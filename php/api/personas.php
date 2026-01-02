<?php
/**
 * Personas API endpoints
 */

function handlePersonasRequest($method, $parts, $body, $auth, $db) {
    $auth->requireAuth();
    $user = $auth->getCurrentUser();
    
    $personaId = $parts[1] ?? null;
    
    switch ($method) {
        case 'GET':
            if ($personaId) {
                // Get specific persona
                $persona = $db->fetchOne(
                    "SELECT * FROM personas WHERE id = ?",
                    [$personaId],
                    's'
                );
                
                if (!$persona) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Persona not found']);
                    return;
                }
                
                // Convert is_default to boolean
                $persona['is_default'] = (bool)$persona['is_default'];
                
                echo json_encode($persona);
            } else {
                // Get all personas
                $personas = $db->fetchAll(
                    "SELECT * FROM personas ORDER BY is_default DESC, name ASC"
                );
                
                // Convert is_default to boolean
                foreach ($personas as &$persona) {
                    $persona['is_default'] = (bool)$persona['is_default'];
                }
                
                echo json_encode($personas);
            }
            break;
            
        case 'POST':
            // Only admins can create personas
            if ($user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(['error' => 'Admin access required']);
                return;
            }
            
            try {
                $name = $body['name'] ?? '';
                $systemPrompt = $body['system_prompt'] ?? '';
                $isDefault = isset($body['is_default']) ? (int)$body['is_default'] : 0;
                
                if (empty($name) || empty($systemPrompt)) {
                    throw new Exception('Name and system prompt are required');
                }
                
                // If setting as default, unset other defaults
                if ($isDefault) {
                    $db->query("UPDATE personas SET is_default = 0");
                }
                
                $id = generateUuid();
                
                $db->query(
                    "INSERT INTO personas (id, name, system_prompt, is_default) VALUES (?, ?, ?, ?)",
                    [$id, $name, $systemPrompt, $isDefault],
                    'sssi'
                );
                
                $persona = $db->fetchOne(
                    "SELECT * FROM personas WHERE id = ?",
                    [$id],
                    's'
                );
                
                $persona['is_default'] = (bool)$persona['is_default'];
                
                http_response_code(201);
                echo json_encode($persona);
            } catch (Exception $e) {
                http_response_code(400);
                echo json_encode(['error' => $e->getMessage()]);
            }
            break;
            
        case 'PUT':
            if (!$personaId) {
                http_response_code(400);
                echo json_encode(['error' => 'Persona ID required']);
                return;
            }
            
            // Only admins can update personas
            if ($user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(['error' => 'Admin access required']);
                return;
            }
            
            try {
                $updates = [];
                $params = [];
                $types = '';
                
                if (isset($body['name'])) {
                    $updates[] = 'name = ?';
                    $params[] = $body['name'];
                    $types .= 's';
                }
                
                if (isset($body['system_prompt'])) {
                    $updates[] = 'system_prompt = ?';
                    $params[] = $body['system_prompt'];
                    $types .= 's';
                }
                
                if (isset($body['is_default'])) {
                    $isDefault = (int)$body['is_default'];
                    
                    // If setting as default, unset other defaults
                    if ($isDefault) {
                        $db->query("UPDATE personas SET is_default = 0");
                    }
                    
                    $updates[] = 'is_default = ?';
                    $params[] = $isDefault;
                    $types .= 'i';
                }
                
                if (empty($updates)) {
                    throw new Exception('No updates provided');
                }
                
                $params[] = $personaId;
                $types .= 's';
                
                $sql = "UPDATE personas SET " . implode(', ', $updates) . " WHERE id = ?";
                $db->query($sql, $params, $types);
                
                $persona = $db->fetchOne(
                    "SELECT * FROM personas WHERE id = ?",
                    [$personaId],
                    's'
                );
                
                $persona['is_default'] = (bool)$persona['is_default'];
                
                echo json_encode($persona);
            } catch (Exception $e) {
                http_response_code(400);
                echo json_encode(['error' => $e->getMessage()]);
            }
            break;
            
        case 'DELETE':
            if (!$personaId) {
                http_response_code(400);
                echo json_encode(['error' => 'Persona ID required']);
                return;
            }
            
            // Only admins can delete personas
            if ($user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(['error' => 'Admin access required']);
                return;
            }
            
            // Prevent deleting default persona
            $persona = $db->fetchOne(
                "SELECT * FROM personas WHERE id = ?",
                [$personaId],
                's'
            );
            
            if ($persona && $persona['is_default']) {
                http_response_code(400);
                echo json_encode(['error' => 'Cannot delete default persona']);
                return;
            }
            
            $db->delete('personas', 'id = ?', [$personaId], 's');
            
            echo json_encode(['success' => true]);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
}

function generateUuid() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
