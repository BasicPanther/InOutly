# Complete Employee Management System with NFC

## Overview
This is a comprehensive employee management system with NFC-based attendance tracking, project management, and role-based dashboards.

## Files Structure
```
project/
├── server.js                    # Main Node.js server with MySQL
├── database-schema.sql          # MySQL database schema
├── login.html                   # Login page
├── admin-dashboard.html         # Admin dashboard
├── employee-dashboard.html      # Employee dashboard
├── phone-scanner.html           # NFC scanner for attendance
├── nfc-register.html            # NFC card registration page
└── package.json                 # Dependencies
```

## Setup Instructions

### 1. Install MySQL
- Download and install MySQL Server
- Create a database user with permissions

### 2. Create Database
```bash
mysql -u root -p < database-schema.sql
```

This creates:
- Users table (admin/admin123 login)
- Employees table
- Projects and tasks
- Attendance records
- NFC card linking

### 3. Install Node.js Dependencies
```bash
npm install ws mysql2
```

### 4. Configure Database Connection
Edit `server.js` lines 9-11:
```javascript
host: 'localhost',
user: 'root',        // Your MySQL username
password: '',        // Your MySQL password
```

### 5. Start Server
```bash
node server.js
```

## Features

### Authentication & Authorization
- **Login System**: Username/password authentication
- **Role-based Access**: Admin vs Employee dashboards
- **Default Admin**: username: `admin`, password: `admin123`

### Admin Dashboard
1. **Employee Management**
   - Create, edit, delete employees
   - View employee details
   - Assign roles and positions
   - Link NFC cards to employees

2. **Project Management**
   - Create and manage projects
   - Assign employees to projects
   - Track project status and progress
   - Set priorities and deadlines

3. **Task Management**
   - Create tasks for employees
   - Assign tasks to projects
   - Track task completion
   - Set priorities

4. **Attendance Tracking**
   - View attendance records
   - Filter by date, employee, department
   - Track working hours
   - Generate reports

5. **NFC Card Management**
   - Register new NFC cards
   - Link cards to employees
   - View scan logs
   - Track unassigned cards

### Employee Dashboard
1. **Personal Information**
   - View profile details
   - See assigned projects
   - Check tasks

2. **Task Management**
   - View assigned tasks
   - Update task status
   - Track deadlines
   - Mark tasks complete

3. **Attendance Calendar**
   - View attendance history
   - See in-office/out-office dates
   - Check working hours
   - Track present/absent days

4. **Project Overview**
   - View assigned projects
   - See project details
   - Track project progress

### NFC Attendance System
1. **Phone Scanner**
   - Web-based NFC scanner
   - Works on Chrome for Android
   - Real-time attendance recording
   - Visual feedback on scan

2. **How It Works**
   - Employee taps NFC card to phone
   - System reads card UID (non-writable)
   - Automatically records clock in/out
   - Updates dashboard in real-time

3. **NFC Card Registration**
   - Admin can register new cards
   - Scan card and assign to employee
   - System stores card UID
   - Link multiple cards per employee

## Usage Guide

### Admin Workflow

1. **Login**
   - Go to `http://localhost:8080`
   - Login with admin/admin123

2. **Add Employee**
   - Navigate to Employees section
   - Click "Add Employee"
   - Fill in details
   - Save

3. **Register NFC Card**
   - Go to "NFC Registration"
   - Select employee
   - Tap "Scan NFC Card"
   - Place NFC card near phone
   - System automatically links card

4. **Create Project**
   - Navigate to Projects
   - Click "Create Project"
   - Fill details and assign employees
   - Save

5. **Assign Tasks**
   - Go to Tasks section
   - Create task
   - Assign to employee and project
   - Set deadline and priority

### Employee Workflow

1. **Login**
   - Use email as username
   - Default password (set by admin)

2. **View Tasks**
   - See all assigned tasks
   - Update task status
   - Mark complete when done

3. **Check Attendance**
   - View calendar
   - See attendance history
   - Check working hours

4. **Clock In/Out**
   - Open phone scanner on phone
   - Tap NFC card when arriving
   - System auto-records clock in
   - Tap again when leaving for clock out

### Phone Attendance Workflow

1. **Setup Phone**
   - Open Chrome on Android phone
   - Go to `http://YOUR_IP:8080/phone`
   - Grant NFC permissions when prompted

2. **Clock In**
   - Arrive at office
   - Open scanner page
   - Tap NFC card to phone back
   - See confirmation message
   - Dashboard updates automatically

3. **Clock Out**
   - End of day
   - Tap same NFC card
   - System records clock out
   - Calculates working hours

## API Endpoints

### Authentication
- `POST /api/login` - User login

### Employees
- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get employee details
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `GET /api/tasks?employee=:id` - Get tasks for employee
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Attendance
- `GET /api/attendance?employee=:id&startDate=:date` - Get attendance
- `POST /api/attendance/record` - Manual attendance recording

### NFC
- `POST /api/nfc/link` - Link NFC card to employee
- `POST /api/nfc/scan` - Handle NFC scan for attendance

## Troubleshooting

### NFC Not Working
1. Ensure Chrome for Android (v89+)
2. Enable NFC in phone settings
3. Grant NFC permissions to browser
4. Hold card steady for 2-3 seconds

### Database Connection Failed
1. Check MySQL is running
2. Verify credentials in server.js
3. Ensure database 'employee_management' exists
4. Check user has proper permissions

### "Employee Not Found" on NFC Scan
1. Card not registered in system
2. Go to NFC Registration page
3. Scan card and link to employee
4. Try scanning again

### Login Failed
1. Check username/password
2. Verify user exists in database
3. Check database connection
4. Review server logs

## Security Notes

- **Production Use**: Hash passwords with bcrypt
- **HTTPS**: Use SSL certificates for production
- **SQL Injection**: Use parameterized queries (already implemented)
- **Session Management**: Implement proper session tokens
- **NFC Security**: Consider encrypting stored card IDs

## Deployment

### Local Network
- Server accessible on LAN
- Phone and PC on same WiFi
- Use PC's IP address for phone access

### TrueNAS Deployment
1. Install Node.js on TrueNAS
2. Import database to TrueNAS MySQL
3. Copy all files to TrueNAS
4. Run server as service
5. Configure firewall rules

### Production Deployment
1. Use process manager (PM2)
2. Set up reverse proxy (nginx)
3. Enable HTTPS with SSL
4. Configure proper database backup
5. Set up monitoring and logs

## Support

For issues or questions:
1. Check server console logs
2. Review browser console (F12)
3. Verify database connections
4. Test API endpoints individually
5. Check NFC permissions on phone