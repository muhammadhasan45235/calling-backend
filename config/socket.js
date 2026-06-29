/**
 * Why this file exists:
 * This file configures the Socket.IO server instance with production-safe CORS properties
 * and standard server options.
 *
 * When it is executed:
 * Executed once during the server startup phase.
 *
 * Which other files use it:
 * Used by server/services/socketService.ts to bootstrap the socket server.
 *
 * How it fits into the WebRTC signaling flow:
 * It creates the foundation of the websocket connection, enabling clients to establish
 * low-latency full-duplex communication channels required for WebRTC negotiation.
 */

import { Server } from "socket.io";

export function configureSocket(server) {
  return new Server(server, {
    cors: {
      origin: "*", // Allows any frontend client to connect
      methods: ["GET", "POST"],
      // credentials: true,
    },
    transports: ["websocket", "polling"],
  });
}
