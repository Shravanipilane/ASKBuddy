import { BookIcon } from './Icons'

// Temporary logo. We will replace it once the final logo is ready.
// light = true gives a white version for dark or colored backgrounds.
export default function Logo({ light = false }) {
    return (
        <span
            className={`flex items-center gap-2.5 font-display text-2xl font-extrabold ${light ? 'text-white' : 'text-ink'
                }`}
        >
            <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${light ? 'bg-white text-primary' : 'bg-primary text-white'
                    }`}
            >
                <BookIcon size={20} />
            </span>
            ASKBuddy
        </span>
    )
}