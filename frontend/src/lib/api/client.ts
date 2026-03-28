import axios from "axios";

/** Base URL del API: proxy same-origin salvo que definas NEXT_PUBLIC_API_URL (URL absoluta). */
function apiBaseURL(): string {
  const env = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (env) return env;
  // Cliente: va a /api en el mismo host/puerto de Next (rewrite → Express).
  if (typeof window !== "undefined") return "/api";
  // SSR / scripts: hablar directo al backend
  return "http://127.0.0.1:4000/api";
}

const api = axios.create({
  baseURL: apiBaseURL(),
  headers: { "Content-Type": "application/json" },
});

// Inyectar token en cada request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Redirect a login si 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
