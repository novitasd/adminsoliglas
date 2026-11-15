const defaultApiUrl = import.meta.env.DEV
  ? "http://localhost:4000"
  : "https://back-soliglas.onrender.com";
const API_URL = (import.meta.env.VITE_API_URL || defaultApiUrl).replace(/\/$/, "");

export async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "No se pudo completar la solicitud.");
    error.status = response.status;
    throw error;
  }

  return payload;
}
