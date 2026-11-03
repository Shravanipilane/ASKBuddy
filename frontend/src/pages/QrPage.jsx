import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TopNav from "../components/TopNav";
import { resolveQr } from "../api/qr";

export default function QrPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [code, setCode] = useState("");
    const [chapter, setChapter] = useState(null); // the record from the backend
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [scanning, setScanning] = useState(false);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const timerRef = useRef(null);

    async function lookUp(value) {
        const clean = (value ?? code).trim();
        if (!clean || isLoading) return;
        setError("");
        setChapter(null);
        setIsLoading(true);
        try {
            setChapter(await resolveQr(clean));
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    // If the page was opened from a link like /qr?code=11080CH01, look it up straight away
    useEffect(() => {
        const fromLink = searchParams.get("code");
        if (fromLink) {
            setCode(fromLink);
            lookUp(fromLink);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function stopCamera() {
        clearInterval(timerRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setScanning(false);
    }

    // Camera scanning (works after deployment on HTTPS, or on localhost)
    useEffect(() => {
        if (!scanning) return;
        let cancelled = false;

        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" }, // back camera on phones
                });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                videoRef.current.srcObject = stream;
                await videoRef.current.play();

                const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
                timerRef.current = setInterval(async () => {
                    try {
                        const found = await detector.detect(videoRef.current);
                        if (found.length > 0) {
                            const value = found[0].rawValue;
                            stopCamera();
                            setCode(value);
                            lookUp(value);
                        }
                    } catch {
                        /* ignore a bad frame, try the next one */
                    }
                }, 400);
            } catch (err) {
                setError(
                    err.name === "NotAllowedError"
                        ? "Camera is blocked. Allow the camera in your browser settings and try again."
                        : "Couldn't open the camera. You can paste the code instead."
                );
                setScanning(false);
            }
        })();

        return () => {
            cancelled = true;
            clearInterval(timerRef.current);
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanning]);

    function handleScanClick() {
        setError("");
        if (scanning) {
            stopCamera();
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia || !("BarcodeDetector" in window)) {
            setError("Camera scanning isn't supported in this browser. Scan with your phone camera, then paste the code here.");
            return;
        }
        if (!window.isSecureContext) {
            setError("Camera scanning needs a secure (https) page. Paste the code here for now.");
            return;
        }
        setScanning(true);
    }

    function startAsking() {
        // Pass the chapter to the Ask page
        navigate("/ask", { state: { qr: chapter } });
    }

    const partText = chapter && chapter.part > 0 ? ` · Part ${chapter.part}` : "";

    return (
        <div className="flex min-h-screen w-full flex-col bg-surface">
            <TopNav />

            <div className="flex flex-1 items-start justify-center bg-gradient-to-b from-primary-soft via-surface to-surface px-4 py-8 sm:px-8">
                <div className="w-full max-w-xl rounded-[2.5rem] border-2 border-line bg-white p-6 shadow-lg sm:p-10">
                    <h1 className="text-center font-display text-2xl font-extrabold text-ink sm:text-3xl">
                        Scan your NCERT book 📚
                    </h1>
                    <p className="mt-2 text-center text-sm text-ink/70">
                        Scan the QR code on your chapter, then start asking questions about it.
                    </p>

                    {/* Camera */}
                    {scanning && (
                        <div className="mt-5 overflow-hidden rounded-2xl border-2 border-line bg-black">
                            <video ref={videoRef} playsInline muted className="h-64 w-full object-cover" />
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleScanClick}
                        className="mt-5 w-full rounded-full bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-dark"
                    >
                        {scanning ? "Stop camera" : "📷 Scan QR with camera"}
                    </button>

                    <div className="my-5 flex items-center gap-3 text-xs font-bold text-ink/40">
                        <span className="h-px flex-1 bg-line" />
                        OR PASTE THE CODE
                        <span className="h-px flex-1 bg-line" />
                    </div>

                    {/* Paste the code */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            lookUp();
                        }}
                        className="flex items-center gap-2 rounded-full border-2 border-line bg-surface px-3 py-2.5 transition focus-within:border-primary"
                    >
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Paste the code or link from your phone"
                            className="flex-1 bg-transparent px-2 text-sm text-ink placeholder-placeholder outline-none"
                        />
                        <button
                            type="submit"
                            disabled={!code.trim() || isLoading}
                            className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {isLoading ? "Looking..." : "Find"}
                        </button>
                    </form>

                    {error && (
                        <p className="mt-3 text-center text-sm font-bold text-coral-ink">{error}</p>
                    )}

                    {/* Result */}
                    {chapter && (
                        <div className="mt-6 rounded-2xl bg-mint-soft p-5 text-center">
                            <p className="text-xs font-bold uppercase tracking-wide text-mint-ink">Found it!</p>
                            <p className="mt-1 font-display text-xl font-extrabold text-ink">
                                {chapter.subject} · Class {chapter.std}
                                {partText}
                            </p>
                            <p className="text-sm font-bold text-ink/80">
                                Chapter {chapter.chapter}
                                {chapter.title ? `: ${chapter.title}` : ""}
                            </p>
                            <button
                                type="button"
                                onClick={startAsking}
                                className="mt-4 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-primary-dark"
                            >
                                Start asking questions →
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}