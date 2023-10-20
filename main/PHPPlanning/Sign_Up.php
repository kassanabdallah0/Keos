<?php
// Initialize a response arra
$response = [];

require 'conf/confsql.php';

// Handle POST request
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Validate username
    if (empty($_POST["username"])) {
        $response["username"] =  "Username is required";
        exit();
    }
    // Validate password
    if (empty($_POST["password"])) {
        $response["password"] =  "Password is required";
        exit();
    }
    // Validate email
    if (empty($_POST["email"])) {
        $response["email"] =  "Email is required";
        exit();
    } elseif (!filter_var($_POST["email"], FILTER_VALIDATE_EMAIL)) {
        $response["email"] =  "Invalid email format";
        exit();
    }
    // Validate telephone
    if (empty($_POST["telephone"])) {
        $response["telephone"] =  "Telephone is required";
        exit();
    } elseif (!preg_match("/^\\d{10}$/", $_POST["telephone"])) {
        $response["telephone"] =  "Invalid telephone number";
        exit();
    }
    // Validate birth_date
    if (empty($_POST["dob"])) {
        $response["dob"] =  "Date of birth is required";
        exit();
    }
    // Validate fullname
    if (empty($_POST["fullname"])) {
        $response["fullname"] =  "Full name is required";
        exit();
    }
    // Validate gender
    if (empty($_POST["gender"])) {
        $response = " Gender is required";
        exit();
    }
    // Validate role
    if (empty($_POST["Role"])) {
        $response["Role"] =  "Role is required";
        exit();
    }

    // Data sanitization
    $username = htmlspecialchars($_POST["username"]);
    $password = htmlspecialchars($_POST["password"]);
    $telephone = htmlspecialchars($_POST["telephone"]);
    $email = htmlspecialchars($_POST["email"]);
    $birth_date = htmlspecialchars($_POST["dob"]);
    $fullname = htmlspecialchars($_POST["fullname"]);
    $gender = htmlspecialchars($_POST["gender"]);
    $role = htmlspecialchars($_POST["Role"]);
    try {
    $conn->begin_transaction();
    try{
    $response['status'] = "Data sanitized successfully.";

   $stmtCheckUser = $conn->prepare("SELECT UserID FROM userlog WHERE Username = ?");
   $stmtCheckUser->bind_param("s", $username);
   $stmtCheckUser->execute();
   $stmtCheckUser->store_result();

   if ($stmtCheckUser->num_rows > 0) {
       $stmtCheckUser->bind_result($existing_user_id);
       $stmtCheckUser->fetch();
       $user_id = $existing_user_id;
       $response['status_1'] = "User exists, using existing UserID.";
   } else {
       $hashed_password = password_hash($password, PASSWORD_BCRYPT);
       $stmt1 = $conn->prepare("INSERT INTO userlog (Username, Password) VALUES (?, ?)");
       $stmt1->bind_param("ss", $username, $hashed_password);

       if ($stmt1->execute()) {
           $user_id = $conn->insert_id;
           $response['status_2'] = "New user created.";
       } else {
           $conn->rollback();
           $response['error'] = "Database Error: " . $stmt1->error;
            echo json_encode($response);
           exit();
       }
   }
   $stmtCheckUser->close();
// Insert into userinfo
$stmt2 = $conn->prepare("INSERT INTO userinfo (UserID, Role, DateN, Names, Gender) VALUES (?, ?, ?, ?, ?)");
$stmt2->bind_param("issss", $user_id, $role, $birth_date, $fullname, $gender);

if (!$stmt2->execute()) {
    $conn->rollback();
    $response['error_1'] = "Database Error: " . $stmt2->error;
    echo json_encode($response);
    exit();
} else {
    $response['status_userinfo'] = "Data inserted into userinfo table successfully.";
}
// Insert into usercontact
$stmt3 = $conn->prepare("INSERT INTO usercontact (UserID, TelNum, Mail) VALUES (?, ?, ?)");
$stmt3->bind_param("iss", $user_id, $telephone, $email);
if (!$stmt3->execute()) {
    $conn->rollback();
    $response['error'] = "Database Error: " . $stmt3->error;
    echo json_encode($response);
    exit();
} else {
    $response['status_usercontact'] = "Data inserted into usercontact table successfully.";
}
if ($role === 'CDP') {
    // Create a unique integer PlanningID
    $timestamp = time();
    $planningID = intval(substr($timestamp, -4) . substr($user_id, -4));  // Combining last 4 digits of each
    
    $stmt4 = $conn->prepare("INSERT INTO planningaccess (UserID, RoleID, PlanningID) VALUES (?, ?, ?)");
    
    // Use $user_id from previous insertions and $role for RoleID
    $stmt4->bind_param("isi", $user_id, $role, $planningID);
    
    if (!$stmt4->execute()) {
        $conn->rollback();
        $response['error'] = "Database Error in planningaccess: " . $stmt4->error;
        echo json_encode($response);
    } else {
        $response['status_planningaccess'] = "Data inserted into planningaccess table successfully.";
    }
    $stmt4->close();
}
$conn->commit();
// Final response
// Close statements and connection
$stmt1->close();
$stmt2->close();
$stmt3->close();
$conn->close();
    } catch (PDOException $e) {
        error_log($e->getMessage());
        echo "Error" .$e->getMessage();
    }
session_write_close();
$response['final_status'] = "New records created successfully.";
    } catch (Exception $e) {
        $conn->rollback();
        $response['error'] = "Database Error: " . $e->getMessage();
    }
echo json_encode($response);
}
?>
