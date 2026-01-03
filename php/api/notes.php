<?php
/**
 * Notes/Mindmap API endpoints
 */

function handleNotesRequest($method, $parts, $body, $auth, $db) {
    $auth->requireAuth();
    $user = $auth->getCurrentUser();
    
    $resource = $parts[1] ?? 'nodes';
    $itemId = $parts[2] ?? null;
    
    if ($resource === 'nodes') {
        handleNodesRequest($method, $itemId, $body, $user, $db);
    } elseif ($resource === 'edges') {
        handleEdgesRequest($method, $itemId, $body, $user, $db);
    } else {
        // Default to nodes if no resource specified
        handleNodesRequest($method, $resource, $body, $user, $db);
    }
}

function handleNodesRequest($method, $nodeId, $body, $user, $db) {
    switch ($method) {
        case 'GET':
            if ($nodeId && $nodeId !== 'nodes') {
                // Get specific node
                $node = $db->fetchOne(
                    "SELECT * FROM mindmap_nodes WHERE id = ?",
                    [$nodeId],
                    's'
                );
                
                if (!$node) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Node not found']);
                    return;
                }
                
                echo json_encode($node);
            } else {
                // Get all nodes
                $nodes = $db->fetchAll(
                    "SELECT * FROM mindmap_nodes ORDER BY created_at DESC"
                );
                
                echo json_encode($nodes);
            }
            break;
            
        case 'POST':
            try {
                $title = $body['title'] ?? '';
                $content = $body['content'] ?? '';
                $x = $body['x'] ?? 0;
                $y = $body['y'] ?? 0;
                
                if (empty($title)) {
                    throw new Exception('Title is required');
                }
                
                $id = generateUuid();
                
                $db->query(
                    "INSERT INTO mindmap_nodes (id, title, content, x_position, y_position, created_by) VALUES (?, ?, ?, ?, ?, ?)",
                    [$id, $title, $content, $x, $y, $user['id']],
                    'sssdds'
                );
                
                $node = $db->fetchOne(
                    "SELECT * FROM mindmap_nodes WHERE id = ?",
                    [$id],
                    's'
                );
                
                http_response_code(201);
                echo json_encode($node);
            } catch (Exception $e) {
                http_response_code(400);
                echo json_encode(['error' => $e->getMessage()]);
            }
            break;
            
        case 'PUT':
            if (!$nodeId) {
                http_response_code(400);
                echo json_encode(['error' => 'Node ID required']);
                return;
            }
            
            try {
                $updates = [];
                $params = [];
                $types = '';
                
                if (isset($body['title'])) {
                    $updates[] = 'title = ?';
                    $params[] = $body['title'];
                    $types .= 's';
                }
                
                if (isset($body['content'])) {
                    $updates[] = 'content = ?';
                    $params[] = $body['content'];
                    $types .= 's';
                }
                
                if (isset($body['x'])) {
                    $updates[] = 'x_position = ?';
                    $params[] = $body['x'];
                    $types .= 'd';
                }
                
                if (isset($body['y'])) {
                    $updates[] = 'y_position = ?';
                    $params[] = $body['y'];
                    $types .= 'd';
                }
                
                if (empty($updates)) {
                    throw new Exception('No updates provided');
                }
                
                $params[] = $nodeId;
                $types .= 's';
                
                $sql = "UPDATE mindmap_nodes SET " . implode(', ', $updates) . " WHERE id = ?";
                $db->query($sql, $params, $types);
                
                $node = $db->fetchOne(
                    "SELECT * FROM mindmap_nodes WHERE id = ?",
                    [$nodeId],
                    's'
                );
                
                echo json_encode($node);
            } catch (Exception $e) {
                http_response_code(400);
                echo json_encode(['error' => $e->getMessage()]);
            }
            break;
            
        case 'DELETE':
            if (!$nodeId) {
                http_response_code(400);
                echo json_encode(['error' => 'Node ID required']);
                return;
            }
            
            // Delete node and its edges
            $db->delete('mindmap_edges', 'source_id = ? OR target_id = ?', [$nodeId, $nodeId], 'ss');
            $db->delete('mindmap_nodes', 'id = ?', [$nodeId], 's');
            
            echo json_encode(['success' => true]);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
}

function handleEdgesRequest($method, $edgeId, $body, $user, $db) {
    switch ($method) {
        case 'GET':
            if ($edgeId) {
                // Get specific edge
                $edge = $db->fetchOne(
                    "SELECT * FROM mindmap_edges WHERE id = ?",
                    [$edgeId],
                    's'
                );
                
                if (!$edge) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Edge not found']);
                    return;
                }
                
                echo json_encode($edge);
            } else {
                // Get all edges
                $edges = $db->fetchAll(
                    "SELECT * FROM mindmap_edges ORDER BY created_at DESC"
                );
                
                echo json_encode($edges);
            }
            break;
            
        case 'POST':
            try {
                $sourceId = $body['source_id'] ?? '';
                $targetId = $body['target_id'] ?? '';
                
                if (empty($sourceId) || empty($targetId)) {
                    throw new Exception('Source and target IDs are required');
                }
                
                $id = generateUuid();
                
                $db->query(
                    "INSERT INTO mindmap_edges (id, source_id, target_id) VALUES (?, ?, ?)",
                    [$id, $sourceId, $targetId],
                    'sss'
                );
                
                $edge = $db->fetchOne(
                    "SELECT * FROM mindmap_edges WHERE id = ?",
                    [$id],
                    's'
                );
                
                http_response_code(201);
                echo json_encode($edge);
            } catch (Exception $e) {
                http_response_code(400);
                echo json_encode(['error' => $e->getMessage()]);
            }
            break;
            
        case 'DELETE':
            if (!$edgeId) {
                http_response_code(400);
                echo json_encode(['error' => 'Edge ID required']);
                return;
            }
            
            $db->delete('mindmap_edges', 'id = ?', [$edgeId], 's');
            
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
