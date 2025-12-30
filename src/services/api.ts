const API_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

export interface User {
  id: number;
  lastname: string;
  firstname: string;
  email: string;
}

export interface Camera {
  id: number;
  name: string;
  cam_key: string;
}

const getHeaders = (includeAuth = false) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  };

  if (includeAuth) {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
};

export const authService = {
  async login(
    email: string,
    password: string
  ): Promise<{ token: string; user: User }> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erreur de connexion");
    }

    // Cache token et user
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    return data;
  },

  logout(): void {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("cameras");
  },

  getToken(): string | null {
    return localStorage.getItem("token");
  },

  getUser(): User | null {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem("token");
  },
};

export const cameraService = {
  async getMyCameras(): Promise<Camera[]> {
    const response = await fetch(`${API_URL}/cameras/my-cameras`, {
      method: "GET",
      headers: getHeaders(true),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Erreur lors de la récupération des caméras"
      );
    }

    // Cache les caméras
    localStorage.setItem("cameras", JSON.stringify(data.cameras));

    return data.cameras;
  },

  async createCamera(lastname: string, cam_key: string): Promise<Camera> {
    const response = await fetch(`${API_URL}/cameras/create`, {
      method: "POST",
      headers: getHeaders(true),
      body: JSON.stringify({ lastname, cam_key }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erreur lors de la création de la caméra");
    }

    // Mettre à jour le cache
    const cameras = JSON.parse(localStorage.getItem("cameras") || "[]");
    cameras.push(data.camera);
    localStorage.setItem("cameras", JSON.stringify(cameras));

    return data.camera;
  },

  async deleteCamera(id: number): Promise<any> {
    const response = await fetch(`${API_URL}/cameras/${id}`, {
      method: "DELETE",
      headers: getHeaders(true),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Erreur lors de la suppression de la caméra"
      );
    }

    // Mettre à jour le cache
    const cameras = JSON.parse(localStorage.getItem("cameras") || "[]");
    const updatedCameras = cameras.filter((cam: Camera) => cam.id !== id);
    localStorage.setItem("cameras", JSON.stringify(updatedCameras));

    return data;
  },

  getCachedCameras(): Camera[] {
    const cameras = localStorage.getItem("cameras");
    return cameras ? JSON.parse(cameras) : [];
  },

  getVideoStreamUrl(camKey: string): string {
    return `${API_URL}/cameras/video/${camKey}?api_key=${API_KEY}`;
  },
};
