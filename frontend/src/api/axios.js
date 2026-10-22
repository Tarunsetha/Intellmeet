import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
});

// Automatically check and attach token from localStorage
API.interceptors.request.use((config) => {
  // Check multiple possible key names used during login
  let token = localStorage.getItem('token') || localStorage.getItem('authToken');
  
  if (!token) {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        token = parsed.token || parsed.accessToken;
      } catch (e) {
        // ignore parse error
      }
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

export default API;