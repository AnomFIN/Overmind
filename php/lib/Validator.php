<?php
/**
 * Input validation and sanitization helpers
 */

class Validator {
    /**
     * Sanitize string input
     */
    public static function sanitizeString($input) {
        if ($input === null) {
            return '';
        }
        return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
    }
    
    /**
     * Sanitize email
     */
    public static function sanitizeEmail($email) {
        return filter_var(trim($email), FILTER_SANITIZE_EMAIL);
    }
    
    /**
     * Validate email
     */
    public static function isValidEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    /**
     * Validate URL
     */
    public static function isValidUrl($url) {
        return filter_var($url, FILTER_VALIDATE_URL) !== false;
    }
    
    /**
     * Sanitize integer
     */
    public static function sanitizeInt($input) {
        return filter_var($input, FILTER_SANITIZE_NUMBER_INT);
    }
    
    /**
     * Validate integer
     */
    public static function isInt($input) {
        return filter_var($input, FILTER_VALIDATE_INT) !== false;
    }
    
    /**
     * Validate float
     */
    public static function isFloat($input) {
        return filter_var($input, FILTER_VALIDATE_FLOAT) !== false;
    }
    
    /**
     * Validate string length
     */
    public static function validateLength($string, $min, $max) {
        $len = mb_strlen($string);
        return $len >= $min && $len <= $max;
    }
    
    /**
     * Validate username (alphanumeric, underscore, hyphen)
     */
    public static function isValidUsername($username) {
        return preg_match('/^[a-zA-Z0-9_-]{3,50}$/', $username) === 1;
    }
    
    /**
     * Validate UUID
     */
    public static function isValidUuid($uuid) {
        return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $uuid) === 1;
    }
    
    /**
     * Sanitize filename
     */
    public static function sanitizeFilename($filename) {
        // Remove any path components
        $filename = basename($filename);
        
        // Remove any characters that aren't alphanumeric, underscore, hyphen, or dot
        $filename = preg_replace('/[^a-zA-Z0-9_.-]/', '_', $filename);
        
        // Limit length
        if (strlen($filename) > 255) {
            $filename = substr($filename, 0, 255);
        }
        
        return $filename;
    }
    
    /**
     * Check if file extension is allowed
     */
    public static function isAllowedFileExtension($filename, $allowedExtensions = []) {
        if (empty($allowedExtensions)) {
            // Default allowed extensions for uploads
            $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar'];
        }
        
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        return in_array($extension, $allowedExtensions);
    }
    
    /**
     * Validate required fields
     */
    public static function requireFields($data, $fields) {
        $missing = [];
        
        foreach ($fields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missing[] = $field;
            }
        }
        
        if (!empty($missing)) {
            throw new Exception('Missing required fields: ' . implode(', ', $missing));
        }
    }
    
    /**
     * Sanitize SQL LIKE pattern
     */
    public static function sanitizeLikePattern($pattern) {
        // Escape special LIKE characters
        $pattern = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $pattern);
        return $pattern;
    }
    
    /**
     * Generate secure random token
     * @param int $length Number of random bytes (token will be double this length in hex characters)
     */
    public static function generateToken($length = 16) {
        return bin2hex(random_bytes($length));
    }
    
    /**
     * Rate limiting check (simple implementation)
     */
    public static function checkRateLimit($key, $maxAttempts = 5, $timeWindow = 300) {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        $now = time();
        $rateLimitKey = 'rate_limit_' . $key;
        
        if (!isset($_SESSION[$rateLimitKey])) {
            $_SESSION[$rateLimitKey] = [
                'attempts' => 1,
                'first_attempt' => $now
            ];
            return true;
        }
        
        $data = $_SESSION[$rateLimitKey];
        
        // Reset if time window has passed
        if ($now - $data['first_attempt'] > $timeWindow) {
            $_SESSION[$rateLimitKey] = [
                'attempts' => 1,
                'first_attempt' => $now
            ];
            return true;
        }
        
        // Check if limit exceeded
        if ($data['attempts'] >= $maxAttempts) {
            throw new Exception('Rate limit exceeded. Please try again later.');
        }
        
        // Increment attempts
        $_SESSION[$rateLimitKey]['attempts']++;
        return true;
    }
}
