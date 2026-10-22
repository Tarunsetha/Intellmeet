const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path'); // Added for static file routing
const connectDB = require('./config/db');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const meetingRoutes = require('./routes/meetingRoutes');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app); // Wrap express in HTTP server

// Initialize Socket.io with CORS enabled for frontend
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5000', 'http://127.0.0.1:5000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({ 
  origin: ['http://localhost:5173', 'http://localhost:5000', 'http://127.0.0.1:5000'], 
  credentials: true 
}));
app.use(helmet({
  contentSecurityPolicy: false, // Prevents strict helmet rules from blocking inline scripts/styles
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/meetings', meetingRoutes);

// --- SERVE FRONTEND STATIC FILES ---
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Safe middleware fallback for React Router (avoids path-to-regexp crashes on newer express versions)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next(); // Let API requests pass through normally
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(500).send(err);
    }
  });
});

// WebRTC Signaling & Real-Time Chat via Socket.io
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joins a specific meeting room
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    console.log(`User ${userId} joined room: ${roomId}`);
    
    // Broadcast to other peers in the room that a new user joined
    socket.to(roomId).emit('user-connected', userId);

    // Handle real-time chat messages inside the room
    socket.on('send-message', (targetRoomId, data) => {
      io.to(targetRoomId).emit('receive-message', data);
    });

    // Handle typing indicators
    socket.on('typing', (targetRoomId, userName) => {
      socket.to(targetRoomId).emit('display-typing', userName);
    });

    socket.on('stop-typing', (targetRoomId) => {
      socket.to(targetRoomId).emit('hide-typing');
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });

  // WebRTC Signaling Offers / Answers / ICE Candidates
  socket.on('offer', (payload) => {
    io.to(payload.target).emit('offer', payload);
  });

  socket.on('answer', (payload) => {
    io.to(payload.target).emit('answer', payload);
  });

  socket.on('ice-candidate', (incoming) => {
    io.to(incoming.target).emit('ice-candidate', incoming);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with WebRTC & Chat active`);
});