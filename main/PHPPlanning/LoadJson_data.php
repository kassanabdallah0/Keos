<?php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
ini_set('display_errors', '0');
ini_set('log_errors', '1');
if (!isset($_SESSION['UserID'])) {
    // User is not logged in. Respond with an error JSON
    $response = ['status' => 'error', 'message' => 'Unauthorized access'];
    echo json_encode($response);
    exit();
}

header('Content-Type: application/json; charset=utf-8');



$response = ['status' => '', 'message' => '', 'action' => '', 'Json_Data' => '', 'role' => ''];



// Fetch Role from the database

function TheRole($conn) {
    $role = '';
    $userid =  $_SESSION['UserID'];
    if ($userid == null) {
        return $role;
    }
    $stmt = $conn->prepare("SELECT `Role` FROM userinfo WHERE UserID = :userid");
    $stmt->bindParam(':userid', $userid, PDO::PARAM_INT);

    if ($stmt->execute()) {
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($result) {
            return $result['Role'];
        } else {
            $response['status'] = 'error';
            $response['message'] = 'Error getting role';
        }
    } else {
        $response['status'] = 'error';
        $response['message'] = 'Error executing statement';
    }
    return $role;
}

function StaticData($conn, $allData, $role) {
    try {
        // Determine role part of the query based on role
        $rolepart = getRolePart($role);

        // Fetch static data
        $staticDataQuery = "SELECT ColName, `Value` FROM dropdownlists JOIN dropdownlistsval ON dropdownlists.DpID = dropdownlistsval.DpId  WHERE" . $rolepart . "  dropdownlists.`DYes/No` = 'NO'";
        $final_data =  fetchDataINStatic($conn, $staticDataQuery);

        // Fetch dynamic data
        $dynamicDataQuery = "SELECT ColName FROM dropdownlists WHERE" . $rolepart . "  dropdownlists.`DYes/No` = 'YES'";
        $dynamic_data =  fetchDataINStatic($conn, $dynamicDataQuery, true);

        // Merge dynamic data keys into final_data with empty arrays as values
        foreach ($dynamic_data as $col_name) {
            $final_data[$col_name] = array();
        }
        // Add it to the $allData['staticData']
        $allData['Options_Map'] = $final_data;
    } catch (Exception $e) {
        logAndRespondError("Unknown error IN Static Data functionality: " . $e->getMessage());
    }
    return $allData;
}

function getRolePart($role) {
    return ($role == 'CDP') ? " dropdownlists.Role = 'CDP'  AND  " : "  ";
}

function fetchDataINStatic($conn, $query, $isDynamic = false) {
    $stmt = $conn->prepare($query);
    if (!$stmt->execute()) {
        logAndRespondError($isDynamic ? "Error getting dynamic data" : "Error getting static data");
        return array();
    }

    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($isDynamic) {
        return array_column($result, 'ColName');
    }

    $final_data = array();
    foreach ($result as $item) {
        $col_name = $item['ColName'];
        $value = $item['Value'];
        if (!array_key_exists($col_name, $final_data)) {
            $final_data[$col_name] = array();
        }
        array_push($final_data[$col_name], $value);
    }
    return $final_data;
}

function logAndRespondError($message) {
    global $response;
    $response['status'] = 'error';
    $response['message'] = $message;
}


