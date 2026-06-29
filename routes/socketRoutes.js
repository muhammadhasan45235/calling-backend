/**
 * Why this file exists:
 * This file serves as the routing map for socket events. It acts similarly to Express HTTP
 * routes but for WebSockets, binding incoming events from a client socket to the controller handlers.
 *
 * When it is executed:
 * Executed every time a new client establishes a socket connection.
 *
 * Which other files use it:
 * Used by server/services/socketService.ts to register event handlers on connected sockets.
 *
 * How it fits into the WebRTC signaling flow:
 * Sets up listeners for the full lifecycle of a WebRTC call (registering, calling, answering,
 * rejecting, sending candidates, and ending calls).
 */

import { signalingController } from "../controllers/signalingController.js";
import { SOCKET_EVENTS } from "../utils/constants.js";

export function registerSocketRoutes(socket, io) {
  // 1. User registration/joining
  socket.on(SOCKET_EVENTS.REGISTER_USER, (username) => {
    signalingController.handleRegisterUser(socket, io, username);
  });

  // 2. Peer calls another peer
  socket.on(SOCKET_EVENTS.CALL_USER, (data) => {
    signalingController.handleCallUser(socket, io, data);
  });

  // 3. Peer answers an incoming call
  socket.on(SOCKET_EVENTS.ANSWER_CALL, (data) => {
    signalingController.handleAnswerCall(socket, io, data);
  });

  // 4. Peer rejects an incoming call
  socket.on(SOCKET_EVENTS.REJECT_CALL, (data) => {
    signalingController.handleRejectCall(socket, io, data);
  });

  // 5. Exchange ICE candidates
  socket.on(SOCKET_EVENTS.ICE_CANDIDATE, (data) => {
    signalingController.handleIceCandidate(socket, io, data);
  });

  // 6. Manual call end
  socket.on(SOCKET_EVENTS.END_CALL, (data) => {
    signalingController.handleEndCall(socket, io, data);
  });

  // 7. Socket disconnects
  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    signalingController.handleDisconnect(socket, io);
  });

  // 8. On connection, immediately send the current online users list to this socket
  socket.emit(SOCKET_EVENTS.USER_LIST_UPDATE, signalingController.getOnlineUsers());
}
