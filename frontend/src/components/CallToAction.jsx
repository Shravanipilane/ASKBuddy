import { Link } from 'react-router-dom'

export default function CallToAction() {
    return (
        <section className="mx-auto max-w-[1680px] px-6 py-22 lg:px-16">
            <div className="flex flex-wrap items-center justify-between gap-7 rounded-[32px] bg-amber px-10 py-14">
                <div className="flex max-w-[640px] flex-col gap-2.5">
                    <h2 className="font-display text-4xl font-extrabold leading-tight text-ink">
                        Stuck on a chapter? Just ask.
                    </h2>
                    <p className="text-lg leading-normal text-on-amber">
                        Open ASKBuddy, pick your book and get your first answer in a minute.
                    </p>
                </div>
                <Link
                    to="/signup"
                    className="rounded-full bg-ink px-8 py-4 text-lg font-bold text-white hover:bg-primary-dark"
                >
                    Create free account
                </Link>
            </div>
        </section>
    )
}