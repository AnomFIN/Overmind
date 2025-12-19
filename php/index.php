<?php
/**
 * Main API Router
 * Handles all API requests and routes them to appropriate handlers
 */

// Load configuration
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
} else {
    http_response_code(500);
    die(json_encode(['error' => 'Configuration file not found. Please run install.php first.']));
}

// Load libraries
require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/Auth.php';

// Set headers
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

// CORS handling
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!empty($origin)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
}

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Error handling
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    // Don't throw for warnings and notices in production
    if (error_reporting() & $errno) {
        throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
    }
    return true;
});

// Exception handling
set_exception_handler(function($e) {
    error_log("API Error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    
    // Don't expose sensitive error details in production
    $message = 'Internal server error';
    if (defined('DEBUG_MODE') && DEBUG_MODE) {
        $message = $e->getMessage();
    }
    
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $message
    ]);
    exit;
});

// Parse request path
$requestUri = $_SERVER['REQUEST_URI'];
$scriptName = dirname($_SERVER['SCRIPT_NAME']);
$path = str_replace($scriptName, '', $requestUri);
$path = strtok($path, '?');
$path = trim($path, '/');

// Parse method
$method = $_SERVER['REQUEST_METHOD'];

// Parse body for POST/PUT
$body = null;
if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
    $rawBody = file_get_contents('php://input');
    $body = json_decode($rawBody, true);
    
    if ($body === null && !empty($rawBody)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON in request body']);
        exit;
    }
}

// Initialize services with error handling
try {
    $db = Database::getInstance();
    $auth = new Auth();
} catch (Exception $e) {
    error_log("Failed to initialize services: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Service initialization failed',
        'message' => 'Unable to connect to database. Please check configuration.'
    ]);
    exit;
}

// Clean up expired sessions periodically (1% chance)
if (rand(1, 100) === 1) {
    $auth->cleanupSessions();
}

// Route handling
try {
    // Split path into parts
    $parts = explode('/', $path);
    
    // Remove 'api' prefix if present
    if ($parts[0] === 'api') {
        array_shift($parts);
    }
    
    $endpoint = $parts[0] ?? '';
    
    // Route to appropriate handler
    switch ($endpoint) {
        case 'auth':
            require_once __DIR__ . '/api/auth.php';
            handleAuthRequest($method, $parts, $body, $auth);
            break;
            
        case 'links':
        case 'shortlinks':
            require_once __DIR__ . '/api/links.php';
            handleLinksRequest($method, $parts, $body, $auth, $db);
            break;
            
        case 'uploads':
            require_once __DIR__ . '/api/uploads.php';
            handleUploadsRequest($method, $parts, $body, $auth, $db);
            break;
            
        case 'notes':
        case 'mindmap':
            require_once __DIR__ . '/api/notes.php';
            handleNotesRequest($method, $parts, $body, $auth, $db);
            break;
            
        case 'settings':
            require_once __DIR__ . '/api/settings.php';
            handleSettingsRequest($method, $parts, $body, $auth, $db);
            break;
            
        case 'personas':
            require_once __DIR__ . '/api/personas.php';
            handlePersonasRequest($method, $parts, $body, $auth, $db);
            break;
            
        case 'health':
            echo json_encode([
                'status' => 'ok',
                'timestamp' => time(),
                'version' => '1.0.0-webhotel'
            ]);
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
            break;
    }
    
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}
