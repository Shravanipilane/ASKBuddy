// // import { useState } from 'react'
// // import { Link } from 'react-router-dom'
// // import AuthLayout from '../components/AuthLayout'
// // import TextField from '../components/TextField'
// // import { CheckIcon } from '../components/Icons'
// // import { login } from '../api/auth'
// // import { onlyProblems, validateEmail } from '../utils/validators'

// // // Checks the two boxes and returns only the problems.
// // // On Login we do not check password rules, only that something was typed.
// // function validate(form) {
// //     return onlyProblems({
// //         email: validateEmail(form.email),
// //         password: form.password ? '' : 'Please enter your password.',
// //     })
// // }

// // export default function Login() {
// //     // What the student typed
// //     const [form, setForm] = useState({ email: '', password: '' })

// //     // Which boxes the student has already visited (left with Tab or a click).
// //     // We show a box's error only after it was visited, or after pressing the button.
// //     const [touched, setTouched] = useState({})
// //     const [submitted, setSubmitted] = useState(false)

// //     const [serverError, setServerError] = useState('')
// //     const [success, setSuccess] = useState('')
// //     const [loading, setLoading] = useState(false)

// //     // Re-checked on every key press, so errors disappear as soon as the box is fixed
// //     const problems = validate(form)
// //     const errorFor = (field) => (touched[field] || submitted ? problems[field] : undefined)

// //     // Gives each box what it needs: its value, what to do on typing, and what to do on leaving
// //     const fieldProps = (field) => ({
// //         value: form[field],
// //         onChange: (event) => setForm({ ...form, [field]: event.target.value }),
// //         onBlur: () => setTouched({ ...touched, [field]: true }),
// //         error: errorFor(field),
// //     })

// //     async function handleSubmit(event) {
// //         event.preventDefault() // stops the page from reloading
// //         setServerError('')
// //         setSuccess('')
// //         setSubmitted(true)

// //         const firstProblem = Object.keys(problems)[0]
// //         if (firstProblem) {
// //             // Move the cursor to the first box that needs fixing
// //             document.getElementById(firstProblem)?.focus()
// //             return
// //         }

// //         setLoading(true)
// //         try {
// //             const user = await login({ email: form.email.trim().toLowerCase(), password: form.password })
// //             setSuccess(`Welcome back, ${user.name}! The Ask page will open here once we build it.`)
// //         } catch (error) {
// //             setServerError(error.message)
// //         } finally {
// //             setLoading(false)
// //         }
// //     }

// //     return (
// //         <AuthLayout
// //             title="Welcome back"
// //             subtitle="Log in to continue studying."
// //             footer={
// //                 <>
// //                     New to ASKBuddy?{' '}
// //                     <Link to="/signup" className="font-bold text-primary hover:underline">
// //                         Create an account
// //                     </Link>
// //                 </>
// //             }
// //         >
// //             <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
// //                 <TextField
// //                     label="Email"
// //                     id="email"
// //                     type="email"
// //                     autoComplete="email"
// //                     placeholder="you@example.com"
// //                     {...fieldProps('email')}
// //                 />

// //                 <TextField
// //                     label="Password"
// //                     id="password"
// //                     type="password"
// //                     autoComplete="current-password"
// //                     placeholder="Your password"
// //                     {...fieldProps('password')}
// //                 />

// //                 {serverError && (
// //                     <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 font-medium text-red-700">
// //                         {serverError}
// //                     </p>
// //                 )}

// //                 {success && (
// //                     <p
// //                         role="status"
// //                         className="flex items-start gap-2 rounded-xl bg-mint-soft px-4 py-3 font-medium text-mint-ink"
// //                     >
// //                         <CheckIcon size={20} className="mt-0.5 shrink-0" />
// //                         {success}
// //                     </p>
// //                 )}

// //                 <button
// //                     type="submit"
// //                     disabled={loading}
// //                     className="rounded-full bg-primary px-8 py-4 text-lg font-bold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
// //                 >
// //                     {loading ? 'Logging in...' : 'Log in'}
// //                 </button>
// //             </form>
// //         </AuthLayout>
// //     )
// // }


// import { useState } from 'react'
// import { Link, useNavigate } from 'react-router-dom'
// import AuthLayout from '../components/AuthLayout'
// import TextField from '../components/TextField'
// import { CheckIcon } from '../components/Icons'
// import { login } from '../api/auth'
// import { onlyProblems, validateEmail } from '../utils/validators'

// // Checks the two boxes and returns only the problems.
// // On Login we do not check password rules, only that something was typed.
// function validate(form) {
//     return onlyProblems({
//         email: validateEmail(form.email),
//         password: form.password ? '' : 'Please enter your password.',
//     })
// }

// export default function Login() {
//     const navigate = useNavigate()

//     // What the student typed
//     const [form, setForm] = useState({ email: '', password: '' })

//     // Which boxes the student has already visited (left with Tab or a click).
//     // We show a box's error only after it was visited, or after pressing the button.
//     const [touched, setTouched] = useState({})
//     const [submitted, setSubmitted] = useState(false)

