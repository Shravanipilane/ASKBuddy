// Small icons used across the site.
// Each icon is a function that returns an SVG picture.
// "currentColor" means the icon takes the text color of where it is placed.

function Icon({ size = 24, className = '', children }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
        >
            {children}
        </svg>
    )
}

export const BookIcon = (props) => (
    <Icon {...props}>
        <path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z" />
        <path d="M4 19a2 2 0 0 1 2-2h14" />
    </Icon>
)

export const MicIcon = (props) => (
    <Icon {...props}>
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
    </Icon>
)

export const ImageIcon = (props) => (
    <Icon {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
    </Icon>
)

export const QrIcon = (props) => (
    <Icon {...props}>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4" />
    </Icon>
)

export const UserIcon = (props) => (
    <Icon {...props}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
    </Icon>
)

export const TableIcon = (props) => (
    <Icon {...props}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18M9 4v16" />
    </Icon>
)

export const ArrowIcon = (props) => (
    <Icon {...props}>
        <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
)

export const EyeIcon = (props) => (
    <Icon {...props}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
    </Icon>
)

export const EyeOffIcon = (props) => (
    <Icon {...props}>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <path d="M1 1l22 22" />
    </Icon>
)

export const CheckIcon = (props) => (
    <Icon {...props}>
        <path d="M20 6 9 17l-5-5" />
    </Icon>
)