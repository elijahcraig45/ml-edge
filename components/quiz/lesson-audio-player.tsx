"use client";

interface LessonAudioPlayerProps {
  audioUrl: string;
  topic: string;
}

export function LessonAudioPlayer({ audioUrl, topic }: LessonAudioPlayerProps) {
  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/30 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🎧</span>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
          Podcast · Listen while you read
        </p>
      </div>
      <p className="mb-3 text-xs text-slate-400">{topic}</p>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        controls
        className="w-full"
        style={{ accentColor: "#6366f1" }}
        preload="metadata"
        src={audioUrl}
      />
    </div>
  );
}