function DynamicData($conn, $allData,$role) {
    try {
    // Fetch static data Values as keys to the dynamic data and there values as values to the dynamic data for each dynamic data has his seperate name in $allData['Dynamic']['name']
    // DynamicColumn : StaticValue : DynamicValue
    if ($role == 'CDP') {
        $rolepart = " AND DL.Role = 'CDP' ";
    }
    else {
        $rolepart = "";
    }
    $stringSQLquerry= "SELECT DL.ColName AS DynamicColumn, DLV.Value AS StaticValue, DYDLV.Value AS DynamicValue FROM dropdownlists AS DL JOIN dropdownlists AS DL2 JOIN dropdownlistsval AS DLV JOIN dynamicdropdownlistsval AS DYDLV WHERE DL.`DYes/No` = 'YES' AND DL.DpID = DYDLV.DpID AND DL2.`DYes/No` = 'NO' AND DLV.DpId = DL2.DpID AND DLV.ValId = DYDLV.ValID AND DYDLV.DpID = DL.DpID  " . $rolepart;
    $stmt = $conn->prepare($stringSQLquerry);
    if ($stmt->execute()) {
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $final_data = array();
        
        foreach ($result as $item) {
            $dynamic_column = $item["DynamicColumn"];
            $static_value = $item["StaticValue"];
            $dynamic_value = $item["DynamicValue"];
            
            // Initialize DynamicColumn if it doesn't already exist
            if (!array_key_exists($dynamic_column, $final_data)) {
                $final_data[$dynamic_column] = array();
            }
            
            // Initialize StaticValue under the respective DynamicColumn if it doesn't already exist
            if (!array_key_exists($static_value, $final_data[$dynamic_column])) {
                $final_data[$dynamic_column][$static_value] = array();
            }
            
            // Append the DynamicValue to the respective StaticValue array
            array_push($final_data[$dynamic_column][$static_value], $dynamic_value);
        }
        
        // Add it to the $allData['Dynamic']
        $allData['Dynamic'] = $final_data;
    } else {
        $response['status'] = 'error';
        $response['message'] = 'Error getting dynamic data';
    }
    } catch (Exception $e) {
        $response['status'] = 'error';
        $response['message'] = 'Unknown error IN Dynamic Data functionality: ' . json_encode($e->getMessage(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK);
    }
    return $allData;
}

function PlanningHeaders($conn,$allData, $planningHeaders,$role) {
    try {
     // Planning Headers
     $rolepart = " headerofplanning.Role = 'CDP' ";
     if ($role == 'CDP') {
        $rolepart = " headerofplanning.Role = 'CDP' ";
    }
    else {
        $rolepart = " headerofplanning.Role = 'CDP' OR  headerofplanning.Role = 'Admin' ";
    }
     $stringSQLquerry = "SELECT ColName FROM headerofplanning Where " . $rolepart . " ORDER BY headerofplanning.ColID ASC";
     $stmt = $conn->prepare($stringSQLquerry);
     if ($stmt->execute()) {
         $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
         foreach ($result as $item) {
             $col_name = $item["ColName"];
             array_push($planningHeaders, $col_name);
         }
         // add it to the $allData
         $allData['PlanningHeaders'] = $planningHeaders;
     } else {
         $response['status'] = 'error';
         $response['message'] = 'Error getting planning headers';
     }
    $resultarray = array('allData' => $allData, 'planningHeaders' => $planningHeaders);
    } catch (Exception $e) {
        $response['status'] = 'error';
        $response['message'] = 'Unknown error IN Planning Headers functionality: ' . json_encode($e->getMessage(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK);
    }
    return $resultarray;
}

function CollapsibelColumns($conn, $allData,$role) {
    try {
        // Fetch Collipsible Columns and define it for the handsontable accepte the collapsible columns and for the IsCollapsible if it is 1 then put true else put false the format should be collapsibleColumns: [{ row: -2, col: 4, collapsible: true },....]
        if ($role == 'CDP') {
            $rolepart = " headerofplanning.Role = 'CDP' ";
        }
        else {
            $rolepart = " headerofplanning.Role = 'CDP' OR  headerofplanning.Role = 'Admin' ";
        }
        $stringSQLquerry = "SELECT Col, `Row`, IsCollapsible FROM collapsiblecolumns JOIN headerofplanning ON collapsiblecolumns.Col = headerofplanning.ColID Where " . $rolepart;
        $stmt = $conn->prepare($stringSQLquerry);
        if ($stmt->execute()) {
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $collapsibleColumns = array();
            foreach ($result as $item) {
                $col = $item["Col"];
                $row = $item["Row"];
                $is_collapsible = $item["IsCollapsible"];
                if ($is_collapsible == 1) {
                    $is_collapsible = true;
                } else {
                    $is_collapsible = false;
                }
                array_push($collapsibleColumns, array("row" => $row, "col" => $col, "collapsible" => $is_collapsible));
            }
            $allData['collapsibleColumns'] = $collapsibleColumns;
        } else {
            $response['status'] = 'error';
            $response['message'] = 'Error getting collapsible columns';
        }
    } catch (Exception $e) {
        $response['status'] = 'error';
        $response['message'] = 'Unknown error IN Collapsibel Columns functionality: ' . json_encode($e->getMessage(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK);
    }

     return $allData;
}

function NestedHeaders($conn, $allData, $planningHeaders,$role) {
    try{
        // Nested Headers
        if ($role == 'CDP') {
            $rolepart = " headerofplanning.Role = 'CDP' ";
        }
        else {
            $rolepart = " headerofplanning.Role = 'CDP' OR  headerofplanning.Role = 'Admin' ";
        }
        $stringSQLquerry = "SELECT HeaderLabel , ColSpan FROM nestedheaders JOIN headerofplanning ON nestedheaders.HeaderID = headerofplanning.ColID Where " . $rolepart . " ORDER BY nestedheaders.HeaderID ASC";
        $stmt = $conn->prepare($stringSQLquerry);
        if ($stmt->execute()) {
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $NestedHeaders = array();  // Initialize your NestedHeaders array
            
            foreach ($result as $item) {
                $header_label = $item["HeaderLabel"];
                $col_span = $item["ColSpan"];
                
                // Check if the header label is empty
                if (empty($header_label)) {
                    array_push($NestedHeaders, "");
                } else {
                    // If not empty, add the associative array
                    array_push($NestedHeaders, array("label" => $header_label, "colspan" => $col_span));
                }
            }
            
            // Add it to the $allData
            $allData['NestedHeaders'][] = array($NestedHeaders);  // It's wrapped inside another array to match your desired structure
            $allData['NestedHeaders'][] = $planningHeaders;  // It's wrapped inside another array to match your desired structure
        } else {
            $response['status'] = 'error';
            $response['message'] = 'Error getting nested headers';
        }        
    } catch (Exception $e) {
        $response['status'] = 'error';
        $response['message'] = 'Unknown error IN Nested Headers functionality: ' . json_encode($e->getMessage(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK);
    }
    return $allData;
}

function ColumnDefinitionType($conn, $allData,$role) {
    try {
      // Fetch ColumnDefinitionType  the result should be this form "ColumnDefinitionType" : [ { "type": "empty" }, { "type": "empty" }, { "type": "empty" }, { "type": "empty" }, { "type": "empty" }, { "type": "empty" }, { "type": "empty" }, { "key": "Priorité" }, { "key": "Périmètre" }, { "key": "Typologie" }, { "key": "Prestation" }, .... ]
      if ($role == 'CDP') {
        $rolepart = " headerofplanning.Role = 'CDP' ";
    }
    else {
        $rolepart = " headerofplanning.Role = 'CDP' OR  headerofplanning.Role = 'Admin' ";
    }
      $stringSQLquerry = "SELECT `type`, `value` FROM columndefinitionstype JOIN headerofplanning ON columndefinitionstype.HeaderID = headerofplanning.ColID WHERE " . $rolepart . " ORDER BY columndefinitionstype.HeaderID ASC";
      $stmt = $conn->prepare($stringSQLquerry);
            if ($stmt->execute()) {
          $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
          $columnDefinitionType = array();
          foreach ($result as $item) {
              $type = $item["type"];
              $value = $item["value"];
              if ($type ==="type") {
                  array_push($columnDefinitionType, array("type" => $value));
              } elseif ($type === "key") {
                  array_push($columnDefinitionType, array("key" => $value));
              }
          }
          $allData['columnDefinitionType'] = $columnDefinitionType;
  
      } else {
          $response['status'] = 'error';
          $response['message'] = 'Error getting column definition type';
      }
    } catch (Exception $e) {
        $response['status'] = 'error';
        $response['message'] = 'Unknown error IN Column Definition Type functionality: ' . json_encode($e->getMessage(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK);
    }
    return $allData;
}

function fetchData($conn, $response) {
    $allData = [];
    $planningHeaders = [];
    $role = TheRole($conn);
    $response['role'] = $role;
    try {
    // Call Function to fetch Data from the database
    $allData = StaticData($conn, $allData,$role);
    $allData = DynamicData($conn, $allData,$role);
    $resultedArray = PlanningHeaders($conn, $allData, $planningHeaders,$role);
    $allData = $resultedArray['allData'];
    $planningHeaders = $resultedArray['planningHeaders'];
    $allData = NestedHeaders($conn, $allData, $planningHeaders,$role);
    $allData = CollapsibelColumns($conn, $allData,$role);
    $allData = ColumnDefinitionType($conn, $allData,$role);
    $allDataJson = json_encode($allData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK);
    $response['status'] = 'success';
    $response['message'] = 'Data loaded successfully';
    try {
        $response['Json_Data'] = $allDataJson;
        }
        catch (Exception $e) {
            $response['status'] = 'error';
            $response['message'] = 'Unknown error: ' . json_encode($e->getMessage(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK);
        }    
    } catch (Exception $e) {
        $response['status'] = 'error';
        $response['message'] = 'Unknown error IN Fetch Data functionality: ' . json_encode($e->getMessage(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK);
    }
    return $response;
}
   
function HandleAjaxcall($conn) {
    global $response;
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'];
    if (!isset($action)) {
        $action = $_POST['action'];
        if ($action === 'fetch_data') {
            $response['action'] = $action;
            $response = fetchData($conn, $response);
        }
        else {
            $response['status'] = 'error';
            $response['message'] = 'action is not equale to fetch_data';
        }

    } else {
        $response['status'] = 'error';
        $response['message'] = 'No action provided';
    }
}

try {
    require 'conf/confpdo.php';
     HandleAjaxcall($conn);
 } catch (Exception $e) {
     $response['status'] = 'error';
     $response['message'] = 'Unknown error: ' . json_encode($e->getMessage(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK);
 }
 
echo json_encode($response);

?>