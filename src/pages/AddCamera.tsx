import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authService, cameraService } from "../services/api.ts";
import "./AddCamera.css";

function AddCamera() {
  const [lastname, setlastname] = useState("");
  const [camKey, setCamKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Vérifier l'authentification
  if (!authService.isAuthenticated()) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await cameraService.createCamera(lastname, camKey);
      navigate("/home");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/home");
  };

  return (
    <div className="add-camera-container">
      <header className="add-camera-header">
        <button className="back-button" onClick={handleBack}>
          ← Retour
        </button>
        <h1>Ajouter une caméra</h1>
      </header>

      <form onSubmit={handleSubmit} className="add-camera-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="lastname">lastname de la caméra</label>
          <input
            type="text"
            id="lastname"
            value={lastname}
            onChange={(e) => setlastname(e.target.value)}
            placeholder="Ex: Caméra Salon"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="camKey">Clé de la caméra (cam_key)</label>
          <input
            type="text"
            id="camKey"
            value={camKey}
            onChange={(e) => setCamKey(e.target.value)}
            placeholder="Ex: cam_esp32_001"
            required
            disabled={loading}
          />
          <span className="input-hint">
            Identifiant unique de votre ESP32-CAM
          </span>
        </div>

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? "Création..." : "Créer la caméra"}
        </button>
      </form>
    </div>
  );
}

export default AddCamera;
