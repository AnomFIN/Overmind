<?php
/**
 * Anonymous Overmind — Entry Point
 *
 * This file sits at the root of the overmind/ directory on your web hotel.
 * It redirects first-time visitors to the web installer and, once installed,
 * it serves the main GUI.
 */

define('CONFIG_FILE', __DIR__ . '/config.php');
define('LOCK_FILE',   __DIR__ . '/.installed');

// If not installed yet, send the visitor to the installer.
if (!file_exists(LOCK_FILE) || !file_exists(CONFIG_FILE)) {
    header('Location: install.php');
    exit;
}

// Deliver the main GUI application.
// The static HTML/CSS/JS lives in public/GUI.html (same structure as the
// Node.js deployment).  On a pure PHP/web-hotel setup the file is served
// directly; adapt the path below if your directory layout differs.
$gui = __DIR__ . '/public/GUI.html';

if (file_exists($gui)) {
    header('Content-Type: text/html; charset=UTF-8');
    readfile($gui);
} else {
    // Fallback: plain confirmation that Overmind is installed.
    http_response_code(200);
    header('Content-Type: text/html; charset=UTF-8');
    echo '<!DOCTYPE html><html lang="en"><head>'
       . '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<title>Anonymous Overmind</title>'
       . '<style>body{font-family:system-ui,sans-serif;background:#0d1117;color:#c9d1d9;'
       . 'display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}'
       . 'h1{font-size:2rem}p{color:#8b949e}</style>'
       . '</head><body><div style="text-align:center">'
       . '<h1>&#127760; Anonymous Overmind</h1>'
       . '<p>System is installed and running.</p>'
       . '</div></body></html>';
}
