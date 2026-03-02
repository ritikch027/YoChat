import { API_URL } from "@/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  const token = await AsyncStorage.getItem("token");

  if (!token) {
    throw new Error("no token found. USer must login first");
  }

  const waitForConnection = async (sock: Socket) => {
    if (sock.connected) return;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Socket connection timed out"));
      }, 8000);

      const onConnect = () => {
        console.log("Socket connected: ", sock?.id);
        cleanup();
        resolve();
      };

      const onError = (err: any) => {
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err?.message || err)));
      };

      const cleanup = () => {
        clearTimeout(timeout);
        sock.off("connect", onConnect);
        sock.off("connect_error", onError);
      };

      sock.once("connect", onConnect);
      sock.once("connect_error", onError);
    });
  };

  if (!socket) {
    socket = io(API_URL, {
      auth: { token },
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
  } else {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
  }

  await waitForConnection(socket);
  return socket;
}

export function getSocket():Socket|null{
    return socket;
}

export function disconnectSocket():void{
    if(socket){
        socket.disconnect();
        socket=null;
    }
}
