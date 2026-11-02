import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Avatar from "../components/Avatar";
import TopNav from "../components/TopNav";

// The second line under "Hey, I'm your Buddy!" — a different one each time the page opens.
const greetings = [
    "Knock knock! Got a question for me?",
    "Your curiosity looks cute today. What's the question?",
    "Oh yay! My favourite human is here to learn!",
    "What's on your mind, curious bean?",
    "Beep boop. Buddy mode: ON. What's up?",
];

// TODO: replace this with a real fetch to your FastAPI /ask endpoint, e.g.:
//
// async function fetchAnswer(question) {
//   const res = await fetch("http://localhost:8000/ask", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ question }),
//   });
//   if (!res.ok) throw new Error("Request failed");
//   return res.json(); // expect { answer: string, sources: [{book, chapter, page}] }
// }
async function fetchAnswer(question) {
    await new Promise((r) => setTimeout(r, 900)); // fake network delay
    return {
        answer: `(placeholder) Here's what I'd say about: "${question}". Swap fetchAnswer() in AskPage.jsx for your real backend call.`,
        sources: [
            { book: "Biology", chapter: "Chapter 1", page: 4 },
            { book: "Biology", chapter: "Chapter 1", page: 7 },
        ],
    };
}

export default function AskPage() {
    const location = useLocation();
    const [messages, setMessages] = useState([]); // { role: "user"|"assistant", content, sources? }
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const scrollRef = useRef(null);
    const recognitionRef = useRef(null);
    const [greeting] = useState(() => greetings[Math.floor(Math.random() * greetings.length)]);

    // prefill from Hub page's quick-ask bar
    useEffect(() => {
        const prefill = location.state?.prefillQuestion;
        if (prefill) setInput(prefill);
    }, [location.state]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, isLoading]);

    async function handleSend(e) {
        e?.preventDefault();
        const question = input.trim();
        if (!question || isLoading) return;

        setMessages((m) => [...m, { role: "user", content: question }]);
        setInput("");
        setIsLoading(true);

        try {
            const { answer, sources } = await fetchAnswer(question);
            setMessages((m) => [...m, { role: "assistant", content: answer, sources }]);
        } catch (err) {
            setMessages((m) => [
                ...m,
                { role: "assistant", content: "Something went wrong — please try again.", sources: [] },
            ]);
        } finally {
            setIsLoading(false);
        }
    }

    // Mic button using the browser's built-in SpeechRecognition (Web Speech API).
    function handleMicClick() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice input isn't supported in this browser. Try typing instead.");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        };

        recognitionRef.current = recognition;
        recognition.start();
    }

    const isSpeaking = isLoading; // swap for real "TTS is playing" state later

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
                        </div>

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
                                        <p>{m.content}</p>
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
                                className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full text-base transition ${isListening
                                    ? "animate-pulse bg-coral text-white"
                                    : "bg-coral-soft text-coral-ink hover:bg-coral hover:text-white"
                                    }`}
                                title={isListening ? "Listening... click to stop" : "Click to speak"}
                            >
                                🎤
                            </button>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your question, or tap the mic and speak..."
                                className="flex-1 bg-transparent text-sm text-ink placeholder-placeholder outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}