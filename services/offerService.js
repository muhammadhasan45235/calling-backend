/**
 * Why this file exists:
 * This file manages the persistence and tracking of active signaling offers and call states.
 * It integrates MongoDB using Mongoose to log call activities while maintaining an in-memory
 * fallback so the application runs perfectly even if the MongoDB service is offline.
 *
 * When it is executed:
 * Executed at runtime whenever a peer initiates a call, accepts, rejects, or terminates it.
 *
 * Which other files use it:
 * Used by server/controllers/signalingController.ts and server/services/socketService.ts.
 *
 * How it fits into the WebRTC signaling flow:
 * Keeps track of who is currently calling whom so that when ice candidates or end-call events
 * are triggered, the server knows how to route them correctly.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// Robust connection to MongoDB (using optional environment variable or local fallback)


let isDbConnected = false;

const mongooseConnection = async () => {
  await mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("Successfully connected to MongoDB");
      isDbConnected = true;
    })
    .catch((err) => {
      console.warn("MongoDB connection failed, falling back to in-memory store only:", err.message);
    });

}

mongooseConnection();

// Schema to log calls (satisfying MERN MongoDB requirements)
const CallLogSchema = new mongoose.Schema({
  offerer: { type: String, required: true },
  receiver: { type: String, required: true },
  status: { type: String, enum: ["initiated", "accepted", "rejected", "ended"], default: "initiated" },
  createdAt: { type: Date, default: Date.now },
  endedAt: { type: Date }
});

const CallLog = mongoose.model("CallLog", CallLogSchema);

// In-Memory state trackers for ultra-fast real-time signaling routing
const activeOffers = new Map();
const activeCalls = new Map(); // Maps socketId -> socketId of peer in call

export const offerService = {
  /**
   * Save an active offer
   */
  async createOffer(fromSocketId, toSocketId, offer, offererName, receiverName) {
    let logId;

    if (isDbConnected) {
      try {
        const log = new CallLog({
          offerer: offererName,
          receiver: receiverName,
          status: "initiated"
        });
        const saved = await log.save();
        logId = saved._id.toString();
      } catch (error) {
        console.error("Failed to log call initiation to MongoDB:", error);
      }
    }

    activeOffers.set(fromSocketId, { from: fromSocketId, to: toSocketId, offer, logId });
  },

  /**
   * Retrieve active offer by offerer socket id
   */
  getOffer(fromSocketId) {
    return activeOffers.get(fromSocketId);
  },

  /**
   * Delete an active offer
   */
  deleteOffer(fromSocketId) {
    activeOffers.delete(fromSocketId);
  },

  /**
   * Accept call and set up active call connection
   */
  async acceptCall(fromSocketId, toSocketId) {
    activeCalls.set(fromSocketId, toSocketId);
    activeCalls.set(toSocketId, fromSocketId);

    const offerData = activeOffers.get(fromSocketId);
    if (offerData && offerData.logId && isDbConnected) {
      try {
        await CallLog.findByIdAndUpdate(offerData.logId, { status: "accepted" });
      } catch (error) {
        console.error("Failed to update call status to accepted in MongoDB:", error);
      }
    }
    activeOffers.delete(fromSocketId);
  },

  /**
   * Reject call
   */
  async rejectCall(fromSocketId) {
    const offerData = activeOffers.get(fromSocketId);
    if (offerData && offerData.logId && isDbConnected) {
      try {
        await CallLog.findByIdAndUpdate(offerData.logId, { status: "rejected" });
      } catch (error) {
        console.error("Failed to update call status to rejected in MongoDB:", error);
      }
    }
    activeOffers.delete(fromSocketId);
  },

  /**
   * Retrieve the active peer ID for a given socket
   */
  getPeer(socketId) {
    return activeCalls.get(socketId);
  },

  /**
   * Terminate/End an active call
   */
  async endCall(socketId) {
    const peerSocketId = activeCalls.get(socketId);

    activeCalls.delete(socketId);
    if (peerSocketId) {
      activeCalls.delete(peerSocketId);
    }

    return peerSocketId;
  },

  /**
   * Get historical call logs (can be displayed in dashboard if desired)
   */
  async getCallHistory() {
    if (isDbConnected) {
      try {
        return await CallLog.find().sort({ createdAt: -1 }).limit(10);
      } catch (error) {
        console.error("Failed to fetch call history from MongoDB:", error);
      }
    }
    return [];
  }
};
