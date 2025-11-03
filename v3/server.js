const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123',
  database: 'employee_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
  });

async function generateEmployeeId() {
  const [rows] = await db.query('SELECT id FROM employees ORDER BY id DESC LIMIT 1');
  if (rows.length === 0) return 'EMP001';
  const lastId = rows[0].id;
  const number = parseInt(lastId.replace('EMP', '')) + 1;
  return `EMP${String(number).padStart(3, '0')}`;
}

const nfcScanTracker = new Map();

function formatDateForSQL(dateString) {
  if (!dateString) return null;
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  if (dateString.includes('T')) {
    return dateString.split('T')[0];
  }
  return dateString;
}

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

async function handleAPIRequest(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;
  
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  
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
      if (pathname === '/api/login' && method === 'POST') await handleLogin(req, res, data);
      else if (pathname === '/api/employees' && method === 'GET') await getEmployees(req, res);
      else if (pathname === '/api/employees' && method === 'POST') await createEmployee(req, res, data);
      else if (pathname.match(/\/api\/employees\/(.+)/) && method === 'PUT') {
        const id = pathname.match(/\/api\/employees\/(.+)/)[1];
        await updateEmployee(req, res, id, data);
      } else if (pathname.match(/\/api\/employees\/(.+)/) && method === 'DELETE') {
        const id = pathname.match(/\/api\/employees\/(.+)/)[1];
        await deleteEmployee(req, res, id);
      } else if (pathname === '/api/projects' && method === 'GET') await getProjects(req, res);
      else if (pathname === '/api/projects' && method === 'POST') await createProject(req, res, data);
      else if (pathname.match(/\/api\/projects\/(\d+)/) && method === 'PUT') {
        const id = pathname.match(/\/api\/projects\/(\d+)/)[1];
        await updateProject(req, res, id, data);
      } else if (pathname.match(/\/api\/projects\/(\d+)/) && method === 'DELETE') {
        const id = pathname.match(/\/api\/projects\/(\d+)/)[1];
        await deleteProject(req, res, id);
      } else if (pathname === '/api/attendance' && method === 'GET') await getAttendance(req, res, url.searchParams);
      else if (pathname === '/api/attendance/in-office' && method === 'GET') await getInOffice(req, res);
      else if (pathname === '/api/attendance/record' && method === 'POST') await recordAttendance(req, res, data);
      else if (pathname.match(/\/api\/attendance\/(\d+)/) && method === 'PUT') {
        const id = pathname.match(/\/api\/attendance\/(\d+)/)[1];
        await updateAttendance(req, res, id, data);
      } else if (pathname === '/api/nfc/link' && method === 'POST') await linkNFCCard(req, res, data);
      else if (pathname === '/api/nfc/scan' && method === 'POST') await handleNFCScan(req, res, data);
      else if (pathname === '/api/departments' && method === 'GET') await getDepartments(req, res);
      else if (pathname === '/api/stats/dashboard' && method === 'GET') await getDashboardStats(req, res, url.searchParams);
      
      // EMPLOYEE PORTAL ENDPOINTS
      else if (pathname === '/api/employee/stats' && method === 'GET') await getEmployeeStats(req, res, url.searchParams);
      else if (pathname === '/api/employee/attendance' && method === 'GET') await getEmployeeAttendance(req, res, url.searchParams);
      else if (pathname === '/api/employee/projects' && method === 'GET') await getEmployeeProjects(req, res, url.searchParams);
      
      // LEAVES ENDPOINTS
      else if (pathname === '/api/leaves' && method === 'POST') await createLeave(req, res, data);
      else if (pathname === '/api/leaves' && method === 'GET') await getLeaves(req, res, url.searchParams);
      else if (pathname === '/api/employee/leaves' && method === 'GET') await getEmployeeLeaves(req, res, url.searchParams);
      else if (pathname.match(/\/api\/leaves\/(\d+)/) && method === 'PUT') {
        const id = pathname.match(/\/api\/leaves\/(\d+)/)[1];
        await updateLeave(req, res, id, data);
      }
      
      // MEETING ROOMS ENDPOINTS
      else if (pathname === '/api/meeting-rooms' && method === 'GET') await getMeetingRooms(req, res);
      else if (pathname === '/api/meetings' && method === 'POST') await createMeetingBooking(req, res, data);
      else if (pathname === '/api/meetings' && method === 'GET') await getMeetingBookings(req, res, url.searchParams);
      else if (pathname === '/api/employee/meetings' && method === 'GET') await getEmployeeMeetings(req, res, url.searchParams);
      else if (pathname.match(/\/api\/meetings\/(\d+)/) && method === 'PUT') {
        const id = pathname.match(/\/api\/meetings\/(\d+)/)[1];
        await updateMeetingBooking(req, res, id, data);
      }
      
      // ADMIN APPROVALS
      else if (pathname === '/api/admin/approvals' && method === 'GET') await getAdminApprovals(req, res);
      
      else {
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

async function handleLogin(req, res, data) {
  const { username, password } = data;
  
  let [users] = await db.query('SELECT * FROM users WHERE username = ? AND password = ? AND role = "admin"', [username, password]);
  if (users.length > 0) {
    const user = users[0];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, user: { id: user.id, username: user.username, role: user.role, employeeId: user.employeeId }, employee: null }));
    return;
  }
  
  [users] = await db.query('SELECT id, email FROM employees WHERE id = ? LIMIT 1', [username]);
  if (users.length > 0 && password === '123') {
    const emp = users[0];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, user: null, employee: { id: emp.id, email: emp.email } }));
    return;
  }
  
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Invalid credentials' }));
}

