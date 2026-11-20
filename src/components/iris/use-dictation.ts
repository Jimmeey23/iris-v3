"use client";

import * as React from "react";

/* Minimal typing for the browser Web Speech API (Chrome, Edge, Safari). */
type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Allow it in the browser's site settings.",
  "service-not-allowed": "Microphone access is blocked. Allow it in the browser's site settings.",
  "no-speech": "Didn't hear anything. Try again closer to the mic.",
  "audio-capture": "No microphone found.",
  network: "Voice typing needs an internet connection.",
};

/** Speech-to-text into a text box. `onText` gets the base text plus everything said so far. */
export function useDictation(onText: (text: string) => void, onError: (msg: string) => void) {
  const recRef = React.useRef<Rec | null>(null);
  const [listening, setListening] = React.useState(false);
  const supported =
    typeof window !== "undefined" && Boolean((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition);

  const stop = React.useCallback(() => recRef.current?.stop(), []);

  const start = React.useCallback(
    (base: string) => {
      const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
      const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
      if (!Ctor) {
        onError("Voice typing isn't supported in this browser. Use Chrome, Edge or Safari.");
        return;
      }
      const rec = new Ctor();
      rec.lang = "en-IN";
      rec.continuous = true;
      rec.interimResults = true;
      const prefix = base.trim() ? `${base.trim()} ` : "";
      let finalText = "";
      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else interim += r[0].transcript;
        }
        onText(prefix + (finalText + interim).trim());
      };
      rec.onerror = (e) => {
        if (e.error !== "aborted") onError(ERRORS[e.error] ?? `Voice typing stopped (${e.error}).`);
      };
      rec.onend = () => {
        setListening(false);
        recRef.current = null;
      };
      recRef.current = rec;
      try {
        rec.start();
        setListening(true);
      } catch {
        onError("Couldn't start the microphone.");
      }
    },
    [onText, onError],
  );

  React.useEffect(() => () => recRef.current?.stop(), []);
  return { listening, supported, start, stop };
}
