/**
 * Why this file exists:
 * This file defines the shared constant values (such as Socket.IO event names) used
 * across the server-side architecture to prevent typos and ensure consistent event names.
 *
 * When it is executed:
 * Imported and executed at build/runtime whenever backend files load the constants.
 *
 * Which other files use it:
 * Used by server/config/socket.ts, server/controllers/signalingController.ts, and server/services/socketService.ts.
 *
 * How it fits into the WebRTC signaling flow:
 * It standardizes the event names (e.g., USER_JOINED, CALL_USER, MAKE_ANSWER, ICE_CANDIDATE)
 * that route WebRTC offers, answers, and candidates between peers.
 */

export const SOCKET_EVENTS = {
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  REGISTER_USER: "register-user",
  USER_LIST_UPDATE: "user-list-update",
  CALL_USER: "call-user",
  INCOMING_CALL: "incoming-call",
  ANSWER_CALL: "answer-call",
  CALL_ACCEPTED: "call-accepted",
  REJECT_CALL: "reject-call",
  CALL_REJECTED: "call-rejected",
  ICE_CANDIDATE: "ice-candidate",
  END_CALL: "end-call",
  CALL_ENDED: "call-ended",
};
