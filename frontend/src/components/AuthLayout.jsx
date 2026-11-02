// import { useEffect, useState } from 'react'
// import { Link } from 'react-router-dom'
// import Logo from './Logo'
// import { BookIcon, ImageIcon, MicIcon } from './Icons'

// // The points shown on the colored side. Edit the texts here.
// const perks = [
//     { icon: MicIcon, text: 'Ask by typing or by speaking' },
//     { icon: ImageIcon, text: 'Diagrams and tables explained step by step' },
//     { icon: BookIcon, text: 'See the exact chapter behind every answer' },
// ]

// // How long ASKBuddy "types" in the example card before the answer appears (in milliseconds)
// const TYPING_TIME = 2400

// // A small helper: gives an element a delay before its opening animation starts.
// const after = (milliseconds) => ({ animationDelay: `${milliseconds}ms` })

// // The shared frame for the Login and Sign up pages:
// // a colored side with ASKBuddy ideas, and the form on the other side.
// // "children" is the form that each page puts inside.
// //
// // When the screen opens, things slide and fade in one after another.
// // "motion-safe:" means these animations are skipped for people who turned
// // animations off in their device settings.
// export default function AuthLayout({ title, subtitle, footer, children }) {
//     // true = the example card shows the three bouncing dots, then the answer.
//     // People who turned animations off see the answer straight away.
//     const [typing, setTyping] = useState(
//         () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
//     )

//     useEffect(() => {
//         if (!typing) return
//         const timer = setTimeout(() => setTyping(false), TYPING_TIME)
//         return () => clearTimeout(timer)
//     }, [typing])

//     return (
//         <div className="grid min-h-screen bg-white lg:grid-cols-2">
//             {/* Colored side. It is hidden on phones. */}
//             <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-white motion-safe:animate-slide-in-left lg:flex xl:p-16">
//                 {/* Two soft circles that slowly drift */}
//                 <span
//                     aria-hidden="true"
//                     className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 motion-safe:animate-float"
//                 />
//                 <span
//                     aria-hidden="true"
//                     className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-amber/25 motion-safe:animate-float [animation-direction:alternate-reverse]"
//                 />

//                 <Link
//                     to="/"
//                     aria-label="ASKBuddy home"
//                     className="relative self-start motion-safe:animate-fade-up"
//                     style={after(250)}
//                 >
//                     <Logo light />
//                 </Link>

//                 <div className="relative flex flex-col gap-10">
//                     <h2
//                         className="max-w-[520px] font-display text-5xl font-extrabold leading-[1.05] tracking-tight motion-safe:animate-fade-up xl:text-6xl"
//                         style={after(350)}
//                     >
//                         Your textbooks, ready to answer.
//                     </h2>

//                     <ul className="flex flex-col gap-4">
//                         {perks.map(({ icon: PerkIcon, text }, index) => (
//                             <li
//                                 key={text}
//                                 className="flex items-center gap-3.5 text-lg motion-safe:animate-fade-up"
//                                 style={after(550 + index * 130)}
//                             >
//                                 <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
//                                     <PerkIcon size={22} />
//                                 </span>
//                                 {text}
//                             </li>
//                         ))}
//                     </ul>

//                     {/* A small example answer, only for decoration. It "types" first, then shows the answer. */}
//                     <div
//                         className="max-w-[460px] rounded-3xl bg-white p-5 text-ink shadow-xl motion-safe:animate-pop-in"
//                         style={after(1000)}
//                     >
//                         <p className="text-sm font-bold text-muted">You asked</p>
//                         <p className="mb-3 mt-1 font-medium">What does the mitochondrion do?</p>

//                         <div className="min-h-[96px]">
//                             {typing ? (
//                                 <div
//                                     role="status"
//                                     aria-label="ASKBuddy is typing"
//                                     className="flex items-center gap-1.5 pt-3"
//                                 >
//                                     {[0, 160, 320].map((delay) => (
//                                         <span
//                                             key={delay}
//                                             className="h-2.5 w-2.5 rounded-full bg-primary motion-safe:animate-dot-bounce"
//                                             style={after(delay)}
//                                         />
//                                     ))}
//                                 </div>
//                             ) : (
//                                 <div className="motion-safe:animate-fade-up">
//                                     <p className="leading-normal">
//                                         It makes most of the cell's usable energy as ATP, so it is called the powerhouse
//                                         of the cell.
//                                     </p>
//                                     <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-mint-soft px-3 py-1.5 text-[13px] font-bold text-mint-ink">
//                                         <BookIcon size={14} />
//                                         Class 11 Biology · Cell: The Unit of Life
//                                     </span>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 </div>

//                 <p className="relative text-sm text-white/90 motion-safe:animate-fade-up" style={after(1300)}>
//                     Class 11 and 12 · Science, Commerce, Humanities
//                 </p>
//             </aside>

//             {/* Form side */}
//             <main className="flex flex-col px-6 py-8 sm:px-12">
//                 {/* On phones the logo is shown here, because the colored side is hidden */}
//                 <Link
//                     to="/"
//                     aria-label="ASKBuddy home"
//                     className="self-start motion-safe:animate-fade-up lg:hidden"
//                 >
//                     <Logo />
//                 </Link>

//                 <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center gap-8 py-10">
//                     <div className="flex flex-col gap-2 motion-safe:animate-fade-up" style={after(200)}>
//                         <h1 className="font-display text-4xl font-extrabold tracking-tight">{title}</h1>
//                         <p className="text-lg text-muted">{subtitle}</p>
//                     </div>

//                     <div className="motion-safe:animate-fade-up" style={after(380)}>
//                         {children}
//                     </div>

