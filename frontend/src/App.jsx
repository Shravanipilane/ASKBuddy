// // import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
// // import Home from './pages/Home'
// // import Login from './pages/Login'
// // import Signup from './pages/Signup'

// // // Each <Route> says: "when the address is this path, show this page".
// // // To add a new page later, add one more <Route> line here.
// // export default function App() {
// //   return (
// //     <BrowserRouter>
// //       <Routes>
// //         <Route path="/" element={<Home />} />
// //         <Route path="/login" element={<Login />} />
// //         <Route path="/signup" element={<Signup />} />
// //         {/* Any unknown address goes back to the Home page */}
// //         <Route path="*" element={<Navigate to="/" replace />} />
// //       </Routes>
// //     </BrowserRouter>
// //   )
// // }


// import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
// import Home from './pages/Home'
// import Login from './pages/Login'
// import Signup from './pages/Signup'
// import Hub from './pages/Hub'
// import AskPage from './pages/AskPage'

// // Each <Route> says: "when the address is this path, show this page".
// // To add a new page later, add one more <Route> line here.
// export default function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<Home />} />
//         <Route path="/login" element={<Login />} />
//         <Route path="/signup" element={<Signup />} />
//         <Route path="/hub" element={<Hub />} />
//         <Route path="/ask" element={<AskPage />} />
//         {/* Any unknown address goes back to the Home page */}
//         <Route path="*" element={<Navigate to="/" replace />} />
//       </Routes>
//     </BrowserRouter>
//   )
// }

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Hub from './pages/Hub'
import AskPage from './pages/AskPage'
import PageTransition from './components/PageTransition'

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
          <Route path="/hub" element={<Hub />} />
          <Route path="/ask" element={<AskPage />} />
          {/* Any unknown address goes back to the Home page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransition>
    </BrowserRouter>
  )
}