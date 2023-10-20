<?php

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header('Content-Type: application/json; charset=utf-8');



$response = ['status' => 'success', 'message' => '', 'action' => '', 'row' => '', 'column' => '', 'value' => ''];


function getSuggestions($conn, $column_names, $value_names, $excludeRowID) {
    
    $suggestions = initializeSuggestions($value_names);
    list($nonEmptyColumns, $nonEmptyValues) = identifyNonEmptyColumns($column_names, $value_names);
    $hasSuggestion = false;
    for ($i = 0; $i < count($value_names); $i++) {
        if (isEmptyValue($value_names[$i])) {
            $suggestion = findSuggestion(
                $conn, $i, $column_names, $nonEmptyColumns, $nonEmptyValues, $excludeRowID
            );
            $suggestions[$i] = $suggestion;
            if ($suggestion !== null) {
                $hasSuggestion = true;
            }
        }
    }
    return [$suggestions, $hasSuggestion];
}

function initializeSuggestions($value_names) {
    return array_map(function($value) {
        return isset($value) ? $value : "";
    }, $value_names);
}

function identifyNonEmptyColumns($column_names, $value_names) {
    $nonEmptyColumns = [];
    $nonEmptyValues = [];
    for ($i = 0; $i < count($value_names); $i++) {
        if (!isEmptyValue($value_names[$i])) {
            $nonEmptyColumns[] = $column_names[$i];
            $nonEmptyValues[] = $value_names[$i];
        }
    }
    return [$nonEmptyColumns, $nonEmptyValues];
}

function isEmptyValue($value) {
    return is_null($value) || $value === '';
}

function findSuggestion($conn, $i, $column_names, $nonEmptyColumns, $nonEmptyValues, $excludeRowID) {

    $found = false;
    $tempColumns = array_diff($nonEmptyColumns, ['rowID'], ['PlanningID'], ['UserID']); // Exclude rowID from matching criteria
    $tempValues = $nonEmptyValues;

    while (!$found && !empty($tempColumns)) {
        $whereClauses = ["rowID != :excludeRowID"];
        $params = [":excludeRowID" => $excludeRowID];

        foreach ($tempColumns as $index => $col) {
            $whereClauses[] = "`{$col}` = :value{$index}";
            $params[":value{$index}"] = $tempValues[$index];
        }

        $sql = "SELECT `{$column_names[$i]}` FROM globalplanning WHERE " . implode(' AND ', $whereClauses);

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($rows) {
            $randomIndex = array_rand($rows);
            $suggestion = $rows[$randomIndex][$column_names[$i]];
            return $suggestion;
        } else {
            array_pop($tempColumns);
            array_pop($tempValues);
        }
    }

    return "";
}

function handleAjaxRequest($conn) {
    global $response;

    // Session Validation
    validateSession();

    try {
        $inputData = getDecodedInput();
        validateInputData($inputData);

        $rowID = $inputData['rowID'];
        $rowData = $inputData['rowData'];
        
        // Assuming rowData is an associative array where keys are column names and values are their values
        if (!is_array($rowData)) {
            throw new Exception('Invalid input data');
        }

        $column_names = array_keys($rowData);
        $value_names = array_values($rowData);

        list($suggestions, $hasSuggestion) = getSuggestions($conn, $column_names, $value_names, $rowID);
        
        $response['suggestions'] = $suggestions;
        $response['hasSuggestion'] = $hasSuggestion;
        $response['status'] = 'success';

    } catch (Exception $e) {
        handleException($e);
    }
}

function validateSession() {
    if (!isset($_SESSION['UserID']) || !isset($_SESSION['PlanningID'])) {
        throw new Exception('Session variables not set');
    }
}

function getDecodedInput() {
    $rawInput = file_get_contents("php://input");
    return json_decode($rawInput, true);
}

function validateInputData($inputData) {
    if (!is_array($inputData) || !isset($inputData['rowID']) || !isset($inputData['rowData'])) {
        throw new Exception('Invalid input data');
    }
}

function handleException($e) {
    global $response;
    $response['status'] = 'error';
    $response['message'] = $e->getMessage();
}

// Main execution starts here
try {
    require 'conf/confpdo.php';
    handleAjaxRequest($conn);
} catch (Exception $e) {
    handleException($e);
}
// At the bottom of your PHP code
$output = json_encode($response);
if (json_last_error() === JSON_ERROR_NONE) {
    echo $output;
} else {
    // Handle JSON encoding error
    echo json_encode(['status' => 'error', 'message' => 'JSON encoding failed']);
}
?>