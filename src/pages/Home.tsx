import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService, cameraService, User, Camera } from "../services/api.ts";
import { socketService, NotificationData } from "../services/socket.ts";
import "./Home.css";

function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<NotificationData | null>(
    null
  );
  const [deleteConfirm, setDeleteConfirm] = useState<Camera | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Vérifier l'authentification
    if (!authService.isAuthenticated()) {
      navigate("/");
      return;
    }

    const userData = authService.getUser();
    setUser(userData);

    // Charger les caméras
    loadCameras();

    // Écouter l'événement d'installation PWA
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    globalThis.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    return () => {
      globalThis.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      socketService.disconnect();
    };
  }, [navigate]);

  const loadCameras = async () => {
    try {
      setLoading(true);
      const camerasData = await cameraService.getMyCameras();
      setCameras(camerasData);

      // Initialiser Socket.IO après avoir récupéré les caméras
      const token = authService.getToken();
      if (token) {
        socketService.connect(token);
      }

      // Écouter les notifications
      socketService.onNotification((data: NotificationData) => {
        setNotification(data);
        // Masquer après 5 secondes
        setTimeout(() => setNotification(null), 5000);
      });
    } catch (err: any) {
      setError(err.message);
      // Utiliser le cache si disponible
      const cachedCameras = cameraService.getCachedCameras();
      if (cachedCameras.length > 0) {
        setCameras(cachedCameras);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    socketService.disconnect();
    authService.logout();
    navigate("/");
  };

  const handleAddCamera = () => {
    navigate("/add-camera");
  };

  const handleCameraClick = (camera: Camera) => {
    navigate(`/stream/${camera.cam_key}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, camera: Camera) => {
    e.stopPropagation();
    setDeleteConfirm(camera);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await cameraService.deleteCamera(deleteConfirm.id);
      setCameras(cameras.filter((cam) => cam.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        setInstallPrompt(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading">
          <img src="/logo.png" alt="MyCam" className="loading-logo" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Notification toast */}
      {notification && (
        <div className="notification-toast">
          <div className="notification-icon">🔔</div>
          <div className="notification-content">
            <strong>{notification.cameraName}</strong>
            <p>{notification.message}</p>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="home-topbar">
        {installPrompt ? (
          <button className="topbar-button install" onClick={handleInstallApp}>
            <span>📲</span> Télécharger PWA
          </button>
        ) : (
          <div className="topbar-placeholder"></div>
        )}
        <button className="topbar-button logout" onClick={handleLogout}>
          Déconnexion
        </button>
      </header>

      {/* Greeting */}
      <section className="greeting-section">
        <img src="/logo.png" alt="MyCam" className="home-logo" />
        <h1>Bonjour {user?.firstname}</h1>
      </section>

      {/* Error message */}
      {error && <div className="error-banner">{error}</div>}

      {/* Cameras grid */}
      <section className="cameras-section">
        <div className="cameras-grid">
          {cameras.map((camera) => (
            <div
              key={camera.id}
              className="camera-card"
              onClick={() => handleCameraClick(camera)}
            >
              <div className="camera-preview">
                <img src="/logo.png" alt="Camera" className="camera-logo" />
              </div>
              <div className="camera-info">
                <h3>{camera.lastname}</h3>
              </div>
              <button
                className="delete-button"
                onClick={(e) => handleDeleteClick(e, camera)}
                title="Supprimer"
              >
                🗑️
              </button>
            </div>
          ))}

          {/* Add camera card */}
          <div className="camera-card add-card" onClick={handleAddCamera}>
            <div className="camera-preview add-preview">
              <span className="add-icon">+</span>
            </div>
            <div className="camera-info">
              <h3>Ajouter</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmer la suppression</h3>
            <p>
              Voulez-vous vraiment supprimer la caméra{" "}
              <strong>{deleteConfirm.lastname}</strong> ?
            </p>
            <div className="modal-actions">
              <button
                className="modal-cancel"
                onClick={() => setDeleteConfirm(null)}
              >
                Annuler
              </button>
              <button className="modal-confirm" onClick={confirmDelete}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
