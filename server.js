const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Setup file upload storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.originalname, mimetype: req.file.mimetype });
});

// Proxy endpoint to bypass X-Frame-Options / CSP restrictions on client iframe
app.get('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const response = await fetch(targetUrl);
    const contentType = response.headers.get('content-type') || 'text/html';
    
    res.setHeader('Content-Type', contentType);
    
    if (contentType.includes('text/html')) {
      let body = await response.text();
      const urlObj = new URL(targetUrl);
      const baseTag = `<head><base href="${urlObj.origin}${urlObj.pathname}">`;
      body = body.replace('<head>', baseTag);
      res.send(body);
    } else {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).send('Proxy error: ' + error.message);
  }
});

// Store active connections
const clients = {}; // iPad clients: { id: { socketId, name, device } }
let adminSocketId = null;

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // 1. Identification
  socket.on('register-client', (data) => {
    clients[socket.id] = {
      id: socket.id,
      name: data.name || `iPad ${Object.keys(clients).length + 1}`,
      device: data.device || 'iPad'
    };
    console.log(`iPad registered: ${clients[socket.id].name} (${socket.id})`);
    
    // Notify admin of updated client list
    if (adminSocketId) {
      io.to(adminSocketId).emit('update-clients', Object.values(clients));
    }
  });

  socket.on('register-admin', () => {
    adminSocketId = socket.id;
    console.log(`Admin registered: ${socket.id}`);
    socket.emit('update-clients', Object.values(clients));
  });

  // 2. WebRTC Signaling (Admin <-> Client)
  // Direct signaling pass-through
  socket.on('webrtc-signal', ({ targetId, streamType, signal }) => {
    io.to(targetId).emit('webrtc-signal', {
      senderId: socket.id,
      streamType,
      signal
    });
  });

  // 3. File Push
  socket.on('push-file', ({ targetId, fileUrl, fileType, fileName }) => {
    console.log(`Pushing file to ${targetId || 'all'}: ${fileName} (${fileUrl})`);
    const payload = { fileUrl, fileType, fileName };
    if (targetId) {
      io.to(targetId).emit('receive-file', payload);
    } else {
      socket.broadcast.emit('receive-file', payload); // Broadcast to all clients
    }
  });

  // 4. Remote Control Command
  socket.on('remote-control', ({ targetId, action, data }) => {
    console.log(`Remote control command [${action}] to ${targetId}`);
    io.to(targetId).emit('remote-control', { action, data });
  });

  // 5. Broadcast Stream Alert (Admin broadcasts screen to iPads)
  socket.on('admin-broadcast-start', () => {
    console.log(`Admin started broadcasting screen`);
    socket.broadcast.emit('admin-broadcast-started', { adminId: socket.id });
  });

  socket.on('admin-broadcast-stop', () => {
    console.log(`Admin stopped broadcasting screen`);
    socket.broadcast.emit('admin-broadcast-stopped');
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    if (socket.id === adminSocketId) {
      console.log('Admin disconnected');
      adminSocketId = null;
    } else if (clients[socket.id]) {
      console.log(`iPad disconnected: ${clients[socket.id].name}`);
      delete clients[socket.id];
      if (adminSocketId) {
        io.to(adminSocketId).emit('update-clients', Object.values(clients));
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Access Admin Dashboard: http://localhost:${PORT}/admin.html`);
  console.log(`Access iPad Client: http://localhost:${PORT}/client.html`);
});
