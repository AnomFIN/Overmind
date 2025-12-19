<?php
/**
 * Authentication API endpoints
 */

// Load validator
require_once __DIR__ . '/../lib/Validator.php';

function handleAuthRequest($method, $parts, $body, $auth) {
    $action = $parts[1] ?? '';
    
    switch ($action) {
        case 'register':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                return;
            }
            
            try {
                // Validate required fields
                Validator::requireFields($body, ['username', 'email', 'password']);
                
                // Sanitize inputs
                $username = Validator::sanitizeString($body['username']);
                $email = Validator::sanitizeEmail($body['email']);
                $password = $body['password']; // Don't sanitize password
                
                // Validate username format
                if (!Validator::isValidUsername($username)) {
                    throw new Exception('Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens');
                }
                
                // Validate email
                if (!Validator::isValidEmail($email)) {
                    throw new Exception('Invalid email address');
                }
                
                // Validate password length
                if (!Validator::validateLength($password, 6, 100)) {
                    throw new Exception('Password must be 6-100 characters');
                }
                
                $user = $auth->register($username, $email, $password);
                
                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'user' => $user
                ]);
            } catch (Exception $e) {
                http_response_code(400);
                echo json_encode(['error' => $e->getMessage()]);
            }
            break;
            
        case 'login':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                return;
            }
            
            try {
                // Rate limiting for login attempts
                Validator::checkRateLimit('login', 5, 300); // 5 attempts per 5 minutes
                
                // Validate required fields
                $usernameOrEmail = $body['username'] ?? $body['email'] ?? '';
                $password = $body['password'] ?? '';
                
                if (empty($usernameOrEmail) || empty($password)) {
                    throw new Exception('Username/email and password are required');
                }
                
                // Sanitize username/email
                $usernameOrEmail = Validator::sanitizeString($usernameOrEmail);
                
                $user = $auth->login($usernameOrEmail, $password);
                
                echo json_encode([
                    'success' => true,
                    'user' => $user
                ]);
            } catch (Exception $e) {
                http_response_code(401);
                echo json_encode(['error' => $e->getMessage()]);
            }
            break;
            
        case 'logout':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                return;
            }
            
            $auth->logout();
            echo json_encode(['success' => true]);
            break;
            
        case 'me':
            if ($method !== 'GET') {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                return;
            }
            
            $user = $auth->getCurrentUser();
            
            if ($user) {
                echo json_encode([
                    'authenticated' => true,
                    'user' => $user
                ]);
            } else {
                echo json_encode([
                    'authenticated' => false
                ]);
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
            break;
    }
}
