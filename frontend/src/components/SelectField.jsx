// A labelled drop-down list. "options" is a list of texts to choose from.
export default function SelectField({ label, id, options, error, ...props }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-bold">
                {label}
            </label>

            <select
                id={id}
                name={id}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                className={`w-full rounded-xl border bg-white px-4 py-3.5 text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 ${error ? 'border-red-600' : 'border-line-strong'
                    }`}
                {...props}
            >
                <option value="">Choose...</option>
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>

            {error && (
                <p id={`${id}-error`} className="text-sm font-medium text-red-700">
                    {error}
                </p>
            )}
        </div>
    )
}