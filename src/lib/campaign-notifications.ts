/**
 * Server-Sent Events (SSE) helper for real-time video campaign notifications
 *
 * Uses PostgreSQL LISTEN/NOTIFY to broadcast campaign updates to TV display
 */

import { Pool } from "pg";

// Store active SSE connections for campaign updates
const clients = new Set<ReadableStreamDefaultController>();

// PostgreSQL connection pool for LISTEN
let listenerPool: Pool | null = null;
let isListening = false;

/**
 * Initialize PostgreSQL LISTEN connection for campaign updates
 * Sets up a dedicated connection that listens for 'campaign_update' notifications
 */
export async function initializeCampaignListener() {
  if (isListening) {
    return;
  }

  try {
    // Create dedicated pool for LISTEN connection
    listenerPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1, // Only need one connection for listening
    });

    const client = await listenerPool.connect();

    // Set up LISTEN command
    await client.query("LISTEN campaign_update");

    isListening = true;
    console.log("📺 Campaign listener initialized");

    // Handle incoming notifications
    client.on("notification", (msg) => {
      if (msg.channel === "campaign_update" && msg.payload) {
        console.log("📺 Campaign notification received:", msg.payload);
        broadcastToClients(msg.payload);
      }
    });

    // Handle connection errors
    client.on("error", (err) => {
      console.error("PostgreSQL campaign LISTEN error:", err);
      isListening = false;
      // Try to reconnect after 5 seconds
      setTimeout(() => {
        initializeCampaignListener();
      }, 5000);
    });
  } catch (error) {
    console.error("Failed to initialize campaign listener:", error);
    isListening = false;
  }
}

/**
 * Broadcast message to all connected SSE clients
 */
function broadcastToClients(payload: string) {
  if (clients.size === 0) {
    return;
  }

  console.log(`📺 Broadcasting to ${clients.size} campaign client(s)`);
  const deadClients: ReadableStreamDefaultController[] = [];

  clients.forEach((controller) => {
    try {
      const data = `data: ${payload}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
    } catch (error) {
      deadClients.push(controller);
    }
  });

  // Clean up dead connections
  deadClients.forEach((controller) => {
    clients.delete(controller);
  });
}

/**
 * Send a campaign update notification to all clients
 * Called from the campaign processor job
 */
export async function sendCampaignNotification(
  type: "COUNTDOWN_START" | "VIDEO_PLAY" | "VIDEO_END" | "CANCELLED",
  campaign: {
    id: string;
    videoId: string;
    videoUrl?: string | null;
    videoName?: string | null;
    videoDuration?: number | null;
    countdownSeconds?: number;
  },
) {
  const payload = JSON.stringify({
    type,
    campaign,
    timestamp: new Date().toISOString(),
  });

  // Broadcast directly to connected clients
  broadcastToClients(payload);

  // Also send PostgreSQL NOTIFY for any other listeners
  if (listenerPool) {
    try {
      const client = await listenerPool.connect();
      await client.query(
        `NOTIFY campaign_update, '${payload.replace(/'/g, "''")}'`,
      );
      client.release();
    } catch (error) {
      console.error("Failed to send NOTIFY:", error);
    }
  }
}

/**
 * Add a new SSE client connection
 */
export function addClient(controller: ReadableStreamDefaultController) {
  clients.add(controller);
  console.log(`📺 Campaign client connected. Total: ${clients.size}`);

  // Initialize listener if not already running
  if (!isListening) {
    initializeCampaignListener();
  }
}

/**
 * Remove an SSE client connection
 */
export function removeClient(controller: ReadableStreamDefaultController) {
  clients.delete(controller);
  console.log(`📺 Campaign client disconnected. Total: ${clients.size}`);
}

/**
 * Get current number of connected clients
 */
export function getClientCount() {
  return clients.size;
}

/**
 * Cleanup function to close listener pool
 */
export async function closeCampaignListener() {
  if (listenerPool) {
    await listenerPool.end();
    listenerPool = null;
    isListening = false;
  }
}
