import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function MeetingLobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  useEffect(() => {
    // Get user camera and microphone stream for preview
    async function getMedia() {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(userStream);
        if (videoRef.current) {
          videoRef.current.srcObject = userStream;
        }
      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    }
    getMedia();

    return () => {
      // Cleanup stream when leaving lobby
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleAudio = () => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = !isAudioMuted;
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks()[0].enabled = !isVideoMuted;
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const joinRoom = () => {
    // Stop preview stream so the room page can claim the media tracks
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    navigate(`/room/${roomId || 'default-room'}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-xl w-full bg-gray-800 p-6 rounded-xl shadow-xl flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">Ready to join IntellMeet?</h1>
        
        {/* Video Preview */}
        <div className="relative w-full h-72 bg-black rounded-lg overflow-hidden mb-6 flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {isVideoMuted && (
            <div className="absolute inset-flex items-center justify-center bg-gray-900 text-gray-400">
              Camera is off
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-6">
          <button 
            onClick={toggleAudio} 
            className={`px-4 py-2 rounded-lg font-semibold ${isAudioMuted ? 'bg-red-600' : 'bg-gray-700'}`}>
            {isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
          </button>
          <button 
            onClick={toggleVideo} 
            className={`px-4 py-2 rounded-lg font-semibold ${isVideoMuted ? 'bg-red-600' : 'bg-gray-700'}`}>
            {isVideoMuted ? 'Turn Video On' : 'Turn Video Off'}
          </button>
        </div>

        <button 
          onClick={joinRoom}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-lg transition">
          Join Now
        </button>
      </div>
    </div>
  );
}