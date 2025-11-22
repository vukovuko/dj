import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  getTVDisplayProducts,
  subscribeToPriceUpdates,
} from "~/queries/products.server";
import { ArrowUp, ArrowDown } from "lucide-react";

interface Product {
  id: string;
  name: string;
  categoryName: string | null;
  currentPrice: string;
  trend: "up" | "down";
}

export const Route = createFileRoute("/")({
  component: TVDisplay,
  loader: async () => {
    return await getTVDisplayProducts();
  },
});

function TVDisplay() {
  const initialData = Route.useLoaderData();
  const [products, setProducts] = useState(initialData);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Refresh product data
  const refreshProducts = async () => {
    try {
      const fresh = await getTVDisplayProducts();
      setProducts(fresh);
      setLastUpdated(new Date());
      console.log("📊 Products refreshed");
    } catch (error) {
      console.error("❌ Failed to refresh products:", error);
    }
  };

  // Set up real-time updates via Server-Sent Events (SSE)
  useEffect(() => {
    const connectSSE = async () => {
      try {
        // Get the SSE endpoint URL
        const response = await subscribeToPriceUpdates();
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          console.error("❌ No reader available for SSE stream");
          return;
        }

        console.log("🔌 Connected to price update stream");
        setIsConnected(true);

        // Read SSE stream
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);

                // Refresh products when price update notification received
                if (parsed.count !== undefined) {
                  await refreshProducts();
                }
              } catch (e) {
                // Ignore parse errors (e.g., keepalive pings)
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ SSE connection error:", error);
        setIsConnected(false);

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("🔄 Reconnecting to price update stream...");
          connectSSE();
        }, 5000);
      }
    };

    // Start SSE connection
    connectSSE();

    // Fallback polling every 60 seconds in case SSE fails
    fallbackIntervalRef.current = setInterval(async () => {
      if (!isConnected) {
        console.log("⏰ Fallback poll (SSE disconnected)");
        await refreshProducts();
      }
    }, 60000);

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
    };
  }, []);

  // Group products by category
  const grouped = products.reduce(
    (acc, product) => {
      const cat = product.categoryName || "Ostalo";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(product);
      return acc;
    },
    {} as Record<string, Product[]>,
  );

  const categories = Object.keys(grouped).sort();
  const leftCategory = categories[0];
  const rightCategory = categories[1];

  return (
    <div className="min-h-screen bg-neutral-900 text-gray-100 p-4 overflow-hidden">
      <div className="grid grid-cols-2 gap-4 h-screen items-start">
        {/* Left */}
        {leftCategory && (
          <div>
            <h2
              className="text-5xl font-black mb-2 text-center text-white py-4 px-6 rounded-lg uppercase tracking-wider shadow-lg"
              style={{ backgroundColor: "#06402B" }}
            >
              {leftCategory}
            </h2>
            <div className="space-y-4">
              {grouped[leftCategory].map((product) => (
                <div
                  key={product.id}
                  className={`flex justify-between items-center border-2 px-6 py-5 rounded-lg shadow-lg ${
                    product.trend === "up"
                      ? "border-emerald-700 bg-emerald-800 shadow-emerald-400/30"
                      : "border-red-500 shadow-red-400/30"
                  }`}
                  style={
                    product.trend === "down"
                      ? { backgroundColor: "rgb(189, 31, 31)" }
                      : undefined
                  }
                >
                  <h3 className="text-4xl font-black tracking-wide flex-1 text-white">
                    {product.name.toUpperCase()}
                  </h3>
                  <div className="flex items-center gap-6 ml-6">
                    <span className="text-4xl font-black text-white tabular-nums whitespace-nowrap">
                      {parseInt(parseFloat(product.currentPrice).toString())}{" "}
                      RSD
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {product.trend === "up" ? (
                        <ArrowUp
                          className="w-8 h-8 text-emerald-500"
                          strokeWidth={2}
                        />
                      ) : (
                        <ArrowDown
                          className="w-8 h-8 text-rose-500"
                          strokeWidth={2}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right */}
        {rightCategory && (
          <div>
            <h2
              className="text-5xl font-black mb-2 text-center text-white py-4 px-6 rounded-lg uppercase tracking-wider shadow-lg"
              style={{ backgroundColor: "#341539" }}
            >
              {rightCategory}
            </h2>
            <div className="space-y-4">
              {grouped[rightCategory].map((product) => (
                <div
                  key={product.id}
                  className={`flex justify-between items-center border-2 px-6 py-5 rounded-lg shadow-lg ${
                    product.trend === "up"
                      ? "border-emerald-700 bg-emerald-800 shadow-emerald-400/30"
                      : "border-red-500 shadow-red-400/30"
                  }`}
                  style={
                    product.trend === "down"
                      ? { backgroundColor: "rgb(189, 31, 31)" }
                      : undefined
                  }
                >
                  <h3 className="text-4xl font-black tracking-wide flex-1 text-white">
                    {product.name.toUpperCase()}
                  </h3>
                  <div className="flex items-center gap-6 ml-6">
                    <span className="text-4xl font-black text-white tabular-nums whitespace-nowrap">
                      {parseInt(parseFloat(product.currentPrice).toString())}{" "}
                      RSD
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {product.trend === "up" ? (
                        <ArrowUp
                          className="w-8 h-8 text-emerald-500"
                          strokeWidth={2}
                        />
                      ) : (
                        <ArrowDown
                          className="w-8 h-8 text-rose-500"
                          strokeWidth={2}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
