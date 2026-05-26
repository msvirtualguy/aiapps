"use client";

import { Mic, MicOff } from "lucide-react";

interface Props {
  recording: boolean;
  onToggle: () => void;
  disabled: boolean;
}

export default function VoiceButton({ recording, onToggle, disabled }: Props) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled && !recording}
      title={recording ? "Stop recording" : "Start voice input"}
      className={`flex-shrink-0 w-11 h-11 rounded-xl transition-all flex items-center justify-center relative ${
        recording
          ? "bg-red-500 hover:bg-red-600"
          : "bg-surface border border-surface-border hover:border-brand disabled:opacity-30 disabled:cursor-not-allowed"
      }`}
    >
      {recording ? (
        <>
          {/* Waveform animation while recording */}
          <div className="flex items-center gap-0.5 h-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="waveform-bar w-0.5 bg-white rounded-full"
                style={{ height: "16px" }}
              />
            ))}
          </div>
          {/* Pulsing ring */}
          <span className="absolute inset-0 rounded-xl border-2 border-red-400 animate-ping opacity-30" />
        </>
      ) : (
        <Mic size={16} className="text-text-secondary" />
      )}
    </button>
  );
}
