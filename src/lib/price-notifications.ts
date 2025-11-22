/**
 * Server-Sent Events (SSE) helper for real-time price update notifications
 *
 * Uses PostgreSQL LISTEN/NOTIFY to broadcast price changes to connected clients
 */

import { Pool } from "pg";

// Store active SSE connections
const clients = new Set<ReadableStreamDefaultController>();

// PostgreSQL connection pool for LISTEN
let listenerPool: Pool | null = null;
let isListening = false;

/**
 * Initialize PostgreSQL LISTEN connection
 * Sets up a dedicated connection that listens for 'price_update' notifications
 */
export async function initializePriceListener() {
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
    await client.query("LISTEN price_update");

    isListening = true;

    // Handle incoming notifications
    client.on("notification", (msg) => {
      if (msg.channel === "price_update" && msg.payload) {
        broadcastToClients(msg.payload);
      }
    });

    // Handle connection errors
    client.on("error", (err) => {
      console.error("PostgreSQL LISTEN error:", err);
      isListening = false;
      // Try to reconnect after 5 seconds
      setTimeout(() => {
        initializePriceListener();
      }, 5000);
    });
  } catch (error) {
    console.error("Failed to initialize price listener:", error);
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
 * Add a new SSE client connection
 */
export function addClient(controller: ReadableStreamDefaultController) {
  clients.add(controller);
}

/**
 * Remove an SSE client connection
 */
export function removeClient(controller: ReadableStreamDefaultController) {
  clients.delete(controller);
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
export async function closePriceListener() {
  if (listenerPool) {
    await listenerPool.end();
    listenerPool = null;
    isListening = false;
  }
}
