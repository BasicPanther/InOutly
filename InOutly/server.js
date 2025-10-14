const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create HTTP server to serve static files
const server = http.createServer((req, res) => {
  let filePath = '';
  
  if (req.url === '/') {
    filePath = path.join(__dirname, 'dashboard.html');
  } else if (req.url === '/phone') {
    filePath = path.join(__dirname, 'phone.html');
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

// Create WebSocket server
const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', (ws, req) => {
  console.log('✅ Client connected');
  clients.add(ws);

  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to attendance system',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📱 Received:', data);
      
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (error) {
      console.error('Error:', error);
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
    clients.delete(ws);
  });
});

const PORT = 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 NFC Attendance Server Started!');
  console.log('📊 Dashboard: http://localhost:8080');
  console.log('📱 Phone: http://YOUR-PC-IP:8080/phone');
  console.log('Waiting for connections...');
});
