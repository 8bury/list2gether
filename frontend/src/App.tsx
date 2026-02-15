import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/Login'
import RegistroPage from './pages/Registro'
import HomePage from './pages/Home'
import ListPage from './pages/List'
import SettingsPage from './pages/Settings'
import JoinPage from './pages/Join'
import './App.css'

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: '#171717',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/list/:listId" element={<ProtectedRoute><ListPage /></ProtectedRoute>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegistroPage />} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/join/:code" element={<ProtectedRoute><JoinPage /></ProtectedRoute>} />
      </Routes>
    </>
  )
}
