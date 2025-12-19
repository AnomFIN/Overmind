<?php
/**
 * Links/Shortlinks API endpoints
 */

function handleLinksRequest($method, $parts, $body, $auth, $db) {
    $linkId = $parts[1] ?? null;
    
    switch ($method) {
        case 'GET':
            if ($linkId === 'redirect' || $linkId === 'r') {
                // Handle redirect: /api/links/redirect/:code
                $shortCode = $parts[2] ?? '';
                handleRedirect($shortCode, $db);
            } elseif ($linkId) {
                // Get specific link
                $link = $db->fetchOne(
                    "SELECT * FROM shortlinks WHERE id = ?",
                    [$linkId],
                    's'
                );
                
                if (!$link) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Link not found']);
                    return;
                }
                
                echo json_encode($link);
            } else {
                // Get all links
                $auth->requireAuth();
                $user = $auth->getCurrentUser();
                
                $links = $db->fetchAll(
                    "SELECT * FROM shortlinks WHERE created_by = ? OR created_by IS NULL ORDER BY created_at DESC",
                    [$user['id']],
                    's'
                );
                
                echo json_encode($links);
            }
            break;
            
        case 'POST':
            $auth->requireAuth();
            $user = $auth->getCurrentUser();
            
            try {
                require_once __DIR__ . '/../lib/Validator.php';
                
                // Validate required fields
                Validator::requireFields($body, ['url']);
                
                $url = trim($body['url']);
                $shortCode = isset($body['short_code']) ? Validator::sanitizeString($body['short_code']) : generateShortCode();
                $expiresAt = $body['expires_at'] ?? null;
                
                // Validate URL
                if (!Validator::isValidUrl($url)) {
                    throw new Exception('Invalid URL format');
                }
                
                // Validate short code format
                if (!preg_match('/^[a-zA-Z0-9_-]{3,50}$/', $shortCode)) {
                    throw new Exception('Short code must be 3-50 characters and contain only letters, numbers, underscores, and hyphens');
                }
                
                // Validate URL length
                if (strlen($url) > 2000) {
                    throw new Exception('URL is too long (maximum 2000 characters)');
                }
                
                // Check if short code exists
                $existing = $db->fetchOne(
                    "SELECT id FROM shortlinks WHERE short_code = ?",
                    [$shortCode],
                    's'
                );
                
                if ($existing) {
                    throw new Exception('Short code already exists');
                }
                
                $id = generateUuid();
                
                $db->query(
                    "INSERT INTO shortlinks (id, short_code, url, created_by, expires_at) VALUES (?, ?, ?, ?, ?)",
                    [$id, $shortCode, $url, $user['id'], $expiresAt],
                    'sssss'
                );
                
                $link = $db->fetchOne(
                    "SELECT * FROM shortlinks WHERE id = ?",
                    [$id],
                    's'
                );
                
                http_response_code(201);
                echo json_encode($link);
            } catch (Exception $e) {
                http_response_code(400);
                echo json_encode(['error' => $e->getMessage()]);
            }
            break;
            
        case 'DELETE':
            if (!$linkId) {
                http_response_code(400);
                echo json_encode(['error' => 'Link ID required']);
                return;
            }
            
            $auth->requireAuth();
            $user = $auth->getCurrentUser();
            
            // Check ownership
            $link = $db->fetchOne(
                "SELECT * FROM shortlinks WHERE id = ?",
                [$linkId],
                's'
            );
            
            if (!$link) {
                http_response_code(404);
                echo json_encode(['error' => 'Link not found']);
                return;
            }
            
            if ($link['created_by'] !== $user['id'] && $user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(['error' => 'Forbidden']);
                return;
            }
            
            $db->delete('shortlinks', 'id = ?', [$linkId], 's');
            
            echo json_encode(['success' => true]);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
}

function handleRedirect($shortCode, $db) {
    if (empty($shortCode)) {
        http_response_code(400);
        echo json_encode(['error' => 'Short code required']);
        return;
    }
    
    $link = $db->fetchOne(
        "SELECT * FROM shortlinks WHERE short_code = ?",
        [$shortCode],
        's'
    );
    
    if (!$link) {
        http_response_code(404);
        echo json_encode(['error' => 'Link not found']);
        return;
    }
    
    // Check expiry
    if ($link['expires_at'] && strtotime($link['expires_at']) < time()) {
        http_response_code(410);
        echo json_encode(['error' => 'Link expired']);
        return;
    }
    
    // Increment click counter
    $db->query(
        "UPDATE shortlinks SET clicks = clicks + 1 WHERE id = ?",
        [$link['id']],
        's'
    );
    
    // Redirect
    header('Location: ' . $link['url']);
    exit;
}

function generateShortCode($length = 6) {
    $characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $code = '';
    
    for ($i = 0; $i < $length; $i++) {
        $code .= $characters[random_int(0, strlen($characters) - 1)];
    }
    
    return $code;
}

function generateUuid() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
