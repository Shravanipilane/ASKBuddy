// Talks to the backend QR route: POST /qr/resolve
const BASE = "/api"; // Vite removes "/api" and forwards to FastAPI (same as api/ask.js)

export async function resolveQr(code) {
    let res;
    try {
        res = await fetch(`${BASE}/qr/resolve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: code.trim() }),
        });
    } catch {
        throw new Error("Can't reach the server. Is the backend running?");
    }

    if (res.status === 404) {
        throw new Error("This QR code isn't linked to a chapter yet.");
    }
    if (!res.ok) {
        throw new Error("Something went wrong. Please try again.");
    }
    // { code, subject, std, part, chapter, title }
    return res.json();
}