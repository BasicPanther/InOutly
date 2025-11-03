-- ============================================
-- Employee Management System - Full Database
-- FIXED: Removed problematic trigger
-- ============================================

-- Create Database
CREATE DATABASE IF NOT EXISTS employee_management;
USE employee_management;

-- ============================================
-- TABLES - CORRECT ORDER
-- ============================================

-- Departments Table (No dependencies)
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees Table (Depends on departments)
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  department VARCHAR(100),
  position VARCHAR(100),
  role VARCHAR(50),
  dateOfJoining DATE,
  salary DECIMAL(10, 2),
  address TEXT,
  emergencyContact VARCHAR(255),
  nfcCardId VARCHAR(255) UNIQUE,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department) REFERENCES departments(name) ON DELETE SET NULL
);

-- Users Table (Depends on employees)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'employee') DEFAULT 'employee',
  employeeId VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE SET NULL
);

-- Projects Table (No dependencies)
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  startDate DATE,
  endDate DATE,
  status ENUM('ongoing', 'completed', 'on-hold') DEFAULT 'ongoing',
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status)
);

-- Project Assignments Table (Depends on projects and employees)
CREATE TABLE IF NOT EXISTS project_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projectId INT NOT NULL,
  employeeId VARCHAR(50) NOT NULL,
  role VARCHAR(100) DEFAULT 'Team Member',
  assignedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY unique_assignment (projectId, employeeId)
);

-- Tasks Table (Depends on projects and employees)
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projectId INT,
  employeeId VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('pending', 'in-progress', 'completed') DEFAULT 'pending',
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  dueDate DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE SET NULL
);

-- Attendance Table (Depends on employees)
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employeeId VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  clockIn DATETIME,
  clockOut DATETIME,
  totalHours DECIMAL(5, 2),
  status ENUM('present', 'absent', 'leave') DEFAULT 'present',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_employee_date (employeeId, date),
  INDEX idx_date (date),
  INDEX idx_status (status)
);

-- NFC Scan Logs Table (Depends on employees)
CREATE TABLE IF NOT EXISTS nfc_scan_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nfcCardId VARCHAR(255),
  employeeId VARCHAR(50),
  scanTime DATETIME DEFAULT CURRENT_TIMESTAMP,
  action ENUM('clock_in', 'clock_out', 'unassigned') DEFAULT 'clock_in',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE SET NULL,
  INDEX idx_nfc (nfcCardId),
  INDEX idx_scan_time (scanTime)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_nfc ON employees(nfcCardId);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_attendance_employee ON attendance(employeeId);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert Departments
INSERT INTO departments (name, description) VALUES
('Engineering', 'Software and Hardware Engineering Department'),
('Sales', 'Sales and Business Development'),
('Marketing', 'Marketing and Communications'),
('HR', 'Human Resources'),
('Operations', 'Operations and Administration'),
('Finance', 'Finance and Accounting')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ============================================
-- SAMPLE EMPLOYEES (Optional - for testing)
-- ============================================

INSERT INTO employees (id, name, email, phone, department, position, role, dateOfJoining, salary, address, emergencyContact, status) VALUES
('EMP001', 'John Doe', 'john.doe@company.com', '9876543210', 'Engineering', 'Software Developer', 'employee', '2023-01-15', 75000.00, '123 Tech Street, Tech City', '9876543210', 'active'),
('EMP002', 'Jane Smith', 'jane.smith@company.com', '9876543211', 'Sales', 'Sales Manager', 'employee', '2023-02-20', 65000.00, '456 Market Lane, Business City', '9876543211', 'active'),
('EMP003', 'Michael Brown', 'michael.brown@company.com', '9876543212', 'Marketing', 'Marketing Executive', 'employee', '2023-03-10', 55000.00, '789 Creative Ave, Design City', '9876543212', 'active'),
('EMP004', 'Sarah Wilson', 'sarah.wilson@company.com', '9876543213', 'HR', 'HR Manager', 'employee', '2022-12-05', 60000.00, '321 People Road, HR City', '9876543213', 'active'),
('EMP005', 'David Johnson', 'david.johnson@company.com', '9876543214', 'Engineering', 'Senior Developer', 'employee', '2022-06-15', 85000.00, '654 Code Street, Tech City', '9876543214', 'active')
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  email = VALUES(email),
  phone = VALUES(phone),
  department = VALUES(department),
  position = VALUES(position),
  salary = VALUES(salary);

-- ============================================
-- INSERT ADMIN USER (MUST BE AFTER EMPLOYEES)
-- ============================================

INSERT INTO users (username, password, role) VALUES
('admin', 'admin123', 'admin')
ON DUPLICATE KEY UPDATE password = VALUES(password);

-- Create User Accounts for Sample Employees
INSERT INTO users (username, password, role, employeeId) VALUES
('john.doe@company.com', 'emp123', 'employee', 'EMP001'),
('jane.smith@company.com', 'emp123', 'employee', 'EMP002'),
('michael.brown@company.com', 'emp123', 'employee', 'EMP003'),
('sarah.wilson@company.com', 'emp123', 'employee', 'EMP004'),
('david.johnson@company.com', 'emp123', 'employee', 'EMP005')
ON DUPLICATE KEY UPDATE 
  password = VALUES(password),
  role = VALUES(role),
  employeeId = VALUES(employeeId);

-- ============================================
-- SAMPLE PROJECTS (Optional - for testing)
-- ============================================

