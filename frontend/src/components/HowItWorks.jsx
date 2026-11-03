const steps = [
    {
        title: 'Scan your book',
        text: 'Scan the QR code printed on your textbook chapter, with your phone camera or by pasting the code. ASKBuddy opens that chapter for you.',
    },
    {
        title: 'Ask your question',
        text: 'Type it or say it. Point to a diagram or table and ask about that too.',
    },
    {
        title: 'Learn with the source',
        text: 'Read or listen to a clear answer, then open the exact chapter it came from.',
    },
]

export default function HowItWorks() {
    return (
        <section id="how" className="mx-auto flex max-w-[1680px] flex-col gap-11 px-6 lg:px-16 py-22">
            <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight lg:text-[44px]">
                From doubt to answer in three steps
            </h2>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
                {steps.map((step, index) => (
                    <div key={step.title} className="flex flex-col gap-3.5">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary font-display text-2xl font-extrabold text-white">
                            {index + 1}
                        </span>
                        <h3 className="font-display text-2xl font-bold">{step.title}</h3>
                        <p className="text-[17px] leading-relaxed text-muted">{step.text}</p>
                    </div>
                ))}
            </div>
        </section>
    )
}