import { io, Socket } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL;

export interface NotificationData {
  camKey: string;
  id: number;
  type: string;
  message: string;
  cameraName: string;
  createdAt: string;
  receivedAt: string;
}

type NotificationCallback = (data: NotificationData) => void;

let socket: Socket | null = null;
let notificationCallbacks: NotificationCallback[] = [];

export const socketService = {
  // Initialisation globale asynchrone (background)
  init(token: string, onNotif: { (notif: any): void; (data: NotificationData): void; }) {
    this.connect(token);
    this.onNotification(onNotif);
  },
  connect(token: string): Socket {
    if (socket?.connected) {
      return socket;
    }

    socket = io(API_URL, {
      auth: {
        token: token,
      },
      transports: ["polling", "websocket"],
      extraHeaders: {
        "ngrok-skip-browser-warning": "true",
      },
    });

    socket.on("connect", () => {
      console.log("Connecté au serveur WebSocket");
    });

    socket.on("notification", (data: NotificationData) => {
      console.log("Nouvelle notification:", data);
      notificationCallbacks.forEach((callback) => callback(data));
    });

    socket.on("connect_error", (error: Error) => {
      console.error("Erreur de connexion WebSocket:", error.message);
    });

    socket.on("disconnect", () => {
      console.log("Déconnecté du serveur WebSocket");
    });

    return socket;
  },

  disconnect(): void {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    notificationCallbacks = [];
  },

  subscribeToCamera(camKey: string): void {
    if (socket?.connected) {
      socket.emit("subscribe:camera", camKey);
    }
  },

  unsubscribeFromCamera(camKey: string): void {
    if (socket?.connected) {
      socket.emit("unsubscribe:camera", camKey);
    }
  },

  onNotification(callback: NotificationCallback): () => void {
    notificationCallbacks.push(callback);
    return () => {
      notificationCallbacks = notificationCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  },

  isConnected(): boolean {
    return socket?.connected || false;
  },
};
