const BASE = "/api"; // Vite removes "/api" and forwards to FastAPI (see vite.config.js)

// Ask a question. Returns data in the shape AskPage renders.
export async function askQuestion({ message, sessionId, name, scope = {} }) {
    let res;
    try {
        res = await fetch(`${BASE}/ask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message,
                session_id: sessionId || null,
                name: name ? name.slice(0, 40) : null,
                subject: scope.subject || null,
                std: scope.std || null,
                chapter: scope.chapter || null,
            }),
        });
    } catch {
        throw new Error("Cannot reach the server. Is the backend running?");
    }
    if (!res.ok) throw new Error("Something went wrong. Please try again.");

    const data = await res.json();
    return {
        sessionId: data.session_id,
        answer: data.text,
        spokenText: data.spoken_text,
        mood: data.mood,
        sources: (data.sources || []).map((s) => ({
            book: `${s.subject} Class ${s.std}`,
            chapter: `Chapter ${s.chapter}`,
            page: s.page,
        })),
    };
}

// ---- Talking: send text to /voice/speak and play the WAV ----
let stopCurrent = null;

export function stopSpeaking() {
    if (stopCurrent) stopCurrent();
}

export async function speak(text, { onStart, onEnd } = {}) {
    stopSpeaking();
    if (!text) {
        onEnd?.();
        return;
    }

    let res;
    try {
        res = await fetch(`${BASE}/voice/speak`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text.slice(0, 2000) }),
        });
    } catch {
        onEnd?.();
        return;
    }
    if (!res.ok) {
        onEnd?.();
        return;
    }

    const url = URL.createObjectURL(await res.blob());
    const audio = new Audio(url);

    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        audio.pause();
        URL.revokeObjectURL(url);
        stopCurrent = null;
        onEnd?.();
    };
    stopCurrent = finish;
    audio.onended = finish;
    audio.onerror = finish;

    try {
        await audio.play();
        onStart?.();
    } catch {
        finish();
    }
}

// ---- Mic: send a recorded audio clip to /voice/transcribe (faster-whisper) ----
// ---- Mic: turn the recording into a 16 kHz mono WAV, then send it to /voice/transcribe ----
async function blobToWav(blob) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    let decoded;
    try {
        decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    } finally {
        ctx.close();
    }

    // Resample to 16 kHz mono (what Whisper uses)
    const rate = 16000;
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const samples = (await offline.startRendering()).getChannelData(0);

    // Write a 16-bit PCM WAV file
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeText = (offset, text) => {
        for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
    };
    writeText(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeText(8, "WAVE");
    writeText(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);        // PCM
    view.setUint16(22, 1, true);        // mono
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeText(36, "data");
    view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([buffer], { type: "audio/wav" });
}

export async function transcribeAudio(blob) {
    let wav;
    try {
        wav = await blobToWav(blob);
    } catch {
        throw new Error("Could not process the recording in this browser. Try Chrome or Edge.");
    }

    const form = new FormData();
    form.append("file", wav, "speech.wav");

    let res;
    try {
        res = await fetch(`${BASE}/voice/transcribe`, { method: "POST", body: form });
    } catch {
        throw new Error("Cannot reach the server. Is the backend running?");
    }

    if (!res.ok) {
        let detail = "";
        try {
            detail = (await res.json()).detail;
        } catch {
            /* not JSON */
        }
        throw new Error(
            typeof detail === "string" && detail
                ? detail
                : "I couldn't understand that audio. Please try again."
        );
    }

    const data = await res.json();
    return (data.text || "").trim();
}