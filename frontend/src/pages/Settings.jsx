import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import { logout as signOut } from "../api/auth";

// Colour of the small message under each button
const noteColor = { "": "text-muted", ok: "font-semibold text-mint-ink", bad: "font-semibold text-red-700" };

function Note({ note }) {
    return (
        <p role="status" className={`mt-2 min-h-6 text-sm ${noteColor[note.kind]}`}>
            {note.text}
        </p>
    );
}

// One white card with a round icon, a title and a short line, same look as the Hub cards
function Card({ icon, bg, ink, title, desc, children }) {
    return (
        <section className="rounded-2xl border-2 border-line bg-white p-6 shadow-sm">
            <div className="flex items-center gap-5">
                <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl ${bg} ${ink}`}>
                    {icon}
                </span>
                <div className="flex flex-col gap-1">
                    <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
                    <p className="text-base text-muted">{desc}</p>
                </div>
            </div>
            {children}
        </section>
    );
}

const primaryBtn =
    "rounded-full bg-primary px-6 py-3 font-display font-bold text-white shadow-md transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60";
const ghostBtn =
    "rounded-full border-2 border-primary px-5 py-2 font-bold text-primary transition hover:bg-primary-soft";

export default function Settings() {
    const navigate = useNavigate();

    // Speaker test
    const [asked, setAsked] = useState(false); // show "Did you hear it?"
    const [spNote, setSpNote] = useState({ text: "Turn your volume up a little first.", kind: "" });

    // Microphone test
    const [testing, setTesting] = useState(false);
    const [level, setLevel] = useState(0); // 0 to 1, drives the level bar
    const [micNote, setMicNote] = useState({ text: "Press the button, then say “hello Buddy” for 4 seconds.", kind: "" });

    // Log out needs two taps
    const [sure, setSure] = useState(false);

    const stopMic = useRef(null); // closes the microphone if the student leaves the page
    const sureTimer = useRef(null);

    useEffect(
        () => () => {
            stopMic.current?.();
            clearTimeout(sureTimer.current);
        },
        [],
    );

    // 1. Three short notes made in the browser (no server needed)
    
    async function playSound() {
        try {
            const user = JSON.parse(sessionStorage.getItem("user") || "null");
            const firstName = user?.name?.trim().split(/\s+/)[0] || "there";

            const text = `Hey ${firstName}! It's Buddy. Can you hear me?`;

            setSpNote({ text: "Buddy is speaking...", kind: "" });

            const res = await fetch("/api/voice/speak", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ text })
            });

            if (!res.ok) {
                throw new Error("Could not generate Kiki voice.");
            }

            const audioBlob = await res.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            audio.onended = () => URL.revokeObjectURL(audioUrl);

            await audio.play();

            setAsked(true);
            setSpNote({
                text: "Buddy just spoke! Did you hear it?",
                kind: "ok"
            });

        } catch (error) {
            setSpNote({
                text: `Voice test failed: ${error.message}`,
                kind: "bad"
            });
        }
    }


    // 2. Listen for 4 seconds and show how loud the student is
    async function testMic() {
        if (!navigator.mediaDevices || !window.isSecureContext) {
            setMicNote({ text: "The microphone only works on https or on localhost.", kind: "bad" });
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const ctx = new AudioContext();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            ctx.createMediaStreamSource(stream).connect(analyser);

            const samples = new Uint8Array(analyser.fftSize);
            const endAt = Date.now() + 4000;
            let peak = 0;
            let frame = 0;

            const finish = () => {
                cancelAnimationFrame(frame);
                stream.getTracks().forEach((track) => track.stop());
                ctx.close().catch(() => {});
                stopMic.current = null;
            };
            stopMic.current = finish;

            setTesting(true);
            setMicNote({ text: "Listening… say “hello Buddy”", kind: "" });

            const tick = () => {
                analyser.getByteTimeDomainData(samples);
                let sum = 0;
                for (const value of samples) {
                    const d = (value - 128) / 128;
                    sum += d * d;
                }
                const now = Math.min(1, Math.sqrt(sum / samples.length) * 6);
                peak = Math.max(peak, now);
                setLevel(now);

                if (Date.now() < endAt) {
                    frame = requestAnimationFrame(tick);
                    return;
                }
                finish();
                setLevel(0);
                setTesting(false);
                if (peak > 0.15) setMicNote({ text: "I can hear you loud and clear! 🎉", kind: "ok" });
                else if (peak < 0.05)
                    setMicNote({
                        text: "I heard almost nothing. Check that your microphone is not muted, or try a headset.",
                        kind: "bad",
                    });
                else setMicNote({ text: "I can hear you, but it is quiet. Move closer to the microphone.", kind: "ok" });
            };
            tick();
        } catch (error) {
            setTesting(false);
            setMicNote({
                text:
                    error.name === "NotAllowedError"
                        ? "The browser blocked the microphone. Click the lock icon in the address bar and allow it."
                        : `Could not open the microphone: ${error.message}`,
                kind: "bad",
            });
        }
    }

    // Log out: signOut() is the logout() from api/auth.js. It removes the saved token and user.
    // Then we go to the login page. The first tap only asks "are you sure?".
    function handleLogout() {
        if (!sure) {
            setSure(true);
            sureTimer.current = setTimeout(() => setSure(false), 4000);
            return;
        }
        clearTimeout(sureTimer.current);
        signOut();
        navigate("/login", { replace: true });
    }

    return (
        <div className="min-h-screen w-full bg-surface">
            <TopNav />

            <div className="relative overflow-hidden bg-gradient-to-b from-primary-soft via-surface to-surface px-6 pb-12 pt-24 sm:px-10 sm:pt-28">
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-10 h-64 w-64 rounded-full bg-coral/10" />

                <div className="relative mx-auto flex w-full max-w-[640px] flex-col gap-6 motion-safe:animate-fade-up">
                    <Link to="/hub" className="font-semibold text-muted hover:text-primary">
                        ← Back to Hub
                    </Link>

                    <div>
                        <h1 className="font-display text-3xl font-extrabold text-ink">Settings</h1>
                        <p className="mt-1 text-muted">Check your sound, or sign out.</p>
                    </div>

                    <Card icon="🔊" bg="bg-primary-soft" ink="text-primary-dark" title="Sound check" desc="Can Buddy hear you, and can you hear Buddy?">
                        <div className="mt-5 border-t-2 border-line pt-4">
                            <p className="font-display text-lg font-bold text-ink">1 · Can you hear me?</p>
                            <button type="button" onClick={playSound} className={`mt-3 ${primaryBtn}`}>
                                ▶ Play a test sound
                            </button>
                            {asked && (
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                    <span className="text-muted">Did you hear it?</span>
                                    <button
                                        type="button"
                                        className={ghostBtn}
                                        onClick={() => setSpNote({ text: "Great, your speaker works. 🎉", kind: "ok" })}
                                    >
                                        Yes 👍
                                    </button>
                                    <button
                                        type="button"
                                        className={ghostBtn}
                                        onClick={() =>
                                            setSpNote({
                                                text: "Try this: raise the volume, unmute the tab, check the headphones or the output device, then play again.",
                                                kind: "bad",
                                            })
                                        }
                                    >
                                        No 🤔
                                    </button>
                                </div>
                            )}
                            <Note note={spNote} />
                        </div>

                        <div className="mt-4 border-t-2 border-line pt-4">
                            <p className="font-display text-lg font-bold text-ink">2 · Can I hear you?</p>
                            <button type="button" onClick={testMic} disabled={testing} className={`mt-3 ${primaryBtn}`}>
                                🎤 {testing ? "Listening…" : "Test my mic"}
                            </button>
                            <div className="mt-4 h-3.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#2EC4A6] via-amber to-coral transition-[width] duration-75"
                                    style={{ width: `${level * 100}%` }}
                                />
                            </div>
                            <Note note={micNote} />
                        </div>
                    </Card>

                    <Card icon="👋" bg="bg-coral-soft" ink="text-coral-ink" title="Log out" desc="Sign out of ASKBuddy on this device">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className={`mt-5 rounded-full border-2 border-red-600 px-6 py-2.5 font-bold transition ${
                                sure ? "bg-red-600 text-white" : "text-red-700 hover:bg-red-50"
                            }`}
                        >
                            {sure ? "Tap again to log out" : "Log out"}
                        </button>
                    </Card>
                </div>
            </div>
        </div>
    );
}