import { Link } from 'react-router-dom'
import ChatPreview from './ChatPreview'
import { ArrowIcon } from './Icons'

export default function Hero() {
    return (
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
                    Type or speak a question. ASKBuddy reads the chapter, understands its diagrams and tables,
                    and explains the answer in simple words, with the page it came from.
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
    )
}