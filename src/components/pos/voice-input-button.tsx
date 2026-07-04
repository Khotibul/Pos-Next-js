"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const NUMBER_WORDS: Record<string, number> = {
  satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5,
  enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
  sebelas: 11,
};

function parseQuantityFromWords(words: string[]): { qty: number; nameWords: string[] } {
  let qty = 1;
  let splitIdx = words.length;
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i].toLowerCase();
    const num = Number(w);
    if (!isNaN(num) && num > 0 && num <= 999) {
      qty = Math.round(num);
      splitIdx = i;
      break;
    }
    if (NUMBER_WORDS[w] !== undefined) {
      qty = NUMBER_WORDS[w];
      splitIdx = i;
      break;
    }
  }
  const nameWords = words.slice(0, splitIdx);
  return { qty, nameWords };
}

export function VoiceInputButton({ onProductDetected }: { onProductDetected: (productName: string, qty: number) => Promise<boolean> }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionAPI | null>(null);
  const mountedRef = useRef(true);
  const listeningRef = useRef(false);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { }
      recognitionRef.current = null;
    }
    setListening(false);
    setTranscript("");
    listeningRef.current = false;
  }, []);

  const start = useCallback(() => {
    const SpeechRecognitionAPI = getSpeechRecognitionAPI();
    if (!SpeechRecognitionAPI) {
      alert("Browser tidak mendukung voice input. Gunakan Chrome terbaru.");
      return;
    }
    stop();
    const recog = new SpeechRecognitionAPI();
    recog.lang = "id-ID";
    recog.interimResults = true;
    recog.maxAlternatives = 1;

    recog.onresult = (event: SpeechRecognitionEvent) => {
      let final = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      const text = final || interim;
      setTranscript(text);

      if (final) {
        recog.stop();
        const words = final.trim().split(/\s+/);
        if (words.length > 0) {
          const { qty, nameWords } = parseQuantityFromWords(words);
          const name = nameWords.join(" ").trim();
          if (name) {
            setTranscript(`${name} x${qty}`);
            onProductDetected(name, qty).then((found) => {
              if (mountedRef.current) {
                if (!found) {
                  setTranscript(`Produk "${name}" tidak ditemukan`);
                  setTimeout(() => { if (mountedRef.current) setTranscript(""); }, 2000);
                } else {
                  setListening(false);
                  setTranscript("");
                }
              }
            });
          }
        }
      }
    };

    recog.onerror = () => {
      if (mountedRef.current) { setListening(false); setTranscript(""); listeningRef.current = false; }
    };

    recog.onend = () => {
      if (mountedRef.current && listeningRef.current) {
        setListening(false);
        listeningRef.current = false;
      }
    };

    recognitionRef.current = recog;
    recog.start();
    setListening(true);
    setTranscript("");
    listeningRef.current = true;
  }, [stop, onProductDetected]);

  return (
    <div className="relative">
      <Button
        type="button"
        variant={listening ? "default" : "outline"}
        className={`h-10 w-10 rounded-xl p-0 ${listening ? "animate-pulse bg-primary text-primary-foreground" : ""}`}
        onClick={listening ? stop : start}
        aria-label="Voice input"
        title="Cari produk pakai suara"
      >
        {listening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
      </Button>
      {transcript ? (
        <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-lg">
          {transcript}
        </div>
      ) : null}
    </div>
  );
}

function getSpeechRecognitionAPI(): { new(): SpeechRecognitionAPI } | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  if (w.SpeechRecognition) return w.SpeechRecognition as { new(): SpeechRecognitionAPI };
  if (w.webkitSpeechRecognition) return w.webkitSpeechRecognition as { new(): SpeechRecognitionAPI };
  return null;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResult[];
  resultIndex: number;
}

interface SpeechRecognitionAPI {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
