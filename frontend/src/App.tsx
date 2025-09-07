import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/Login'
import RegistroPage from './pages/Registro'
import HomePage from './pages/Home'
import ListPage from './pages/List'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/list/:listId" element={<ListPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegistroPage />} />
    </Routes>
  )
}

