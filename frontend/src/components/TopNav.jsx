import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { logout } from "../api/auth";

// Real logged-in user, saved by api/auth.js after login/signup.
function useCurrentUser() {
    try {
        const raw = sessionStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

const links = [
    { to: "/hub", label: "🏠 Hub" },
    { to: "/ask", label: "💬 Ask" },
];

// Shared top bar for every page past login: logo, nav links, profile menu.
// Drop this at the top of any page instead of rebuilding it per page.
export default function TopNav() {
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const user = useCurrentUser();
    const firstName = user?.name?.split(" ")[0] || "there";

    function handleLogout() {
        logout();
        navigate("/login");
    }

    return (
        <header className="relative z-10 flex items-center justify-between border-b-2 border-line bg-white px-6 py-4 sm:px-10">
            <Link to="/hub" aria-label="ASKBuddy home">
                <Logo />
            </Link>

            <div className="flex items-center gap-6">
                {links.map((l) => {
                    const active = location.pathname === l.to;
                    return (
                        <Link
                            key={l.to}
                            to={l.to}
                            className={`pb-1 font-display text-base font-bold transition ${active ? "border-b-2 border-primary text-primary" : "text-muted hover:text-ink"
                                }`}
                        >
                            {l.label}
                        </Link>
                    );
                })}

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        className="flex items-center gap-1.5 rounded-full border-2 border-line bg-surface p-1.5 pr-2.5 transition hover:border-primary"
                    >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-dark">
                            {firstName[0]?.toUpperCase() || "?"}
                        </span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border-2 border-line bg-white shadow-lg">
                            <Link
                                to="/profile"
                                onClick={() => setMenuOpen(false)}
                                className="block px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface"
                            >
                                Profile
                            </Link>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="block w-full px-4 py-2.5 text-left text-sm font-medium text-coral-ink hover:bg-coral-soft"
                            >
                                Log out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}