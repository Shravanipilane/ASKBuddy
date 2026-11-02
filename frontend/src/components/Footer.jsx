export default function Footer() {
    return (
        <footer className="border-t border-line bg-white">
            <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-3 px-6 lg:px-16 py-7 text-[15px] text-muted">
                <span className="font-display text-xl font-extrabold text-ink">ASKBuddy</span>
                {/* Replace the text in [ ] with your real team and college names */}
                <span>Built by [TEAM NAMES] · [COLLEGE NAME]</span>
                <span>Not affiliated with NCERT. Answers are drawn from NCERT textbooks.</span>
            </div>
        </footer>
    )
}