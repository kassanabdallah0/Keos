<?php
function connectDatabase($dbParams) {
    $conn = new mysqli($dbParams['servername'], $dbParams['username'], $dbParams['password'], $dbParams['dbname']);
    $conn->set_charset("utf8mb4");
    if ($conn->connect_error) {
        throw new Exception('Database connection failed');
    }
    return $conn;
}
require 'dbparams.php';
$conn = connectDatabase($dbParams);
$conn->set_charset("utf8mb4");
?>