//                     <p className="text-muted motion-safe:animate-fade-up" style={after(560)}>
//                         {footer}
//                     </p>
//                 </div>
//             </main>
//         </div>
//     )
// }

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from './Logo'
import { BookIcon, ImageIcon, MicIcon } from './Icons'

// The points shown on the colored side. Edit the texts here.
const perks = [
    { icon: MicIcon, text: 'Ask by typing or by speaking' },
    { icon: ImageIcon, text: 'Diagrams and tables explained step by step' },
    { icon: BookIcon, text: 'See the exact chapter behind every answer' },
]

// How long ASKBuddy "types" in the example card before the answer appears (in milliseconds)
const TYPING_TIME = 2400

// A small helper: gives an element a delay before its opening animation starts.
const after = (milliseconds) => ({ animationDelay: `${milliseconds}ms` })

// The shared frame for the Login and Sign up pages:
// a colored side with ASKBuddy ideas, and the form on the other side.
// "children" is the form that each page puts inside.
//
// When the screen opens, things slide and fade in one after another.
// "motion-safe:" means these animations are skipped for people who turned
// animations off in their device settings.
export default function AuthLayout({ title, subtitle, footer, children }) {
    // true = the example card shows the three bouncing dots, then the answer.
    // People who turned animations off see the answer straight away.
    const [typing, setTyping] = useState(
        () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )

    useEffect(() => {
        if (!typing) return
        const timer = setTimeout(() => setTyping(false), TYPING_TIME)
        return () => clearTimeout(timer)
    }, [typing])

    return (
        <div className="grid min-h-screen bg-white lg:grid-cols-2">
            {/* Colored side. It is hidden on phones. A playful two-tone gradient
                instead of a flat fill, so it reads as fun rather than corporate. */}
            <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-coral p-12 text-white motion-safe:animate-slide-in-left lg:flex xl:p-16">
                {/* Three soft circles that slowly drift, in three different accent colors */}
                <span
                    aria-hidden="true"
                    className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 motion-safe:animate-float"
                />
                <span
                    aria-hidden="true"
                    className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-amber/25 motion-safe:animate-float [animation-direction:alternate-reverse]"
                />
                <span
                    aria-hidden="true"
                    className="absolute left-1/3 top-1/2 h-40 w-40 rounded-full bg-coral/20 motion-safe:animate-float"
                    style={{ animationDuration: '12s' }}
                />

                <Link
                    to="/"
                    aria-label="ASKBuddy home"
                    className="relative self-start motion-safe:animate-fade-up"
                    style={after(250)}
                >
                    <Logo light />
                </Link>

                <div className="relative flex flex-col gap-10">
                    <h2
                        className="max-w-[520px] font-display text-5xl font-extrabold leading-[1.05] tracking-tight motion-safe:animate-fade-up xl:text-6xl"
                        style={after(350)}
                    >
                        Your textbooks just got a{' '}
                        <span className="text-amber">chatty</span> new best friend.
                    </h2>

                    <ul className="flex flex-col gap-4">
                        {perks.map(({ icon: PerkIcon, text }, index) => (
                            <li
                                key={text}
                                className="flex items-center gap-3.5 text-lg motion-safe:animate-fade-up"
                                style={after(550 + index * 130)}
                            >
                                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                                    <PerkIcon size={22} />
                                </span>
                                {text}
                            </li>
                        ))}
                    </ul>

                    {/* A small example answer, only for decoration. It "types" first, then shows the answer. */}
                    <div
                        className="max-w-[460px] rounded-3xl bg-white p-5 text-ink shadow-xl motion-safe:animate-pop-in"
                        style={after(1000)}
                    >
                        <p className="text-sm font-bold text-muted">You asked</p>
                        <p className="mb-3 mt-1 font-medium">What does the mitochondrion do?</p>

                        <div className="min-h-[96px]">
                            {typing ? (
                                <div
                                    role="status"
                                    aria-label="ASKBuddy is typing"
                                    className="flex items-center gap-1.5 pt-3"
                                >
                                    {[0, 160, 320].map((delay) => (
                                        <span
                                            key={delay}
                                            className="h-2.5 w-2.5 rounded-full bg-primary motion-safe:animate-dot-bounce"
                                            style={after(delay)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="motion-safe:animate-fade-up">
                                    <p className="leading-normal">
                                        It makes most of the cell's usable energy as ATP, so it is called the powerhouse
                                        of the cell.
                                    </p>
                                    <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-mint-soft px-3 py-1.5 text-[13px] font-bold text-mint-ink">
                                        <BookIcon size={14} />
                                        Class 11 Biology · Cell: The Unit of Life
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <p className="relative text-sm text-white/90 motion-safe:animate-fade-up" style={after(1300)}>
                    Class 11 and 12 · Science, Commerce, Humanities
                </p>
            </aside>

            {/* Form side. Side gutters trimmed down and the form column widened,
                so the form fills the space instead of floating in a narrow strip. */}
            <main className="flex flex-col px-4 py-8 sm:px-8">
                {/* On phones the logo is shown here, because the colored side is hidden */}
                <Link
                    to="/"
                    aria-label="ASKBuddy home"
                    className="self-start motion-safe:animate-fade-up lg:hidden"
                >
                    <Logo />
                </Link>

                <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col justify-center gap-8 py-10">
                    <div className="flex flex-col gap-2 motion-safe:animate-fade-up" style={after(200)}>
                        <h1 className="font-display text-4xl font-extrabold tracking-tight">{title}</h1>
                        <p className="text-lg text-muted">{subtitle}</p>
                    </div>

                    <div className="motion-safe:animate-fade-up" style={after(380)}>
                        {children}
                    </div>

                    <p className="text-muted motion-safe:animate-fade-up" style={after(560)}>
                        {footer}
                    </p>
                </div>
            </main>
        </div>
    )
}