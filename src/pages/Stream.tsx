import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { authService, cameraService, Camera } from "../services/api.ts";
import "./Stream.css";

function Stream() {
  const { camKey } = useParams<{ camKey: string }>();
  const navigate = useNavigate();
  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const videoRef = useRef<HTMLImageElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    // Arrêter l'enregistrement si en cours
    if (isRecording) {
      stopRecording();
    }
    navigate("/home");
  };

  const captureScreenshot = () => {
    const img = videoRef.current;

    if (!img) {
      console.error("Aucune image disponible pour la capture");
      setError("Impossible de capturer l'image");
      setTimeout(() => setError(""), 3000);
      return;
    }

    // Pour les streams MJPEG, on vérifie seulement naturalWidth
    // car img.complete est toujours false pour un flux continu
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    if (width === 0 || height === 0) {
      console.error("Image pas encore chargée, dimensions:", width, height);
      setError("Flux vidéo en cours de chargement...");
      setTimeout(() => setError(""), 3000);
      return;
    }

    // Créer un canvas pour capturer l'image
    const canvas = document.createElement("canvas");
    canvas.width = width || 640;
    canvas.height = height || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Impossible de créer le contexte canvas");
      setError("Erreur technique");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      // Dessiner l'image sur le canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convertir en blob et télécharger
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error("Impossible de créer le blob");
            return;
          }

          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `capture-${camera?.name || camKey}-${Date.now()}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          console.log("Screenshot capturé avec succès!");
        },
        "image/jpeg",
        0.95
      );
    } catch (err) {
      console.error("Erreur lors de la capture:", err);
      setError("Erreur lors de la capture de l'image");
      setTimeout(() => setError(""), 3000);
    }
  };

  const startRecording = async () => {
    if (!videoRef.current) return;

    try {
      // Créer un canvas pour capturer le stream
      const canvas = document.createElement("canvas");
      const img = videoRef.current;

      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      canvasRef.current = canvas;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Capturer le stream du canvas
      const stream = canvas.captureStream(30); // 30 FPS
      streamRef.current = stream;

      // Dessiner l'image en boucle
      const drawFrame = () => {
        if (!isRecording && !canvasRef.current) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        if (isRecording) {
          requestAnimationFrame(drawFrame);
        }
      };

      setIsRecording(true);
      drawFrame();

      // Créer le MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `video-${camera?.name || camKey}-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
    } catch (err) {
      console.error("Erreur lors du démarrage de l'enregistrement:", err);
      setError("Impossible de démarrer l'enregistrement");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Nettoyer les références
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      canvasRef.current = null;
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
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
          <h1>{camera?.name}</h1>
          <span className="stream-status">
            <span className="status-dot"></span> En direct
          </span>
        </div>
      </header>

      <div className="stream-wrapper">
        {streamUrl ? (
          <img
            ref={videoRef}
            src={streamUrl}
            alt="Flux vidéo"
            className="stream-video"
            crossOrigin="anonymous"
            onError={() => console.error("Erreur de chargement du flux")}
            onLoad={() => console.log("Flux chargé avec succès")}
          />
        ) : (
          <div className="stream-placeholder">
            <img src="/logo.png" alt="Camera" className="stream-logo" />
            <p>Aucun flux vidéo disponible</p>
            <span className="stream-url">Caméra: {camKey}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="error-banner" style={{ margin: "0 20px 10px" }}>
          {error}
        </div>
      )}

      {streamUrl && (
        <div className="stream-controls">
          <button className="control-button" onClick={captureScreenshot}>
            <span>📸</span> Capture
          </button>
          <button
            className={`control-button ${isRecording ? "recording" : ""}`}
            onClick={toggleRecording}
          >
            <span>{isRecording ? "⏹️" : "🔴"}</span>{" "}
            {isRecording ? "Arrêter" : "Enregistrer"}
          </button>
        </div>
      )}
    </div>
  );
}

export default Stream;
