const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// In-memory data storage
let employees = new Map([
    ['EMP001', { 
        id: 'EMP001', 
        name: 'John Doe', 
        email: 'john.doe@company.com',
        phone: '+1234567890',
        department: 'Engineering', 
        position: 'Software Developer',
        nfcId: '04E91A2A3B5C80', 
        status: 'Not Arrived',
        lastScan: null,
        hireDate: '2024-01-15'
    }],
    ['EMP002', { 
        id: 'EMP002', 
        name: 'Jane Smith', 
        email: 'jane.smith@company.com',
        phone: '+1234567891',
        department: 'Marketing', 
        position: 'Marketing Manager',
        nfcId: '04A23F5D1E7C92', 
        status: 'Not Arrived',
        lastScan: null,
        hireDate: '2024-02-20'
    }],
    ['EMP003', { 
        id: 'EMP003', 
        name: 'Bob Johnson', 
        email: 'bob.johnson@company.com',
        phone: '+1234567892',
        department: 'HR', 
        position: 'HR Specialist',
        nfcId: '04B45C8A9F2D14', 
        status: 'Not Arrived',
        lastScan: null,
        hireDate: '2023-11-10'
    }]
]);

let attendanceRecords = new Map(); // Store daily attendance records
let departments = ['Engineering', 'Marketing', 'HR', 'Finance', 'Operations', 'Sales'];

// Helper functions
function generateEmployeeId() {
    const ids = Array.from(employees.keys());
    const numbers = ids.map(id => parseInt(id.replace('EMP', ''))).filter(n => !isNaN(n));
    const maxNumber = Math.max(0, ...numbers);
    return `EMP${String(maxNumber + 1).padStart(3, '0')}`;
}

function getDateKey(date = new Date()) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function recordAttendance(employeeId, action, timestamp) {
    const dateKey = getDateKey(new Date(timestamp));
    const timeKey = `${dateKey}-${employeeId}`;
    
    if (!attendanceRecords.has(timeKey)) {
        attendanceRecords.set(timeKey, {
            employeeId,
            date: dateKey,
            clockIn: null,
            clockOut: null,
            totalHours: 0,
            status: 'Absent'
        });
    }
    
    const record = attendanceRecords.get(timeKey);
    
    if (action === 'Clock In' && !record.clockIn) {
        record.clockIn = timestamp;
        record.status = 'Present';
    } else if (action === 'Clock Out' && record.clockIn && !record.clockOut) {
        record.clockOut = timestamp;
        const clockInTime = new Date(record.clockIn);
        const clockOutTime = new Date(timestamp);
        record.totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60); // Convert to hours
        record.status = 'Completed';
    }
    
    attendanceRecords.set(timeKey, record);
}

// Create HTTP server to serve static files and API
const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API Routes
    if (req.url.startsWith('/api/')) {
        handleAPIRequest(req, res);
        return;
    }
    
    // Static file serving
    let filePath = '';
    if (req.url === '/') {
        filePath = path.join(__dirname, 'dashboard-complete.html');
    } else if (req.url === '/phone') {
        filePath = path.join(__dirname, 'phone-complete.html');
    } else {
        res.writeHead(404);
        res.end('Not found');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500);
            res.end('Error loading file');
            return;
        }
        
        if (filePath.endsWith('.html')) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
        }
        res.end(data);
    });
});

// API Request Handler
function handleAPIRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method;
    
    // Parse request body for POST/PUT requests
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        let data = null;
        if (body) {
            try {
                data = JSON.parse(body);
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
                return;
            }
        }
        
        // Route API requests
        if (path === '/api/employees' && method === 'GET') {
            getEmployees(req, res);
        } else if (path === '/api/employees' && method === 'POST') {
            createEmployee(req, res, data);
        } else if (path.match(/\/api\/employees\/(.+)/) && method === 'PUT') {
            const employeeId = path.match(/\/api\/employees\/(.+)/)[1];
            updateEmployee(req, res, employeeId, data);
        } else if (path.match(/\/api\/employees\/(.+)/) && method === 'DELETE') {
            const employeeId = path.match(/\/api\/employees\/(.+)/)[1];
            deleteEmployee(req, res, employeeId);
        } else if (path === '/api/departments' && method === 'GET') {
            getDepartments(req, res);
        } else if (path === '/api/attendance' && method === 'GET') {
            getAttendance(req, res, url.searchParams);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'API endpoint not found' }));
        }
    });
}

// API Handlers
function getEmployees(req, res) {
    const employeeArray = Array.from(employees.values());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(employeeArray));
}

