import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Hub from './pages/Hub'
import AskPage from './pages/AskPage'
import Settings from './pages/Settings'
import ChatHistory from './pages/ChatHistory'
import QrPage from './pages/QrPage'
import PageTransition from './components/PageTransition'
import ProtectedRoute from './components/ProtectedRoute'

// Each <Route> says: "when the address is this path, show this page".
// To add a new page later, add one more <Route> line here.
// PageTransition wraps everything so every page change gets a fade + a fun line.
export default function App() {
  return (
    <BrowserRouter>
      <PageTransition>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Private pages: only for logged-in students */}
          <Route path="/hub" element={<ProtectedRoute><Hub /></ProtectedRoute>} />
          <Route path="/ask" element={<ProtectedRoute><AskPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><ChatHistory /></ProtectedRoute>} />
          <Route path="/qr" element={<ProtectedRoute><QrPage /></ProtectedRoute>} />

          {/* Any unknown address goes back to the Home page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransition>
    </BrowserRouter>
  )
}