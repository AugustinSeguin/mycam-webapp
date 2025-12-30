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
  return (
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
  );
}

export default App;
