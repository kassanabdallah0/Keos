<?php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
ini_set('display_errors', '0');
ini_set('log_errors', '1');
header('Content-Type: application/json; charset=utf-8');

$response = ['status' => 'success', 'message' => '', 'action' => '', 'data' => []];

function handleException($e, $response) {
    http_response_code(500);
    $response['status'] = 'error';
    $response['message'] = $e->getMessage();
    file_put_contents("error_log.txt", $e->ghandleAjaxRequestetMessage() . "\n", FILE_APPEND);  // Exception logging
    return $response;
}

$planningID = $_SESSION['PlanningID'];
$userID = $_SESSION['UserID'];
$allowedColumns = json_decode('["PlanningID", "UserID", "rowID", "UO", "G2R", "Nom Du Site", "Hostname", "Priorité", "Périmètre", "Typologie", "Prestation", "Type TP", "Description des tâches", "Nombre PE/Liens/ Cartes", "CDP SFR", "CDP KEOS", "Mois", "Semaine", "Date TP", "HO/HNO", "Heure TP", "Créneau IP", "Odéon IP", "Odéon DCN", "Odéon WDM", "ADMIN", "Nom de l admin", "STIT", "Nbr intervenants", "Nbr sites distants", "Intervenant Terrain", "Site distant 1", "Odeon 1", "Site distant 2", "Odeon 2", "Site distant 3", "Odeon 3", "Site distant 4", "Odeon 4", "Site distant 5", "Odeon 5", "Site distant 6", "Odeon 6","Objet FDR", "FDR envoyée", "Statut TP", "Commentaires de IMES", "Responsable echec", "Problème", "Causes Echecs", "Livraison CR", "Cloture AP Axis MES", "Statut MEP", "Date de MEP", "Commentaires MEP", "Responsable echec (MEP)", "Problème MEP", "Causes Echecs (MEP)", "Dépose CR MEP sur Axis", "Clôture AP Axis MEP", "Statut Attachement STIT", "Date Attachement STIT", "Statut PV SFR", "Date PV SFR"]');

// function importing stringfied sheetData to database intialy it was array of array each sub array is a row in the sheet 
function importData($conn, $userID, $planningID, $sheetData) {
    global $response, $allowedColumns;
    $newRowsInfo = [];  // Array to hold the new row info
    
    $conn->begin_transaction();
    for ($i = 0; $i < count($sheetData); $i++) {
        $row = $sheetData[$i];
        $stmt = $conn->prepare("INSERT INTO globalplanning (UserID, PlanningID) VALUES (?, ?)");
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        $stmt->bind_param("ii", $userID, $planningID);
        $execute_success = $stmt->execute();
        if (!$execute_success) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        $newRowID = $conn->insert_id;
        $stmt->close();
        
        // Store the new row information
        $newRowsInfo[] = [
            'rowID' => $newRowID,
            'planningID' => $planningID,
            'userID' => $userID
        ];
        for ($j = 3; $j < count($row); $j++) {
            $colValue = $row[$j];
            $colName = $allowedColumns[$j];  // Map index to column name
            
            // Check if the column name is allowed
            if (!in_array($colName, $allowedColumns)) {
                throw new Exception("Invalid column name: " . $colName);
            }
            
            // Generate SQL query string with the column name directly inserted (assuming it is safe)
            $sql = "UPDATE globalplanning SET `$colName` = ? WHERE UserID = ? AND PlanningID = ? AND RowID = ?";
            $stmtUpdate = $conn->prepare($sql);
            if (!$stmtUpdate) {
                throw new Exception("Prepare statement failed for update: " . $conn->error);
            }

            $stmtUpdate->bind_param("siii", $colValue, $userID, $planningID, $newRowID);
            $execute_success = $stmtUpdate->execute();
            if (!$execute_success) {
                throw new Exception("Execute failed for update: " . $stmtUpdate->error);
            }
            $stmtUpdate->close();
        }
    }
    $conn->commit();
    $response['data']['newRowsInfo'] = $newRowsInfo;
}

function handleAjaxRequest($conn, $userID, $planningID) {
    global $response;
    try {
        $rawInput = file_get_contents("php://input");
        $inputData = json_decode($rawInput, true);
    } catch (Exception $e) {
        $response['status'] = 'error';
        $response['message'] = 'Invalid input data 1';
        return;
    }
    $action = isset($inputData['action']) ? $inputData['action'] : '';
    if ($action === 'importData') {
        try {
            importData($conn, $userID, $planningID, $inputData['sheetData']);
        } catch (Exception $e) {
            $response = handleException($e, $response);
            return;
        }
    } else {
        $response['status'] = 'error';
        $response['message'] = 'Invalid action';
        return;
    }
}

try {
    require 'conf/confsql.php';
    $userID = $_SESSION['UserID'];
    $planningID = $_SESSION['PlanningID'];
    if (!isset($userID) || !isset($planningID)) {
        error_log("Session variables not set");
        header("Location: LoginPage.html");
        throw new Exception('Session variables not set');
    }
    handleAjaxRequest($conn, $userID, $planningID);
} catch (Exception $e) {
    $response = handleException($e, $response);
} finally {
    echo json_encode($response);
}
