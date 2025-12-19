<?php
/**
 * Cleanup script for expired uploads
 * Run this via cron job every 15 minutes:
 * */15 * * * * php /path/to/your/website/php/cleanup.php
 */

// Load configuration
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
} else {
    die("Configuration file not found.\n");
}

// Load libraries
require_once __DIR__ . '/lib/Database.php';

try {
    $db = Database::getInstance();
    
    // Find expired uploads
    $expired = $db->fetchAll(
        "SELECT * FROM uploads WHERE expires_at < NOW()"
    );
    
    $deletedCount = 0;
    $errorCount = 0;
    
    foreach ($expired as $upload) {
        // Delete file from disk
        $filepath = __DIR__ . '/../tmp_uploads/' . $upload['filename'];
        
        if (file_exists($filepath)) {
            if (unlink($filepath)) {
                echo "Deleted file: " . $upload['filename'] . "\n";
            } else {
                echo "Error deleting file: " . $upload['filename'] . "\n";
                $errorCount++;
            }
        }
        
        // Delete from database
        $db->delete('uploads', 'id = ?', [$upload['id']], 's');
        $deletedCount++;
    }
    
    echo "Cleanup complete. Deleted $deletedCount expired uploads.\n";
    
    if ($errorCount > 0) {
        echo "Errors: $errorCount files could not be deleted.\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
