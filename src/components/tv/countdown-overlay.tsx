/**
 * Full-screen countdown overlay for TV display
 * Shows animated countdown before video plays
 */

interface CountdownOverlayProps {
  secondsRemaining: number;
  totalSeconds: number;
  videoName: string;
  videoThumbnail?: string | null;
}

export function CountdownOverlay({
  secondsRemaining,
  totalSeconds,
  videoName,
  videoThumbnail,
}: CountdownOverlayProps) {
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[100px] bg-gradient-to-r from-purple-900/20 via-transparent to-emerald-900/20 animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_70%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Thumbnail preview (if available) */}
        {videoThumbnail && (
          <div className="mb-8 rounded-xl overflow-hidden shadow-2xl shadow-white/10 ring-2 ring-white/20">
            <img
              src={videoThumbnail}
              alt={videoName}
              className="w-80 h-44 object-cover"
            />
          </div>
        )}

        {/* Countdown timer */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 blur-3xl bg-white/20 rounded-full scale-150" />

          {/* Timer */}
          <div
            className="relative text-[12rem] font-black text-white tabular-nums leading-none"
            style={{
              textShadow:
                "0 0 40px rgba(255,255,255,0.5), 0 0 80px rgba(255,255,255,0.3)",
              animation:
                secondsRemaining <= 10
                  ? "pulse 1s ease-in-out infinite"
                  : undefined,
            }}
          >
            {formatTime(secondsRemaining)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-12 w-96 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 transition-[width] duration-1000 ease-linear"
            style={{
              width: `${totalSeconds > 0 ? (secondsRemaining / totalSeconds) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
