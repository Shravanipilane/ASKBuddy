import { useEffect, useMemo, useRef, useState } from "react";
import { getToken } from "../api/auth";

/* ASKBuddy Chat History (Tailwind). Same loading and opening logic as before.
   New: ASKBuddy colours, rename, pin, streak, copy answer, page sources.
   Rename needs ONE backend route:  PATCH /api/history/{id}  with body {"title": "..."}
   Pins are saved on this device only (localStorage), no backend needed. */

const PIN_KEY = "askbuddy_pinned_chats";

function loadPins() {
  try {
    return JSON.parse(localStorage.getItem(PIN_KEY)) || [];
  } catch {
    return [];
  }
}
function savePins(pins) {
  try {
    localStorage.setItem(PIN_KEY, JSON.stringify(pins));
  } catch {
    /* storage can be blocked; pins just won't persist */
  }
}

const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

function subjectEmoji(book = "") {
  const b = (book || "").toLowerCase();
  if (b.includes("physic")) return "⚛️";
  if (b.includes("chem")) return "🧪";
  if (b.includes("bio")) return "🧬";
  if (b.includes("math")) return "📐";
  if (b.includes("histor")) return "🏛️";
  if (b.includes("econom")) return "📈";
  if (b.includes("geograph")) return "🌍";
  if (b.includes("politic")) return "🗳️";
  if (b.includes("english")) return "✍️";
  return "📖";
}

