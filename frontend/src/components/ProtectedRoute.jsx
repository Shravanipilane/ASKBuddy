import { Navigate } from 'react-router-dom'
import { getToken } from '../api/auth'

// Shows the page only if the student is logged in.
// Otherwise sends them to the Login page.
export default function ProtectedRoute({ children }) {
    return getToken() ? children : <Navigate to="/login" replace />
}