async function getEmployeeStats(req, res, params) {
  const empId = params.get('id');
  try {
    const [attendance] = await db.query('SELECT COUNT(*) as presentDays, SUM(totalHours) as totalHours FROM attendance WHERE employeeId = ? AND status = "present"', [empId]);
    const [projects] = await db.query('SELECT COUNT(DISTINCT projectId) as count FROM project_assignments WHERE employeeId = ?', [empId]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      presentDays: attendance[0].presentDays || 0,
      totalHours: attendance[0].totalHours || 0,
      activeProjects: projects[0].count || 0
    }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function getEmployeeAttendance(req, res, params) {
  const empId = params.get('id');
  const month = params.get('month') || new Date().toISOString().slice(0, 7);
  try {
    const [attendance] = await db.query('SELECT * FROM attendance WHERE employeeId = ? AND DATE_FORMAT(date, "%Y-%m") = ? ORDER BY date DESC', [empId, month]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(attendance || []));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function getEmployeeProjects(req, res, params) {
  const empId = params.get('id');
  try {
    const [projects] = await db.query(`
      SELECT p.* FROM projects p
      INNER JOIN project_assignments pa ON p.id = pa.projectId
      WHERE pa.employeeId = ?
      ORDER BY p.status DESC, p.endDate
    `, [empId]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(projects || []));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function createLeave(req, res, data) {
  try {
    const [result] = await db.query(
      'INSERT INTO leaves (employeeId, leaveType, startDate, endDate, reason, status) VALUES (?, ?, ?, ?, ?, ?)',
      [data.employeeId, data.leaveType, data.startDate, data.endDate, data.reason, 'pending']
    );
    const [leave] = await db.query('SELECT * FROM leaves WHERE id = ?', [result.insertId]);
    broadcastToAll({ type: 'leave_requested', leave: leave[0] });
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(leave[0]));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function getLeaves(req, res, params) {
  try {
    const [leaves] = await db.query('SELECT l.*, e.name as employeeName, e.id as employeeId FROM leaves l LEFT JOIN employees e ON l.employeeId = e.id ORDER BY l.appliedDate DESC');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(leaves || []));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function getEmployeeLeaves(req, res, params) {
  const empId = params.get('id');
  try {
    const [leaves] = await db.query('SELECT * FROM leaves WHERE employeeId = ? ORDER BY appliedDate DESC', [empId]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(leaves || []));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function updateLeave(req, res, id, data) {
  try {
    if (data.status === 'cancelled') {
      await db.query(
        'UPDATE leaves SET status = ? WHERE id = ? AND status IN ("pending", "approved")',
        ['cancelled', id]
      );
    } else {
      await db.query(
        'UPDATE leaves SET status = ?, approvalDate = NOW(), comments = ? WHERE id = ?',
        [data.status, data.comments, id]
      );
    }
    
    const [leave] = await db.query('SELECT l.*, e.name as employeeName, e.id as employeeId FROM leaves l LEFT JOIN employees e ON l.employeeId = e.id WHERE l.id = ?', [id]);
    broadcastToAll({ type: 'leave_updated', leave: leave[0] });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(leave[0]));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function getMeetingRooms(req, res) {
  try {
    const [rooms] = await db.query('SELECT * FROM meeting_rooms WHERE isActive = true');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(rooms || []));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function createMeetingBooking(req, res, data) {
  try {
    const [result] = await db.query(
      'INSERT INTO meeting_bookings (roomId, employeeId, projectId, bookingDate, startTime, endTime, purpose, attendees, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.roomId, data.employeeId, data.projectId || null, data.bookingDate, data.startTime, data.endTime, data.purpose, data.attendees || null, 'pending']
    );
    const [booking] = await db.query(`
      SELECT mb.*, mr.name as roomName, e.name as employeeName, e.id as employeeId FROM meeting_bookings mb
      LEFT JOIN meeting_rooms mr ON mb.roomId = mr.id
      LEFT JOIN employees e ON mb.employeeId = e.id
      WHERE mb.id = ?
    `, [result.insertId]);
    broadcastToAll({ type: 'meeting_requested', booking: booking[0] });
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(booking[0]));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function getMeetingBookings(req, res, params) {
  try {
    const [bookings] = await db.query(`
      SELECT mb.*, mr.name as roomName, e.name as employeeName, e.id as employeeId FROM meeting_bookings mb
      LEFT JOIN meeting_rooms mr ON mb.roomId = mr.id
      LEFT JOIN employees e ON mb.employeeId = e.id
      ORDER BY mb.appliedDate DESC
    `);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(bookings || []));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function getEmployeeMeetings(req, res, params) {
  const empId = params.get('id');
  try {
    const [bookings] = await db.query(`
      SELECT mb.*, mr.name as roomName FROM meeting_bookings mb
      LEFT JOIN meeting_rooms mr ON mb.roomId = mr.id
      WHERE mb.employeeId = ?
      ORDER BY mb.appliedDate DESC
    `, [empId]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(bookings || []));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function updateMeetingBooking(req, res, id, data) {
  try {
    const updates = [];
    const values = [];
    
    if (data.status) {
      updates.push('status = ?');
      values.push(data.status);
    }
    
    if (data.attendees !== undefined) {
      updates.push('attendees = ?');
      values.push(data.attendees);
    }
    
    if (data.comments !== undefined) {
      updates.push('comments = ?');
      values.push(data.comments);
      updates.push('approvalDate = NOW()');
    }
    
    if (updates.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No fields to update' }));
      return;
    }
    
    values.push(id);
    await db.query(`UPDATE meeting_bookings SET ${updates.join(', ')} WHERE id = ?`, values);
    
    const [booking] = await db.query(`
      SELECT mb.*, mr.name as roomName, e.name as employeeName, e.id as employeeId FROM meeting_bookings mb
      LEFT JOIN meeting_rooms mr ON mb.roomId = mr.id
      LEFT JOIN employees e ON mb.employeeId = e.id
      WHERE mb.id = ?
    `, [id]);
    
    broadcastToAll({ type: 'meeting_updated', booking: booking[0] });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(booking[0]));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function getAdminApprovals(req, res) {
  try {
    const [leaves] = await db.query(`
      SELECT 
        l.id, 
        'leave' as type, 
        e.id as employeeId,
        e.name as employeeName,
        l.leaveType,
        l.startDate as startDate,
        l.endDate as endDate,
        l.status, 
        l.appliedDate,
        l.reason
      FROM leaves l 
      LEFT JOIN employees e ON l.employeeId = e.id 
      ORDER BY l.appliedDate DESC
    `);
    
    const [meetings] = await db.query(`
      SELECT 
        mb.id, 
        'meeting' as type, 
        e.id as employeeId,
        e.name as employeeName,
        mr.name as roomName,
        mb.bookingDate as date,
        mb.startTime,
        mb.endTime,
        mb.status, 
        mb.appliedDate,
        mb.purpose
      FROM meeting_bookings mb 
      LEFT JOIN meeting_rooms mr ON mb.roomId = mr.id
      LEFT JOIN employees e ON mb.employeeId = e.id 
      ORDER BY mb.appliedDate DESC
    `);
    
    const approvals = [...(leaves || []), ...(meetings || [])].sort((a, b) => 
      new Date(b.appliedDate) - new Date(a.appliedDate)
    );
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(approvals));
  } catch (err) {
    console.error('Error loading approvals:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

async function getEmployees(req, res) {
  const [employees] = await db.query('SELECT * FROM employees WHERE status = "active" ORDER BY id');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(employees));
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
  const [projects] = await db.query(`
    SELECT p.*, COUNT(DISTINCT pa.employeeId) as memberCount 
    FROM projects p
    LEFT JOIN project_assignments pa ON p.id = pa.projectId
    GROUP BY p.id
    ORDER BY p.status DESC, p.created_at DESC
  `);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(projects));
}

async function createProject(req, res, data) {
  const [result] = await db.query(
    'INSERT INTO projects (name, description, startDate, endDate, status, priority) VALUES (?, ?, ?, ?, ?, ?)',
    [data.name, data.description, formatDateForSQL(data.startDate), formatDateForSQL(data.endDate), data.status || 'ongoing', data.priority || 'medium']
  );
  
  const projectId = result.insertId;
  
  if (data.employees && data.employees.length > 0) {
    for (const empId of data.employees) {
      await db.query(
        'INSERT INTO project_assignments (projectId, employeeId, role, assignedDate) VALUES (?, ?, ?, ?)',
        [projectId, empId, 'Team Member', new Date()]
      );
    }
  }
  
  const [projects] = await db.query('SELECT * FROM projects WHERE id = ?', [projectId]);
  broadcastToAll({ type: 'project_created', project: projects[0] });
  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(projects[0]));
}

async function updateProject(req, res, projectId, data) {
  const updates = [];
  const values = [];
  
  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
  if (data.startDate !== undefined) { 
    updates.push('startDate = ?'); 
    values.push(formatDateForSQL(data.startDate)); 
  }
  if (data.endDate !== undefined) { 
    updates.push('endDate = ?'); 
    values.push(formatDateForSQL(data.endDate)); 
  }
  if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
  if (data.priority !== undefined) { updates.push('priority = ?'); values.push(data.priority); }
  
  if (updates.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'No fields to update' }));
    return;
  }
  
  values.push(projectId);
  await db.query(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, values);
  
  const [projects] = await db.query('SELECT * FROM projects WHERE id = ?', [projectId]);
  broadcastToAll({ type: 'project_updated', project: projects[0] });
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(projects[0]));
}

async function deleteProject(req, res, projectId) {
  await db.query('DELETE FROM project_assignments WHERE projectId = ?', [projectId]);
  await db.query('DELETE FROM projects WHERE id = ?', [projectId]);
  broadcastToAll({ type: 'project_deleted', projectId: projectId });
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true }));
}

async function getInOffice(req, res) {
  const today = new Date().toISOString().split('T')[0];
  const query = `
    SELECT e.id, e.name, e.department, e.position, a.clockIn, a.id as attendanceId
    FROM employees e
    INNER JOIN attendance a ON e.id = a.employeeId
    WHERE a.date = ? AND a.clockOut IS NULL AND a.status = 'present'
    ORDER BY a.clockIn DESC
  `;
  const [inOffice] = await db.query(query, [today]);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(inOffice));
}

async function getAttendance(req, res, params) {
  const employeeId = params.get('employee');
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');
  const date = params.get('date');
  
  let query = `
    SELECT a.id, a.employeeId, e.name as employeeName, a.clockIn, a.clockOut
    FROM attendance a
    LEFT JOIN employees e ON a.employeeId = e.id
    WHERE a.clockOut IS NOT NULL
  `;
  const queryParams = [];
  
  if (employeeId) { query += ' AND a.employeeId = ?'; queryParams.push(employeeId); }
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

async function recordAttendance(req, res, data) {
  const { employeeId, clockIn, clockOut } = data;
  const date = new Date(clockIn || clockOut).toISOString().split('T')[0];
  const [existing] = await db.query('SELECT * FROM attendance WHERE employeeId = ? AND date = ?', [employeeId, date]);
  if (existing.length > 0) {
    let totalHours = null;
    if (clockIn && clockOut) {
      const start = new Date(clockIn);
      const end = new Date(clockOut);
      totalHours = (end - start) / (1000 * 60 * 60);
    }
    await db.query('UPDATE attendance SET clockIn = ?, clockOut = ?, totalHours = ?, status = ? WHERE employeeId = ? AND date = ?', [clockIn || existing[0].clockIn, clockOut, totalHours, 'present', employeeId, date]);
  } else {
    await db.query('INSERT INTO attendance (employeeId, date, clockIn, status) VALUES (?, ?, ?, ?)', [employeeId, date, clockIn, 'present']);
  }
  const [attendance] = await db.query('SELECT * FROM attendance WHERE employeeId = ? AND date = ?', [employeeId, date]);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(attendance[0]));
}

async function updateAttendance(req, res, attendanceId, data) {
  const updates = [];
  const values = [];
  if (data.clockIn !== undefined) { updates.push('clockIn = ?'); values.push(data.clockIn); }
  if (data.clockOut !== undefined) { updates.push('clockOut = ?'); values.push(data.clockOut); }
  
  if (data.clockIn && data.clockOut) {
    const start = new Date(data.clockIn);
    const end = new Date(data.clockOut);
    const totalHours = (end - start) / (1000 * 60 * 60);
    updates.push('totalHours = ?');
    values.push(totalHours);
  }
  
  if (updates.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'No fields to update' }));
    return;
  }
  
  values.push(attendanceId);
  await db.query(`UPDATE attendance SET ${updates.join(', ')} WHERE id = ?`, values);
  const [attendance] = await db.query('SELECT a.*, e.name as employeeName FROM attendance a LEFT JOIN employees e ON a.employeeId = e.id WHERE a.id = ?', [attendanceId]);
  
  broadcastToAll({ type: 'attendance_updated', attendance: attendance[0] });
  
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

async function handleNFCScan(req, res, data) {
  const { nfcCardId } = data;
  const scanTime = new Date();
  
  const [employees] = await db.query('SELECT * FROM employees WHERE nfcCardId = ?', [nfcCardId]);
  
  if (employees.length === 0) {
    try {
      await db.query('INSERT INTO nfc_scan_logs (nfcCardId, scanTime, action) VALUES (?, ?, ?)', [nfcCardId, scanTime, 'unassigned']);
    } catch (err) {
      console.log('Log insert skipped:', err.message);
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'NFC card not assigned to any employee', nfcCardId }));
    broadcastToAll({ type: 'nfc_unassigned', nfcCardId: nfcCardId, scanTime: scanTime });
    return;
  }
  
  const employee = employees[0];
  const date = scanTime.toISOString().split('T')[0];
  
  const [activeSession] = await db.query(
    'SELECT * FROM attendance WHERE employeeId = ? AND date = ? AND clockOut IS NULL ORDER BY clockIn DESC LIMIT 1',
    [employee.id, date]
  );
  
  let action = 'clock_in';
  
  if (activeSession.length > 0) {
    const clockInTime = new Date(activeSession[0].clockIn);
    const timeDifference = (scanTime - clockInTime) / 1000;
    
    if (timeDifference < 10) {
      const waitTime = Math.ceil(10 - timeDifference);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: `Too fast! Wait ${waitTime} more seconds before clocking out`,
        waitTime: waitTime
      }));
      return;
    }
    
    const scanKey = `${employee.id}_clock_out`;
    const lastScanTime = nfcScanTracker.get(scanKey);
    if (lastScanTime && (scanTime - lastScanTime) < 2000) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Please wait before scanning again' }));
      return;
    }
    
    const totalHours = timeDifference / 3600;
    
    await db.query(
      'UPDATE attendance SET clockOut = ?, totalHours = ? WHERE id = ?',
      [scanTime, totalHours, activeSession[0].id]
    );
    action = 'clock_out';
    nfcScanTracker.set(scanKey, scanTime);
  } else {
    const scanKey = `${employee.id}_clock_in`;
    const lastScanTime = nfcScanTracker.get(scanKey);
    
    if (lastScanTime && (scanTime - lastScanTime) < 2000) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Please wait before scanning again' }));
      return;
    }
    
    await db.query(
      'INSERT INTO attendance (employeeId, date, clockIn, status) VALUES (?, ?, ?, ?)',
      [employee.id, date, scanTime, 'present']
    );
    action = 'clock_in';
    nfcScanTracker.set(scanKey, scanTime);
  }
  
  setTimeout(() => nfcScanTracker.delete(`${employee.id}_${action}`), 20000);
  
  try {
    await db.query(
      'INSERT INTO nfc_scan_logs (nfcCardId, employeeId, scanTime, action) VALUES (?, ?, ?, ?)',
      [nfcCardId, employee.id, scanTime, action]
    );
  } catch (err) {
    console.log('Log insert skipped:', err.message);
  }
  
  let attendanceRecord = null;
  if (action === 'clock_out') {
    const [completedSession] = await db.query(
      'SELECT * FROM attendance WHERE employeeId = ? AND date = ? ORDER BY clockIn DESC LIMIT 1',
      [employee.id, date]
    );
    attendanceRecord = completedSession[0] || null;
  } else {
    const [currentSession] = await db.query(
      'SELECT * FROM attendance WHERE employeeId = ? AND date = ? AND clockOut IS NULL ORDER BY clockIn DESC LIMIT 1',
      [employee.id, date]
    );
    attendanceRecord = currentSession[0] || null;
  }
  
  broadcastToAll({
    type: 'attendance_recorded',
    employee: employee,
    attendance: attendanceRecord,
    action: action,
    scanTime: scanTime
  });
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: true,
    employee: employee,
    action: action,
    attendance: attendanceRecord,
    message: action === 'clock_in' ? '✅ Clocked In' : '✅ Clocked Out'
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