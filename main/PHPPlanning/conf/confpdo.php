<?php
function connectDatabase($dbParams) {
    try {
        $dsn = "mysql:host={$dbParams['servername']};dbname={$dbParams['dbname']};charset=utf8mb4";
        $conn = new PDO($dsn, $dbParams['username'], $dbParams['password']);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $conn;
    } catch (PDOException $e) {
        throw new Exception('Database connection failed: ' . json_encode($e->getMessage(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK));
    }
}
require 'dbparams.php';
$conn = connectDatabase($dbParams);
?>
