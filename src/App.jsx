import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Landing from './pages/Landing'
import Register from './pages/Register'
import Login from './pages/Login'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Contact from './pages/Contact'
import Dashboard from './pages/Dashboard'
import Inbound from './pages/Inbound'
import BulkCall from './pages/BulkCall'
import Monitor from './pages/Monitor'
import Agents from './pages/Agents'
import History from './pages/History'
import Settings from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />

          {/* Protected */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/inbound" element={<ProtectedRoute><Inbound /></ProtectedRoute>} />
          <Route path="/dashboard/bulk" element={<ProtectedRoute><BulkCall /></ProtectedRoute>} />
          <Route path="/dashboard/monitor" element={<ProtectedRoute><Monitor /></ProtectedRoute>} />
          <Route path="/dashboard/agents" element={<ProtectedRoute><Agents /></ProtectedRoute>} />
          <Route path="/dashboard/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
