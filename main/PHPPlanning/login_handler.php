<?php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
$sessionTimeout = 1800;
ini_set('display_errors', '0');
ini_set('log_errors', '1');
// Handle session timeout
handleSessionTimeout();
header('Content-Type: application/json; charset=utf-8');
$response = [];
error_log("1");
require 'conf/confsql.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = htmlspecialchars($_POST['Username']);
    $enteredPassword = htmlspecialchars($_POST['Password']);

    if (empty($username) || empty($enteredPassword)) {
        respondWithError("Both fields are required");
    }
    $conn->begin_transaction();
    try {
        authenticateUser($conn, $username, $enteredPassword);
    } catch (Exception $e) {
        $conn->rollback();
        respondWithError("Database Error: " . $e->getMessage());
    }
}

function handleSessionTimeout() {
    global $sessionTimeout;
    if (isset($_SESSION['LAST_ACTIVITY']) && (time() - $_SESSION['LAST_ACTIVITY'] > $sessionTimeout)) {
        session_unset();
        session_destroy();
    }
    $_SESSION['LAST_ACTIVITY'] = time();
}

function authenticateUser($conn, $username, $password) {
    // Initialize variables
    $role = '';
    $fetchedUserID = null;
    $storedHash = '';
    $fetchedPlanningID = null;

    // Fetch common user information
    if (!fetchUserInfo($conn, $username, $role, $fetchedUserID, $storedHash)) {
        respondWithError("User not found");
        return;
    }

    // Verify password
    if (!password_verify($password, $storedHash)) {
        respondWithError("Authentication failed");
        return;
    }

    // Handle different roles
    if ($role === "CDP") {
        fetchCDPPlanningID($conn, $username, $fetchedUserID, $storedHash, $fetchedPlanningID);
    } else {
        $fetchedPlanningID = 1;
    }

    handleSuccessfulLogin($fetchedUserID, $fetchedPlanningID, $username, $role);

    // Close resources
    $conn->commit();
    $conn->close();
    session_write_close();
}

function fetchUserInfo($conn, $username, &$role, &$fetchedUserID, &$storedHash) {
    $stmt = $conn->prepare("SELECT uif.`Role`, uif.UserID, userlog.Password FROM userinfo uif JOIN userlog ON uif.UserID = userlog.Userid WHERE userlog.Username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $stmt->bind_result($role, $fetchedUserID, $storedHash);
    $result = $stmt->fetch();
    $stmt->close();
    return $result;
}

function fetchCDPPlanningID($conn, $username, &$fetchedUserID, &$storedHash, &$fetchedPlanningID) {
    $stmt = $conn->prepare("SELECT u.UserID, u.Password, p.PlanningID FROM userlog u LEFT JOIN planningaccess p ON u.UserID = p.UserID WHERE u.Username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $stmt->bind_result($fetchedUserID, $storedHash, $fetchedPlanningID);
    $stmt->fetch();
    $stmt->close();
}

function handleSuccessfulLogin($userID, $planningID, $username, $role) {
    global $response;

    $_SESSION['UserID'] = $userID;
    $_SESSION['PlanningID'] = $planningID;
    $_SESSION['Username'] = $username;
    $_SESSION['Role'] = $role;

    $response['UserID'] = $userID;
    $response['PlanningID'] = $planningID;
    $response['success'] = "Login successful";
    $response['redirect'] = "http://planningfix.keos-telecom.com/CDPplanning.html";
    echo json_encode($response);
}

function respondWithError($message) {
    global $response;
    $response['error'] = $message;
    echo json_encode($response);
    exit();
}
?>
