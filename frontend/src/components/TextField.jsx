import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from './Icons'

// One labelled input box with an error message under it.
// If type is "password", it also shows a small eye button to show or hide the password.
export default function TextField({ label, id, type = 'text', error, ...props }) {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword && showPassword ? 'text' : type

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-bold">
                {label}
            </label>

            <div className="relative">
                <input
                    id={id}
                    name={id}
                    type={inputType}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${id}-error` : undefined}
                    className={`w-full rounded-xl border bg-white px-4 py-3.5 text-base outline-none placeholder:text-placeholder focus:border-primary focus:ring-4 focus:ring-primary/15 ${error ? 'border-red-600' : 'border-line-strong'
                        } ${isPassword ? 'pr-12' : ''}`}
                    {...props}
                />

                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-primary"
                    >
                        {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                    </button>
                )}
            </div>

            {error && (
                <p id={`${id}-error`} className="text-sm font-medium text-red-700">
                    {error}
                </p>
            )}
        </div>
    )
}