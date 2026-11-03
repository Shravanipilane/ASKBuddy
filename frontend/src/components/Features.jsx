import { BookIcon, ImageIcon, MicIcon, QrIcon, TableIcon, UserIcon } from './Icons'

// Colors for the small icon boxes. Full class names are written out
// so Tailwind can find them.
const tones = {
    primary: 'bg-primary-soft text-primary',
    amber: 'bg-amber-soft text-amber-ink',
    mint: 'bg-mint-soft text-mint-ink',
}

// To change a feature card, edit this list.
const features = [
    {
        icon: MicIcon,
        tone: 'primary',
        title: 'Ask by text or voice',
        text: 'Type your doubt or just say it out loud. ASKBuddy understands the chapter you are on and answers in context.',
    },
    {
        icon: ImageIcon,
        tone: 'amber',
        title: 'Understands diagrams and tables',
        text: 'Figures, graphs and data tables are part of the lesson. Ask about them and get an explanation, not just text.',
    },
    {
        icon: QrIcon,
        tone: 'mint',
        title: 'Scan the QR in your book',
        text: 'Scan the QR code printed on your NCERT chapter and ASKBuddy opens exactly that chapter. Then start asking questions right away, and every answer stays inside the chapter you are reading.',
    },
    {
        icon: BookIcon,
        tone: 'primary',
        title: 'Every answer shows its source',
        text: 'See the book and chapter behind each answer, so you can open the page and read it yourself.',
    },
    {
        icon: UserIcon,
        tone: 'amber',
        title: 'A friendly AI tutor',
        text: 'An animated avatar speaks the answer aloud, so learning feels like talking to a person, not reading a wall of text.',
    },
    {
        icon: TableIcon,
        tone: 'mint',
        title: 'Simple words, step by step',
        text: 'Hard ideas get broken into small steps you can follow, with no jargon left unexplained.',
    },
]

export default function Features() {
    return (
        <section id="features" className="border-y border-line bg-white">
            <div className="mx-auto flex max-w-[1680px] flex-col gap-11 px-6 lg:px-16 py-20">
                <div className="flex max-w-[680px] flex-col gap-3">
                    <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight lg:text-[44px]">
                        A study buddy that actually reads the book
                    </h2>
                    <p className="text-lg leading-relaxed text-muted">
                        Answers come from your NCERT chapters, not from guesswork, so you can trust what you
                        revise.
                    </p>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
                    {features.map(({ icon: FeatureIcon, tone, title, text }) => (
                        <div
                            key={title}
                            className="flex flex-col gap-3.5 rounded-3xl border border-line bg-surface p-7"
                        >
                            <span className={`flex h-13 w-13 items-center justify-center rounded-2xl ${tones[tone]}`}>
                                <FeatureIcon size={26} />
                            </span>
                            <h3 className="font-display text-2xl font-bold">{title}</h3>
                            <p className="leading-relaxed text-muted">{text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}