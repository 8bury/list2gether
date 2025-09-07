import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/Login'
import RegistroPage from './pages/Registro'
import HomePage from './pages/Home'
import './App.css'

// removed old landing component; root now redirects to /home

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegistroPage />} />
    </Routes>
  )
}

