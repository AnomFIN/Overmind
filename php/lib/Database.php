<?php
/**
 * Database connection and query helper
 */

class Database {
    private static $instance = null;
    private $conn = null;
    
    private function __construct() {
        try {
            $this->conn = new mysqli(
                DB_HOST,
                DB_USER,
                DB_PASS,
                DB_NAME
            );
            
            if ($this->conn->connect_error) {
                throw new Exception("Database connection failed: " . $this->conn->connect_error);
            }
            
            $this->conn->set_charset(DB_CHARSET);
        } catch (Exception $e) {
            error_log("Database error: " . $e->getMessage());
            throw $e;
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->conn;
    }
    
    public function query($sql, $params = [], $types = '') {
        $stmt = $this->conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            throw new Exception("Query failed: " . $error);
        }
        
        return $stmt;
    }
    
    public function fetchAll($sql, $params = [], $types = '') {
        $stmt = $this->query($sql, $params, $types);
        $result = $stmt->get_result();
        $data = [];
        
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        
        $stmt->close();
        return $data;
    }
    
    public function fetchOne($sql, $params = [], $types = '') {
        $stmt = $this->query($sql, $params, $types);
        $result = $stmt->get_result();
        $data = $result->fetch_assoc();
        $stmt->close();
        return $data;
    }
    
    public function insert($table, $data) {
        $fields = array_keys($data);
        $values = array_values($data);
        $placeholders = implode(',', array_fill(0, count($values), '?'));
        
        $sql = "INSERT INTO $table (" . implode(',', $fields) . ") VALUES ($placeholders)";
        
        $types = '';
        foreach ($values as $value) {
            if (is_int($value)) {
                $types .= 'i';
            } elseif (is_float($value)) {
                $types .= 'd';
            } else {
                $types .= 's';
            }
        }
        
        $stmt = $this->query($sql, $values, $types);
        $insertId = $this->conn->insert_id;
        $stmt->close();
        
        return $insertId;
    }
    
    public function update($table, $data, $where, $whereParams = [], $whereTypes = '') {
        $sets = [];
        $values = [];
        $types = '';
        
        foreach ($data as $field => $value) {
            $sets[] = "$field = ?";
            $values[] = $value;
            
            if (is_int($value)) {
                $types .= 'i';
            } elseif (is_float($value)) {
                $types .= 'd';
            } else {
                $types .= 's';
            }
        }
        
        $sql = "UPDATE $table SET " . implode(', ', $sets) . " WHERE $where";
        
        $allParams = array_merge($values, $whereParams);
        $allTypes = $types . $whereTypes;
        
        $stmt = $this->query($sql, $allParams, $allTypes);
        $affectedRows = $this->conn->affected_rows;
        $stmt->close();
        
        return $affectedRows;
    }
    
    public function delete($table, $where, $whereParams = [], $whereTypes = '') {
        $sql = "DELETE FROM $table WHERE $where";
        $stmt = $this->query($sql, $whereParams, $whereTypes);
        $affectedRows = $this->conn->affected_rows;
        $stmt->close();
        
        return $affectedRows;
    }
    
    public function escapeString($string) {
        return $this->conn->real_escape_string($string);
    }
    
    public function __destruct() {
        if ($this->conn) {
            $this->conn->close();
        }
    }
}
