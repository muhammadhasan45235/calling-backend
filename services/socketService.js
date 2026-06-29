/**
 * Why this file exists:
 * This service initializes and holds the master reference of the Socket.IO server.
 * It manages connection lifecycle hooks and coordinates event registrations.
 *
 * When it is executed:
 * Executed during server startup.
 *
 * Which other files use it:
 * Imported and initialized by the main entrypoint file (server.ts).
 *
 * How it fits into the WebRTC signaling flow:
 * Sets up the listener for incoming socket connections and passes each socket
 * to the routes that manage peer-to-peer signalling and connection events.
 */

import { configureSocket } from "../config/socket.js";
import { registerSocketRoutes } from "../routes/socketRoutes.js";
import { SOCKET_EVENTS } from "../utils/constants.js";

let ioInstance = null;

export const socketService = {
  /**
   * Initialize Socket.IO with the HTTP Server instance
   */
  init(server) {
    const io = configureSocket(server);
    ioInstance = io;

    io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
      console.log(`New socket connection established: ${socket.id}`);

      // Register all routes/event handlers for this socket
      registerSocketRoutes(socket, io);
    });

    console.log("Socket.IO signaling service fully initialized");
    return io;
  },

  /**
   * Retrieve the active Socket.IO Server instance
   */
  getIO() {
    if (!ioInstance) {
      throw new Error("SocketService is not initialized. Call init(server) first.");
    }
    return ioInstance;
  }
};
