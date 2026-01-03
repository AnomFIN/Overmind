<?php
/**
 * Authentication and session management
 */

class Auth {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Start secure session
     */
    public function startSession() {
        if (session_status() === PHP_SESSION_NONE) {
            ini_set('session.cookie_httponly', 1);
            ini_set('session.cookie_secure', isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on');
            ini_set('session.cookie_samesite', 'Lax');
            session_start();
        }
    }
    
    /**
     * Register new user
     */
    public function register($username, $email, $password, $role = 'user') {
        // Validate input
        if (empty($username) || empty($email) || empty($password)) {
            throw new Exception('All fields are required');
        }
        
        if (strlen($username) < 3 || strlen($username) > 50) {
            throw new Exception('Username must be 3-50 characters');
        }
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email address');
        }
        
        if (strlen($password) < 6) {
            throw new Exception('Password must be at least 6 characters');
        }
        
        // Check if username or email exists
        $existing = $this->db->fetchOne(
            "SELECT id FROM users WHERE username = ? OR email = ?",
            [$username, $email],
            'ss'
        );
        
        if ($existing) {
            throw new Exception('Username or email already exists');
        }
        
        // Hash password
        $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        
        // Create user
        $userId = $this->generateUuid();
        
        $this->db->query(
            "INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)",
            [$userId, $username, $email, $passwordHash, $role],
            'sssss'
        );
        
        return [
            'id' => $userId,
            'username' => $username,
            'email' => $email,
            'role' => $role
        ];
    }
    
    /**
     * Login user
     */
    public function login($usernameOrEmail, $password) {
        // Find user by username or email
        $user = $this->db->fetchOne(
            "SELECT * FROM users WHERE username = ? OR email = ?",
            [$usernameOrEmail, $usernameOrEmail],
            'ss'
        );
        
        if (!$user) {
            throw new Exception('Invalid credentials');
        }
        
        // Verify password
        if (!password_verify($password, $user['password'])) {
            throw new Exception('Invalid credentials');
        }
        
        // Create session
        $sessionId = $this->generateUuid();
        $expiresAt = time() + SESSION_LIFETIME;
        
        $this->db->query(
            "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
            [$sessionId, $user['id'], $expiresAt],
            'ssi'
        );
        
        // Start session and store data
        $this->startSession();
        $_SESSION['session_id'] = $sessionId;
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        
        // Set cookie
        setcookie('session_id', $sessionId, [
            'expires' => $expiresAt,
            'path' => '/',
            'httponly' => true,
            'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
            'samesite' => 'Lax'
        ]);
        
        return [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'role' => $user['role']
        ];
    }
    
    /**
     * Check if user is authenticated
     */
    public function isAuthenticated() {
        $this->startSession();
        
        if (empty($_SESSION['session_id'])) {
            return false;
        }
        
        $sessionId = $_SESSION['session_id'];
        
        // Check session in database
        $session = $this->db->fetchOne(
            "SELECT s.*, u.username, u.email, u.role 
             FROM sessions s 
             JOIN users u ON s.user_id = u.id 
             WHERE s.id = ? AND s.expires_at > ?",
            [$sessionId, time()],
            'si'
        );
        
        if (!$session) {
            $this->logout();
            return false;
        }
        
        return true;
    }
    
    /**
     * Get current user
     */
    public function getCurrentUser() {
        $this->startSession();
        
        if (empty($_SESSION['session_id'])) {
            return null;
        }
        
        $sessionId = $_SESSION['session_id'];
        
        $session = $this->db->fetchOne(
            "SELECT s.*, u.id as user_id, u.username, u.email, u.role 
             FROM sessions s 
             JOIN users u ON s.user_id = u.id 
             WHERE s.id = ? AND s.expires_at > ?",
            [$sessionId, time()],
            'si'
        );
        
        if (!$session) {
            return null;
        }
        
        return [
            'id' => $session['user_id'],
            'username' => $session['username'],
            'email' => $session['email'],
            'role' => $session['role']
        ];
    }
    
    /**
     * Logout user
     */
    public function logout() {
        $this->startSession();
        
        if (!empty($_SESSION['session_id'])) {
            // Delete session from database
            $this->db->delete('sessions', 'id = ?', [$_SESSION['session_id']], 's');
        }
        
        // Clear session
        session_destroy();
        
        // Clear cookie
        setcookie('session_id', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'httponly' => true,
            'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
            'samesite' => 'Lax'
        ]);
        
        return true;
    }
    
    /**
     * Require authentication
     */
    public function requireAuth() {
        if (!$this->isAuthenticated()) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
    }
    
    /**
     * Require admin role
     */
    public function requireAdmin() {
        $this->requireAuth();
        $user = $this->getCurrentUser();
        
        if ($user['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden - Admin access required']);
            exit;
        }
    }
    
    /**
     * Clean up expired sessions
     */
    public function cleanupSessions() {
        $this->db->delete('sessions', 'expires_at < ?', [time()], 'i');
    }
    
    /**
     * Generate UUID v4
     */
    private function generateUuid() {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
