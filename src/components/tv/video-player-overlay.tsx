/**
 * Full-screen video player overlay for TV display
 * Plays video over the price display
 */

import { useEffect, useRef } from "react";

interface VideoPlayerOverlayProps {
  videoUrl: string;
  videoName: string;
  onEnded: () => void;
}

export function VideoPlayerOverlay({
  videoUrl,
  videoName,
  onEnded,
}: VideoPlayerOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Auto-play when component mounts
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error("Failed to auto-play video:", error);
      });
    }
  }, [videoUrl]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        autoPlay
        muted
        playsInline
        onEnded={onEnded}
        onError={(e) => {
          console.error("Video playback error:", e);
          // Call onEnded to move to next campaign if video fails
          onEnded();
        }}
      />

      {/* Video info overlay (shown briefly or on hover) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <p className="text-2xl text-white font-medium">{videoName}</p>
      </div>
    </div>
  );
}