INSERT INTO projects (name, description, startDate, endDate, status, priority) VALUES
('Mobile App Development', 'Develop new mobile application for iOS and Android', '2024-01-10', '2024-06-30', 'ongoing', 'high'),
('Website Redesign', 'Redesign company website with modern UI/UX', '2024-02-01', '2024-05-15', 'ongoing', 'medium'),
('Cloud Migration', 'Migrate on-premise systems to cloud infrastructure', '2024-03-01', '2024-08-31', 'ongoing', 'high'),
('Data Analytics Platform', 'Build analytics dashboard for business intelligence', '2024-01-20', '2024-07-31', 'completed', 'medium')
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  description = VALUES(description),
  status = VALUES(status),
  priority = VALUES(priority);

-- Assign Employees to Projects
INSERT INTO project_assignments (projectId, employeeId, role, assignedDate) VALUES
(1, 'EMP001', 'Developer', NOW()),
(1, 'EMP005', 'Senior Developer', NOW()),
(2, 'EMP003', 'Designer', NOW()),
(3, 'EMP001', 'Developer', NOW()),
(3, 'EMP005', 'Architect', NOW()),
(4, 'EMP004', 'Project Manager', NOW())
ON DUPLICATE KEY UPDATE role = VALUES(role);

-- ============================================
-- SAMPLE ATTENDANCE (Optional - for testing)
-- ============================================

INSERT INTO attendance (employeeId, date, clockIn, clockOut, totalHours, status) VALUES
('EMP001', CURDATE(), DATE_SUB(NOW(), INTERVAL 8 HOUR), DATE_SUB(NOW(), INTERVAL 0 HOUR), 8.0, 'present'),
('EMP002', CURDATE(), DATE_SUB(NOW(), INTERVAL 8 HOUR), DATE_SUB(NOW(), INTERVAL 1 HOUR), 7.0, 'present'),
('EMP003', DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 32 HOUR), DATE_SUB(NOW(), INTERVAL 24 HOUR), 8.0, 'present'),
('EMP004', DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 32 HOUR), DATE_SUB(NOW(), INTERVAL 24 HOUR), 8.5, 'present'),
('EMP005', CURDATE(), DATE_SUB(NOW(), INTERVAL 9 HOUR), NULL, NULL, 'present')
ON DUPLICATE KEY UPDATE 
  clockIn = VALUES(clockIn),
  clockOut = VALUES(clockOut),
  totalHours = VALUES(totalHours);

-- ============================================
-- VIEWS (Optional - for easier querying)
-- ============================================

-- Employee Summary View
CREATE OR REPLACE VIEW v_employee_summary AS
SELECT 
  e.id,
  e.name,
  e.email,
  e.department,
  e.position,
  e.salary,
  e.status,
  COUNT(DISTINCT pa.projectId) as active_projects,
  COALESCE(AVG(a.totalHours), 0) as avg_hours_per_day
FROM employees e
LEFT JOIN project_assignments pa ON e.id = pa.employeeId
LEFT JOIN projects p ON pa.projectId = p.id AND p.status = 'ongoing'
LEFT JOIN attendance a ON e.id = a.employeeId AND a.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
WHERE e.status = 'active'
GROUP BY e.id, e.name, e.email, e.department, e.position, e.salary, e.status;

-- Today's Attendance View
CREATE OR REPLACE VIEW v_today_attendance AS
SELECT 
  e.id,
  e.name,
  e.department,
  a.clockIn,
  a.clockOut,
  a.totalHours,
  CASE 
    WHEN a.clockOut IS NULL THEN 'In Office'
    ELSE 'Clocked Out'
  END as status
FROM employees e
LEFT JOIN attendance a ON e.id = a.employeeId AND a.date = CURDATE()
WHERE e.status = 'active'
ORDER BY a.clockIn DESC;


-- Add to existing database

-- Leaves Table
CREATE TABLE IF NOT EXISTS leaves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employeeId VARCHAR(50) NOT NULL,
  leaveType ENUM('sick', 'vacation', 'casual', 'personal') DEFAULT 'casual',
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  reason TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  appliedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approvedBy INT,
  approvalDate TIMESTAMP NULL,
  comments TEXT,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_employee_status (employeeId, status),
  INDEX idx_status (status)
);

-- Meeting Rooms Table
CREATE TABLE IF NOT EXISTS meeting_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  capacity INT,
  location VARCHAR(255),
  description TEXT,
  isActive BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meeting Room Bookings Table
CREATE TABLE IF NOT EXISTS meeting_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roomId INT NOT NULL,
  employeeId VARCHAR(50) NOT NULL,
  projectId INT,
  bookingDate DATE NOT NULL,
  startTime TIME NOT NULL,
  endTime TIME NOT NULL,
  purpose TEXT,
  status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
  appliedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approvedBy INT,
  approvalDate TIMESTAMP NULL,
  comments TEXT,
  FOREIGN KEY (roomId) REFERENCES meeting_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL,
  INDEX idx_booking_date (bookingDate),
  INDEX idx_employee_status (employeeId, status),
  INDEX idx_status (status)
);

-- Insert Default Meeting Rooms
INSERT INTO meeting_rooms (name, capacity, location, description) VALUES
('Conference Room A', 10, 'Floor 2', 'Large conference room with projector'),
('Conference Room B', 8, 'Floor 2', 'Medium conference room'),
('Meeting Room 1', 4, 'Floor 1', 'Small meeting room'),
('Meeting Room 2', 4, 'Floor 1', 'Small meeting room'),
('Cafeteria', 50, 'Ground Floor', 'Large cafeteria for team events')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Create indexes for performance
CREATE INDEX idx_leaves_employee ON leaves(employeeId);
CREATE INDEX idx_leaves_status ON leaves(status);
CREATE INDEX idx_bookings_employee ON meeting_bookings(employeeId);
CREATE INDEX idx_bookings_status ON meeting_bookings(status);