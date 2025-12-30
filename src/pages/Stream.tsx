import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { authService, cameraService, Camera } from "../services/api.ts";
import "./Stream.css";

function Stream() {
  const { camKey } = useParams<{ camKey: string }>();
  const navigate = useNavigate();
  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Vérifier l'authentification
    if (!authService.isAuthenticated()) {
      navigate("/");
      return;
    }

    // Récupérer les infos de la caméra depuis le cache
    const cameras = cameraService.getCachedCameras();
    const currentCamera = cameras.find((cam: Camera) => cam.cam_key === camKey);

    if (currentCamera) {
      setCamera(currentCamera);
    } else {
      setError("Caméra non trouvée");
    }

    setLoading(false);
  }, [camKey, navigate]);

  const handleBack = () => {
    navigate("/home");
  };

  if (loading) {
    return (
      <div className="stream-container">
        <div className="loading">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stream-container">
        <header className="stream-header">
          <button className="back-button" onClick={handleBack}>
            ← Retour
          </button>
        </header>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const streamUrl = camKey ? cameraService.getVideoStreamUrl(camKey) : "";

  return (
    <div className="stream-container">
      <header className="stream-header">
        <button className="back-button" onClick={handleBack}>
          ← Retour
        </button>
        <div className="stream-info">
          <h1>{camera?.lastname}</h1>
          <span className="stream-status">
            <span className="status-dot"></span> En direct
          </span>
        </div>
      </header>

      <div className="stream-wrapper">
        <div className="stream-placeholder">
          <img src="/logo.png" alt="Camera" className="stream-logo" />
          <p>Flux vidéo: {camKey}</p>
          <span className="stream-url">{streamUrl}</span>
        </div>
        {/* 
          Pour un vrai flux MJPEG de l'ESP32-CAM:
          <img 
            src={streamUrl} 
            alt="Flux vidéo" 
            className="stream-video"
          />
        */}
      </div>

      <div className="stream-controls">
        <button className="control-button">
          <span>📸</span> Capture
        </button>
        <button className="control-button">
          <span>🔴</span> Enregistrer
        </button>
      </div>
    </div>
  );
}

export default Stream;
