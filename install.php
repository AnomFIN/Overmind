<?php
/**
 * Anonymous Overmind — Web Installer
 *
 * Place this file (along with all other Overmind files) in your web-hotel
 * directory, e.g. public_html/overmind/, then visit:
 *   https://yourserver.com/overmind/install.php
 *
 * The installer will:
 *   1. Check server requirements
 *   2. Collect MySQL connection details
 *   3. Create all required database tables
 *   4. Set up the administrator account
 *   5. Write config.php and lock the installer
 */

define('OVERMIND_VERSION', '1.0.0');
define('CONFIG_FILE', __DIR__ . '/config.php');
define('LOCK_FILE',   __DIR__ . '/.installed');

/* ── helpers ─────────────────────────────────────────────────────────────── */

function already_installed(): bool
{
    return file_exists(LOCK_FILE) && file_exists(CONFIG_FILE);
}

function h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function redirect(string $url): void
{
    header('Location: ' . $url);
    exit;
}

/**
 * Very simple CSRF token stored in the session.
 */
function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf(string $token): bool
{
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

/* ── requirements check ──────────────────────────────────────────────────── */

function check_requirements(): array
{
    $checks = [];

    $checks[] = [
        'label' => 'PHP version &ge; 7.4',
        'ok'    => version_compare(PHP_VERSION, '7.4.0', '>='),
        'value' => PHP_VERSION,
    ];
    $checks[] = [
        'label' => 'PDO extension',
        'ok'    => extension_loaded('pdo'),
        'value' => extension_loaded('pdo') ? 'enabled' : 'missing',
    ];
    $checks[] = [
        'label' => 'PDO MySQL driver',
        'ok'    => extension_loaded('pdo_mysql'),
        'value' => extension_loaded('pdo_mysql') ? 'enabled' : 'missing',
    ];
    $checks[] = [
        'label' => 'config.php writable',
        'ok'    => is_writable(__DIR__),
        'value' => is_writable(__DIR__) ? 'writable' : 'not writable',
    ];
    $checks[] = [
        'label' => 'PHP sessions',
        'ok'    => function_exists('session_start'),
        'value' => function_exists('session_start') ? 'available' : 'missing',
    ];

    return $checks;
}

function requirements_met(array $checks): bool
{
    foreach ($checks as $c) {
        if (!$c['ok']) return false;
    }
    return true;
}

/* ── database helpers ────────────────────────────────────────────────────── */

function db_connect(array $cfg): PDO
{
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $cfg['host'],
        (int) $cfg['port'],
        $cfg['name']
    );
    $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4",
    ]);
    return $pdo;
}

