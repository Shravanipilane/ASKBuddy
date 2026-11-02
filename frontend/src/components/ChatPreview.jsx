import { BookIcon, MicIcon, UserIcon } from './Icons'

// A picture of how the Ask page will look.
// The text here is only an example, not a real answer from the backend.
export default function ChatPreview() {
    return (
        <div className="w-full max-w-[480px] overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_24px_60px_rgba(20,24,58,0.12)]">
            {/* Top bar */}
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber text-ink">
                    <UserIcon size={24} />
                </span>
                <div className="flex flex-col">
                    <span className="text-[17px] font-bold">ASKBuddy</span>
                    <span className="text-sm text-muted">Class 11 Biology</span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex flex-col gap-3.5 bg-surface p-5">
                <div className="max-w-[80%] self-end rounded-[18px] rounded-br-sm bg-primary px-4 py-3 leading-snug text-white">
                    What does the mitochondrion do in a cell?
                </div>

                <div className="flex max-w-[92%] flex-col gap-3 self-start rounded-[18px] rounded-bl-sm border border-line bg-white px-4 py-3.5 leading-normal">
                    <span>
                        Mitochondria are where the cell makes most of its usable energy, as ATP. That is why
                        they are called the powerhouses of the cell.
                    </span>

                    <div className="flex items-center gap-3.5 rounded-xl bg-primary-soft p-3">
                        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true" className="text-primary">
                            <ellipse cx="36" cy="36" rx="32" ry="20" fill="#fff" stroke="currentColor" strokeWidth="2.5" />
                            <path
                                d="M12 36c6-10 8 10 14 0s8 10 14 0 8 10 14 0"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                            />
                        </svg>
                        <span className="text-sm leading-snug">Diagram from your textbook, explained step by step</span>
                    </div>

                    <span className="flex items-center gap-2 self-start rounded-full bg-mint-soft px-3 py-1.5 text-[13px] font-bold text-mint-ink">
                        <BookIcon size={14} />
                        Class 11 Biology · Cell: The Unit of Life
                    </span>
                </div>
            </div>

            {/* Input bar */}
            <div className="flex items-center gap-2.5 border-t border-line px-4 py-3.5">
                <div className="min-w-0 flex-1 rounded-full border border-line-strong px-4.5 py-3 text-placeholder">
                    Ask anything from this chapter
                </div>
                <button
                    type="button"
                    aria-label="Ask by voice"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-amber text-ink"
                >
                    <MicIcon size={22} />
                </button>
            </div>
        </div>
    )
}