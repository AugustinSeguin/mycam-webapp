import { useEffect, useRef, useState, createContext } from "react";
import { socketService, NotificationData } from "./services/socket.ts";

// Contexte pour exposer les notifications à toute l'app
export const NotificationContext = createContext<NotificationData | null>(null);
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login.tsx";
import Home from "./pages/Home.tsx";
import AddCamera from "./pages/AddCamera.tsx";
import Stream from "./pages/Stream.tsx";
import { authService } from "./services/api.ts";
import "./App.css";

// Protected Route Component
function ProtectedRoute({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  const [notification, setNotification] = useState<NotificationData | null>(
    null
  );
  const socketStarted = useRef(false);

  useEffect(() => {
    // Lancer le socket en tâche de fond dès qu'on a un token
    const token = localStorage.getItem("token");
    if (token && !socketStarted.current) {
      socketStarted.current = true;
      socketService.init(token, (notif) => setNotification(notif));
    }
  }, []);

  return (
    <NotificationContext.Provider value={notification}>
      <Router>
        <div className="container">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-camera"
              element={
                <ProtectedRoute>
                  <AddCamera />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stream/:camKey"
              element={
                <ProtectedRoute>
                  <Stream />
                </ProtectedRoute>
              }
            />
            <Route path="/logout" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </NotificationContext.Provider>
  );
}

export default App;