function dayKey(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function calcStreak(chats) {
  const days = new Set(
    chats.map((c) => c.updated_at || c.created_at).filter(Boolean).map(dayKey)
  );
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1); // today not asked yet
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function groupLabel(chat, pinned) {
  if (pinned) return "📌 Pinned";
  const d = new Date(chat.updated_at || chat.created_at);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return (now - d) / 86400000 <= 7 ? "Earlier this week" : "Older";
}

const BADGES = [
  { id: "first", emoji: "🌱", name: "First question", test: (s) => s.total >= 1 },
  { id: "curious", emoji: "🐱", name: "Curious cat · 5 chats", test: (s) => s.total >= 5 },
  { id: "worm", emoji: "🐛", name: "Bookworm · 15 chats", test: (s) => s.total >= 15 },
  { id: "fire", emoji: "🔥", name: "On fire · 3-day streak", test: (s) => s.streak >= 3 },
  { id: "week", emoji: "🏆", name: "Week warrior · 7-day streak", test: (s) => s.streak >= 7 },
];

function buddySays(stats) {
  const h = new Date().getHours();
  const hi = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  if (stats.total === 0) return `${hi}! Ask me your first question and I'll keep it safe here.`;
  if (stats.streak >= 3) return `${hi}! ${stats.streak} days in a row. You're unstoppable!`;
  return `${hi}! Pick an old chat and quiz yourself before you open it.`;
}

function exportChat(chat) {
  const lines = (chat.messages || []).map(
    (m) => `${m.role === "user" ? "You" : "ASKBuddy"}: ${m.content}`
  );
  const text = `${chat.title || "ASKBuddy conversation"}\n\n${lines.join("\n\n")}\n`;
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const link = document.createElement("a");
  const name = (chat.title || "").replace(/[^\w\- ]+/g, "").trim().slice(0, 40) || "askbuddy-chat";
  link.href = url;
  link.download = `${name}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

// sources may be a list of objects, a list of strings, or a JSON string; show what we can
function sourceLabels(sources) {
  let list = sources;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      return list.trim() ? [list.trim()] : [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((s) => {
      if (!s) return "";
      if (typeof s === "string") return s;
      const parts = [s.chapter || s.book, s.page != null ? `p. ${s.page}` : null];
      return parts.filter(Boolean).join(" · ");
    })
    .filter(Boolean)
    .slice(0, 4);
}

/* ---------- small pieces ---------- */

function Buddy({ size = 40 }) {
  const dot = Math.max(3, size * 0.09);
  return (
    <div
      aria-hidden="true"
      className="relative shrink-0 rounded-full bg-gradient-to-br from-[#6a5bd6] to-[#e8697d] shadow-md"
      style={{ width: size, height: size }}
    >
      <span className="absolute rounded-full bg-white" style={{ left: "34%", top: "40%", width: dot, height: dot }} />
      <span className="absolute rounded-full bg-white" style={{ right: "34%", top: "40%", width: dot, height: dot }} />
      <span
        className="absolute rounded-full bg-white"
        style={{ left: "50%", top: "62%", width: size * 0.22, height: dot * 0.8, transform: "translateX(-50%)" }}
      />
    </div>
  );
}

function TitleEditor({ initial, onSave, onCancel }) {
  const [text, setText] = useState(initial);
  const ref = useRef(null);
  const done = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function finish(save) {
    if (done.current) return;
    done.current = true;
    save ? onSave(text) : onCancel();
  }

  return (
    <input
      ref={ref}
      value={text}
      maxLength={80}
      aria-label="Conversation name"
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(true);
        if (e.key === "Escape") finish(false);
      }}
      onBlur={() => finish(true)}
      className="w-full rounded-xl border-2 border-[#4a4cdb] bg-white px-3 py-1.5 text-sm font-semibold text-[#151a3d] outline-none focus:ring-4 focus:ring-[#4a4cdb]/20"
    />
  );
}

function Stat({ emoji, value, label }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 text-center backdrop-blur-sm">
      <div className="text-xl">{emoji}</div>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-white/80">{label}</div>
    </div>
  );
}

/* ---------- the page ---------- */

export default function ChatHistory() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [pins, setPins] = useState(loadPins);
  const [copiedId, setCopiedId] = useState(null);
  const [sort, setSort] = useState("newest");
  const [msgSearch, setMsgSearch] = useState("");
  const noticeTimer = useRef(null);

  function flash(text) {
    setNotice(text);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 2500);
  }
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  async function loadHistory() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/history", { headers: authHeaders() });
      if (!response.ok) throw new Error("Could not load chat history");
      const data = await response.json();
      setChats(Array.isArray(data) ? data : data.chats || data.history || []);
    } catch (err) {
      console.error(err);
      setError("Couldn't load your conversations. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function openChat(id) {
    setEditingId(null);
    setMsgSearch("");
    try {
      const response = await fetch(`/api/history/${id}`, { headers: authHeaders() });
      if (!response.ok) throw new Error("Could not load conversation");
      setSelectedChat(await response.json());
    } catch (err) {
      console.error(err);
      setError("Couldn't open this conversation.");
    }
  }

  async function saveTitle(id, raw) {
    setEditingId(null);
    const title = raw.trim();
    const old = chats.find((c) => c.id === id)?.title || "";
    if (!title || title === old) return;

    const apply = (t) => {
      setChats((cs) => cs.map((c) => (c.id === id ? { ...c, title: t } : c)));
      setSelectedChat((s) => (s && s.id === id ? { ...s, title: t } : s));
    };

    apply(title); // show the new name straight away
    try {
      const response = await fetch(`/api/history/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error("rename failed");
      flash("Renamed! ✏️");
    } catch (err) {
      console.error(err);
      apply(old); // put the old name back
      setError("Couldn't rename this conversation. Please try again.");
    }
  }

  function togglePin(id) {
    const next = pins.includes(id) ? pins.filter((p) => p !== id) : [...pins, id];
    setPins(next);
    savePins(next);
    flash(next.includes(id) ? "Pinned to the top 📌" : "Unpinned");
  }

  async function copyAnswer(message) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setError("Couldn't copy. Select the text and copy it instead.");
    }
  }

  const stats = useMemo(() => {
    const now = new Date();
    const week = chats.filter((c) => {
      const d = new Date(c.updated_at || c.created_at);
      const days = (now - d) / 86400000;
      return days >= 0 && days <= 7;
    }).length;
    return { total: chats.length, week, streak: calcStreak(chats) };
  }, [chats]);

  const filteredChats = useMemo(() => {
    const now = new Date();
    return chats
      .filter((chat) => {
        const text = `${chat.title || ""} ${chat.book || ""} ${chat.chapter || ""}`.toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;

        const date = new Date(chat.created_at);
        const daysAgo = (now - date) / 86400000;
        return (
          filter === "All" ||
          (filter === "Today" && date.toDateString() === now.toDateString()) ||
          (filter === "This week" && daysAgo <= 7 && daysAgo >= 0) ||
          (filter === "Pinned" && pins.includes(chat.id))
        );
      })
      .sort((a, b) => {
        const pin = Number(pins.includes(b.id)) - Number(pins.includes(a.id));
        if (pin) return pin;
        if (sort === "az") return (a.title || "").localeCompare(b.title || "");
        const t = (c) => new Date(c.updated_at || c.created_at).getTime() || 0;
        return sort === "oldest" ? t(a) - t(b) : t(b) - t(a);
      });
  }, [chats, search, filter, pins, sort]);

  const badges = BADGES.map((b) => ({ ...b, earned: b.test(stats) }));
  const says = buddySays(stats);
  const visibleMessages = (selectedChat?.messages || []).filter((m) =>
    (m.content || "").toLowerCase().includes(msgSearch.toLowerCase())
  );

  function surprise() {
    if (!filteredChats.length) return;
    const pick = filteredChats[Math.floor(Math.random() * filteredChats.length)];
    openChat(pick.id);
    flash("Here's a random one. Test yourself! 🎲");
  }

  const ring = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e8697d]/40";

  return (
    <div className="min-h-screen bg-[#eceefb] p-5 text-[#151a3d] md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold md:text-4xl">Chat History</h1>
              <p className="mt-1 text-[#5b6080]">Every question is a step forward. Revisit what you've learned!</p>
            </div>
          </div>
          <button
            onClick={loadHistory}
            className={`rounded-full border-2 border-[#4a4cdb] bg-white px-5 py-2 font-bold text-[#4a4cdb] transition hover:bg-[#eceefe] ${ring}`}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Buddy says */}
        <div className="mb-6 flex items-center gap-3">
          <div className="motion-safe:hover:animate-bounce"><Buddy size={52} /></div>
          <div className="rounded-3xl rounded-bl-md bg-white px-5 py-3 text-sm font-semibold shadow-[0_4px_18px_rgba(74,76,219,0.1)]">
            {says}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-[#4a4cdb] via-[#6a5bd6] to-[#e8697d] p-5 text-white shadow-lg">
          <p className="mb-3 text-sm font-semibold text-white/90">
            {stats.streak > 1
              ? `You're on a ${stats.streak}-day streak. Keep it going! 🔥`
              : "Ask something today to start a streak! 🚀"}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Stat emoji="💬" value={stats.total} label="Conversations" />
            <Stat emoji="📅" value={stats.week} label="This week" />
            <Stat emoji="🔥" value={stats.streak} label="Day streak" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Badges">
            {badges.map((b) => (
              <span
                key={b.id}
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  b.earned ? "bg-white text-[#4a4cdb]" : "bg-white/10 text-white/70"
                }`}
              >
                {b.earned ? b.emoji : "🔒"} {b.name}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-5 flex items-center justify-between rounded-2xl bg-[#fde8ec] p-4 text-sm font-semibold text-[#b3261e]">
            <span>{error}</span>
            <button onClick={() => setError("")} className={`rounded-full px-2 ${ring}`} aria-label="Dismiss">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Conversation list */}
          <div className="rounded-3xl bg-white p-5 shadow-[0_4px_18px_rgba(74,76,219,0.1)] lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold">💬 Your conversations</h2>
              <span className="rounded-full bg-[#eceefe] px-3 py-1 text-xs font-bold text-[#4a4cdb]">
                {filteredChats.length} chats
              </span>
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search by name, book or chapter"
              aria-label="Search conversations"
              className="mb-4 w-full rounded-full border-2 border-[#e2e5f6] bg-[#f6f7fd] px-5 py-3 text-sm outline-none transition focus:border-[#4a4cdb] focus:ring-4 focus:ring-[#4a4cdb]/15"
            />

            <div className="mb-5 flex flex-wrap gap-2">
              {["All", "Today", "This week", "Pinned"].map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  aria-pressed={filter === item}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${ring} ${
                    filter === item
                      ? "bg-[#4a4cdb] text-white shadow"
                      : "bg-[#eceefe] text-[#4a4cdb] hover:bg-[#dfe2fc]"
                  }`}
                >
                  {item === "Pinned" ? "📌 Pinned" : item}
                </button>
              ))}
            </div>

            <div className="mb-5 flex items-center gap-2">
              <label htmlFor="sort" className="sr-only">Sort conversations</label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="flex-1 rounded-full border-2 border-[#e2e5f6] bg-white px-4 py-2 text-sm font-semibold outline-none focus:border-[#4a4cdb]"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="az">A to Z</option>
              </select>
              <button
                onClick={surprise}
                className={`shrink-0 rounded-full bg-[#fff0d6] px-4 py-2 text-sm font-bold text-[#9a5b00] hover:bg-[#ffe4b3] ${ring}`}
              >
                🎲 Surprise me
              </button>
            </div>

            {loading ? (
              <div className="space-y-3" aria-label="Loading your conversations">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-[#eceefe]" />
                ))}
                <p className="pt-2 text-center text-sm text-[#5b6080]">Fetching your learning journey… ✨</p>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mb-3 flex justify-center"><Buddy size={72} /></div>
                <p className="font-extrabold">
                  {chats.length === 0 ? "Your journey starts here!" : "Nothing matches that"}
                </p>
                <p className="mt-2 text-sm text-[#5b6080]">
                  {chats.length === 0
                    ? "Ask Buddy a question and your chats will show up here."
                    : filter === "Pinned"
                    ? "Tap the 📍 on a chat to pin it."
                    : "Try another search or filter."}
                </p>
              </div>
            ) : (
              <div className="max-h-[600px] space-y-3 overflow-y-auto pr-1">
                {filteredChats.map((chat, index) => {
                  const selected = selectedChat?.id === chat.id;
                  const pinned = pins.includes(chat.id);
                  const editing = editingId === chat.id;
                  const tile = (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eceefe] text-xl">
                      {subjectEmoji(chat.book)}
                    </div>
                  );
                  const label = groupLabel(chat, pinned);
                  const prev = filteredChats[index - 1];
                  const showLabel = sort !== "az" && (!prev || label !== groupLabel(prev, pins.includes(prev.id)));
                  return (
                    <div key={chat.id}>
                      {showLabel && (
                        <p className="mb-2 mt-1 text-xs font-extrabold tracking-wide text-[#5b6080]">{label}</p>
                      )}
                    <div
                      className={`flex items-center gap-1 rounded-2xl border-2 transition ${
                        selected
                          ? "border-[#4a4cdb] bg-[#eceefe]"
                          : "border-transparent bg-[#f6f7fd] hover:border-[#c9ccf5]"
                      }`}
                    >
                      {editing ? (
                        <div className="flex min-w-0 flex-1 items-center gap-3 p-3">
                          {tile}
                          <TitleEditor
                            initial={chat.title || ""}
                            onSave={(t) => saveTitle(chat.id, t)}
                            onCancel={() => setEditingId(null)}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => openChat(chat.id)}
                          className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3 text-left ${ring}`}
                        >
                          {tile}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold">
                              {pinned && <span aria-label="Pinned">📌 </span>}
                              {chat.title || "New conversation"}
                            </p>
                            <p className="mt-0.5 text-xs text-[#5b6080]">
                              {formatDate(chat.updated_at || chat.created_at)}
                            </p>
                            {(chat.book || chat.chapter) && (
                              <p className="mt-1 inline-block max-w-full truncate rounded-full bg-[#e3f6ee] px-2 py-0.5 text-xs font-semibold text-[#1c6b4f]">
                                {chat.book || "NCERT"}
                                {chat.chapter ? ` · ${chat.chapter}` : ""}
                              </p>
                            )}
                          </div>
                        </button>
                      )}

                      {!editing && (
                        <div className="flex shrink-0 flex-col pr-2">
                          <button
                            onClick={() => togglePin(chat.id)}
                            aria-label={pinned ? "Unpin conversation" : "Pin conversation"}
                            className={`rounded-full p-1.5 text-sm hover:bg-white ${ring}`}
                          >
                            {pinned ? "📌" : "📍"}
                          </button>
                          <button
                            onClick={() => setEditingId(chat.id)}
                            aria-label="Rename conversation"
                            className={`rounded-full p-1.5 text-sm hover:bg-white ${ring}`}
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                    </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected conversation */}
          <div className="rounded-3xl bg-white p-5 shadow-[0_4px_18px_rgba(74,76,219,0.1)] lg:col-span-3">
            {!selectedChat ? (
              <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
                <div className="mb-4"><Buddy size={96} /></div>
                <h2 className="text-xl font-extrabold">Ready to revisit your learning?</h2>
                <p className="mt-2 max-w-sm text-sm text-[#5b6080]">
                  Pick a conversation on the left and let's go through it again!
                </p>
              </div>
            ) : (
              <>
                <div className="mb-5 border-b-2 border-[#eceefe] pb-4">
                  <p className="text-xs font-extrabold tracking-wide text-[#4a4cdb]">📚 CONVERSATION</p>
                  <div className="mt-2 flex items-center gap-2">
                    {editingId === selectedChat.id ? (
                      <TitleEditor
                        initial={selectedChat.title || ""}
                        onSave={(t) => saveTitle(selectedChat.id, t)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <>
                        <h2 className="min-w-0 truncate text-xl font-extrabold">
                          {selectedChat.title || "New conversation"}
                        </h2>
                        <button
                          onClick={() => setEditingId(selectedChat.id)}
                          aria-label="Rename conversation"
                          className={`shrink-0 rounded-full bg-[#eceefe] px-3 py-1 text-xs font-bold text-[#4a4cdb] hover:bg-[#dfe2fc] ${ring}`}
                        >
                          ✏️ Rename
                        </button>
                      </>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[#5b6080]">{selectedChat.messages?.length || 0} messages</span>
                    <input
                      type="text"
                      value={msgSearch}
                      onChange={(e) => setMsgSearch(e.target.value)}
                      placeholder="Search in this chat"
                      aria-label="Search in this chat"
                      className="min-w-0 flex-1 rounded-full border-2 border-[#e2e5f6] bg-[#f6f7fd] px-4 py-1.5 text-xs outline-none focus:border-[#4a4cdb]"
                    />
                    <button
                      onClick={() => exportChat(selectedChat)}
                      className={`shrink-0 rounded-full bg-[#eceefe] px-3 py-1.5 text-xs font-bold text-[#4a4cdb] hover:bg-[#dfe2fc] ${ring}`}
                    >
                      ⬇️ Save as text
                    </button>
                  </div>
                </div>

                <div className="max-h-[600px] space-y-4 overflow-y-auto pr-2">
                  {msgSearch && visibleMessages.length === 0 && (
                    <p className="py-8 text-center text-sm text-[#5b6080]">No messages match that. Try another word.</p>
                  )}
                  {visibleMessages.map((message) => {
                    const isUser = message.role === "user";
                    const labels = isUser ? [] : sourceLabels(message.sources);
                    return (
                      <div key={message.id} className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                        {!isUser && <Buddy size={32} />}
                        <div
                          className={`max-w-[85%] rounded-3xl p-4 ${
                            isUser
                              ? "rounded-br-md bg-[#4a4cdb] text-white"
                              : "rounded-bl-md border-2 border-[#eceefe] bg-[#f6f7fd]"
                          }`}
                        >
                          <p className={`mb-1 text-xs font-bold ${isUser ? "text-white/80" : "text-[#4a4cdb]"}`}>
                            {isUser ? "You" : "ASKBuddy"}
                          </p>
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>

                          {!isUser && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {labels.map((label) => (
                                <span
                                  key={label}
                                  className="rounded-full bg-[#e3f6ee] px-2.5 py-0.5 text-xs font-semibold text-[#1c6b4f]"
                                >
                                  📖 {label}
                                </span>
                              ))}
                              <button
                                onClick={() => copyAnswer(message)}
                                className={`rounded-full bg-white px-3 py-0.5 text-xs font-bold text-[#4a4cdb] hover:bg-[#eceefe] ${ring}`}
                              >
                                {copiedId === message.id ? "Copied! ✓" : "Copy"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-[#151a3d] px-5 py-3 text-sm font-bold text-white shadow-lg"
        >
          {notice}
        </div>
      )}
    </div>
  );
}