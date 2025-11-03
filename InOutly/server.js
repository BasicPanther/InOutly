const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// MySQL database connection pool
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123',
  database: 'employee_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
db.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
  });

// Helper function to generate employee ID
async function generateEmployeeId() {
  const [rows] = await db.query('SELECT id FROM employees ORDER BY id DESC LIMIT 1');
  if (rows.length === 0) return 'EMP001';
  
  const lastId = rows[0].id;
  const number = parseInt(lastId.replace('EMP', '')) + 1;
  return `EMP${String(number).padStart(3, '0')}`;
}

// Request handler function
const requestHandler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url.startsWith('/api/')) {
    await handleAPIRequest(req, res);
    return;
  }
  
  let filePath = '';
  if (req.url === '/' || req.url === '/login') {
    filePath = path.join(__dirname, 'login.html');
  } else if (req.url === '/admin') {
    filePath = path.join(__dirname, 'admin-dashboard.html');
  } else if (req.url === '/employee') {
    filePath = path.join(__dirname, 'employee-dashboard.html');
  } else if (req.url === '/phone') {
    filePath = path.join(__dirname, 'phone-scanner.html');
  } else if (req.url === '/nfc-register') {
    filePath = path.join(__dirname, 'nfc-register.html');
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
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
};

// API Request Handler
async function handleAPIRequest(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;
  
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', async () => {
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
    
    try {
      if (pathname === '/api/login' && method === 'POST') {
        await handleLogin(req, res, data);
      } else if (pathname === '/api/employees' && method === 'GET') {
        await getEmployees(req, res);
      } else if (pathname === '/api/employees' && method === 'POST') {
        await createEmployee(req, res, data);
      } else if (pathname.match(/\/api\/employees\/(.+)/) && method === 'PUT') {
        const employeeId = pathname.match(/\/api\/employees\/(.+)/)[1];
        await updateEmployee(req, res, employeeId, data);
      } else if (pathname.match(/\/api\/employees\/(.+)/) && method === 'DELETE') {
        const employeeId = pathname.match(/\/api\/employees\/(.+)/)[1];
        await deleteEmployee(req, res, employeeId);
      } else if (pathname.match(/\/api\/employees\/(.+)/) && method === 'GET') {
        const employeeId = pathname.match(/\/api\/employees\/(.+)/)[1];
        await getEmployeeById(req, res, employeeId);
      } else if (pathname === '/api/projects' && method === 'GET') {
        await getProjects(req, res);
      } else if (pathname === '/api/projects' && method === 'POST') {
        await createProject(req, res, data);
      } else if (pathname.match(/\/api\/projects\/(\d+)/) && method === 'PUT') {
        const projectId = pathname.match(/\/api\/projects\/(\d+)/)[1];
        await updateProject(req, res, projectId, data);
      } else if (pathname.match(/\/api\/projects\/(\d+)/) && method === 'DELETE') {
        const projectId = pathname.match(/\/api\/projects\/(\d+)/)[1];
        await deleteProject(req, res, projectId);
      } else if (pathname === '/api/tasks' && method === 'GET') {
        await getTasks(req, res, url.searchParams);
      } else if (pathname === '/api/tasks' && method === 'POST') {
        await createTask(req, res, data);
      } else if (pathname.match(/\/api\/tasks\/(\d+)/) && method === 'PUT') {
        const taskId = pathname.match(/\/api\/tasks\/(\d+)/)[1];
        await updateTask(req, res, taskId, data);
      } else if (pathname.match(/\/api\/tasks\/(\d+)/) && method === 'DELETE') {
        const taskId = pathname.match(/\/api\/tasks\/(\d+)/)[1];
        await deleteTask(req, res, taskId);
      } else if (pathname === '/api/attendance' && method === 'GET') {
        await getAttendance(req, res, url.searchParams);
      } else if (pathname.match(/\/api\/attendance\/(\d+)/) && method === 'PUT') {
        // [NEW] Add endpoint for editing attendance
        const attendanceId = pathname.match(/\/api\/attendance\/(\d+)/)[1];
        await updateAttendance(req, res, attendanceId, data);
      } else if (pathname === '/api/attendance/in-office' && method === 'GET') {
        await getInOffice(req, res);
      } else if (pathname === '/api/attendance/record' && method === 'POST') {
        await recordAttendance(req, res, data);
      } else if (pathname === '/api/nfc/link' && method === 'POST') {
        await linkNFCCard(req, res, data);
      } else if (pathname === '/api/nfc/scan' && method === 'POST') {
        await handleNFCScan(req, res, data);
      } else if (pathname === '/api/departments' && method === 'GET') {
        await getDepartments(req, res);
      } else if (pathname === '/api/stats/dashboard' && method === 'GET') {
        await getDashboardStats(req, res, url.searchParams);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
      }
    } catch (error) {
      console.error('API Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

// [Previous auth, employee, project, task functions remain the same...]
// Authentication
async function handleLogin(req, res, data) {
  const { username, password } = data;
  const [users] = await db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
  if (users.length === 0) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid credentials' }));
    return;
  }
  const user = users[0];
  let employeeData = null;
  if (user.employeeId) {
    const [employees] = await db.query('SELECT * FROM employees WHERE id = ?', [user.employeeId]);
    employeeData = employees[0];
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, user: { id: user.id, username: user.username, role: user.role, employeeId: user.employeeId }, employee: employeeData }));
}

