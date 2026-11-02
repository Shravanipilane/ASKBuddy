// Change these to match the books you have added.
const streams = [
    { name: 'Science', books: 'Physics, Chemistry, Biology' },
    { name: 'Commerce', books: 'Accountancy, Business Studies, Economics' },
    { name: 'Humanities', books: 'History, Geography, Political Science and more' },
]

export default function Subjects() {
    return (
        <section id="subjects" className="bg-ink text-white">
            <div className="mx-auto flex max-w-[1680px] flex-col gap-11 px-6 lg:px-16 py-22">
                <div className="flex max-w-[680px] flex-col gap-3">
                    <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight lg:text-[44px]">
                        Covers Class 11 and Class 12
                    </h2>
                    <p className="text-lg leading-relaxed text-on-ink-muted">
                        Pick your stream and start with the chapter you are studying today.
                    </p>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
                    {streams.map((stream) => (
                        // Later these will open the Library page for this stream
                        <a
                            key={stream.name}
                            href="#start"
                            className="flex flex-col gap-2.5 rounded-3xl bg-white p-8 text-ink hover:-translate-y-1 hover:shadow-xl"
                        >
                            <span className="font-display text-3xl font-extrabold">{stream.name}</span>
                            <span className="leading-normal text-muted">{stream.books}</span>
                            <span className="mt-2.5 font-bold text-primary">Open books</span>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    )
}