//     const [serverError, setServerError] = useState('')
//     const [loading, setLoading] = useState(false)

//     // Re-checked on every key press, so errors disappear as soon as the box is fixed
//     const problems = validate(form)
//     const errorFor = (field) => (touched[field] || submitted ? problems[field] : undefined)

//     // Gives each box what it needs: its value, what to do on typing, and what to do on leaving
//     const fieldProps = (field) => ({
//         value: form[field],
//         onChange: (event) => setForm({ ...form, [field]: event.target.value }),
//         onBlur: () => setTouched({ ...touched, [field]: true }),
//         error: errorFor(field),
//     })

//     async function handleSubmit(event) {
//         event.preventDefault() // stops the page from reloading
//         setServerError('')
//         setSubmitted(true)

//         const firstProblem = Object.keys(problems)[0]
//         if (firstProblem) {
//             // Move the cursor to the first box that needs fixing
//             document.getElementById(firstProblem)?.focus()
//             return
//         }

//         setLoading(true)
//         try {
//             // login() returns { access_token, token_type, user } and already
//             // saves the token/user to sessionStorage (see api/auth.js)
//             await login({ email: form.email.trim().toLowerCase(), password: form.password })
//             navigate('/hub')
//         } catch (error) {
//             setServerError(error.message)
//         } finally {
//             setLoading(false)
//         }
//     }

//     return (
//         <AuthLayout
//             title="Welcome back"
//             subtitle="Log in to continue studying."
//             footer={
//                 <>
//                     New to ASKBuddy?{' '}
//                     <Link to="/signup" className="font-bold text-primary hover:underline">
//                         Create an account
//                     </Link>
//                 </>
//             }
//         >
//             <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
//                 <TextField
//                     label="Email"
//                     id="email"
//                     type="email"
//                     autoComplete="email"
//                     placeholder="you@example.com"
//                     {...fieldProps('email')}
//                 />

//                 <TextField
//                     label="Password"
//                     id="password"
//                     type="password"
//                     autoComplete="current-password"
//                     placeholder="Your password"
//                     {...fieldProps('password')}
//                 />

//                 {serverError && (
//                     <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 font-medium text-red-700">
//                         {serverError}
//                     </p>
//                 )}

//                 <button
//                     type="submit"
//                     disabled={loading}
//                     className="rounded-full bg-primary px-8 py-4 text-lg font-bold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
//                 >
//                     {loading ? 'Logging in...' : 'Log in'}
//                 </button>
//             </form>
//         </AuthLayout>
//     )
// }

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import TextField from '../components/TextField'
import { CheckIcon } from '../components/Icons'
import { login } from '../api/auth'
import { onlyProblems, validateEmail } from '../utils/validators'

// Checks the two boxes and returns only the problems.
// On Login we do not check password rules, only that something was typed.
function validate(form) {
    return onlyProblems({
        email: validateEmail(form.email),
        password: form.password ? '' : 'Please enter your password.',
    })
}

export default function Login() {
    const navigate = useNavigate()

    // What the student typed
    const [form, setForm] = useState({ email: '', password: '' })

    // Which boxes the student has already visited (left with Tab or a click).
    // We show a box's error only after it was visited, or after pressing the button.
    const [touched, setTouched] = useState({})
    const [submitted, setSubmitted] = useState(false)

    const [serverError, setServerError] = useState('')
    const [loading, setLoading] = useState(false)

    // Re-checked on every key press, so errors disappear as soon as the box is fixed
    const problems = validate(form)
    const errorFor = (field) => (touched[field] || submitted ? problems[field] : undefined)

    // Gives each box what it needs: its value, what to do on typing, and what to do on leaving
    const fieldProps = (field) => ({
        value: form[field],
        onChange: (event) => setForm({ ...form, [field]: event.target.value }),
        onBlur: () => setTouched({ ...touched, [field]: true }),
        error: errorFor(field),
    })

    async function handleSubmit(event) {
        event.preventDefault() // stops the page from reloading
        setServerError('')
        setSubmitted(true)

        const firstProblem = Object.keys(problems)[0]
        if (firstProblem) {
            // Move the cursor to the first box that needs fixing
            document.getElementById(firstProblem)?.focus()
            return
        }

        setLoading(true)
        try {
            // login() returns { access_token, token_type, user } and already
            // saves the token/user to sessionStorage (see api/auth.js)
            await login({ email: form.email.trim().toLowerCase(), password: form.password })
            navigate('/hub')
        } catch (error) {
            setServerError(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Your books missed you. Let's pick up where you left off."
            footer={
                <>
                    New to ASKBuddy?{' '}
                    <Link to="/signup" className="font-bold text-primary hover:underline">
                        Create an account
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                <TextField
                    label="Email"
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...fieldProps('email')}
                />

                <TextField
                    label="Password"
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Your password"
                    {...fieldProps('password')}
                />

                {serverError && (
                    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 font-medium text-red-700">
                        {serverError}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-full bg-primary px-8 py-4 text-lg font-bold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? 'Logging in...' : 'Log in'}
                </button>
            </form>
        </AuthLayout>
    )
}