import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import TextField from '../components/TextField'
import SelectField from '../components/SelectField'
import { signup } from '../api/auth'
import { onlyProblems, validateEmail, validateName, validateNewPassword } from '../utils/validators'

// The choices in the drop-down lists. Edit here to change them.
const classes = ['Class 11', 'Class 12']
const streams = ['Science', 'Commerce', 'Humanities']

// Checks every box and returns only the problems.
// The order here is the order of the boxes on the page.
function validate(form) {
    let confirmMessage = ''
    if (!form.confirm) confirmMessage = 'Please type the password again.'
    else if (form.confirm !== form.password) confirmMessage = 'The two passwords do not match.'

    return onlyProblems({
        name: validateName(form.name),
        email: validateEmail(form.email),
        studentClass: form.studentClass ? '' : 'Please choose your class.',
        stream: form.stream ? '' : 'Please choose your stream.',
        password: validateNewPassword(form.password),
        confirm: confirmMessage,
    })
}

export default function Signup() {
    const navigate = useNavigate()

    // One object holds everything the student typed
    const [form, setForm] = useState({
        name: '',
        email: '',
        studentClass: '',
        stream: '',
        password: '',
        confirm: '',
    })

    // Which boxes the student has already visited. A box's error is shown
    // only after it was visited, or after pressing the button.
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
        event.preventDefault()
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
            // signup() saves the token and user to sessionStorage (see api/auth.js)
            await signup({
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                studentClass: form.studentClass,
                stream: form.stream,
                password: form.password,
            })
            navigate('/hub')
        } catch (error) {
            setServerError(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout
            title="Create your account"
            subtitle="Free for Class 11 and 12 students."
            footer={
                <>
                    Already have an account?{' '}
                    <Link to="/login" className="font-bold text-primary hover:underline">
                        Log in
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                <TextField
                    label="Full name"
                    id="name"
                    autoComplete="name"
                    placeholder="Your name"
                    {...fieldProps('name')}
                />

                <TextField
                    label="Email"
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...fieldProps('email')}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                    <SelectField label="Class" id="studentClass" options={classes} {...fieldProps('studentClass')} />
                    <SelectField label="Stream" id="stream" options={streams} {...fieldProps('stream')} />
                </div>

                <TextField
                    label="Password"
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="8+ characters with a letter and a number"
                    {...fieldProps('password')}
                />

                <TextField
                    label="Confirm password"
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Type the password again"
                    {...fieldProps('confirm')}
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
                    {loading ? 'Creating account...' : 'Create account'}
                </button>
            </form>
        </AuthLayout>
    )
}