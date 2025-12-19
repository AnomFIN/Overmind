<?php
/**
 * AnomHome Overmind - Web Hosting Installation Script
 * This script sets up the MySQL database and configures the application
 * 
 * IMPORTANT: Delete this file after successful installation!
 */

// Security check - only allow installation if not already completed
$lockFile = __DIR__ . '/data/install.lock';
if (file_exists($lockFile)) {
    die('
    <!DOCTYPE html>
    <html>
    <head>
        <title>Installation Already Completed</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 20px; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="error">
            <h2>⚠️ Installation Already Completed</h2>
            <p>The installation has already been completed. Please delete this file (install.php) for security.</p>
            <p>If you need to reinstall, delete the file: <code>data/install.lock</code></p>
        </div>
    </body>
    </html>
    ');
}

// Error handling
error_reporting(E_ALL);
ini_set('display_errors', 0);
$errors = [];
$warnings = [];

// Step tracking
$currentStep = isset($_POST['step']) ? (int)$_POST['step'] : 1;

/**
 * Check PHP version
 */
function checkPhpVersion() {
    return version_compare(PHP_VERSION, '7.4.0', '>=');
}

/**
 * Check required PHP extensions
 */
function checkRequiredExtensions() {
    $required = ['mysqli', 'json', 'session', 'mbstring'];
    $missing = [];
    
    foreach ($required as $ext) {
        if (!extension_loaded($ext)) {
            $missing[] = $ext;
        }
    }
    
    return $missing;
}

/**
 * Check folder permissions
 */
function checkFolderPermissions() {
    $folders = ['uploads', 'tmp_uploads', 'data'];
    $issues = [];
    
    foreach ($folders as $folder) {
        if (!file_exists($folder)) {
            @mkdir($folder, 0755, true);
        }
        
        if (!is_writable($folder)) {
            $issues[] = $folder;
        }
    }
    
    return $issues;
}

/**
 * Test database connection
 */
function testDatabaseConnection($host, $user, $pass, $dbname = null) {
    $conn = @mysqli_connect($host, $user, $pass, $dbname);
    
    if (!$conn) {
        return [
            'success' => false,
            'error' => mysqli_connect_error()
        ];
    }
    
    $result = [
        'success' => true,
        'version' => mysqli_get_server_info($conn)
    ];
    
    mysqli_close($conn);
    return $result;
}

/**
 * Create database if not exists
 */
function createDatabase($host, $user, $pass, $dbname) {
    $conn = @mysqli_connect($host, $user, $pass);
    
    if (!$conn) {
        return ['success' => false, 'error' => mysqli_connect_error()];
    }
    
    $dbname = mysqli_real_escape_string($conn, $dbname);
    $sql = "CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    
    if (!mysqli_query($conn, $sql)) {
        return ['success' => false, 'error' => mysqli_error($conn)];
    }
    
    mysqli_close($conn);
    return ['success' => true];
}

/**
 * Create database tables
 */
function createTables($conn) {
    $tables = [
        // Users table
        "CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_username (username),
            INDEX idx_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        // Sessions table
        "CREATE TABLE IF NOT EXISTS sessions (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            expires_at BIGINT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_expires (expires_at),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        // Links/Shortlinks table
        "CREATE TABLE IF NOT EXISTS shortlinks (
            id VARCHAR(36) PRIMARY KEY,
            short_code VARCHAR(50) UNIQUE NOT NULL,
            url TEXT NOT NULL,
            created_by VARCHAR(36),
            clicks INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NULL,
            INDEX idx_short_code (short_code),
            INDEX idx_created_by (created_by),
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        // Uploads table
        "CREATE TABLE IF NOT EXISTS uploads (
            id VARCHAR(36) PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            original_name VARCHAR(255) NOT NULL,
            size BIGINT NOT NULL,
            mime_type VARCHAR(100),
            created_by VARCHAR(36),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            INDEX idx_expires (expires_at),
            INDEX idx_created_by (created_by),
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        // Mind map nodes
        "CREATE TABLE IF NOT EXISTS mindmap_nodes (
            id VARCHAR(36) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            x_position FLOAT NOT NULL,
            y_position FLOAT NOT NULL,
            created_by VARCHAR(36),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_created_by (created_by),
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        // Mind map edges
        "CREATE TABLE IF NOT EXISTS mindmap_edges (
            id VARCHAR(36) PRIMARY KEY,
            source_id VARCHAR(36) NOT NULL,
            target_id VARCHAR(36) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_source (source_id),
            INDEX idx_target (target_id),
            FOREIGN KEY (source_id) REFERENCES mindmap_nodes(id) ON DELETE CASCADE,
            FOREIGN KEY (target_id) REFERENCES mindmap_nodes(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        // AI Personas
        "CREATE TABLE IF NOT EXISTS personas (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            system_prompt TEXT NOT NULL,
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        // App Configuration
        "CREATE TABLE IF NOT EXISTS app_config (
            config_key VARCHAR(100) PRIMARY KEY,
            config_value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ];
    
    foreach ($tables as $sql) {
        if (!mysqli_query($conn, $sql)) {
            return ['success' => false, 'error' => mysqli_error($conn)];
        }
    }
    
    return ['success' => true];
}

/**
 * Create default admin user
 */
function createAdminUser($conn, $username, $password, $email) {
    $id = generateUuid();
    $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    
    $stmt = mysqli_prepare($conn, 
        "INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, 'admin')"
    );
    
    if (!$stmt) {
        return ['success' => false, 'error' => mysqli_error($conn)];
    }
    
    mysqli_stmt_bind_param($stmt, 'ssss', $id, $username, $email, $passwordHash);
    
    if (!mysqli_stmt_execute($stmt)) {
        return ['success' => false, 'error' => mysqli_stmt_error($stmt)];
    }
    
    mysqli_stmt_close($stmt);
    return ['success' => true];
}

/**
 * Create default personas
 */
function createDefaultPersonas($conn) {
    $personas = [
        [
            'id' => generateUuid(),
            'name' => 'Default Assistant',
            'prompt' => 'You are a helpful, friendly AI assistant.',
            'is_default' => 1
        ],
        [
            'id' => generateUuid(),
            'name' => 'Professional',
            'prompt' => 'You are a professional AI assistant focused on providing clear, concise, and accurate information.',
            'is_default' => 0
        ],
        [
            'id' => generateUuid(),
            'name' => 'Creative',
            'prompt' => 'You are a creative AI assistant who thinks outside the box and provides innovative solutions.',
            'is_default' => 0
        ]
    ];
    
    $stmt = mysqli_prepare($conn, 
        "INSERT INTO personas (id, name, system_prompt, is_default) VALUES (?, ?, ?, ?)"
    );
    
    if (!$stmt) {
        return ['success' => false, 'error' => mysqli_error($conn)];
    }
    
    foreach ($personas as $persona) {
        mysqli_stmt_bind_param($stmt, 'sssi', 
            $persona['id'], 
            $persona['name'], 
            $persona['prompt'], 
            $persona['is_default']
        );
        
        if (!mysqli_stmt_execute($stmt)) {
            mysqli_stmt_close($stmt);
            return ['success' => false, 'error' => mysqli_stmt_error($stmt)];
        }
    }
    
    mysqli_stmt_close($stmt);
    return ['success' => true];
}

/**
 * Create default app configuration
 */
function createDefaultConfig($conn) {
    $configs = [
        ['app_name', 'AnomHome Overmind'],
        ['app_logo', '/images/overmind-logo-tp.png'],
        ['primary_color', '#667eea'],
        ['background_image', '']
    ];
    
    $stmt = mysqli_prepare($conn, 
        "INSERT INTO app_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)"
    );
    
    if (!$stmt) {
        return ['success' => false, 'error' => mysqli_error($conn)];
    }
    
    foreach ($configs as $config) {
        mysqli_stmt_bind_param($stmt, 'ss', $config[0], $config[1]);
        mysqli_stmt_execute($stmt);
    }
    
    mysqli_stmt_close($stmt);
    return ['success' => true];
}

/**
 * Generate UUID v4
 */
function generateUuid() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/**
 * Save configuration file
 */
function saveConfigFile($host, $user, $pass, $dbname, $secretKey) {
    $config = "<?php
/**
 * AnomHome Overmind - Configuration
 * Generated by installation script
 */

// Database Configuration
define('DB_HOST', " . var_export($host, true) . ");
define('DB_NAME', " . var_export($dbname, true) . ");
define('DB_USER', " . var_export($user, true) . ");
define('DB_PASS', " . var_export($pass, true) . ");
define('DB_CHARSET', 'utf8mb4');

// Application Configuration
define('APP_URL', " . var_export('http://' . $_SERVER['HTTP_HOST'], true) . ");
define('SECRET_KEY', " . var_export($secretKey, true) . ");

// Session Configuration
define('SESSION_LIFETIME', 3600 * 24 * 7); // 7 days

// Upload Configuration
define('MAX_UPLOAD_SIZE', 100 * 1024 * 1024); // 100MB
define('UPLOAD_TTL', 900); // 15 minutes

// OpenAI Configuration (Optional)
define('OPENAI_API_KEY', '');

?>";
    
    if (!file_exists('php')) {
        mkdir('php', 0755, true);
    }
    
    return file_put_contents('php/config.php', $config) !== false;
}

// Process installation steps
$stepComplete = false;
$nextStep = $currentStep;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    switch ($currentStep) {
        case 1: // System check
            $nextStep = 2;
            $stepComplete = true;
            break;
            
        case 2: // Database configuration
            $dbHost = $_POST['db_host'] ?? 'localhost';
            $dbName = $_POST['db_name'] ?? '';
            $dbUser = $_POST['db_user'] ?? '';
            $dbPass = $_POST['db_pass'] ?? '';
            
            if (empty($dbName) || empty($dbUser)) {
                $errors[] = 'Database name and user are required';
            } else {
                // Test connection
                $testResult = testDatabaseConnection($dbHost, $dbUser, $dbPass);
                
                if (!$testResult['success']) {
                    $errors[] = 'Database connection failed: ' . $testResult['error'];
                } else {
                    // Create database
                    $createResult = createDatabase($dbHost, $dbUser, $dbPass, $dbName);
                    
                    if (!$createResult['success']) {
                        $errors[] = 'Failed to create database: ' . $createResult['error'];
                    } else {
                        // Store in session for next step
                        session_start();
                        $_SESSION['install_db'] = [
                            'host' => $dbHost,
                            'name' => $dbName,
                            'user' => $dbUser,
                            'pass' => $dbPass
                        ];
                        $nextStep = 3;
                        $stepComplete = true;
                    }
                }
            }
            break;
            
        case 3: // Admin user creation
            session_start();
            $dbConfig = $_SESSION['install_db'] ?? null;
            
            if (!$dbConfig) {
                $errors[] = 'Database configuration lost. Please start over.';
                $nextStep = 2;
            } else {
                $adminUsername = $_POST['admin_username'] ?? 'admin';
                $adminPassword = $_POST['admin_password'] ?? '';
                $adminPasswordConfirm = $_POST['admin_password_confirm'] ?? '';
                $adminEmail = $_POST['admin_email'] ?? 'admin@overmind.local';
                
                // Validate
                if (empty($adminPassword)) {
                    $errors[] = 'Admin password is required';
                } elseif (strlen($adminPassword) < 6) {
                    $errors[] = 'Password must be at least 6 characters';
                } elseif ($adminPassword !== $adminPasswordConfirm) {
                    $errors[] = 'Passwords do not match';
                } else {
                    // Connect to database
                    $conn = @mysqli_connect(
                        $dbConfig['host'],
                        $dbConfig['user'],
                        $dbConfig['pass'],
                        $dbConfig['name']
                    );
                    
                    if (!$conn) {
                        $errors[] = 'Database connection failed: ' . mysqli_connect_error();
                    } else {
                        // Create tables
                        $tablesResult = createTables($conn);
                        
                        if (!$tablesResult['success']) {
                            $errors[] = 'Failed to create tables: ' . $tablesResult['error'];
                        } else {
                            // Create admin user
                            $userResult = createAdminUser($conn, $adminUsername, $adminPassword, $adminEmail);
                            
                            if (!$userResult['success']) {
                                $errors[] = 'Failed to create admin user: ' . $userResult['error'];
                            } else {
                                // Create default personas
                                createDefaultPersonas($conn);
                                
                                // Create default config
                                createDefaultConfig($conn);
                                
                                // Generate secret key
                                $secretKey = bin2hex(random_bytes(32));
                                
                                // Save config file
                                if (!saveConfigFile(
                                    $dbConfig['host'],
                                    $dbConfig['user'],
                                    $dbConfig['pass'],
                                    $dbConfig['name'],
                                    $secretKey
                                )) {
                                    $warnings[] = 'Could not save config file. You may need to create it manually.';
                                }
                                
                                // Create lock file
                                if (!file_exists('data')) {
                                    mkdir('data', 0755, true);
                                }
                                file_put_contents($lockFile, date('Y-m-d H:i:s'));
                                
                                // Store admin credentials for final page
                                $_SESSION['install_admin'] = [
                                    'username' => $adminUsername,
                                    'password' => $adminPassword,
                                    'email' => $adminEmail
                                ];
                                
                                $nextStep = 4;
                                $stepComplete = true;
                            }
                        }
                        
                        mysqli_close($conn);
                    }
                }
            }
            break;
    }
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AnomHome Overmind - Installation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 700px;
            width: 100%;
            padding: 40px;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        h2 {
            color: #667eea;
            margin: 30px 0 20px;
            font-size: 20px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .progress {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            position: relative;
        }
        .progress::before {
            content: '';
            position: absolute;
            top: 15px;
            left: 0;
            right: 0;
            height: 2px;
            background: #e0e0e0;
            z-index: 0;
        }
        .progress-step {
            flex: 1;
            text-align: center;
            position: relative;
            z-index: 1;
        }
        .progress-circle {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #e0e0e0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 8px;
            font-weight: bold;
            color: #999;
        }
        .progress-step.active .progress-circle {
            background: #667eea;
            color: white;
        }
        .progress-step.complete .progress-circle {
            background: #10b981;
            color: white;
        }
        .progress-label {
            font-size: 12px;
            color: #666;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 500;
        }
        input[type="text"],
        input[type="password"],
        input[type="email"] {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        .help-text {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
        .button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
        }
        .button:hover {
            background: #5568d3;
        }
        .button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .error {
            background: #fee;
            border: 1px solid #fcc;
            color: #c33;
            padding: 12px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .warning {
            background: #fffbea;
            border: 1px solid #ffd666;
            color: #996600;
            padding: 12px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .success {
            background: #d1fae5;
            border: 1px solid #6ee7b7;
            color: #065f46;
            padding: 12px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .check-item {
            display: flex;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        .check-icon {
            width: 24px;
            height: 24px;
            margin-right: 12px;
            font-size: 18px;
        }
        .check-ok { color: #10b981; }
        .check-fail { color: #ef4444; }
        .check-warn { color: #f59e0b; }
        .completion {
            text-align: center;
            padding: 20px;
        }
        .completion-icon {
            font-size: 64px;
            color: #10b981;
            margin-bottom: 20px;
        }
        .credentials {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 5px;
            padding: 20px;
            margin: 20px 0;
            text-align: left;
        }
        .credentials code {
            background: #e5e7eb;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
        }
        .actions {
            margin-top: 30px;
            text-align: right;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧠 AnomHome Overmind</h1>
        <div class="subtitle">Web Hosting Installation Wizard</div>
        
        <div class="progress">
            <div class="progress-step <?php echo $currentStep >= 1 ? 'active' : ''; ?> <?php echo $currentStep > 1 ? 'complete' : ''; ?>">
                <div class="progress-circle">1</div>
                <div class="progress-label">System Check</div>
            </div>
            <div class="progress-step <?php echo $currentStep >= 2 ? 'active' : ''; ?> <?php echo $currentStep > 2 ? 'complete' : ''; ?>">
                <div class="progress-circle">2</div>
                <div class="progress-label">Database</div>
            </div>
            <div class="progress-step <?php echo $currentStep >= 3 ? 'active' : ''; ?> <?php echo $currentStep > 3 ? 'complete' : ''; ?>">
                <div class="progress-circle">3</div>
                <div class="progress-label">Admin User</div>
            </div>
            <div class="progress-step <?php echo $currentStep >= 4 ? 'active' : ''; ?>">
                <div class="progress-circle">4</div>
                <div class="progress-label">Complete</div>
            </div>
        </div>
        
        <?php if (!empty($errors)): ?>
            <div class="error">
                <strong>⚠️ Errors:</strong>
                <ul style="margin-top: 10px; margin-left: 20px;">
                    <?php foreach ($errors as $error): ?>
                        <li><?php echo htmlspecialchars($error); ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>
        
        <?php if (!empty($warnings)): ?>
            <div class="warning">
                <strong>⚠️ Warnings:</strong>
                <ul style="margin-top: 10px; margin-left: 20px;">
                    <?php foreach ($warnings as $warning): ?>
                        <li><?php echo htmlspecialchars($warning); ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>
        
        <?php if ($currentStep === 1): ?>
            <h2>Step 1: System Check</h2>
            <p style="margin-bottom: 20px;">Checking your server configuration...</p>
            
            <div class="check-item">
                <div class="check-icon <?php echo checkPhpVersion() ? 'check-ok' : 'check-fail'; ?>">
                    <?php echo checkPhpVersion() ? '✓' : '✗'; ?>
                </div>
                <div>
                    <strong>PHP Version <?php echo PHP_VERSION; ?></strong>
                    <?php if (!checkPhpVersion()): ?>
                        <div class="help-text" style="color: #ef4444;">PHP 7.4 or higher required</div>
                    <?php endif; ?>
                </div>
            </div>
            
            <?php
            $missingExtensions = checkRequiredExtensions();
            foreach (['mysqli', 'json', 'session', 'mbstring'] as $ext):
                $loaded = extension_loaded($ext);
            ?>
            <div class="check-item">
                <div class="check-icon <?php echo $loaded ? 'check-ok' : 'check-fail'; ?>">
                    <?php echo $loaded ? '✓' : '✗'; ?>
                </div>
                <div>
                    <strong><?php echo $ext; ?> extension</strong>
                    <?php if (!$loaded): ?>
                        <div class="help-text" style="color: #ef4444;">Required extension not loaded</div>
                    <?php endif; ?>
                </div>
            </div>
            <?php endforeach; ?>
            
            <?php
            $folderIssues = checkFolderPermissions();
            foreach (['uploads', 'tmp_uploads', 'data'] as $folder):
                $writable = !in_array($folder, $folderIssues);
            ?>
            <div class="check-item">
                <div class="check-icon <?php echo $writable ? 'check-ok' : 'check-warn'; ?>">
                    <?php echo $writable ? '✓' : '⚠'; ?>
                </div>
                <div>
                    <strong>/<?php echo $folder; ?> folder</strong>
                    <?php if (!$writable): ?>
                        <div class="help-text" style="color: #f59e0b;">Folder needs write permissions (chmod 755 or 777)</div>
                    <?php endif; ?>
                </div>
            </div>
            <?php endforeach; ?>
            
            <?php if (checkPhpVersion() && empty($missingExtensions)): ?>
                <form method="post">
                    <input type="hidden" name="step" value="1">
                    <div class="actions">
                        <button type="submit" class="button">Continue to Database Setup →</button>
                    </div>
                </form>
            <?php else: ?>
                <div class="error" style="margin-top: 20px;">
                    <strong>Cannot continue:</strong> Please fix the errors above before proceeding.
                    Contact your hosting provider if you need help configuring PHP.
                </div>
            <?php endif; ?>
            
        <?php elseif ($currentStep === 2): ?>
            <h2>Step 2: Database Configuration</h2>
            <p style="margin-bottom: 20px;">Enter your MySQL database credentials. You can find these in your hosting control panel.</p>
            
            <form method="post">
                <input type="hidden" name="step" value="2">
                
                <div class="form-group">
                    <label for="db_host">Database Host</label>
                    <input type="text" id="db_host" name="db_host" value="localhost" required>
                    <div class="help-text">Usually "localhost" or an IP address provided by your host</div>
                </div>
                
                <div class="form-group">
                    <label for="db_name">Database Name</label>
                    <input type="text" id="db_name" name="db_name" required>
                    <div class="help-text">The name of your MySQL database</div>
                </div>
                
                <div class="form-group">
                    <label for="db_user">Database Username</label>
                    <input type="text" id="db_user" name="db_user" required>
                    <div class="help-text">Your MySQL username</div>
                </div>
                
                <div class="form-group">
                    <label for="db_pass">Database Password</label>
                    <input type="password" id="db_pass" name="db_pass">
                    <div class="help-text">Your MySQL password (leave blank if none)</div>
                </div>
                
                <div class="actions">
                    <button type="submit" class="button">Test Connection & Continue →</button>
                </div>
            </form>
            
        <?php elseif ($currentStep === 3): ?>
            <h2>Step 3: Create Admin User</h2>
            <p style="margin-bottom: 20px;">Set up your administrator account. You'll use this to log in to Overmind.</p>
            
            <form method="post">
                <input type="hidden" name="step" value="3">
                
                <div class="form-group">
                    <label for="admin_username">Admin Username</label>
                    <input type="text" id="admin_username" name="admin_username" value="admin" required>
                    <div class="help-text">Choose a username for the administrator account</div>
                </div>
                
                <div class="form-group">
                    <label for="admin_email">Admin Email</label>
                    <input type="email" id="admin_email" name="admin_email" value="admin@overmind.local" required>
                    <div class="help-text">Email address for the administrator</div>
                </div>
                
                <div class="form-group">
                    <label for="admin_password">Admin Password</label>
                    <input type="password" id="admin_password" name="admin_password" required minlength="6">
                    <div class="help-text">Choose a strong password (minimum 6 characters)</div>
                </div>
                
                <div class="form-group">
                    <label for="admin_password_confirm">Confirm Password</label>
                    <input type="password" id="admin_password_confirm" name="admin_password_confirm" required minlength="6">
                    <div class="help-text">Re-enter your password</div>
                </div>
                
                <div class="actions">
                    <button type="submit" class="button">Create Database & Admin User →</button>
                </div>
            </form>
            
        <?php elseif ($currentStep === 4): ?>
            <?php
            session_start();
            $adminCreds = $_SESSION['install_admin'] ?? null;
            ?>
            
            <div class="completion">
                <div class="completion-icon">🎉</div>
                <h2 style="color: #10b981;">Installation Complete!</h2>
                <p style="margin: 20px 0;">AnomHome Overmind has been successfully installed.</p>
            </div>
            
            <?php if ($adminCreds): ?>
            <div class="credentials">
                <h3 style="margin-bottom: 15px; color: #333;">Your Admin Credentials</h3>
                <p style="margin-bottom: 10px;"><strong>Username:</strong> <code><?php echo htmlspecialchars($adminCreds['username']); ?></code></p>
                <p style="margin-bottom: 10px;"><strong>Password:</strong> <code><?php echo htmlspecialchars($adminCreds['password']); ?></code></p>
                <p style="margin-bottom: 10px;"><strong>Email:</strong> <code><?php echo htmlspecialchars($adminCreds['email']); ?></code></p>
                <p style="margin-top: 15px; color: #ef4444; font-weight: bold;">⚠️ Save these credentials now! Change the password after your first login.</p>
            </div>
            <?php endif; ?>
            
            <div class="success">
                <strong>✓ Next Steps:</strong>
                <ol style="margin: 10px 0 0 20px;">
                    <li>Delete this file (install.php) for security</li>
                    <li>Visit your website homepage</li>
                    <li>Log in with your admin credentials</li>
                    <li>Change your password in Settings</li>
                    <li>Configure OpenAI API key (optional) in php/config.php</li>
                </ol>
            </div>
            
            <div class="actions">
                <a href="/" class="button" style="display: inline-block; text-decoration: none;">Go to Homepage →</a>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
