/**
 * Full-screen overlay for highlighting a product after a campaign video ends.
 * Shows the product name with old price crossed out and new promotional price.
 * Supports optional image backgrounds (fullscreen or behind text).
 * Auto-dismisses after durationSeconds (handled by parent).
 */

interface CocktailHighlightOverlayProps {
  productName: string;
  newPrice: string;
  oldPrice?: string | null;
  imageUrl?: string | null;
  imageMode?: "fullscreen" | "background" | null;
  durationSeconds: number;
}

export function CocktailHighlightOverlay({
  productName,
  newPrice,
  oldPrice,
  imageUrl,
  imageMode,
  durationSeconds,
}: CocktailHighlightOverlayProps) {
  const newPriceNum = Math.round(parseFloat(newPrice));
  const oldPriceNum = oldPrice ? Math.round(parseFloat(oldPrice)) : null;
  const isDiscount = oldPriceNum !== null ? newPriceNum < oldPriceNum : true;

  // Fullscreen image mode — just the image, progress bar, no text
  if (imageMode === "fullscreen" && imageUrl) {
    return (
      <div className="fixed inset-0 bg-black z-50">
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
        />

        {/* Progress bar */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-96 h-1 bg-white/10 rounded-full overflow-hidden z-10">
          <div
            className="h-full bg-gradient-to-r from-white/60 to-white/40"
            style={{
              animation: `highlight-shrink ${durationSeconds}s linear forwards`,
            }}
          />
        </div>

        <style>{`
          @keyframes highlight-shrink {
            0% { width: 100%; }
            100% { width: 0%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50">
      {/* Background — image or gradient */}
      {imageMode === "background" && imageUrl ? (
        <div className="absolute inset-0">
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark scrim for text readability */}
          <div className="absolute inset-0 bg-black/60" />
        </div>
      ) : (
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={`absolute -inset-[100px] animate-pulse ${
              isDiscount
                ? "bg-gradient-to-r from-emerald-900/30 via-transparent to-emerald-900/20"
                : "bg-gradient-to-r from-amber-900/30 via-transparent to-amber-900/20"
            }`}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_70%)]" />
        </div>
      )}

      {/* Content with entrance animation */}
      <div className="relative z-10 flex flex-col items-center animate-highlight-enter">
        {/* Product name */}
        <h1
          className="text-6xl lg:text-[8rem] font-black text-white tracking-wider uppercase text-center leading-tight px-4"
          style={{
            textShadow:
              "0 0 60px rgba(255,255,255,0.4), 0 0 120px rgba(255,255,255,0.2)",
          }}
        >
          {productName}
        </h1>

        {/* Price display */}
        <div className="mt-6 lg:mt-12 flex items-center gap-4 lg:gap-8">
          {oldPriceNum !== null && (
            <>
              {/* Old price (crossed out) */}
              <span className="text-3xl lg:text-6xl font-mono text-white/30 line-through">
                {oldPriceNum}
              </span>

              {/* Arrow */}
              <span className="text-3xl lg:text-6xl text-white/50">&rarr;</span>
            </>
          )}

          {/* New price (highlighted) */}
          {!isNaN(newPriceNum) && newPriceNum > 0 && (
            <>
              <span
                className={`text-6xl lg:text-[10rem] font-mono font-black tabular-nums leading-none ${
                  isDiscount ? "text-emerald-400" : "text-amber-400"
                }`}
                style={{
                  textShadow: isDiscount
                    ? "0 0 40px rgba(52, 211, 153, 0.5)"
                    : "0 0 40px rgba(251, 191, 36, 0.5)",
                }}
              >
                {newPriceNum}
              </span>
              <span className="text-2xl lg:text-4xl text-white/40 font-mono">
                RSD
              </span>
            </>
          )}
        </div>
      </div>

      {/* Progress bar at bottom */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-96 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${
            isDiscount
              ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
              : "bg-gradient-to-r from-amber-500 to-amber-400"
          }`}
          style={{
            animation: `highlight-shrink ${durationSeconds}s linear forwards`,
          }}
        />
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes highlight-enter {
          0% { transform: scale(0.3); opacity: 0; }
          15% { transform: scale(1.05); opacity: 1; }
          20% { transform: scale(1); }
          85% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0; }
        }
        @keyframes highlight-shrink {
          0% { width: 100%; }
          100% { width: 0%; }
        }
        .animate-highlight-enter {
          animation: highlight-enter ${durationSeconds}s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
