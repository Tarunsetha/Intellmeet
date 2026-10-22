import React, { useState } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post('/auth/signup', { name, email, password });
      alert('Signup Successful!');
      localStorage.setItem('token', data.accessToken);
      navigate('/dashboard');
    } catch (error) {
      alert(error.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
      <form onSubmit={handleSignup} className="p-8 bg-gray-800 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Join IntellMeet</h2>
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 mb-4 bg-gray-700 rounded border border-gray-600 focus:outline-none"
          required
        />
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 bg-gray-700 rounded border border-gray-600 focus:outline-none"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-6 bg-gray-700 rounded border border-gray-600 focus:outline-none"
          required
        />
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded font-semibold transition">
          Sign Up
        </button>
      </form>
    </div>
  );
}