async function getEmployees(req, res) {
  const [employees] = await db.query('SELECT * FROM employees WHERE status = "active" ORDER BY id');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(employees));
}

async function getEmployeeById(req, res, employeeId) {
  const [employees] = await db.query('SELECT * FROM employees WHERE id = ?', [employeeId]);
  if (employees.length === 0) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Employee not found' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(employees[0]));
}

async function createEmployee(req, res, data) {
  const employeeId = await generateEmployeeId();
  await db.query('INSERT INTO employees (id, name, email, phone, department, position, role, dateOfJoining, salary, address, emergencyContact, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [employeeId, data.name || '', data.email || '', data.phone || null, data.department || '', data.position || '', data.role || '', data.dateOfJoining || new Date().toISOString().split('T')[0], data.salary || null, data.address || null, data.emergencyContact || null, 'active']);
  if (data.email && data.email.trim() !== '') {
    try {
      await db.query('INSERT INTO users (username, password, role, employeeId) VALUES (?, ?, ?, ?)', [data.email, data.password || 'temp123', 'employee', employeeId]);
    } catch (err) {
      console.log('User account creation skipped:', err.message);
    }
  }
  const [employees] = await db.query('SELECT * FROM employees WHERE id = ?', [employeeId]);
  const employee = employees[0];
  broadcastToAll({ type: 'employee_created', employee: employee });
  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(employee));
}

