import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar";
import TopNav from "../components/TopNav";
import { askQuestion, transcribeAudio } from "../api/ask";
import { speak, stopSpeaking } from "../api/speakStream";
import MathText from "../components/MathText";

// The second line under "Hey, I'm your Buddy!" — a different one each time the page opens.
const greetings = [
    "Knock knock! Got a question for me?",
    "Your curiosity looks cute today. What's the question?",
    "Oh yay! My favourite human is here to learn!",
    "What's on your mind, curious bean?",
    "Beep boop. Buddy mode: ON. What's up?",
];

const MIC_BLOCKED =
    "The microphone is blocked. Click the lock icon next to the web address, allow the microphone, then reload the page.";
const MIC_MISSING = "No microphone found. Check that one is connected.";
const MIC_UNSUPPORTED = "Recording isn't supported in this browser. Try Chrome or Edge, or type instead.";
const MIC_EMPTY = "I didn't catch that. Tap the mic, speak clearly, then tap it again to stop.";

// The logged-in student's name (saved by api/auth.js), so Buddy can use it.
function getUserName() {
    try {
        return JSON.parse(sessionStorage.getItem("user") || "{}").name || null;
    } catch {
        return null;
    }
}

export default function AskPage() {
    const location = useLocation();
    const navigate = useNavigate();
    // Chapter chosen on the QR page. Kept in sessionStorage so a refresh doesn't lose it.
    const [qr] = useState(() => {
        if (location.state?.qr) {
            try { sessionStorage.setItem("qrChapter", JSON.stringify(location.state.qr)); } catch { /* ignore */ }
            return location.state.qr;
        }
        try {
            const saved = sessionStorage.getItem("qrChapter");
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    // No scanned book yet: send the student to the scan page first.
    useEffect(() => {
        if (!qr) navigate("/qr", { replace: true });
    }, [qr, navigate]);
    const [messages, setMessages] = useState([]); // { role, content, sources?, spoken? }
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [micError, setMicError] = useState("");
    const [autoVoice, setAutoVoice] = useState(true);       // speak new answers automatically
    const [playingIndex, setPlayingIndex] = useState(null); // which message is loading/playing
    const [isSpeaking, setIsSpeaking] = useState(false);    // true only while sound is coming out
    const scrollRef = useRef(null);
    const recorderRef = useRef(null);
    const autoStopRef = useRef(null);
    const cancelledRef = useRef(false); // true when the page is closed while recording
    const sessionIdRef = useRef(null);  // backend session, so follow-up questions work
    const [greeting] = useState(() => greetings[Math.floor(Math.random() * greetings.length)]);

    // prefill from Hub page's quick-ask bar
    useEffect(() => {
        const prefill = location.state?.prefillQuestion;
        if (prefill) setInput(prefill);
    }, [location.state]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, isLoading]);

    // Stop the voice and the recording if the student leaves this page
    useEffect(() => {
        cancelledRef.current = false;
        return () => {
            cancelledRef.current = true;
            stopSpeaking();
            clearTimeout(autoStopRef.current);
            const rec = recorderRef.current;
            if (rec && rec.state === "recording") rec.stop();
        };
    }, []);

    // Play one message's audio. Clicking again while it plays stops it.
    function playMessage(index, text) {
        if (playingIndex === index) {
            stopSpeaking();
            return;
        }
        setPlayingIndex(index);
        speak(text, {
            onStart: () => setIsSpeaking(true),
            onEnd: () => {
                setIsSpeaking(false);
                setPlayingIndex((prev) => (prev === index ? null : prev));
            },
        });
    }

    async function handleSend(e) {
        e?.preventDefault();
        const question = input.trim();
        if (!question || isLoading || isRecording || isTranscribing) return;

        stopSpeaking(); // stop the previous answer if it is still talking
        setMicError("");
        setMessages((m) => [...m, { role: "user", content: question }]);
        setInput("");
        setIsLoading(true);

        const assistantIndex = messages.length + 1; // user message is at messages.length

        try {
            const data = await askQuestion({
                message: question,
                sessionId: sessionIdRef.current,
                name: getUserName(),
                // If the student came from the QR page, keep answers inside that chapter
                scope: qr ? { subject: qr.subject, std: qr.std, chapter: qr.chapter } : {},
            });
            sessionIdRef.current = data.sessionId;
            setMessages((m) => [
                ...m,
                { role: "assistant", content: data.answer, sources: data.sources, spoken: data.spokenText },
            ]);

            // First time: the avatar talks by itself (if Auto voice is on)
            if (autoVoice) playMessage(assistantIndex, data.spokenText);
        } catch (err) {
            setMessages((m) => [
                ...m,
                { role: "assistant", content: err.message || "Something went wrong — please try again.", sources: [] },
            ]);
        } finally {
            setIsLoading(false);
        }
    }

    function toggleAutoVoice() {
        if (autoVoice) stopSpeaking();
        setAutoVoice((v) => !v);
    }

    // Mic: record with the browser, then send the clip to the backend (Whisper) to get text.
    async function handleMicClick() {
        if (isTranscribing) return;

        // Second click = stop recording (onstop below does the rest)
        if (isRecording) {
            recorderRef.current?.stop();
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
            setMicError(MIC_UNSUPPORTED);
            return;
        }

        stopSpeaking(); // don't let Buddy talk over the student
        setMicError("");

        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            setMicError(err.name === "NotFoundError" ? MIC_MISSING : MIC_BLOCKED);
            return;
        }

        const recorder = new MediaRecorder(stream);
        const chunks = [];
        const base = input.trim() ? input.trim() + " " : "";

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
            clearTimeout(autoStopRef.current);
            stream.getTracks().forEach((t) => t.stop()); // turns the mic light off
            if (cancelledRef.current) return;
            setIsRecording(false);

            const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
            if (blob.size < 1500) {
                setMicError(MIC_EMPTY);
                return;
            }

            setIsTranscribing(true);
            try {
                const text = await transcribeAudio(blob);
                if (cancelledRef.current) return;
                if (text) setInput(base + text);
                else setMicError(MIC_EMPTY);
            } catch (err) {
                if (!cancelledRef.current) setMicError(err.message);
            } finally {
                if (!cancelledRef.current) setIsTranscribing(false);
            }
        };

        recorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);

        // Safety: stop by itself after 30 seconds
        autoStopRef.current = setTimeout(() => {
            if (recorder.state === "recording") recorder.stop();
        }, 30000);
    }

    const placeholder = isRecording
        ? "Recording... tap the red button when you finish"
        : isTranscribing
            ? "Writing down what you said..."
            : "Type your question, or tap the mic and speak...";

    return (
        <div className="flex min-h-screen w-full flex-col bg-surface">
            <TopNav />

            <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-primary-soft via-surface to-surface px-4 py-8 sm:px-8">
                <span aria-hidden="true" className="pointer-events-none absolute -left-10 top-16 h-48 w-48 rounded-full bg-primary/10 motion-safe:animate-float" />
                <span aria-hidden="true" className="pointer-events-none absolute -right-10 bottom-10 h-56 w-56 rounded-full bg-coral/10 motion-safe:animate-float" style={{ animationDirection: "alternate-reverse" }} />

                <div className="relative flex w-full max-w-3xl flex-1 flex-col">
                    <div className="flex w-full flex-1 flex-col overflow-hidden rounded-[2.5rem] border-2 border-line bg-white p-6 shadow-lg sm:p-10">
                        {/* Duolingo-style hero: big fun greeting + avatar, front and center */}
                        <div className="relative flex flex-col items-center gap-3 pb-2">
                            {messages.length === 0 && (
                                <h1 className="max-w-md text-balance text-center font-display text-2xl font-extrabold leading-snug text-ink sm:text-3xl">
                                    {greeting}
                                </h1>
                            )}

                            <div className="relative mt-1">
                                <span aria-hidden="true" className="absolute -left-6 top-2 text-xl opacity-60 motion-safe:animate-float">✨</span>
                                <span aria-hidden="true" className="absolute -right-5 bottom-4 text-lg opacity-60 motion-safe:animate-float" style={{ animationDirection: "alternate-reverse" }}>✨</span>
                                <Avatar isSpeaking={isSpeaking} size={messages.length === 0 ? "lg" : "sm"} />
                            </div>

                            <button
                                type="button"
                                onClick={toggleAutoVoice}
                                className="rounded-full bg-mint-soft px-3 py-1 text-xs font-bold text-mint-ink transition hover:opacity-80"
                                title={autoVoice ? "Buddy reads new answers aloud. Click to turn off." : "Auto voice is off. Click to turn on."}
                            >
                                {autoVoice ? "🔊 Auto voice on" : "🔇 Auto voice off"}
                            </button>
                        </div>

                        {/* Which chapter we are asking about (comes from the QR page) */}
                        {qr && (
                            <div className="mb-2 flex items-center justify-center gap-2 text-xs font-bold text-mint-ink">
                                <span className="rounded-full bg-mint-soft px-3 py-1">
                                    📖 {qr.subject} · Class {qr.std} · Chapter {qr.chapter}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => navigate("/qr")}
                                    className="rounded-full border border-line px-2 py-0.5 text-ink/60 hover:text-ink"
                                    title="Scan a different chapter"
                                >
                                    Change
                                </button>
                            </div>
                        )}

                        {/* message list */}
                        <div ref={scrollRef} className="min-h-[30vh] max-h-[50vh] flex-1 space-y-4 overflow-y-auto px-1 py-3">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user"
                                            ? "rounded-br-sm bg-primary text-white"
                                            : "rounded-bl-sm bg-primary-soft text-ink"
                                            }`}
                                    >
                                        
                                            {m.role === "assistant" ? (
                                                            <MathText>{m.content}</MathText>
                                                        ) : (
                                                            <p className="whitespace-pre-line">{m.content}</p>
                                                        )}

                                        {m.sources?.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/30 pt-2">
                                                {m.sources.map((s, si) => (
                                                    <span
                                                        key={si}
                                                        className="rounded-full bg-mint-soft px-2 py-0.5 text-xs font-bold text-mint-ink"
                                                    >
                                                        {s.book} · {s.chapter}
                                                        {s.page ? ` · p.${s.page}` : ""}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Listen / Stop button on every answer */}
                                        {m.role === "assistant" && m.spoken && (
                                            <button
                                                type="button"
                                                onClick={() => playMessage(i, m.spoken)}
                                                className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-primary-dark transition hover:bg-white"
                                            >
                                                {playingIndex === i
                                                    ? isSpeaking
                                                        ? "⏹ Stop"
                                                        : "⏳ Loading..."
                                                    : "🔊 Listen"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="rounded-2xl rounded-bl-sm bg-primary-soft px-4 py-2.5 text-sm text-primary-dark">
                                        Thinking...
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* input row — one big pill, like the search bar in the sketch */}
                        <form onSubmit={handleSend} className="mt-3 flex items-center gap-2 rounded-full border-2 border-line bg-surface px-3 py-2.5 shadow-sm transition focus-within:border-primary">
                            <button
                                type="button"
                                onClick={handleMicClick}
                                disabled={isTranscribing}
                                className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full text-base transition disabled:cursor-wait ${isRecording
                                    ? "animate-pulse bg-coral text-white"
                                    : "bg-coral-soft text-coral-ink hover:bg-coral hover:text-white"
                                    }`}
                                title={
                                    isRecording
                                        ? "Recording... click to stop"
                                        : isTranscribing
                                            ? "Writing down what you said..."
                                            : "Click to speak"
                                }
                            >
                                {isRecording ? "⏹" : isTranscribing ? "⏳" : "🎤"}
                            </button>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={placeholder}
                                className="flex-1 bg-transparent text-sm text-ink placeholder-placeholder outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading || isRecording || isTranscribing}
                                className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Send
                            </button>
                        </form>

                        {micError && (
                            <p className="mt-2 px-4 text-center text-xs font-bold text-coral-ink">{micError}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}