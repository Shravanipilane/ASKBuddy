
import { getToken } from "./auth";

const BASE = "/api";

async function apiRequest(path, options = {}) {
    const token = getToken();

    const response = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    const responseText = await response.text();
    let data = {};

    try {
        data = responseText ? JSON.parse(responseText) : {};
    } catch {
        throw new Error(`Invalid server response (${response.status}): ${responseText}`);
    }

    if (!response.ok) {
        throw new Error(data.detail || "Unable to contact server");
    }

    return { response, data };
}

// ---------- ASK QUESTION ----------

export async function askQuestion({
    message,
    sessionId,
    name,
    subject,
    std,
    chapter
}) {
    const { data } = await apiRequest("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message,
            session_id: sessionId || null,
            name,
            subject,
            std,
            chapter
        })
    });

    return {
        ...data,
        sessionId: data.session_id,
        answer: data.text,
        spokenText: data.spoken_text,
        mood: data.mood,
        sources: data.sources,
        historySessionId: data.history_session_id
    };
}

// ---------- TEXT TO SPEECH ----------

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
            headers: {
                "Content-Type": "application/json",
                ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
            },
            body: JSON.stringify({ text: text.slice(0, 2000) })
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

// ---------- AUDIO CONVERSION ----------

async function blobToWav(blob) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    let decoded;

    try {
        decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    } finally {
        ctx.close();
    }

    const rate = 16000;

    const offline = new OfflineAudioContext(
        1,
        Math.max(1, Math.ceil(decoded.duration * rate)),
        rate
    );

    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();

    const samples = (await offline.startRendering()).getChannelData(0);

    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeText = (offset, text) => {
        for (let i = 0; i < text.length; i++) {
            view.setUint8(offset + i, text.charCodeAt(i));
        }
    };

    writeText(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeText(8, "WAVE");
    writeText(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeText(36, "data");
    view.setUint32(40, samples.length * 2, true);

    for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(
            44 + i * 2,
            s < 0 ? s * 0x8000 : s * 0x7fff,
            true
        );
    }

    return new Blob([buffer], { type: "audio/wav" });
}

// ---------- SPEECH TO TEXT ----------

export async function transcribeAudio(blob) {
    let wav;

    try {
        wav = await blobToWav(blob);
    } catch {
        throw new Error(
            "Could not process the recording in this browser. Try Chrome or Edge."
        );
    }

    const form = new FormData();
    form.append("file", wav, "speech.wav");

    let res;

    try {
        res = await fetch(`${BASE}/voice/transcribe`, {
            method: "POST",
            headers: {
                ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
            },
            body: form
        });
    } catch {
        throw new Error("Cannot reach the server. Is the backend running?");
    }

    const responseText = await res.text();
    let data = {};

    try {
        data = responseText ? JSON.parse(responseText) : {};
    } catch {
        throw new Error("Invalid transcription response from server.");
    }

    if (!res.ok) {
        throw new Error(
            data.detail || "I couldn't understand that audio. Please try again."
        );
    }

    return (data.text || "").trim();
}
