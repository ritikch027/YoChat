import { getSocket } from "./socket";

function withCallSocket(handler: (socket: ReturnType<typeof getSocket>) => void) {
  const socket = getSocket();
  if (!socket) {
    console.log("socket is not connected");
    return;
  }
  handler(socket);
}

function bindEvent(event: string, payload: any, off = false) {
  withCallSocket((socket) => {
    if (!socket) return;
    if (off) {
      socket.off(event, payload);
    } else if (typeof payload === "function") {
      socket.on(event, payload);
    } else {
      socket.emit(event, payload);
    }
  });
}

export const startCall = (payload: any) => bindEvent("call:start", payload);
export const acceptCall = (payload: any) => bindEvent("call:accept", payload);
export const rejectCall = (payload: any) => bindEvent("call:reject", payload);
export const endCall = (payload: any) => bindEvent("call:end", payload);

export const onIncomingCall = (payload: any, off = false) =>
  bindEvent("call:incoming", payload, off);
export const onOutgoingCall = (payload: any, off = false) =>
  bindEvent("call:outgoing", payload, off);
export const onAcceptedCall = (payload: any, off = false) =>
  bindEvent("call:accepted", payload, off);
export const onRejectedCall = (payload: any, off = false) =>
  bindEvent("call:rejected", payload, off);
export const onEndedCall = (payload: any, off = false) =>
  bindEvent("call:ended", payload, off);
export const onMissedCall = (payload: any, off = false) =>
  bindEvent("call:missed", payload, off);
export const onCallError = (payload: any, off = false) =>
  bindEvent("call:error", payload, off);
