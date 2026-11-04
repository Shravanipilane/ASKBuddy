// Plays Buddy's voice piece by piece: the first short phrase starts quickly,
// and the rest is made while it plays. Same speak() / stopSpeaking() as before.
// If the new streaming route fails for any reason, it falls back to the old
// speak() from ask.js, so Listen always keeps working.
import { speak as legacySpeak, stopSpeaking as legacyStop } from "./ask";

const BASE = "/api";

let current = null; // the speech that is playing right now

function finish(run) {
  if (run.done) return;
  run.done = true;
  run.controller.abort();
  run.audio?.pause();
  run.queue.length = 0;
  if (current === run) current = null;
  run.onEnd?.();
}

export function stopSpeaking() {
  if (current) finish(current);
  legacyStop();
}

export async function speak(text, { onStart, onEnd } = {}) {
  stopSpeaking();

  const run = {
    done: false,
    controller: new AbortController(),
    queue: [],
    audio: null,
    playing: false,
    fetching: true,
    started: false,
    onEnd,
  };
  current = run;
  let failed = false;

  function playNext() {
    if (run.done) return;
    const next = run.queue.shift();
    if (!next) {
      run.playing = false;
      if (!run.fetching) finish(run); // everything has been played
      return;
    }
    run.playing = true;
    const audio = new Audio(`data:${next.mime};base64,${next.audio_base64}`);
    run.audio = audio;
    audio.onplay = () => {
      if (!run.started) {
        run.started = true;
        onStart?.();
      }
    };
    audio.onended = playNext;
    audio.onerror = () => {
      console.error("Voice: could not play an audio piece");
      playNext();
    };
    audio.play().catch((err) => {
      console.error("Voice: the browser blocked or could not play the sound", err);
      finish(run);
    });
  }

  try {
    const res = await fetch(`${BASE}/voice/speak_stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: run.controller.signal,
    });
    if (!res.ok || !res.body) throw new Error(`speak_stream returned status ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;
        run.queue.push(JSON.parse(line)); // a page that is not JSON throws here, which triggers the fallback
        if (!run.playing) playNext();
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      failed = true;
      console.warn("Voice: streaming failed.", err);
    }
  } finally {
    run.fetching = false;
    if (failed && !run.started && !run.done) {
      // hand over to the old voice, without telling the page that speaking ended
      run.done = true;
      run.controller.abort();
      run.audio?.pause();
      run.queue.length = 0;
      if (current === run) current = null;
      console.warn("Voice: using the normal voice instead.");
      legacySpeak(text, { onStart, onEnd });
    } else if (!run.done && !run.playing) {
      if (run.queue.length) playNext();
      else finish(run); // nothing came back, so end cleanly
    }
  }
}