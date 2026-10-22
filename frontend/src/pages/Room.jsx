import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

// Automatically connects to whichever host/IP you are using (localhost or your network IP)
const socket = io(`http://${window.location.hostname}:5000`, {
  withCredentials: true,
});

export default function Room() {
  const { meetingId } = useParams(); // Using meetingId matching your App.jsx
  const navigate = useNavigate();
  const userVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isSharingScreen, setIsSharingScreen] = useState(false);

  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [typingUser, setTypingUser] = useState('');
  const [userName] = useState('Tarun'); 
  
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [remoteUserJoined, setRemoteUserJoined] = useState(false);

  const peerConnectionRef = useRef(null);

  // Configuration for WebRTC Free STUN servers
  const servers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    // Get local media stream and set up WebRTC
    async function initRoom() {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(userStream);
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = userStream;
        }

        // Join room via socket once stream is ready
        socket.emit('join-room', meetingId, userName);

      } catch (err) {
        console.error("Failed to get local stream or join room", err);
      }
    }
    initRoom();

    // Socket Event Listeners for WebRTC signaling
    socket.on('user-connected', async (userId) => {
      console.log('User connected to room:', userId);
      setRemoteUserJoined(true);
      
      // Create Peer Connection as caller
      createPeerConnection(userId, true);
    });

    socket.on('offer', async ({ payload, target }) => {
      setRemoteUserJoined(true);
      await createPeerConnection(target, false);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socket.emit('answer', { target: userIdFromSocket(), payload: answer });
      }
    });

    socket.on('answer', async ({ payload }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload));
      }
    });

    socket.on('ice-candidate', async ({ incoming }) => {
      if (peerConnectionRef.current && incoming) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(incoming));
        } catch (e) {
          console.error('Error adding received ice candidate', e);
        }
      }
    });

    // Listen for incoming chat messages
    socket.on('receive-message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    // Listen for typing events
    socket.on('display-typing', (name) => {
      setTypingUser(`${name} is typing...`);
    });

    socket.on('hide-typing', () => {
      setTypingUser('');
    });

    socket.on('user-disconnected', () => {
      setRemoteUserJoined(false);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    });

    return () => {
      socket.off('user-connected');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('receive-message');
      socket.off('display-typing');
      socket.off('hide-typing');
      socket.off('user-disconnected');

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      socket.disconnect();
    };
  }, [meetingId, userName]);

  // Helper to get socket ID
  const userIdFromSocket = () => socket.id;

  // Initialize WebRTC Peer Connection
  const createPeerConnection = async (targetId, isCreator) => {
    if (peerConnectionRef.current) return;

    peerConnectionRef.current = new RTCPeerConnection(servers);

    // Add local tracks to peer connection
    if (stream) {
      stream.getTracks().forEach((track) => {
        peerConnectionRef.current.addTrack(track, stream);
      });
    }

    // Handle incoming remote tracks
    peerConnectionRef.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // ICE candidates handler
    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { target: targetId, incoming: event.candidate });
      }
    };

    // If caller, create offer
    if (isCreator) {
      try {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        socket.emit('offer', { target: targetId, payload: offer });
      } catch (err) {
        console.error("Error creating WebRTC offer", err);
      }
    }
  };

  // Fixed Audio Toggle
  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const nextMutedState = !isAudioMuted;
        audioTrack.enabled = !nextMutedState; 
        setIsAudioMuted(nextMutedState);
      }
    }
  };

  // Fixed Video Toggle
  const toggleVideo = () => {
    const activeStream = isSharingScreen ? screenStream : stream;
    if (activeStream) {
      const videoTrack = activeStream.getVideoTracks()[0];
      if (videoTrack) {
        const nextVideoState = !isVideoMuted;
        videoTrack.enabled = !nextVideoState;
        setIsVideoMuted(nextVideoState);
      }
    }
  };

  // Screen Sharing Toggle with safety checks
  const handleShareScreen = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert("Screen sharing is not supported or blocked in this browser context.");
        return;
      }

      if (!isSharingScreen) {
        const sStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(sStream);
        
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = sStream;
        }
        setIsSharingScreen(true);
        setIsVideoMuted(false);

        // Replace track in peer connection if active
        if (peerConnectionRef.current) {
          const videoSender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(sStream.getVideoTracks()[0]);
          }
        }

        sStream.getVideoTracks()[0].onended = () => {
          stopScreenShare(sStream);
        };
      } else {
        stopScreenShare(screenStream);
      }
    } catch (err) {
      console.error("Error sharing screen:", err);
    }
  };

  const stopScreenShare = (sStream) => {
    if (sStream) {
      sStream.getTracks().forEach(track => track.stop());
    }
    if (userVideoRef.current && stream) {
      userVideoRef.current.srcObject = stream;
      if (peerConnectionRef.current) {
        const videoSender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(stream.getVideoTracks()[0]);
        }
      }
    }
    setIsSharingScreen(false);
    setScreenStream(null);
  };

  // Chat message submission
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const messageData = { 
      sender: userName, 
      text: messageInput, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    socket.emit('send-message', meetingId, messageData);
    socket.emit('stop-typing', meetingId, userName);
    setMessageInput('');
  };

  // Typing indicator trigger
  const handleTyping = (e) => {
    setMessageInput(e.target.value);
    if (e.target.value.length > 0) {
      socket.emit('typing', meetingId, userName);
    } else {
      socket.emit('stop-typing', meetingId, userName);
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Main Content (Video Grid & Controls) */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-lg">IntellMeet Room: <span className="text-blue-400">{meetingId}</span></h2>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Meeting link copied to clipboard!");
              }}
              className="bg-gray-800 hover:bg-gray-700 text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1">
              📋 Copy Invite Link
            </button>
          </div>
          <span className="text-sm bg-green-600 px-3 py-1 rounded-full">Connected</span>
        </div>

        {/* Video Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-6 overflow-hidden">
          {/* Local Video */}
          <div className="relative bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center border border-gray-800">
            <video ref={userVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <span className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-sm">
              {userName} {isSharingScreen ? '(Sharing Screen)' : '(You)'}
            </span>
          </div>

          {/* Remote Video / Participant */}
          <div className="relative bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center border border-gray-800 text-gray-500">
            <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${!remoteUserJoined ? 'hidden' : ''}`} />
            {!remoteUserJoined && (
              <p>Waiting for other participants to join...</p>
            )}
            <span className={`absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-sm text-white ${!remoteUserJoined ? 'hidden' : ''}`}>
              Participant
            </span>
          </div>
        </div>

        {/* Control Toolbar */}
        <div className="flex justify-center items-center gap-4 py-4 bg-gray-900 border-t border-gray-800">
          <button 
            onClick={toggleAudio} 
            className={`px-4 py-2 rounded-lg font-semibold ${isAudioMuted ? 'bg-red-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
            {isAudioMuted ? 'Unmute' : 'Mute'}
          </button>
          <button 
            onClick={toggleVideo} 
            className={`px-4 py-2 rounded-lg font-semibold ${isVideoMuted ? 'bg-red-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
            {isVideoMuted ? 'Start Video' : 'Stop Video'}
          </button>
          <button 
            onClick={handleShareScreen} 
            className={`px-4 py-2 rounded-lg font-semibold ${isSharingScreen ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`}>
            {isSharingScreen ? 'Stop Sharing' : 'Share Screen'}
          </button>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-bold">
            Leave
          </button>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 font-bold">Meeting Chat</div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((msg, idx) => (
            <div key={idx} className="bg-gray-800 p-3 rounded-lg">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span className="font-semibold text-blue-400">{msg.sender}</span>
                <span>{msg.time}</span>
              </div>
              <p className="text-sm">{msg.text}</p>
            </div>
          ))}
        </div>

        {typingUser && <div className="px-4 py-1 text-xs text-gray-400 italic">{typingUser}</div>}

        <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-800 flex gap-2">
          <input 
            type="text" 
            value={messageInput} 
            onChange={handleTyping}
            placeholder="Type a message..." 
            className="flex-1 bg-gray-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button type="submit" className="bg-blue-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">Send</button>
        </form>
      </div>
    </div>
  );
}