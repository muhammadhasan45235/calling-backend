/**
 * Why this file exists:
 * This controller contains the core signaling and state management logic. It coordinates
 * username registration, WebRTC offer/answer forwarding, ICE candidate relay, and call
 * terminations.
 *
 * When it is executed:
 * Executed in response to various Socket.IO client events (such as register-user, call-user, etc.).
 *
 * Which other files use it:
 * Used by server/routes/socketRoutes.ts to wire socket events to their handlers.
 *
 * How it fits into the WebRTC signaling flow:
 * It acts as the traffic controller, taking incoming SDP offers/answers and ICE candidates from
 * one client and forwarding them precisely to the targeted peer socket.
 */

import { offerService } from "../services/offerService.js";
import { SOCKET_EVENTS } from "../utils/constants.js";

// In-memory mapping of socket.id -> username
const connectedUsers = new Map();

export const signalingController = {
  /**
   * Returns a list of all currently online users (id and username)
   */
  getOnlineUsers() {
    return Array.from(connectedUsers.entries()).map(([id, username]) => ({
      id,
      username,
    }));
  },

  /**
   * Handle user joining/registering their username
   */
  handleRegisterUser(socket, io, username) {
    const trimmedName = username?.trim();
    if (!trimmedName) {
      socket.emit("register-error", "Username cannot be empty");
      return;
    }

    // Check if username is already taken
    const isTaken = Array.from(connectedUsers.values()).some(
      (name) => name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isTaken) {
      socket.emit("register-error", "Username is already taken");
      return;
    }

    // Save user connection
    connectedUsers.set(socket.id, trimmedName);
    console.log(`User registered: ${trimmedName} (${socket.id})`);

    // Acknowledge registration
    socket.emit("register-success", { id: socket.id, username: trimmedName });

    // Broadcast updated user list to all users
    io.emit(SOCKET_EVENTS.USER_LIST_UPDATE, this.getOnlineUsers());
  },

  /**
   * Handle WebRTC Offer (Initiate Call)
   */
  async handleCallUser(
    socket,
    io,
    data
  ) {
    const { to, offer } = data;
    const offererName = connectedUsers.get(socket.id);
    const receiverName = connectedUsers.get(to);

    if (!offererName || !receiverName) {
      console.warn(`Call initiation failed: offerer or receiver not registered.`);
      return;
    }

    console.log(`Initiating call from ${offererName} to ${receiverName}`);

    // Track offer
    await offerService.createOffer(socket.id, to, offer, offererName, receiverName);

    // Forward offer to receiver
    io.to(to).emit(SOCKET_EVENTS.INCOMING_CALL, {
      from: socket.id,
      offererName,
      offer,
    });
  },

  /**
   * Handle WebRTC Answer (Accept Call)
   */
  async handleAnswerCall(
    socket,
    io,
    data
  ) {
    const { to, answer } = data;
    console.log(`Call answered by ${connectedUsers.get(socket.id)} for ${connectedUsers.get(to)}`);

    // Track active call
    await offerService.acceptCall(to, socket.id);

    // Relay answer to offerer
    io.to(to).emit(SOCKET_EVENTS.CALL_ACCEPTED, {
      from: socket.id,
      answer,
    });
  },

  /**
   * Handle Reject Call
   */
  async handleRejectCall(socket, io, data) {
    const { to } = data;
    console.log(`Call rejected by ${connectedUsers.get(socket.id)} for ${connectedUsers.get(to)}`);

    // Remove offer
    await offerService.rejectCall(to);

    // Notify offerer
    io.to(to).emit(SOCKET_EVENTS.CALL_REJECTED, {
      from: socket.id,
    });
  },

  /**
   * Handle ICE Candidate forwarding
   */
  handleIceCandidate(
    socket, io, data
  ) {
    const { to, candidate } = data;
    // Relay candidate to receiver
    io.to(to).emit(SOCKET_EVENTS.ICE_CANDIDATE, {
      from: socket.id,
      candidate,
    });
  },

  /**
   * Handle manual Ending of call
   */
  async handleEndCall(socket, io, data) {
    const { to } = data;
    console.log(`Call ended manually by ${connectedUsers.get(socket.id)} with ${connectedUsers.get(to)}`);

    await offerService.endCall(socket.id);

    // Notify peer
    io.to(to).emit(SOCKET_EVENTS.CALL_ENDED, {
      from: socket.id,
    });
  },

  /**
   * Handle user disconnection
   */
  async handleDisconnect(socket, io) {
    const username = connectedUsers.get(socket.id);
    if (!username) return;

    console.log(`User disconnected: ${username} (${socket.id})`);

    // Remove user
    connectedUsers.delete(socket.id);

    // If they were in an active call, terminate it and notify the peer
    const peerSocketId = await offerService.endCall(socket.id);
    if (peerSocketId) {
      io.to(peerSocketId).emit(SOCKET_EVENTS.CALL_ENDED, {
        from: socket.id,
      });
    }

    // Clean up any outstanding offer by this user
    await offerService.rejectCall(socket.id);

    // Broadcast updated list to remaining users
    io.emit(SOCKET_EVENTS.USER_LIST_UPDATE, this.getOnlineUsers());
  }
};
