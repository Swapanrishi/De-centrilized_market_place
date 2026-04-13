<?php
// Database connection
$conn = new mysqli("localhost", "root", "", "marketplace");

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Get form data
$username = $_POST['username'];
$email = $_POST['email'];
$password = $_POST['password'];
$confirm_password = $_POST['confirm_password'];

// Check password match
if ($password != $confirm_password) {
    echo "Passwords do not match!";
    exit();
}

// Hash password (IMPORTANT)
$hashed_password = password_hash($password, PASSWORD_DEFAULT);

// Check if user already exists
$sql_check = "SELECT * FROM users WHERE email='$email'";
$result = $conn->query($sql_check);

if ($result->num_rows > 0) {
    echo "Email already registered!";
    exit();
}

$sql = "INSERT INTO users (username, email, password) 
        VALUES ('$username', '$email', '$hashed_password')";

if ($conn->query($sql) === TRUE) {
    echo "Registration successful!"
    <a href='login.html'>Login here</a>;
} else {
    echo "Error: " . $conn->error;
}

$conn->close();
?>