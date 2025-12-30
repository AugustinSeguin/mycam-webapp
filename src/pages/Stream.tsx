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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // URL du flux
  const streamUrl = camKey ? cameraService.getVideoStreamUrl(camKey) : "";

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/");
      return;
    }

    const cameras = cameraService.getCachedCameras();
    const currentCamera = cameras.find((cam: Camera) => cam.cam_key === camKey);

    if (currentCamera) {
      setCamera(currentCamera);
    } else {
      setError("Caméra non trouvée");
    }
    setLoading(false);
  }, [camKey, navigate]);

  useEffect(() => {
    if (!camKey || !camera || !streamUrl) return;

    const token = localStorage.getItem("token");
    const apiKey = import.meta.env.VITE_API_KEY;
    let isMounted = true;
    const controller = new AbortController();

    const decodeMJPEG = async () => {
      try {
        const response = await fetch(streamUrl, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "X-API-Key": apiKey || "",
            "ngrok-skip-browser-warning": "true", // INDISPENSABLE pour ngrok
            Accept: "multipart/x-mixed-replace, image/jpeg",
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const reader = response.body.getReader();
        let buffer = new Uint8Array(0);
        while (isMounted) {
          const { value, done } = await reader.read();
          if (done) break;

          // Fusionner le nouveau chunk avec le buffer existant
          const nextBuffer = new Uint8Array(buffer.length + value.length);
          nextBuffer.set(buffer);
          nextBuffer.set(value, buffer.length);
          buffer = nextBuffer;

          while (true) {
            // Trouver le début d'une image JPEG (FF D8)
            const start = buffer.findIndex(
              (b, i) => b === 0xff && buffer[i + 1] === 0xd8
            );

            if (start === -1) break;

            // Trouver la fin d'une image JPEG (FF D9)
            const end = buffer.findIndex(
              (b, i) => b === 0xff && buffer[i + 1] === 0xd9
            );
            if (end === -1 || end < start) break;

            const actualEnd = end + 2;
            const jpegData = buffer.slice(start, actualEnd);

            // Préparer le buffer pour la suite (on enlève ce qu'on vient de lire)
            buffer = buffer.slice(actualEnd);

            // Affichage sur le Canvas
            const blob = new Blob([jpegData], { type: "image/jpeg" });
            const img = new Image();
            const url = URL.createObjectURL(blob);

            img.onload = () => {
              if (canvasRef.current && isMounted) {
                const ctx = canvasRef.current.getContext("2d");
                if (ctx) {
                  ctx.drawImage(
                    img,
                    0,
                    0,
                    canvasRef.current.width,
                    canvasRef.current.height
                  );
                }
              }
              URL.revokeObjectURL(url);
            };
            img.src = url;
          }

          // Sécurité anti-fuite mémoire si le buffer sature sans trouver de JPEG
          if (buffer.length > 1024 * 1024) buffer = new Uint8Array(0);
        }
      } catch (err: any) {
        if (err.name !== "AbortError" && isMounted) {
          console.error("Stream Error:", err);
          setError("Flux interrompu ou protégé (Vérifiez CORS/API Key)");
        }
      }
    };

    decodeMJPEG();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [camKey, camera, streamUrl]);

  const handleBack = () => {
    if (isRecording) stopRecording();
    navigate("/home");
  };

  const captureScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `capture-${camKey}-${Date.now()}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.9);
    link.click();
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stream = canvas.captureStream(24); // 24 FPS
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp8", // Plus compatible que VP9 sur ESP32-CAM resolutions
    });

    recordedChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    }
  };

  if (loading)
    return (
      <div className="stream-container">
        <div className="loading">Initialisation...</div>
      </div>
    );

  return (
    <div className="stream-container">
      <header className="stream-header">
        <button className="back-button" onClick={handleBack}>
          ← Retour
        </button>
        <div className="stream-info">
          <h1>{camera?.name || "Caméra sans nom"}</h1>
          <span className="stream-status">
            <span className="status-dot"></span> En direct
          </span>
        </div>
      </header>

      <div className="stream-wrapper">
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="stream-video"
          style={{
            background: "#000",
            width: "100%",
            height: "auto",
            maxWidth: "800px",
          }}
        />
        {error && <div className="error-overlay">{error}</div>}
      </div>

      <div className="stream-controls">
        <button className="control-button" onClick={captureScreenshot}>
          📸 Capture
        </button>
        <button
          className={`control-button ${isRecording ? "recording" : ""}`}
          onClick={toggleRecording}
        >
          {isRecording ? "⏹️ Arrêter" : "🔴 Enregistrer"}
        </button>
      </div>
    </div>
  );
}

export default Stream;
