import { useLocation } from 'react-router-dom'

// Wrap your <Routes> with this once, in App.jsx. Every time the address
// changes, the new page fades + slides up in instead of snapping instantly.
// No popup message — just the motion.
export default function PageTransition({ children }) {
    const location = useLocation()

    return (
        // key={pathname} makes React remount this div on every route change,
        // which is what re-triggers the fade-up animation each time —
        // including programmatic navigation like navigate('/hub') after login.
        <div key={location.pathname} className="motion-safe:animate-fade-up">
            {children}
        </div>
    )
}