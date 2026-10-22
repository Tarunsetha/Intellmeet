import React, { useEffect, useState } from 'react';
import API from '../api/axios'; // Import your configured axios instance
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch meeting history on load
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await API.post('/meetings/history', {});
        if (response.data.success) {
          setMeetings(response.data.meetings);
        }
      } catch (err) {
        console.error("Failed to fetch meetings", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, []);

  const handleStartInstantMeeting = async () => {
    try {
      // Using API instance instead of raw axios to send the auth token
      const response = await API.post('/meetings/create', { 
        title: 'Instant Meeting' 
      });
      
      if (response.data.success) {
        const { meetingId } = response.data;
        navigate(`/lobby/${meetingId}`);
      }
    } catch (err) {
      console.error("Failed to create meeting", err);
    }
  };

  return (
    <div className="p-8 bg-gray-950 text-white min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Dashboard</h1>
        <button 
          onClick={handleStartInstantMeeting}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition">
          New Instant Meeting
        </button>
      </div>

      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
        <h2 className="text-xl font-semibold mb-4">Meeting History</h2>
        
        {loading ? (
          <p className="text-gray-400">Loading meetings...</p>
        ) : meetings.length === 0 ? (
          <p className="text-gray-400">No meetings created yet. Start one above!</p>
        ) : (
          <div className="space-y-3">
            {meetings.map((meeting) => (
              <div key={meeting._id} className="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
                <div>
                  <h3 className="font-semibold text-blue-400">{meeting.title || 'IntellMeet Session'}</h3>
                  <p className="text-xs text-gray-400">ID: {meeting.meetingId} | Created: {new Date(meeting.createdAt).toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => navigate(`/lobby/${meeting.meetingId}`)}
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition">
                  Rejoin
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}