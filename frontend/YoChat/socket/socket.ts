import { API_URL } from "@/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io, Socket } from "socket.io-client";
import { AppState, AppStateStatus } from "react-native";

type SocketStore = {
  socket: Socket | null;
  connectPromise: Promise<Socket> | null;
  appStateListenerInstalled: boolean;
  lastAppState: AppStateStatus;
  bgDisconnectTimer: ReturnType<typeof setTimeout> | null;
};

// Persist across Fast Refresh / HMR to avoid creating multiple Socket.IO clients.
const globalAny = globalThis as unknown as { __YOCHAT_SOCKET_STORE__?: SocketStore };
const store: SocketStore =
  globalAny.__YOCHAT_SOCKET_STORE__ ??
  (globalAny.__YOCHAT_SOCKET_STORE__ = {
    socket: null,
    connectPromise: null,
    appStateListenerInstalled: false,
    lastAppState: AppState.currentState,
    bgDisconnectTimer: null,
  });

function ensureAppStatePresenceListener() {
  if (store.appStateListenerInstalled) return;
  store.appStateListenerInstalled = true;

  AppState.addEventListener("change", async (nextState) => {
    const prev = store.lastAppState;
    store.lastAppState = nextState;

    // Avoid disconnect storms on iOS where opening system UI can flip to "inactive".
    if (nextState === "inactive") return;

    if (nextState === "background") {
      if (store.bgDisconnectTimer) return;
      store.bgDisconnectTimer = setTimeout(() => {
        store.bgDisconnectTimer = null;
        if (store.lastAppState !== "background") return;
        if (store.socket) {
          try {
            store.socket.disconnect();
          } catch {}
        }
      }, 2000);
      return;
    }

    if (nextState !== "active") return;

    if (store.bgDisconnectTimer) {
      clearTimeout(store.bgDisconnectTimer);
      store.bgDisconnectTimer = null;
    }

    // App becomes active again: reconnect if we have auth.
    if (prev !== "active") {
      try {
        await connectSocket();
      } catch {
        // ignore (e.g. signed out)
      }
    }
  });
}

export async function connectSocket(): Promise<Socket> {
  if (store.connectPromise) return store.connectPromise;

  ensureAppStatePresenceListener();
  store.connectPromise = (async () => {
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
          reject(
            err instanceof Error ? err : new Error(String(err?.message || err)),
          );
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

    if (!store.socket) {
      store.socket = io(API_URL, {
        auth: { token },
      });

      store.socket.on("disconnect", () => {
        console.log("Socket disconnected");
      });
    } else {
      store.socket.auth = { token };
      if (!store.socket.connected) store.socket.connect();
    }

    await waitForConnection(store.socket);
    return store.socket;
  })();

  try {
    return await store.connectPromise;
  } finally {
    store.connectPromise = null;
  }
}

export function getSocket():Socket|null{
    return store.socket;
}

export function disconnectSocket():void{
    if(store.socket){
        store.socket.disconnect();
        store.socket=null;
    }
    store.connectPromise = null;
    if (store.bgDisconnectTimer) {
      clearTimeout(store.bgDisconnectTimer);
      store.bgDisconnectTimer = null;
    }
}
