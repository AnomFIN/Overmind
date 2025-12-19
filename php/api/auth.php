<?php
/**
 * Authentication API endpoints
 */

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
                $username = $body['username'] ?? '';
                $email = $body['email'] ?? '';
                $password = $body['password'] ?? '';
                
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
                $usernameOrEmail = $body['username'] ?? $body['email'] ?? '';
                $password = $body['password'] ?? '';
                
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
