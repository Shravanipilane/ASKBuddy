import { Link } from 'react-router-dom'
import Logo from './Logo'

// To add or remove a menu link, edit this list.
const links = [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how' },
    { label: 'Subjects', href: '#subjects' },
]

export default function Navbar() {
    return (
        <header className="border-b border-line bg-white">
            <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-16">
                <Link to="/" aria-label="ASKBuddy home">
                    <Logo />
                </Link>

                <nav className="flex flex-wrap items-center gap-x-7 gap-y-2 font-medium">
                    {links.map((link) => (
                        <a key={link.href} href={link.href} className="hover:text-primary">
                            {link.label}
                        </a>
                    ))}
                    <Link to="/login" className="font-bold hover:text-primary">
                        Log in
                    </Link>
                    <Link
                        to="/signup"
                        className="rounded-full bg-primary px-5 py-3 font-bold text-white hover:bg-primary-dark"
                    >
                        Sign up
                    </Link>
                </nav>
            </div>
        </header>
    )
}