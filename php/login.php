<?php
session_start();
require __DIR__ . '/login-db.php'; // gives $pdo

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../login-pg.html');
    exit;
}

$email = isset($_POST['email']) ? strtolower(trim($_POST['email'])) : '';
$password = $_POST['password'] ?? '';

$stmt = $pdo->prepare('SELECT id, email, password_hash, full_name, role, is_active FROM users WHERE email = :email LIMIT 1');
$stmt->execute([':email' => $email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || (int)$user['is_active'] !== 1) {
    $_SESSION['error'] = 'Invalid credentials.';
    header('Location: ../login-pg.html');
    exit;
}

if (!password_verify($password, $user['password_hash'])) {
    $_SESSION['error'] = 'Invalid credentials.';
    header('Location: ../login-pg.html');
    exit;
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['user_email'] = $user['email'];
$_SESSION['user_name'] = $user['full_name'];
$_SESSION['role'] = $user['role'] ?: 'user';

header('Location: ./dashboard.php'); // same folder
exit;