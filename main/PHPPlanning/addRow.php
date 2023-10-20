<?php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
ini_set('display_errors', '0');
ini_set('log_errors', '1');
header('Content-Type: application/json; charset=utf-8');

function logError($message, $data = null) {
    error_log($message . ': ' . json_encode($data));
}

function jsonResponse($status, $data = []) {
    echo json_encode(array_merge(['status' => $status], $data));
    exit();
}

function validateSession($userID, $planningID) {
    if (!isset($userID) || !isset($planningID)) {
        throw new Exception('Session variables not set');
    }
}

function handleAddNewRow($conn, $userID, $planningID, $role) {
    global $response;
    if ($role == 'Admin') {
        throw new Exception('Only CDP can add new rows');
    }
    $conn->begin_transaction();
    $stmt = $conn->prepare("INSERT INTO globalplanning (UserID, PlanningID) VALUES (?, ?)");
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }

    $stmt->bind_param("ii", $userID, $planningID);
    $execute_success = $stmt->execute();
    
    if (!$execute_success) {
        $conn->rollback();
        throw new Exception("Execute failed: " . $stmt->error);
    }

    $newRowID = $conn->insert_id;

    if (!$conn->commit()) {
        $conn->rollback();
        throw new Exception('Transaction commit failed');
    }
    $stmt->close();
    jsonResponse('success', ['newRowID' => $newRowID, 'UserID' => $userID, 'PlanningID' => $planningID]);
}

try {
    require 'conf/confsql.php';
    $userID = $_SESSION['UserID'];
    $planningID = $_SESSION['PlanningID'];
    $role = $_SESSION['Role'];
    validateSession($userID, $planningID);
    $inputData = json_decode(file_get_contents("php://input"), true);
    $action = isset($inputData['action']) ? $inputData['action'] : '';

    switch ($action) {
        case 'addNewRow':
            handleAddNewRow($conn, $userID, $planningID, $role);
            break;
        default:
            throw new Exception('Invalid action');
    }

} catch (Exception $e) {
    jsonResponse('error', ['message' => $e->getMessage()]);
} finally {
    if ($conn) {
        $conn->close();
    }
}
?>
