import axios from "axios";

// Use environment variable for API URL in production, fallback to relative path in development
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

export default api;
