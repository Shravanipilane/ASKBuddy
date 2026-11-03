import { Link } from "react-router-dom";
import Avatar from "../components/Avatar";
import TopNav from "../components/TopNav";

// Real logged-in user, saved by api/auth.js after login/signup.
function useCurrentUser() {
    try {
        const raw = sessionStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

// TODO: replace with real data from the backend once it's connected.
const mockActivity = {
    favorites: [
        { item_type: "subject", item_name: "Biology" },
        { item_type: "book", item_name: "Physics Part 1" },
    ],
    recentProgress: [
        { book: "Biology", chapter: "Chapter 3: Plant Kingdom" },
        { book: "Chemistry", chapter: "Chapter 1: Basic Concepts" },
    ],
};

// Same accent colors used across the Login/Signup colored side —
// coral, primary, amber, mint — just rotated across the six cards.
const leftFeatures = [
    { key: "saved", title: "Saved Questions", desc: "Bookmarked answers to revisit", to: "/saved", icon: "🔖", bg: "bg-coral-soft", ink: "text-coral-ink" },
    { key: "history", title: "Chat History", desc: "Everything you've asked, by session", to: "/history", icon: "💬", bg: "bg-primary-soft", ink: "text-primary-dark" },
    { key: "favorites", title: "Favorites", desc: "Pinned subjects and books", to: "/favorites", icon: "⭐", bg: "bg-amber-soft", ink: "text-amber-ink" },
];

const rightFeatures = [
    { key: "progress", title: "Progress", desc: "Chapters you've covered so far", to: "/progress", icon: "📈", bg: "bg-mint-soft", ink: "text-mint-ink" },
    { key: "profile", title: "Profile", desc: "Class, stream and account details", to: "/profile", icon: "👤", bg: "bg-primary-soft", ink: "text-primary-dark" },
    { key: "settings", title: "Settings", desc: "Voice, TTS speed, language, theme", to: "/settings", icon: "⚙️", bg: "bg-coral-soft", ink: "text-coral-ink" },
];

function ChevronIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-line-strong transition group-hover:text-primary">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function FeatureCard({ title, desc, to, icon, bg, ink }) {
    return (
        <Link
            to={to}
            className="group mx-auto flex w-full max-w-[380px] items-center gap-5 rounded-2xl border-2 border-line bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
        >
            <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl ${bg} ${ink}`}>
                {icon}
            </span>
            <span className="flex flex-1 flex-col gap-1">
                <span className="font-display text-xl font-bold text-ink">{title}</span>
                <span className="text-base text-muted">{desc}</span>
            </span>
            <ChevronIcon />
        </Link>
    );
}

export default function Hub() {
    const user = useCurrentUser();
    const firstName = user?.name?.split(" ")[0] || "there";

    return (
        <div className="min-h-screen w-full bg-surface">
            <TopNav />

            {/* Decorative background + hero */}
            <div className="relative overflow-hidden bg-gradient-to-b from-primary-soft via-surface to-surface px-6 pb-10 pt-24 sm:px-10 sm:pt-28">
                <span aria-hidden="true" className="pointer-events-none absolute left-10 top-10 text-5xl opacity-20 motion-safe:animate-float">📖</span>
                <span aria-hidden="true" className="pointer-events-none absolute left-[22%] top-24 text-2xl opacity-30 motion-safe:animate-float" style={{ animationDelay: "1s" }}>✨</span>
                <span aria-hidden="true" className="pointer-events-none absolute right-10 top-10 text-5xl opacity-20 motion-safe:animate-float" style={{ animationDirection: "alternate-reverse" }}>💡</span>
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-primary/10 motion-safe:animate-float" />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-10 h-64 w-64 rounded-full bg-coral/10 motion-safe:animate-float" style={{ animationDirection: "alternate-reverse" }} />

                <div className="mx-auto grid w-full max-w-[1700px] grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_520px_1fr]">
                    {/* Left column */}
                    <div className="relative order-2 flex flex-col gap-5 lg:order-1 motion-safe:animate-fade-up" style={{ animationDelay: "160ms" }}>
                        {leftFeatures.map((f) => (
                            <FeatureCard key={f.key} {...f} />
                        ))}
                    </div>

                    {/* Center: avatar + greeting + CTA */}
                    <div className="relative order-1 flex flex-col items-center gap-3 lg:order-2 motion-safe:animate-fade-up">
                        <div className="relative">
                            <Avatar size="lg" greeting={`Hey, I'm your Buddy, ${firstName}! 👋`} />
                            <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary text-base shadow-md">
                                🎓
                            </span>
                        </div>

                        <div className="text-center">
                            <h1 className="font-display text-3xl font-extrabold text-ink">
                                Welcome back,
                                <br />
                                <span className="text-primary">{firstName}!</span> 🤍
                            </h1>
                            <p className="relative mt-2 inline-block text-muted">
                                Keep learning, keep asking!
                                <svg
                                    aria-hidden="true"
                                    width="150"
                                    height="8"
                                    viewBox="0 0 150 8"
                                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-primary-soft"
                                >
                                    <path d="M2 5c20-6 108-6 146 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
                                </svg>
                            </p>
                        </div>

                        {/* Main action: scan the book first */}
                        <Link
                            to="/qr"
                            className="mt-4 w-full rounded-full bg-primary px-6 py-3.5 text-center font-display text-lg font-bold text-white shadow-md transition hover:bg-primary-dark"
                        >
                            📷 Scan your book to start
                        </Link>
                        <p className="text-center text-sm text-muted">
                            Scan the QR in your NCERT chapter, then ask your questions.
                        </p>
                    </div>

                    {/* Right column */}
                    <div className="relative order-3 flex flex-col gap-5 motion-safe:animate-fade-up" style={{ animationDelay: "160ms" }}>
                        {rightFeatures.map((f) => (
                            <FeatureCard key={f.key} {...f} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Pinned + recent progress */}
            <div className="mx-auto mt-6 grid w-full max-w-[1600px] grid-cols-1 gap-6 px-6 pb-10 sm:px-10 md:grid-cols-2 motion-safe:animate-fade-up" style={{ animationDelay: "280ms" }}>
                <div className="rounded-2xl border-2 border-line bg-white p-5">
                    <h3 className="font-display text-lg font-bold text-ink mb-3">Pinned</h3>
                    {mockActivity.favorites.length === 0 ? (
                        <p className="text-sm text-placeholder">No favorites yet — pin a subject or book from the Library.</p>
                    ) : (
                        <ul className="space-y-2">
                            {mockActivity.favorites.map((fav, i) => (
                                <li key={i} className="text-sm text-muted">
                                    {fav.item_type === "subject" ? "📘" : "📗"} {fav.item_name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="rounded-2xl border-2 border-line bg-white p-5">
                    <h3 className="font-display text-lg font-bold text-ink mb-3">Pick up where you left off</h3>
                    <div className="flex flex-wrap gap-3">
                        {mockActivity.recentProgress.map((p, i) => (
                            <span key={i} className="flex items-center gap-2 rounded-full border-2 border-line bg-surface px-3.5 py-1.5 text-sm text-muted">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-2.5 py-0.5 text-[13px] font-bold text-mint-ink">
                                    {p.book}
                                </span>
                                {p.chapter}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}