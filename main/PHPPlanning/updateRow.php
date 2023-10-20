<?php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
ini_set('display_errors', '0');
ini_set('log_errors', '1');
header('Content-Type: application/json; charset=utf-8');

$response = ['status' => 'success', 'message' => '', 'action' => '', 'row' => '', 'column' => '', 'value' => ''];
$allowedColumns = json_decode('["PlanningID", "UserID", "rowID", "UO", "G2R", "Nom Du Site", "Hostname", "Priorité", "Périmètre", "Typologie", "Prestation", "Type TP", "Description des tâches", "Nombre PE/Liens/ Cartes", "CDP SFR", "CDP KEOS", "Mois", "Semaine", "Date TP", "HO/HNO", "Heure TP", "Créneau IP", "Odéon IP", "Odéon DCN", "Odéon WDM", "ADMIN", "Nom de l admin", "STIT", "Nbr intervenants", "Nbr sites distants", "Intervenant Terrain", "Site distant 1", "Odeon 1", "Site distant 2", "Odeon 2", "Site distant 3", "Odeon 3", "Site distant 4", "Odeon 4", "Site distant 5", "Odeon 5", "Site distant 6", "Odeon 6","Objet FDR", "FDR envoyée", "Statut TP", "Commentaires de IMES", "Responsable echec", "Problème", "Causes Echecs", "Livraison CR", "Cloture AP Axis MES", "Statut MEP", "Date de MEP", "Commentaires MEP", "Responsable echec (MEP)", "Problème MEP", "Causes Echecs (MEP)", "Dépose CR MEP sur Axis", "Clôture AP Axis MEP", "Statut Attachement STIT", "Date Attachement STIT", "Statut PV SFR", "Date PV SFR"]');

function handleException($e, $response) {
    http_response_code(500);
    $response['status'] = 'error';
    $response['message'] = $e->getMessage();
    return $response;
}

function updateRow($conn, $userID, $planningID, $rowID, $columnID, $value, $role) {
    global $response, $allowedColumns;

    // Validate column ID
    $columnID = $conn->real_escape_string($columnID);
    if (!in_array($columnID, $allowedColumns, false)) {
        throw new Exception("Invalid column ID: " . $columnID);
    }

    $conn->begin_transaction();

    if ($role == 'CDP') {
        $stmt = $conn->prepare("UPDATE globalplanning SET `$columnID` = ? WHERE UserID = ? AND PlanningID = ? AND RowID = ?");
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        $stmt->bind_param("siii", $value, $userID, $planningID, $rowID);
    } else {
        $stmt = $conn->prepare("UPDATE globalplanning SET `$columnID` = ? WHERE RowID = ?");
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        $stmt->bind_param("si", $value, $rowID);
    }

    $execute_success = $stmt->execute();
    if (!$execute_success) {
        throw new Exception("Execute failed: " . $stmt->error);
    }

    try {
        $conn->commit();
        $response['action'] = 'update';
        $response['row'] = $rowID;
        $response['column'] = $columnID;
        $response['value'] = $value;
        $response['status'] = 'success';
    } catch (Exception $e) {
        $conn->rollback();
        $response['status'] = 'error';
        $response['message'] = 'Transaction commit failed';
    }

    $stmt->close();
}
 function handleAjaxRequest($conn, $userID, $planningID, $role) {
    global $response;
    try {
        $rawInput = file_get_contents("php://input");
        $inputData = json_decode($rawInput, true);
    } catch (Exception $e) {
        $response['status'] = 'error';
        $response['message'] = 'Invalid input data 1';
        return ;
    }
    if (!isset($inputData['action']) || !isset($inputData['row']) || !isset($inputData['column'])) {
        $response['status'] = 'error';
        $response['message'] = 'Invalid input data 2';
        if (!isset($inputData['action'])) {
            $response['message'] .= ' action';
        }
        elseif (!isset($inputData['column'])) {
            $response['message'] .= ' column';
        }
        elseif (!isset($inputData['row'])) {
            $response['message'] = $inputData;
        }
        return ;
    }

    $action = $inputData['action'];
    $rowID = $inputData['row'];
    $columnID = $inputData['column'];
    $value = $inputData['value'];

    if ($action === 'updateRow') {
        updateRow($conn, $userID, $planningID, $rowID, $columnID, $value, $role);
        return ;
    } else {
        throw new Exception('Invalid action');
    }
}

// Main
try {
    require 'conf/confsql.php';
    $userID = $_SESSION['UserID'];
    $planningID = $_SESSION['PlanningID'];
    $role = $_SESSION['Role'];
    if (!isset($userID) || !isset($planningID) || !isset($role)) {
        throw new Exception('Session variables not set');
    }
    handleAjaxRequest($conn, $userID, $planningID, $role);
} catch (Exception $e) {
    $response = handleException($e, $response);
} finally {
    echo json_encode($response);  // Move this line here to ensure a single response
    if (isset($conn)) { // Check if $conn is set before closing
        $conn->close();
    }
}
?>