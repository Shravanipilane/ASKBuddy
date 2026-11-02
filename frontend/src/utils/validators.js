// All the rules for checking what the student typed live in this one file.
// Each "validate" function returns an error text, or an empty text ('') when everything is fine.
// Change a rule here and both the Login page and the Sign up page follow it.

// Something@something.something, with no spaces
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateName(name) {
    const value = name.trim()
    if (!value) return 'Please enter your name.'
    if (value.length < 2) return 'Your name needs at least 2 characters.'
    return ''
}

export function validateEmail(email) {
    const value = email.trim()
    if (!value) return 'Please enter your email.'
    if (!EMAIL_PATTERN.test(value)) return 'Enter a valid email, like you@example.com.'
    return ''
}

// The password rules for a NEW password (Sign up).
// To make passwords stricter, add one more line here, for example:
//   { id: 'upper', label: 'An upper case letter', test: (p) => /[A-Z]/.test(p) },
export const passwordRules = [
    { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { id: 'letter', label: 'A letter', test: (p) => /[A-Za-z]/.test(p) },
    { id: 'number', label: 'A number', test: (p) => /\d/.test(p) },
]

export function validateNewPassword(password) {
    if (!password) return 'Please create a password.'
    const missing = passwordRules.filter((rule) => !rule.test(password))
    if (missing.length > 0) {
        return `Password still needs: ${missing.map((rule) => rule.label.toLowerCase()).join(', ')}.`
    }
    return ''
}

// How strong the password is: 0 = nothing typed, 1 = weak, 2 = medium, 3 = strong
export function passwordStrength(password) {
    if (!password) return 0
    const passesAllRules = passwordRules.every((rule) => rule.test(password))
    if (!passesAllRules) return 1
    const isLong = password.length >= 12
    const isMixed = /[a-z]/.test(password) && /[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password)
    return isLong || isMixed ? 3 : 2
}

// Turns a list of messages like { email: 'text', password: '' } into only the ones that have text
export function onlyProblems(messages) {
    return Object.fromEntries(Object.entries(messages).filter(([, message]) => message))
}