function createEmployee(req, res, data) {
    const employeeId = generateEmployeeId();
    const employee = {
        id: employeeId,
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        department: data.department,
        position: data.position || '',
        nfcId: data.nfcId || '',
        status: 'Not Arrived',
        lastScan: null,
        hireDate: data.hireDate || new Date().toISOString().split('T')[0]
    };
    
    employees.set(employeeId, employee);
    
    // Broadcast to all clients
    broadcastToAll({
        type: 'employee_created',
        employee: employee,
        timestamp: new Date().toISOString()
    });
    
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(employee));
}

function updateEmployee(req, res, employeeId, data) {
    if (!employees.has(employeeId)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Employee not found' }));
        return;
    }
    
    const employee = employees.get(employeeId);
    Object.assign(employee, data);
    employees.set(employeeId, employee);
    
    // Broadcast to all clients
    broadcastToAll({
        type: 'employee_updated',
        employee: employee,
        timestamp: new Date().toISOString()
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(employee));
}

function deleteEmployee(req, res, employeeId) {
    if (!employees.has(employeeId)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Employee not found' }));
        return;
    }
    
    employees.delete(employeeId);
    
    // Broadcast to all clients
    broadcastToAll({
        type: 'employee_deleted',
        employeeId: employeeId,
        timestamp: new Date().toISOString()
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Employee deleted' }));
}

function getDepartments(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(departments));
}

function getAttendance(req, res, params) {
    const date = params.get('date') || getDateKey();
    const department = params.get('department');
    const employeeId = params.get('employee');
    
    let records = Array.from(attendanceRecords.values());
    
    // Filter by date
    if (date) {
        records = records.filter(record => record.date === date);
    }
    
    // Filter by department
    if (department && department !== 'all') {
        records = records.filter(record => {
            const emp = employees.get(record.employeeId);
            return emp && emp.department === department;
        });
    }
    
    // Filter by employee
    if (employeeId) {
        records = records.filter(record => record.employeeId === employeeId);
    }
    
    // Enhance records with employee info
    const enhancedRecords = records.map(record => ({
        ...record,
        employee: employees.get(record.employeeId)
    }));
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(enhancedRecords));
}

// WebSocket server
const wss = new WebSocket.Server({ server });
const clients = new Set();

function broadcastToAll(data) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

wss.on('connection', (ws, req) => {
    console.log('✅ New client connected from:', req.socket.remoteAddress);
    clients.add(ws);

    // Send initial data
    ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to attendance system',
        employees: Array.from(employees.values()),
        timestamp: new Date().toISOString()
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📱 Received:', data);

            if (data.type === 'nfc_scan') {
                handleNFCScan(data);
            }
            
        } catch (error) {
            console.error('❌ Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('❌ Client disconnected');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        clients.delete(ws);
    });
});

function handleNFCScan(data) {
    const { nfcId, timestamp, source } = data;
    
    // Find employee by NFC ID
    let employee = null;
    for (let emp of employees.values()) {
        if (emp.nfcId === nfcId) {
            employee = emp;
            break;
        }
    }
    
    if (!employee) {
        console.log('❌ No employee found with NFC ID:', nfcId);
        broadcastToAll({
            type: 'scan_error',
            message: 'No employee found with this NFC card',
            nfcId: nfcId,
            timestamp: timestamp
        });
        return;
    }
    
    const currentTime = new Date(timestamp);
    let action = '';
    
    if (employee.status === 'Not Arrived' || employee.status === 'Out') {
        employee.status = 'In';
        action = 'Clock In';
    } else {
        employee.status = 'Out';
        action = 'Clock Out';
    }
    
    employee.lastScan = currentTime;
    employees.set(employee.id, employee);
    
    // Record attendance
    recordAttendance(employee.id, action, timestamp);
    
    // Broadcast to all clients
    broadcastToAll({
        type: 'attendance_update',
        employee: employee,
        action: action,
        source: source,
        timestamp: timestamp
    });
    
    console.log(`✅ ${employee.name} - ${action} at ${currentTime.toLocaleString()}`);
}

const PORT = 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Employee Attendance System Started!');
    console.log('='.repeat(50));
    console.log(`📊 PC Dashboard: http://localhost:${PORT}`);
    console.log(`📱 Phone Scanner: http://10.253.27.47:${PORT}/phone`);
    console.log(`🌐 API Available at: http://localhost:${PORT}/api/`);
    console.log('='.repeat(50));
    console.log('Waiting for connections...');
});