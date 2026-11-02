import { useEffect, useState } from "react";

/**
 * Placeholder avatar — stands in for the real Three.js avatar.
 *
 * This is the ONLY component you'll need to replace later. Keep the props
 * the same (isSpeaking, greeting) when you swap in the Three.js version and
 * nothing else on the Hub or Ask page needs to change.
 *
 * Props:
 *   isSpeaking  (bool)   - true while TTS audio is playing / assistant is answering
 *   greeting    (string) - optional text shown as a speech-bubble on first load
 *   size        ("sm" | "md" | "lg") - controls diameter, default "md"
 */
export default function Avatar({ isSpeaking = false, greeting, size = "md" }) {
    const [showGreeting, setShowGreeting] = useState(Boolean(greeting));

    useEffect(() => {
        if (!greeting) return;
        const timer = setTimeout(() => setShowGreeting(false), 5000);
        return () => clearTimeout(timer);
    }, [greeting]);

    const dimensions = {
        sm: "w-16 h-16",
        md: "w-32 h-32",
        lg: "w-48 h-48",
    }[size];

    return (
        <div className="relative flex flex-col items-center">
            {showGreeting && greeting && (
                <div className="absolute -top-[4.5rem] z-10 max-w-[220px] rounded-2xl border-2 border-primary-soft bg-white px-4 py-2.5 text-center font-display text-sm font-bold text-ink shadow-lg motion-safe:animate-pop-in">
                    {greeting}
                    <div className="absolute left-1/2 -bottom-[7px] h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-primary-soft bg-white" />
                </div>
            )}

            <div
                className={`relative ${dimensions} flex items-center justify-center rounded-full
          bg-gradient-to-br from-primary to-coral shadow-xl
          ${isSpeaking ? "motion-safe:animate-speak-pulse" : "motion-safe:animate-idle-breathe"}`}
            >
                {/* simple face so it doesn't look like a blank circle */}
                <div className="flex gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
                </div>
                <div
                    className={`absolute bottom-[30%] h-1.5 w-5 rounded-full bg-white/80 transition-all duration-150 ${isSpeaking ? "scale-y-150" : "scale-y-100"
                        }`}
                />

                {/* speaking ring */}
                {isSpeaking && (
                    <span className="absolute inset-0 rounded-full border-4 border-coral motion-safe:animate-ring-ping" />
                )}
            </div>
        </div>
    );
}