import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import MeetingLobby from './pages/MeetingLobby';
import Room from './pages/Room';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Using :meetingId consistently with your Dashboard */}
        <Route path="/lobby/:meetingId" element={<MeetingLobby />} />
        <Route path="/room/:meetingId" element={<Room />} />
      </Routes>
    </Router>
  );
}

export default App;