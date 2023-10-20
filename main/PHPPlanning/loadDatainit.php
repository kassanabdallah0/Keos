<?php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
ini_set('display_errors', '0');
ini_set('log_errors', '1');
header('Content-Type: application/json; charset=utf-8');

$response = ['status' => 'success', 'message' => '', 'action' => '', 'data' => ''];


function loadData($conn, $user_id, $planning_id, $role) {
    global $response;

    // Validate inputs
    if (empty($user_id) || empty($planning_id) || empty($role)) {
        setResponse('error', 'Invalid user_id or planning_id');
        return;
    }

    // Initialize the SQL query and parameters based on role
    $sql = ($role == 'CDP') 
        ? "SELECT * FROM globalplanning WHERE UserID = ? AND PlanningID = ?" 
        : "SELECT * FROM globalplanning WHERE globalplanning.ADMIN = 'CA_KEOS' ";

    $params = ($role == 'CDP') ? array($user_id, $planning_id) : array();

    // Execute query and fetch results
    try {
        $stmt = $conn->prepare($sql);

        if ($role == 'CDP') {
            $stmt->bindParam(1, $user_id, PDO::PARAM_INT);
            $stmt->bindParam(2, $planning_id, PDO::PARAM_INT);
        }

        $stmt->execute($params);
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Check if query executed successfully
        if ($stmt->errorCode() != '00000') {
            setResponse('error', 'Query failed with error code: ' . $stmt->errorCode());
            return;
        }

        // Populate response based on result
        if ($result) {
            setResponse('success', 'Data loaded successfully', $result);
        } else {
            setResponse('error', 'Data loading failed: No data found');
        }
    } catch (PDOException $e) {
        setResponse('error', 'Data loading failed: ' . $e->getMessage());
    } catch (Exception $e) {
        setResponse('error', 'An unexpected error occurred: ' . $e->getMessage());
    }
}

// Utility function to set the response
function setResponse($status, $message, $data = null) {
    global $response;
    $response['status'] = $status;
    $response['message'] = $message;
    if ($data !== null) {
        $response['data'] = $data;
    }
}


// load session variables from php session 
function loadSession() {
    $user_id = null;
    $planning_id = null;
    if (isset($_SESSION['UserID'])) {
        $user_id = $_SESSION['UserID'];
    } else {
        error_log("user_id not set in session");
    }
    if (isset($_SESSION['PlanningID'])) {
        $planning_id = $_SESSION['PlanningID'];
    } else {
        error_log("planning_id not set in session");
    }
    // NOW FOR role 
    if (isset($_SESSION['Role'])) {
        $role = $_SESSION['Role'];
    } else {
        error_log("role not set in session");
    }
    return [$user_id, $planning_id, $role];
}

function handleAjaxRequest($conn) {
    global $response;
    list($user_id, $planning_id, $role) = loadSession();
    if (!isset($user_id)) {
        $response['status'] = 'error';
        $response['message'] = 'No user logged in';
        return;
    }
    $input = json_decode(file_get_contents("php://input"), true);
    if (!isset($input['action'])) {
        $response['status'] = 'error';
        $response['message'] = 'No action specified';
        return;
    }
    $action = $input['action'];
    try {
        if ($action === 'loadInitialData') {
            loadData($conn, $user_id, $planning_id, $role);
            $response['action'] = $action;
        } else {
            $response['status'] = 'error';
            $response['message'] = 'Unknown action: ' . $action;
        }
    } catch (Exception $e) {
        $response['status'] = 'error';
        $response['message'] = 'Unknown error: ' . $e->getMessage();
    }
}

try {
    require 'conf/confpdo.php';
    handleAjaxRequest($conn);
} catch (Exception $e) {
    $response['status'] = 'error';
    $response['message'] = 'Unknown error: ' . $e->getMessage();
}
echo json_encode($response);
?>