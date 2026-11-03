import { Link } from 'react-router-dom'
import ChatPreview from './ChatPreview'
import { ArrowIcon } from './Icons'

export default function Hero() {
    return (
        <>
            <section
                id="top"
                className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-14 px-6 pb-14 pt-16 lg:px-16 lg:pt-20"
            >
                {/* Left side: text and buttons */}
                <div className="flex min-w-0 flex-1 basis-[460px] flex-col gap-6">
                    <span className="self-start rounded-full bg-amber-soft px-3.5 py-2 text-sm font-bold text-amber-ink">
                        AI study assistant for NCERT Class 11 and 12
                    </span>

                    <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight lg:text-6xl xl:text-7xl">
                        Your NCERT textbooks, now answering back.
                    </h1>

                    <p className="max-w-[560px] text-xl leading-relaxed text-muted">
                        Scan the QR code in your textbook, then type or speak a question. ASKBuddy reads that
                        chapter, understands its diagrams and tables, and explains the answer in simple words,
                        with the page it came from.
                    </p>

                    <div className="flex flex-wrap gap-3.5">
                        <Link
                            id="start"
                            to="/signup"
                            className="flex items-center gap-2.5 rounded-full bg-primary px-8 py-4 text-lg font-bold text-white hover:bg-primary-dark"
                        >
                            Start asking
                            <ArrowIcon size={20} />
                        </Link>
                        <a
                            href="#how"
                            className="rounded-full border-2 border-line-strong bg-white px-7 py-3.5 text-lg font-bold hover:border-primary hover:text-primary"
                        >
                            See how it works
                        </a>
                    </div>
                </div>

                {/* Right side: example chat */}
                <div className="flex min-w-0 flex-1 basis-[420px] justify-center">
                    <ChatPreview />
                </div>
            </section>

            {/* Scan advert: explains the QR flow right under the hero */}
            <section className="mx-auto max-w-[1680px] px-6 pb-14 lg:px-16">
                <div className="rounded-3xl border-2 border-line bg-primary-soft p-8 lg:p-10">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="max-w-[640px]">
                            <span className="rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-primary">
                                📷 Scan your book
                            </span>
                            <h2 className="mt-3 font-display text-3xl font-extrabold text-ink lg:text-4xl">
                                Scan the QR in your NCERT book. Start asking in seconds.
                            </h2>
                            <p className="mt-2 text-lg text-muted">
                                Every NCERT chapter has a QR code. Scan it, and ASKBuddy opens that exact chapter for you.
                                Every answer then comes from the chapter you are reading.
                            </p>
                        </div>
                        <Link
                            to="/signup"
                            className="rounded-full bg-primary px-8 py-4 text-lg font-bold text-white hover:bg-primary-dark"
                        >
                            Try it now
                        </Link>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        {[
                            { icon: '📱', title: '1. Scan', text: 'Scan the QR on your chapter with your phone camera.' },
                            { icon: '📋', title: '2. Paste', text: 'On a laptop, paste the code or link into ASKBuddy. On a phone, scan right in the app.' },
                            { icon: '💬', title: '3. Ask', text: 'Type or speak your question and get answers from that chapter.' },
                        ].map((s) => (
                            <div key={s.title} className="rounded-2xl border-2 border-line bg-white p-5">
                                <div className="text-3xl">{s.icon}</div>
                                <h3 className="mt-2 font-display text-xl font-bold text-ink">{s.title}</h3>
                                <p className="mt-1 text-muted">{s.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    )
}