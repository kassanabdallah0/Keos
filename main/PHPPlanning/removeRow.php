<?php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
ini_set('display_errors', '0');
ini_set('log_errors', '1');
if (session_status() !== PHP_SESSION_ACTIVE) {
    respondWithError("Session is not active.");
    exit();
}

header('Content-Type: application/json; charset=utf-8');



function removeRow($conn, $table_name, $row_id, $user_id, $planning_id) {
    try {
        $stmt = $conn->prepare("DELETE FROM $table_name WHERE RowID = :row_id AND UserID = :user_id AND PlanningID = :planning_id");
        $stmt->bindParam(':row_id', $row_id, PDO::PARAM_INT);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->bindParam(':planning_id', $planning_id, PDO::PARAM_INT);

        $stmt->execute();

        if ($stmt->rowCount() === 0) {
            return ['status' => 'error', 'message' => 'No row deleted', 'action' => 'removeRow', 'row' => $row_id];
        }

        return ['status' => 'success', 'message' => 'Row removed', 'action' => 'removeRow', 'row' => $row_id];
    } catch (PDOException $e) {
        return ['status' => 'error', 'message' => "Database Error: " . $e->getMessage(), 'action' => 'removeRow', 'row' => $row_id];
    }
}


function respondWithError($message) {
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

function handleAjaxRequest($conn) {
    $request = json_decode(file_get_contents("php://input"), true);
    if (!isset($_SESSION['UserID']) || !isset($_SESSION['PlanningID'])) {
        respondWithError("Session expired");
        return;
    }

    try {
        $response = removeRow($conn, 'globalplanning', $request['row'], $_SESSION['UserID'], $_SESSION['PlanningID']);
        echo json_encode($response);
    } catch (Exception $e) {
        respondWithError("Database Error: " . $e->getMessage());
    }
}

try {
    require 'conf/confpdo.php';
    handleAjaxRequest($conn);
} catch (Exception $e) {
    respondWithError($e->getMessage());
}
?>
