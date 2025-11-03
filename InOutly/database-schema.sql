-- Create database
CREATE DATABASE IF NOT EXISTS employee_management;
USE employee_management;

-- Users table (for login)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'employee') NOT NULL,
  employeeId VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE employees (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  department VARCHAR(50),
  position VARCHAR(100),
  role VARCHAR(50),
  nfcCardId VARCHAR(100) UNIQUE,
  profilePicture VARCHAR(255),
  dateOfJoining DATE,
  salary DECIMAL(10, 2),
  address TEXT,
  emergencyContact VARCHAR(20),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  startDate DATE,
  endDate DATE,
  status ENUM('planning', 'in_progress', 'completed', 'on_hold') DEFAULT 'planning',
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Project assignments
CREATE TABLE project_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projectId INT NOT NULL,
  employeeId VARCHAR(20) NOT NULL,
  role VARCHAR(50),
  assignedDate DATE,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE
);

-- Tasks table
CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projectId INT,
  employeeId VARCHAR(20),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  dueDate DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE
);

-- Attendance records
CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employeeId VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  clockIn DATETIME,
  clockOut DATETIME,
  totalHours DECIMAL(5, 2),
  status ENUM('present', 'absent', 'half_day', 'leave') DEFAULT 'present',
  notes TEXT,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE
  -- [FIX] Removed the UNIQUE KEY that caused the "Duplicate" error
  -- UNIQUE KEY unique_attendance (employeeId, date) 
);

-- Departments table
CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  managerId VARCHAR(20),
  FOREIGN KEY (managerId) REFERENCES employees(id) ON DELETE SET NULL
);

-- NFC scan logs (for debugging/audit)
CREATE TABLE nfc_scan_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nfcCardId VARCHAR(100) NOT NULL,
  employeeId VARCHAR(20),
  scanTime DATETIME NOT NULL,
  action ENUM('clock_in', 'clock_out', 'unassigned') DEFAULT 'unassigned',
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE SET NULL
);

-- Insert default admin user (password: admin123)
-- Note: In production, use bcrypt to hash passwords
INSERT INTO users (username, password, role, employeeId) 
VALUES ('admin', 'admin123', 'admin', NULL);

-- Insert sample departments
INSERT INTO departments (name, description) VALUES
('Engineering', 'Software development and IT'),
('Marketing', 'Marketing and communications'),
('HR', 'Human resources'),
('Finance', 'Finance and accounting'),
('Operations', 'Business operations'),
('Sales', 'Sales department');

-- Insert sample admin employee
INSERT INTO employees (id, name, email, phone, department, position, role, dateOfJoining, status)
VALUES ('EMP001', 'Admin User', 'admin@company.com', '+1234567890', 'Management', 'System Administrator', 'Admin', '2024-01-01', 'active');

-- Update admin user with employee link
UPDATE users SET employeeId = 'EMP001' WHERE username = 'admin';
