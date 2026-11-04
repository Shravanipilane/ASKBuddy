// import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
// import Home from './pages/Home'
// import Login from './pages/Login'
// import Signup from './pages/Signup'
// import Hub from './pages/Hub'
// import AskPage from './pages/AskPage'
// import Settings from './pages/Settings'
// import ChatHistory from "./pages/ChatHistory";
// import QrPage from './pages/QrPage'
// import PageTransition from './components/PageTransition'
// import ProtectedRoute from './components/ProtectedRoute'

// // Each <Route> says: "when the address is this path, show this page".
// // To add a new page later, add one more <Route> line here.
// // PageTransition wraps everything so every page change gets a fade + a fun line.
// export default function App() {
//   return (
//     <BrowserRouter>
//       <PageTransition>
//         <Routes>
//           <Route path="/" element={<Home />} />
//           <Route path="/login" element={<Login />} />
//           <Route path="/signup" element={<Signup />} />
// <<<<<<< HEAD

//           {/* Private pages: only for logged-in students */}
//           <Route path="/hub" element={<ProtectedRoute><Hub /></ProtectedRoute>} />
//           <Route path="/ask" element={<ProtectedRoute><AskPage /></ProtectedRoute>} />
//           <Route path="/qr" element={<ProtectedRoute><QrPage /></ProtectedRoute>} />

// =======
//           <Route path="/hub" element={<Hub />} />
//           <Route path="/ask" element={<AskPage />} />
//           <Route path="/settings" element={<Settings />} />
//           <Route path="/history" element={<ChatHistory />} />
//           <Route path="/qr" element={<QrPage />} />
// >>>>>>> aab979a26e1ee6d86072153f65f4a8546fcd93c7
//           {/* Any unknown address goes back to the Home page */}
//           <Route path="*" element={<Navigate to="/" replace />} />
//         </Routes>
//       </PageTransition>
//     </BrowserRouter>
//   )
// }



import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Hub from './pages/Hub'
import AskPage from './pages/AskPage'
import Settings from './pages/Settings'
import ChatHistory from "./pages/ChatHistory";
import QrPage from './pages/QrPage'
import PageTransition from './components/PageTransition'
import ProtectedRoute from './components/ProtectedRoute'

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
          <Route path="/qr" element={<ProtectedRoute><QrPage /></ProtectedRoute>} />

          {/* Other pages */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/history" element={<ChatHistory />} />

          {/* Unknown address goes to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransition>
    </BrowserRouter>
  )
}
