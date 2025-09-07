import { Routes, Route, Link } from 'react-router-dom'
import LoginPage from './pages/Login'
import RegistroPage from './pages/Registro'
import HomePage from './pages/Home'
import './App.css'

function Home() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center flex flex-col items-center gap-3">
        <h1 className="text-3xl font-semibold">list2gether</h1>
        <div className="flex gap-3">
          <Link className="underline" to="/login">Entrar</Link>
          <span>•</span>
          <Link className="underline" to="/registro">Registrar</Link>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegistroPage />} />
    </Routes>
  )
}

