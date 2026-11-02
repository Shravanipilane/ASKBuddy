// This file is the ONLY place where the frontend talks to the backend for login and sign up.
//
// Right now the backend login/sign up is not ready, so USE_FAKE_BACKEND is true:
// the functions just wait a moment and say "success" for anything you type.
// That means there is NO real security yet.
//
// When your FastAPI routes are ready:
//   1. Set USE_FAKE_BACKEND to false.
//   2. Change the two paths below ('/auth/login' and '/auth/signup') to match your routes.
//   3. Make sure FastAPI allows our address with CORS (http://localhost:5173).

const API_URL = "";

async function request(path, body) {
    let res;
    try {
        res = await fetch(`${API_URL}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    } catch (err) {
        throw new Error("Cannot reach the server. Is the backend running?");
    }

    let data = {};
    try {
        data = await res.json();
    } catch {
        /* empty or non-JSON response */
    }

    if (!res.ok) {
        const detail = data.detail;
        const message = Array.isArray(detail)
            ? detail.map((d) => d.msg).join(", ")
            : detail || "Something went wrong";
        throw new Error(message);
    }

    return data;
}

function saveSession(data) {
    if (data.access_token) {
        sessionStorage.setItem("token", data.access_token);
    }
    if (data.user) {
        sessionStorage.setItem("user", JSON.stringify(data.user));
    }
}

export async function signup({ name, email, studentClass, stream, password }) {
    const data = await request("/auth/signup", {
        name,
        email,
        class_level: studentClass,   // frontend field -> backend field
        stream,
        password,
    });
    saveSession(data);
    return data;
}

export async function login({ email, password }) {
    const data = await request("/auth/login", { email, password });
    saveSession(data);
    return data;
}

export function logout() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
}

export function getToken() {
    return sessionStorage.getItem("token");
}