async function updateEmployee(req, res, employeeId, data) {
  const updates = [];
  const values = [];
  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.email !== undefined) { updates.push('email = ?'); values.push(data.email); }
  if (data.phone !== undefined) { updates.push('phone = ?'); values.push(data.phone); }
  if (data.department !== undefined) { updates.push('department = ?'); values.push(data.department); }
  if (data.position !== undefined) { updates.push('position = ?'); values.push(data.position); }
  if (data.role !== undefined) { updates.push('role = ?'); values.push(data.role); }
  if (data.salary !== undefined) { updates.push('salary = ?'); values.push(data.salary); }
  if (data.address !== undefined) { updates.push('address = ?'); values.push(data.address); }
  if (data.emergencyContact !== undefined) { updates.push('emergencyContact = ?'); values.push(data.emergencyContact); }
  if (data.nfcCardId !== undefined) { updates.push('nfcCardId = ?'); values.push(data.nfcCardId); }
  if (updates.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'No fields to update' }));
    return;
  }
  values.push(employeeId);
  await db.query(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`, values);
  const [employees] = await db.query('SELECT * FROM employees WHERE id = ?', [employeeId]);
  const employee = employees[0];
  broadcastToAll({ type: 'employee_updated', employee: employee });
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(employee));
}

async function deleteEmployee(req, res, employeeId) {
  await db.query('UPDATE employees SET status = "inactive" WHERE id = ?', [employeeId]);
  broadcastToAll({ type: 'employee_deleted', employeeId: employeeId });
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true }));
}

async function getProjects(req, res) {
  const [projects] = await db.query(`SELECT p.*, COUNT(pa.employeeId) as memberCount FROM projects p LEFT JOIN project_assignments pa ON p.id = pa.projectId GROUP BY p.id ORDER BY p.created_at DESC`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(projects));
}

async function createProject(req, res, data) {
  const [result] = await db.query('INSERT INTO projects (name, description, startDate, endDate, status, priority) VALUES (?, ?, ?, ?, ?, ?)', [data.name, data.description, data.startDate, data.endDate, data.status, data.priority]);
  const projectId = result.insertId;
  if (data.employees && data.employees.length > 0) {
    for (const emp of data.employees) {
      await db.query('INSERT INTO project_assignments (projectId, employeeId, role, assignedDate) VALUES (?, ?, ?, ?)', [projectId, emp.employeeId, emp.role, new Date()]);
    }
  }
  const [projects] = await db.query('SELECT * FROM projects WHERE id = ?', [projectId]);
  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(projects[0]));
}

async function updateProject(req, res, projectId, data) {
  await db.query('UPDATE projects SET name = ?, description = ?, startDate = ?, endDate = ?, status = ?, priority = ? WHERE id = ?', [data.name, data.description, data.startDate, data.endDate, data.status, data.priority, projectId]);
  const [projects] = await db.query('SELECT * FROM projects WHERE id = ?', [projectId]);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(projects[0]));
}

async function deleteProject(req, res, projectId) {
  await db.query('DELETE FROM projects WHERE id = ?', [projectId]);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true }));
}

async function getTasks(req, res, params) {
  const employeeId = params.get('employee');
  const projectId = params.get('project');
  let query = 'SELECT * FROM tasks WHERE 1=1';
  const queryParams = [];
  if (employeeId) { query += ' AND employeeId = ?'; queryParams.push(employeeId); }
  if (projectId) { query += ' AND projectId = ?'; queryParams.push(projectId); }
  query += ' ORDER BY dueDate ASC';
  const [tasks] = await db.query(query, queryParams);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(tasks));
}

async function createTask(req, res, data) {
  const [result] = await db.query('INSERT INTO tasks (projectId, employeeId, title, description, status, priority, dueDate) VALUES (?, ?, ?, ?, ?, ?, ?)', [data.projectId, data.employeeId, data.title, data.description, data.status, data.priority, data.dueDate]);
  const [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(tasks[0]));
}

async function updateTask(req, res, taskId, data) {
  await db.query('UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, dueDate = ? WHERE id = ?', [data.title, data.description, data.status, data.priority, data.dueDate, taskId]);
  const [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(tasks[0]));
}

async function deleteTask(req, res, taskId) {
  await db.query('DELETE FROM tasks WHERE id = ?', [taskId]);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true }));
}

// Get currently in-office employees
async function getInOffice(req, res) {
  const today = new Date().toISOString().split('T')[0];
  const query = `
    SELECT e.id, e.name, e.department, e.position, a.clockIn, a.clockOut
    FROM employees e
    INNER JOIN attendance a ON e.id = a.employeeId
    WHERE a.date = ? AND a.clockOut IS NULL AND a.status = 'present'
    ORDER BY a.clockIn DESC
  `;
  const [inOffice] = await db.query(query, [today]);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(inOffice));
}

// [FIX] UPDATED: Get attendance - show ALL shifts for the day
async function getAttendance(req, res, params) {
  const employeeId = params.get('employee');
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');
  const date = params.get('date');
  const department = params.get('department'); // [FIX] Added department filter
  
  let query = `
    SELECT a.*, e.name as employeeName, e.department, e.position 
    FROM attendance a
    LEFT JOIN employees e ON a.employeeId = e.id
    WHERE 1=1
  `;
  // [FIX] Removed 'a.clockOut IS NOT NULL' to show all records
  const queryParams = [];
  
  if (employeeId) { query += ' AND a.employeeId = ?'; queryParams.push(employeeId); }
  if (department && department !== 'all') { query += ' AND e.department = ?'; queryParams.push(department); } // [FIX] Added department filter logic
  if (date) { query += ' AND a.date = ?'; queryParams.push(date); }
  else {
    if (startDate) { query += ' AND a.date >= ?'; queryParams.push(startDate); }
    if (endDate) { query += ' AND a.date <= ?'; queryParams.push(endDate); }
  }
  
  query += ' ORDER BY a.date DESC, a.clockIn DESC';
  const [attendance] = await db.query(query, queryParams);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(attendance));
}

// [NEW] Add endpoint for editing attendance
async function updateAttendance(req, res, attendanceId, data) {
  try {
    const { clockIn, clockOut, notes } = data;
    
    // Ensure clockIn and clockOut are valid datetimes or null
    const validClockIn = clockIn ? new Date(clockIn) : null;
    const validClockOut = clockOut ? new Date(clockOut) : null;
    let totalHours = null;
    
    // Recalculate totalHours
    if (validClockIn && validClockOut) {
      if (validClockOut < validClockIn) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Clock out time cannot be before clock in time' }));
        return;
      }
      totalHours = (validClockOut - validClockIn) / (1000 * 60 * 60);
    }
    
    await db.query(
      'UPDATE attendance SET clockIn = ?, clockOut = ?, totalHours = ?, notes = ? WHERE id = ?',
      [validClockIn, validClockOut, totalHours, notes || null, attendanceId]
    );
    
    const [updated] = await db.query('SELECT * FROM attendance WHERE id = ?', [attendanceId]);
    
    // Broadcast update
    broadcastToAll({ type: 'attendance_updated', attendance: updated[0] });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(updated[0]));
    
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to update attendance record' }));
  }
}


async function recordAttendance(req, res, data) {
  const { employeeId, clockIn, clockOut } = data;
  const date = new Date(clockIn || clockOut).toISOString().split('T')[0];
  const [existing] = await db.query('SELECT * FROM attendance WHERE employeeId = ? AND date = ?', [employeeId, date]);
  
  // [FIX] This logic is for *manual* record, not NFC. 
  // The UNIQUE key removal fixes the NFC scan.
  // This manual record function might need adjusting if admins can add multiple records,
  // but for now, we assume it finds and updates one or creates one.
  if (existing.length > 0) {
    let totalHours = null;
    if (clockIn && clockOut) {
      const start = new Date(clockIn);
      const end = new Date(clockOut);
      totalHours = (end - start) / (1000 * 60 * 60);
    }
    await db.query('UPDATE attendance SET clockIn = ?, clockOut = ?, totalHours = ?, status = ? WHERE id = ?', 
      [clockIn || existing[0].clockIn, clockOut, totalHours, 'present', existing[0].id]);
  } else {
    await db.query('INSERT INTO attendance (employeeId, date, clockIn, status) VALUES (?, ?, ?, ?)', 
      [employeeId, date, clockIn, 'present']);
  }
  
  const [attendance] = await db.query('SELECT * FROM attendance WHERE employeeId = ? AND date = ? ORDER BY id DESC LIMIT 1', [employeeId, date]);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(attendance[0]));
}


async function linkNFCCard(req, res, data) {
  const { employeeId, nfcCardId } = data;
  const [existing] = await db.query('SELECT * FROM employees WHERE nfcCardId = ?', [nfcCardId]);
  if (existing.length > 0 && existing[0].id !== employeeId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'NFC card already linked to another employee' }));
    return;
  }
  await db.query('UPDATE employees SET nfcCardId = ? WHERE id = ?', [nfcCardId, employeeId]);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, message: 'NFC card linked successfully' }));
}

// [FIX] This logic is now correct because the UNIQUE KEY in the DB was removed
async function handleNFCScan(req, res, data) {
  const { nfcCardId } = data;
  const scanTime = new Date();
  
  const [employees] = await db.query('SELECT * FROM employees WHERE nfcCardId = ?', [nfcCardId]);
  
  if (employees.length === 0) {
    await db.query('INSERT INTO nfc_scan_logs (nfcCardId, scanTime, action) VALUES (?, ?, ?)', [nfcCardId, scanTime, 'unassigned']);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'NFC card not assigned to any employee', nfcCardId }));
    broadcastToAll({ type: 'nfc_unassigned', nfcCardId: nfcCardId, scanTime: scanTime });
    return;
  }
  
  const employee = employees[0];
  const date = scanTime.toISOString().split('T')[0];
  
  // Check if there's an active (not clocked out) session today
  const [activeSession] = await db.query(
    'SELECT * FROM attendance WHERE employeeId = ? AND date = ? AND clockOut IS NULL ORDER BY clockIn DESC LIMIT 1',
    [employee.id, date]
  );
  
  let action = 'clock_in';
  let attendanceRecord = null;
  
  if (activeSession.length > 0) {
    // Clock out - update the active session
    const clockInTime = new Date(activeSession[0].clockIn);
    const totalHours = (scanTime - clockInTime) / (1000 * 60 * 60);
    
    await db.query(
      'UPDATE attendance SET clockOut = ?, totalHours = ? WHERE id = ?',
      [scanTime, totalHours, activeSession[0].id]
    );
    action = 'clock_out';
    const [updated] = await db.query('SELECT * FROM attendance WHERE id = ?', [activeSession[0].id]);
    attendanceRecord = updated[0];

  } else {
    // Clock in - create new session
    // This will no longer fail due to the removed UNIQUE key
    const [result] = await db.query(
      'INSERT INTO attendance (employeeId, date, clockIn, status) VALUES (?, ?, ?, ?)',
      [employee.id, date, scanTime, 'present']
    );
    action = 'clock_in';
    const [inserted] = await db.query('SELECT * FROM attendance WHERE id = ?', [result.insertId]);
    attendanceRecord = inserted[0];
  }
  
  // Log scan
  await db.query(
    'INSERT INTO nfc_scan_logs (nfcCardId, employeeId, scanTime, action) VALUES (?, ?, ?, ?)',
    [nfcCardId, employee.id, scanTime, action]
  );
    
  // Broadcast to all clients
  broadcastToAll({
    type: 'attendance_recorded',
    employee: employee,
    attendance: attendanceRecord, // Send the full record
    action: action,
    scanTime: scanTime
  });
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: true,
    employee: employee,
    action: action,
    attendance: attendanceRecord
  }));
}

async function getDepartments(req, res) {
  const [departments] = await db.query('SELECT * FROM departments ORDER BY name');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(departments));
}

async function getDashboardStats(req, res, params) {
  const employeeId = params.get('employee');
  if (employeeId) {
    const [tasks] = await db.query('SELECT COUNT(*) as total, SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed FROM tasks WHERE employeeId = ?', [employeeId]);
    const [projects] = await db.query('SELECT COUNT(*) as total FROM project_assignments WHERE employeeId = ?', [employeeId]);
    const today = new Date().toISOString().split('T')[0];
    const [attendance] = await db.query('SELECT * FROM attendance WHERE employeeId = ? AND date = ?', [employeeId, today]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tasks: tasks[0], projects: projects[0].total, todayAttendance: attendance[0] || null }));
  } else {
    const [employees] = await db.query('SELECT COUNT(*) as total FROM employees WHERE status = "active"');
    const [projects] = await db.query('SELECT COUNT(*) as total FROM projects');
    const today = new Date().toISOString().split('T')[0];
    const [inOffice] = await db.query('SELECT COUNT(*) as count FROM attendance WHERE date = ? AND clockOut IS NULL', [today]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ totalEmployees: employees[0].total, totalProjects: projects[0].total, presentToday: inOffice[0].count }));
  }
}

const options = {
  key: fs.readFileSync('./localhost+1-key.pem'),
  cert: fs.readFileSync('./localhost+1.pem')
};

const httpsServer = https.createServer(options, requestHandler);
const wss = new WebSocket.Server({ server: httpsServer });
const clients = new Set();

function broadcastToAll(data) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', (ws, req) => {
  console.log('✅ Client connected');
  clients.add(ws);
  ws.on('close', () => {
    console.log('❌ Client disconnected');
    clients.delete(ws);
  });
});

const PORT = 8080;
httpsServer.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Employee Management System Started!');
  console.log('='.repeat(50));
  console.log(`🔐 Login: https://localhost:${PORT}`);
  console.log(`👨‍💼 Admin Dashboard: https://localhost:${PORT}/admin`);
  console.log(`👤 Employee Dashboard: https://localhost:${PORT}/employee`);
  console.log(`📱 NFC Scanner: https://YOUR_IP:${PORT}/phone`);
  console.log(`🔗 NFC Register: https://localhost:${PORT}/nfc-register`);
  console.log('='.repeat(50));
});