function create_tables(PDO $pdo): void
{
    $statements = [

        /* admin users */
        "CREATE TABLE IF NOT EXISTS `overmind_users` (
            `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `username`   VARCHAR(64)  NOT NULL UNIQUE,
            `email`      VARCHAR(255) NOT NULL UNIQUE,
            `password`   VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
            `role`       ENUM('admin','user') NOT NULL DEFAULT 'user',
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        /* short links */
        "CREATE TABLE IF NOT EXISTS `overmind_links` (
            `id`         CHAR(36)     NOT NULL,
            `code`       VARCHAR(50)  NOT NULL UNIQUE,
            `url`        TEXT         NOT NULL,
            `clicks`     INT UNSIGNED NOT NULL DEFAULT 0,
            `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            INDEX `idx_code` (`code`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        /* mind-map notes */
        "CREATE TABLE IF NOT EXISTS `overmind_notes` (
            `id`         CHAR(36)     NOT NULL,
            `title`      VARCHAR(255) NOT NULL,
            `content`    LONGTEXT,
            `is_public`  TINYINT(1)   NOT NULL DEFAULT 0,
            `share_code` VARCHAR(32)  DEFAULT NULL,
            `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        /* cameras */
        "CREATE TABLE IF NOT EXISTS `overmind_cameras` (
            `id`         CHAR(36)     NOT NULL,
            `name`       VARCHAR(255) NOT NULL,
            `url`        TEXT         NOT NULL,
            `type`       ENUM('mjpeg','hls','img') NOT NULL DEFAULT 'mjpeg',
            `username`   VARCHAR(255) DEFAULT NULL,
            `password`   VARCHAR(255) DEFAULT NULL,
            `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        /* settings key-value store */
        "CREATE TABLE IF NOT EXISTS `overmind_settings` (
            `setting_key`   VARCHAR(128) NOT NULL,
            `setting_value` TEXT,
            `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`setting_key`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    ];

    foreach ($statements as $sql) {
        $pdo->exec($sql);
    }
}

function create_admin(PDO $pdo, string $username, string $email, string $password): void
{
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $stmt = $pdo->prepare(
        "INSERT INTO `overmind_users` (`username`, `email`, `password`, `role`)
         VALUES (:username, :email, :password, 'admin')"
    );
    $stmt->execute([
        ':username' => $username,
        ':email'    => $email,
        ':password' => $hash,
    ]);
}

/* ── config writer ───────────────────────────────────────────────────────── */

function write_config(array $db, string $secret): void
{
    $content = '<?php' . PHP_EOL
        . '/** Anonymous Overmind — auto-generated configuration */' . PHP_EOL
        . '/** Do NOT edit manually unless you know what you are doing. */' . PHP_EOL
        . PHP_EOL
        . "define('DB_HOST',   " . var_export($db['host'], true) . ');' . PHP_EOL
        . "define('DB_PORT',   " . var_export((int) $db['port'], true) . ');' . PHP_EOL
        . "define('DB_NAME',   " . var_export($db['name'], true) . ');' . PHP_EOL
        . "define('DB_USER',   " . var_export($db['user'], true) . ');' . PHP_EOL
        . "define('DB_PASS',   " . var_export($db['pass'], true) . ');' . PHP_EOL
        . "define('APP_SECRET'," . var_export($secret, true) . ');' . PHP_EOL
        . "define('APP_VERSION','1.0.0');" . PHP_EOL;

    if (file_put_contents(CONFIG_FILE, $content, LOCK_EX) === false) {
        throw new RuntimeException('Cannot write config.php — check directory permissions.');
    }

    // Create the lock file so install.php refuses to run again.
    if (file_put_contents(LOCK_FILE, date('c'), LOCK_EX) === false) {
        throw new RuntimeException('Cannot write .installed lock file — check directory permissions.');
    }
}

/* ── session & CSRF bootstrap ───────────────────────────────────────────── */

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params(['samesite' => 'Strict', 'httponly' => true]);
    session_start();
}

/* ── guard: redirect if already installed ───────────────────────────────── */

if (already_installed()) {
    redirect('index.php');
}

/* ── state machine ───────────────────────────────────────────────────────── */

$step   = (int) ($_SESSION['install_step'] ?? 1);
$errors = [];
$info   = [];

/* Step navigation via POST */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf_token'] ?? '';
    if (!verify_csrf($token)) {
        $errors[] = 'Invalid security token. Please refresh and try again.';
        $step = 1;
    } else {
        $action = $_POST['action'] ?? '';

        /* ── step 1 → 2: requirements confirmed ── */
        if ($action === 'next_step1') {
            $checks = check_requirements();
            if (requirements_met($checks)) {
                $step = 2;
                $_SESSION['install_step'] = $step;
            } else {
                $errors[] = 'Please resolve all failing requirements before continuing.';
                $step = 1;
            }
        }

        /* ── step 2 → 3: validate & test DB ── */
        elseif ($action === 'next_step2') {
            $db = [
                'host' => trim($_POST['db_host'] ?? 'localhost'),
                'port' => (int) ($_POST['db_port'] ?? 3306),
                'name' => trim($_POST['db_name'] ?? ''),
                'user' => trim($_POST['db_user'] ?? ''),
                'pass' => $_POST['db_pass'] ?? '',
            ];

            if ($db['name'] === '') $errors[] = 'Database name is required.';
            if ($db['user'] === '') $errors[] = 'Database username is required.';

            if (empty($errors)) {
                try {
                    $pdo = db_connect($db);
                    $_SESSION['db_config'] = $db;
                    $step = 3;
                    $_SESSION['install_step'] = $step;
                    $info[] = 'Database connection successful!';
                } catch (PDOException $e) {
                    $errors[] = 'Cannot connect to database: ' . $e->getMessage();
                }
            }
        }

        /* ── step 3 → 4: validate admin credentials ── */
        elseif ($action === 'next_step3') {
            $admin = [
                'username' => trim($_POST['admin_username'] ?? ''),
                'email'    => trim($_POST['admin_email']    ?? ''),
                'password' => $_POST['admin_password']       ?? '',
                'confirm'  => $_POST['admin_confirm']        ?? '',
            ];

            if ($admin['username'] === '' || strlen($admin['username']) < 3) {
                $errors[] = 'Admin username must be at least 3 characters.';
            }
            if (!filter_var($admin['email'], FILTER_VALIDATE_EMAIL)) {
                $errors[] = 'Please enter a valid e-mail address.';
            }
            if (strlen($admin['password']) < 8) {
                $errors[] = 'Password must be at least 8 characters long.';
            }
            if ($admin['password'] !== $admin['confirm']) {
                $errors[] = 'Passwords do not match.';
            }

            if (empty($errors)) {
                $_SESSION['admin_config'] = $admin;
                $step = 4;
                $_SESSION['install_step'] = $step;
            }
        }

        /* ── step 4: run installation ── */
        elseif ($action === 'install') {
            $db    = $_SESSION['db_config']    ?? null;
            $admin = $_SESSION['admin_config'] ?? null;

            if (!$db || !$admin) {
                $errors[] = 'Session expired. Please start over.';
                $step = 1;
                $_SESSION['install_step'] = $step;
            } else {
                try {
                    $pdo = db_connect($db);
                    create_tables($pdo);
                    create_admin($pdo, $admin['username'], $admin['email'], $admin['password']);
                    $secret = bin2hex(random_bytes(32));
                    write_config($db, $secret);

                    // Destroy installer session data
                    unset($_SESSION['db_config'], $_SESSION['admin_config'], $_SESSION['install_step']);

                    $step = 5; // success
                } catch (Throwable $e) {
                    $errors[] = 'Installation failed: ' . $e->getMessage();
                    $step = 4;
                }
            }
        }
    }
}

/* Recalculate checks for display on step 1 */
$checks = ($step === 1) ? check_requirements() : [];

/* Pre-fill form values from session (to avoid re-typing after error) */
$db_values = $_SESSION['db_config'] ?? [
    'host' => 'localhost',
    'port' => 3306,
    'name' => '',
    'user' => '',
    'pass' => '',
];
$admin_values = $_SESSION['admin_config'] ?? [
    'username' => '',
    'email'    => '',
    'password' => '',
    'confirm'  => '',
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Anonymous Overmind — Web Installer</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: #0d1117;
    color: #c9d1d9;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
  }

  .installer {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 12px;
    width: 100%;
    max-width: 620px;
    overflow: hidden;
  }

  .installer-header {
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    border-bottom: 1px solid #30363d;
    padding: 2rem;
    text-align: center;
  }

  .installer-header h1 {
    font-size: 1.6rem;
    font-weight: 700;
    color: #f0f6fc;
    letter-spacing: .5px;
  }

  .installer-header p {
    color: #8b949e;
    margin-top: .4rem;
    font-size: .9rem;
  }

  /* step indicator */
  .steps {
    display: flex;
    justify-content: center;
    gap: .5rem;
    padding: 1.2rem 2rem;
    border-bottom: 1px solid #21262d;
  }

  .step-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #30363d;
    transition: background .3s;
  }

  .step-dot.active  { background: #388bfd; }
  .step-dot.done    { background: #3fb950; }

  /* body */
  .installer-body { padding: 2rem; }

  h2 { font-size: 1.1rem; color: #f0f6fc; margin-bottom: 1.2rem; }

  /* alerts */
  .alert {
    border-radius: 6px;
    padding: .75rem 1rem;
    margin-bottom: 1rem;
    font-size: .88rem;
    line-height: 1.5;
  }
  .alert-error   { background: #2d1b1b; border: 1px solid #f85149; color: #f85149; }
  .alert-success { background: #1b2d1b; border: 1px solid #3fb950; color: #3fb950; }

  /* requirements table */
  .req-table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: .9rem; }
  .req-table th { text-align: left; color: #8b949e; font-weight: 600; padding: .4rem 0; border-bottom: 1px solid #21262d; }
  .req-table td { padding: .5rem 0; border-bottom: 1px solid #21262d; }
  .req-table td:last-child { text-align: right; }
  .badge-ok   { color: #3fb950; font-weight: 600; }
  .badge-fail { color: #f85149; font-weight: 600; }

  /* form */
  .form-group { margin-bottom: 1.2rem; }
  label { display: block; font-size: .85rem; color: #8b949e; margin-bottom: .35rem; }
  input[type=text], input[type=email], input[type=password], input[type=number] {
    width: 100%;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: .6rem .8rem;
    color: #c9d1d9;
    font-size: .95rem;
    transition: border-color .2s;
  }
  input:focus { outline: none; border-color: #388bfd; }
  .hint { font-size: .78rem; color: #8b949e; margin-top: .3rem; }

  .form-row { display: flex; gap: 1rem; }
  .form-row .form-group { flex: 1; }

  /* actions */
  .installer-actions {
    padding: 1.2rem 2rem;
    border-top: 1px solid #21262d;
    display: flex;
    justify-content: flex-end;
    gap: .75rem;
  }

  .btn {
    padding: .55rem 1.3rem;
    border-radius: 6px;
    border: none;
    font-size: .9rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity .2s;
  }
  .btn:hover { opacity: .85; }
  .btn-primary  { background: #388bfd; color: #fff; }
  .btn-success  { background: #3fb950; color: #fff; }
  .btn-disabled { background: #30363d; color: #8b949e; cursor: not-allowed; }

  /* success */
  .success-icon { font-size: 3.5rem; text-align: center; margin-bottom: 1rem; }
  .success-msg  { text-align: center; color: #8b949e; font-size: .95rem; line-height: 1.6; }
  .success-msg a { color: #388bfd; }
</style>
</head>
<body>
<div class="installer">

  <div class="installer-header">
    <h1>&#127760; Anonymous Overmind</h1>
    <p>Web Installer &mdash; v<?= OVERMIND_VERSION ?></p>
  </div>

  <!-- step indicator -->
  <div class="steps">
    <?php
    $labels = ['Requirements', 'Database', 'Admin', 'Confirm', 'Done'];
    for ($i = 1; $i <= 5; $i++):
        $cls = $i === $step ? 'active' : ($i < $step ? 'done' : '');
    ?>
      <div class="step-dot <?= $cls ?>" title="<?= h($labels[$i-1]) ?>"></div>
    <?php endfor; ?>
  </div>

  <div class="installer-body">

    <!-- alerts -->
    <?php foreach ($errors as $e): ?>
      <div class="alert alert-error"><?= h($e) ?></div>
    <?php endforeach; ?>
    <?php foreach ($info as $m): ?>
      <div class="alert alert-success"><?= h($m) ?></div>
    <?php endforeach; ?>

    <?php if ($step === 1): ?>
    <!-- ── Step 1: Requirements ── -->
    <h2>Step 1 &mdash; Server Requirements</h2>
    <table class="req-table">
      <thead><tr><th>Requirement</th><th>Status</th></tr></thead>
      <tbody>
        <?php foreach ($checks as $c): ?>
        <tr>
          <td><?= $c['label'] ?></td>
          <td>
            <?php if ($c['ok']): ?>
              <span class="badge-ok">&#10003; <?= h($c['value']) ?></span>
            <?php else: ?>
              <span class="badge-fail">&#10007; <?= h($c['value']) ?></span>
            <?php endif; ?>
          </td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>

    <form method="post">
      <input type="hidden" name="csrf_token" value="<?= h(csrf_token()) ?>">
      <input type="hidden" name="action" value="next_step1">
      <div class="installer-actions">
        <?php if (requirements_met($checks)): ?>
          <button type="submit" class="btn btn-primary">Continue &rarr;</button>
        <?php else: ?>
          <button type="button" class="btn btn-disabled" disabled>Resolve issues first</button>
        <?php endif; ?>
      </div>
    </form>

    <?php elseif ($step === 2): ?>
    <!-- ── Step 2: Database ── -->
    <h2>Step 2 &mdash; Database Configuration</h2>
    <form method="post">
      <input type="hidden" name="csrf_token" value="<?= h(csrf_token()) ?>">
      <input type="hidden" name="action" value="next_step2">

      <div class="form-row">
        <div class="form-group">
          <label for="db_host">MySQL Host</label>
          <input type="text" id="db_host" name="db_host"
                 value="<?= h($db_values['host']) ?>" required>
        </div>
        <div class="form-group" style="flex:0 0 90px">
          <label for="db_port">Port</label>
          <input type="number" id="db_port" name="db_port" min="1" max="65535"
                 value="<?= h((string)$db_values['port']) ?>" required>
        </div>
      </div>

      <div class="form-group">
        <label for="db_name">Database Name</label>
        <input type="text" id="db_name" name="db_name"
               value="<?= h($db_values['name']) ?>" required
               placeholder="overmind">
        <p class="hint">The database must already exist on your MySQL server.</p>
      </div>

      <div class="form-group">
        <label for="db_user">Username</label>
        <input type="text" id="db_user" name="db_user"
               value="<?= h($db_values['user']) ?>" required
               autocomplete="off">
      </div>

      <div class="form-group">
        <label for="db_pass">Password</label>
        <input type="password" id="db_pass" name="db_pass"
               value="" autocomplete="new-password"
               placeholder="Leave blank if no password">
        <p class="hint">Passwords are never stored in the session. If there is a connection error you will need to re-enter it.</p>
      </div>

      <div class="installer-actions">
        <button type="submit" class="btn btn-primary">Test &amp; Continue &rarr;</button>
      </div>
    </form>

    <?php elseif ($step === 3): ?>
    <!-- ── Step 3: Admin Account ── -->
    <h2>Step 3 &mdash; Administrator Account</h2>
    <form method="post">
      <input type="hidden" name="csrf_token" value="<?= h(csrf_token()) ?>">
      <input type="hidden" name="action" value="next_step3">

      <div class="form-group">
        <label for="admin_username">Username</label>
        <input type="text" id="admin_username" name="admin_username"
               value="<?= h($admin_values['username']) ?>" required
               minlength="3" maxlength="64" autocomplete="off">
      </div>

      <div class="form-group">
        <label for="admin_email">E-mail Address</label>
        <input type="email" id="admin_email" name="admin_email"
               value="<?= h($admin_values['email']) ?>" required
               autocomplete="off">
      </div>

      <div class="form-group">
        <label for="admin_password">Password <span style="color:#8b949e">(min. 8 characters)</span></label>
        <input type="password" id="admin_password" name="admin_password"
               required minlength="8" autocomplete="new-password">
      </div>

      <div class="form-group">
        <label for="admin_confirm">Confirm Password</label>
        <input type="password" id="admin_confirm" name="admin_confirm"
               required minlength="8" autocomplete="new-password">
      </div>

      <div class="installer-actions">
        <button type="submit" class="btn btn-primary">Continue &rarr;</button>
      </div>
    </form>

    <?php elseif ($step === 4): ?>
    <!-- ── Step 4: Confirm & Install ── -->
    <h2>Step 4 &mdash; Review &amp; Install</h2>
    <p style="color:#8b949e;margin-bottom:1.2rem;font-size:.9rem;line-height:1.6">
      Please review the details below. Clicking <strong>Install</strong> will:
    </p>
    <ul style="color:#8b949e;font-size:.88rem;line-height:1.8;margin-left:1.2rem;margin-bottom:1.5rem">
      <li>Create all required MySQL tables in <strong><?= h($_SESSION['db_config']['name'] ?? '') ?></strong></li>
      <li>Create administrator account <strong><?= h($_SESSION['admin_config']['username'] ?? '') ?></strong></li>
      <li>Write <code>config.php</code> with your database credentials</li>
      <li>Lock the installer so it cannot be run again</li>
    </ul>

    <form method="post">
      <input type="hidden" name="csrf_token" value="<?= h(csrf_token()) ?>">
      <input type="hidden" name="action" value="install">
      <div class="installer-actions">
        <button type="submit" class="btn btn-success">&#9889; Install Now</button>
      </div>
    </form>

    <?php elseif ($step === 5): ?>
    <!-- ── Step 5: Success ── -->
    <div class="success-icon">&#127881;</div>
    <h2 style="text-align:center;margin-bottom:.75rem">Installation Complete!</h2>
    <p class="success-msg">
      Anonymous Overmind has been successfully installed.<br><br>
      <strong>Important:</strong> For security, please delete or rename
      <code>install.php</code> from your server.<br><br>
      <a href="index.php">&#8594; Go to Anonymous Overmind</a>
    </p>

    <?php endif; ?>

  </div><!-- /.installer-body -->
</div><!-- /.installer -->
</body>
</html>
