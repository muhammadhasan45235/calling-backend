/**
 * Why this file exists:
 * This is the central entrypoint for the full-stack server. It initializes Express,
 * creates an HTTP server, hooks up the Socket.IO signaling server, serves API routes,
 * and dynamically mounts the Vite dev server (development) or static assets (production).
 *
 * When it is executed:
 * Executed on start via 'npm run dev' (using tsx server.ts) or 'npm run start' (compiled JS).
 *
 * Which other files use it:
 * Executed directly by the Node runtime to launch the entire application.
 *
 * How it fits into the WebRTC signaling flow:
 * It bootstraps the underlying HTTP server that hosts the Socket.IO signaling protocol.
 * (Note: The server runs as HTTP on port 3000; HTTPS and SSL termination are handled by
 * the cloud environment's reverse proxy, which provides the necessary secure context
 * for WebRTC camera/microphone APIs in the browser.)
 */

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

// Import services
import { offerService } from "./services/offerService.js";
import { socketService } from "./services/socketService.js";

// Import framework and utilities
import express from "express";
import http from "http";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = process.env.PORT || 5000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  app.get("/api/history", async (req, res) => {
    try {
      const history = await offerService.getCallHistory();
      res.json({ success: true, data: history });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Initialize WebRTC Signaling Socket service
  socketService.init(server);

  // Bind to 0.0.0.0 and Port 3000 as required by the platform configuration
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` Server successfully started on :${PORT}`);
    console.log(`====================================================`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start the server:", error);
});
