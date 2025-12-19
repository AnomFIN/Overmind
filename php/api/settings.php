<?php
/**
 * Settings API endpoints
 */

function handleSettingsRequest($method, $parts, $body, $auth, $db) {
    $auth->requireAdmin();
    
    $key = $parts[1] ?? null;
    
    switch ($method) {
        case 'GET':
            if ($key) {
                // Get specific setting
                $setting = $db->fetchOne(
                    "SELECT * FROM app_config WHERE config_key = ?",
                    [$key],
                    's'
                );
                
                if (!$setting) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Setting not found']);
                    return;
                }
                
                echo json_encode($setting);
            } else {
                // Get all settings
                $settings = $db->fetchAll(
                    "SELECT * FROM app_config ORDER BY config_key"
                );
                
                // Convert to key-value object
                $result = [];
                foreach ($settings as $setting) {
                    $result[$setting['config_key']] = $setting['config_value'];
                }
                
                echo json_encode($result);
            }
            break;
            
        case 'POST':
        case 'PUT':
            try {
                if ($key) {
                    // Update specific setting
                    $value = $body['value'] ?? '';
                    
                    $db->query(
                        "INSERT INTO app_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?",
                        [$key, $value, $value],
                        'sss'
                    );
                    
                    echo json_encode([
                        'config_key' => $key,
                        'config_value' => $value
                    ]);
                } else {
                    // Batch update settings
                    foreach ($body as $settingKey => $settingValue) {
                        $db->query(
                            "INSERT INTO app_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?",
                            [$settingKey, $settingValue, $settingValue],
                            'sss'
                        );
                    }
                    
                    echo json_encode(['success' => true]);
                }
            } catch (Exception $e) {
                http_response_code(400);
                echo json_encode(['error' => $e->getMessage()]);
            }
            break;
            
        case 'DELETE':
            if (!$key) {
                http_response_code(400);
                echo json_encode(['error' => 'Setting key required']);
                return;
            }
            
            $db->delete('app_config', 'config_key = ?', [$key], 's');
            
            echo json_encode(['success' => true]);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
}
