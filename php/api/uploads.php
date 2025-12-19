<?php
/**
 * File uploads API endpoints
 */

function handleUploadsRequest($method, $parts, $body, $auth, $db) {
    $uploadId = $parts[1] ?? null;
    
    switch ($method) {
        case 'GET':
            if ($uploadId === 'download') {
                // Download file: /api/uploads/download/:id
                $fileId = $parts[2] ?? '';
                handleDownload($fileId, $db);
            } elseif ($uploadId) {
                // Get specific upload info
                $upload = $db->fetchOne(
                    "SELECT * FROM uploads WHERE id = ?",
                    [$uploadId],
                    's'
                );
                
                if (!$upload) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Upload not found']);
                    return;
                }
                
                // Check if expired
                if (strtotime($upload['expires_at']) < time()) {
                    http_response_code(410);
                    echo json_encode(['error' => 'Upload expired']);
                    return;
                }
                
                echo json_encode($upload);
            } else {
                // List uploads
                $auth->requireAuth();
                $user = $auth->getCurrentUser();
                
                $uploads = $db->fetchAll(
                    "SELECT * FROM uploads WHERE created_by = ? AND expires_at > NOW() ORDER BY created_at DESC",
                    [$user['id']],
                    's'
                );
                
                echo json_encode($uploads);
            }
            break;
            
        case 'POST':
            // Upload file
            try {
                if (empty($_FILES['file'])) {
                    throw new Exception('No file uploaded');
                }
                
                $file = $_FILES['file'];
                
                if ($file['error'] !== UPLOAD_ERR_OK) {
                    throw new Exception('File upload error: ' . $file['error']);
                }
                
                if ($file['size'] > MAX_UPLOAD_SIZE) {
                    throw new Exception('File too large. Maximum size: ' . (MAX_UPLOAD_SIZE / 1024 / 1024) . 'MB');
                }
                
                // Get user if authenticated
                $userId = null;
                if ($auth->isAuthenticated()) {
                    $user = $auth->getCurrentUser();
                    $userId = $user['id'];
                }
                
                // Generate unique filename
                $id = generateUuid();
                $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
                $filename = $id . '.' . $extension;
                $uploadDir = __DIR__ . '/../../tmp_uploads/';
                
                if (!file_exists($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }
                
                $filepath = $uploadDir . $filename;
                
                if (!move_uploaded_file($file['tmp_name'], $filepath)) {
                    throw new Exception('Failed to save file');
                }
                
                // Calculate expiry (15 minutes from now)
                $expiresAt = date('Y-m-d H:i:s', time() + UPLOAD_TTL);
                
                // Save to database
                $db->query(
                    "INSERT INTO uploads (id, filename, original_name, size, mime_type, created_by, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [$id, $filename, $file['name'], $file['size'], $file['type'], $userId, $expiresAt],
                    'sssisis'
                );
                
                $upload = $db->fetchOne(
                    "SELECT * FROM uploads WHERE id = ?",
                    [$id],
                    's'
                );
                
                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'upload' => $upload,
                    'url' => '/api/uploads/download/' . $id
                ]);
            } catch (Exception $e) {
                http_response_code(400);
                echo json_encode(['error' => $e->getMessage()]);
            }
            break;
            
        case 'DELETE':
            if (!$uploadId) {
                http_response_code(400);
                echo json_encode(['error' => 'Upload ID required']);
                return;
            }
            
            $auth->requireAuth();
            $user = $auth->getCurrentUser();
            
            // Check ownership
            $upload = $db->fetchOne(
                "SELECT * FROM uploads WHERE id = ?",
                [$uploadId],
                's'
            );
            
            if (!$upload) {
                http_response_code(404);
                echo json_encode(['error' => 'Upload not found']);
                return;
            }
            
            if ($upload['created_by'] !== $user['id'] && $user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(['error' => 'Forbidden']);
                return;
            }
            
            // Delete file
            $filepath = __DIR__ . '/../../tmp_uploads/' . $upload['filename'];
            if (file_exists($filepath)) {
                unlink($filepath);
            }
            
            // Delete from database
            $db->delete('uploads', 'id = ?', [$uploadId], 's');
            
            echo json_encode(['success' => true]);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
}

function handleDownload($fileId, $db) {
    if (empty($fileId)) {
        http_response_code(400);
        echo json_encode(['error' => 'File ID required']);
        return;
    }
    
    $upload = $db->getConnection()->query(
        "SELECT * FROM uploads WHERE id = '" . $db->escapeString($fileId) . "'"
    )->fetch_assoc();
    
    if (!$upload) {
        http_response_code(404);
        echo json_encode(['error' => 'File not found']);
        return;
    }
    
    // Check expiry
    if (strtotime($upload['expires_at']) < time()) {
        http_response_code(410);
        echo json_encode(['error' => 'File expired']);
        return;
    }
    
    $filepath = __DIR__ . '/../../tmp_uploads/' . $upload['filename'];
    
    if (!file_exists($filepath)) {
        http_response_code(404);
        echo json_encode(['error' => 'File not found on disk']);
        return;
    }
    
    // Send file
    header('Content-Type: ' . $upload['mime_type']);
    header('Content-Disposition: attachment; filename="' . $upload['original_name'] . '"');
    header('Content-Length: ' . filesize($filepath));
    readfile($filepath);
    exit;
}

function generateUuid() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
