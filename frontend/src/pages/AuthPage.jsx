import { useState } from "react";
import api from "../config/api";
import { useNavigate } from "react-router";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const url = mode === "login" ? "/auth/login" : "/auth/register";
      const { data } = await api.post(url, form);
      setMsg(data?.message || "Success");
      navigate("/use", { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Something went wrong";
      setMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: "calc(90vh - 56px)",
      display: "grid",
      placeItems: "center",
      backgroundColor: "#f7f7f7",
      padding: "1.5rem",
    },
    card: {
      width: "100%",
      maxWidth: "400px",
      backgroundColor: "#ffffff",
      borderRadius: "16px",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
      border: "1px solid #e5e7eb",
      padding: "2.5rem 2rem",
      boxSizing: "border-box",
    },
    header: {
      textAlign: "center",
      marginBottom: "2rem",
    },
    title: {
      fontSize: "1.8rem",
      fontWeight: "600",
      color: "#333",
      marginBottom: "0.5rem",
    },
    logoHighlight: {
      color: "#fff",
      backgroundColor: "#2c3e50",
      padding: "0.25rem 0.5rem",
      borderRadius: "6px",
      whiteSpace: "nowrap",
    },
    subtitle: {
      color: "#6b7280",
      fontSize: "0.95rem",
      marginTop: "0.5rem",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "1.25rem",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
    },
    formLabel: {
      fontSize: "0.875rem",
      fontWeight: "500",
      color: "#4b5563",
      marginBottom: "0.5rem",
    },
    formInput: {
      width: "100%",
      padding: "0.75rem 1rem",
      border: "1px solid #d1d5db",
      borderRadius: "8px",
      fontSize: "1rem",
      color: "#374151",
      backgroundColor: "#f9fafb",
      transition: "all 0.2s ease-in-out",
    },
    formInputFocus: {
      outline: "none",
      borderColor: "#4f46e5",
      boxShadow: "0 0 0 3px rgba(79, 70, 229, 0.1)",
    },
    message: {
      padding: "0.75rem 1rem",
      borderRadius: "8px",
      fontSize: "0.875rem",
      textAlign: "center",
      marginTop: "-0.5rem",
    },
    messageError: {
      backgroundColor: "#fef2f2",
      color: "#ef4444",
      border: "1px solid #fecaca",
    },
    messageSuccess: {
      backgroundColor: "#ecfdf5",
      color: "#10b981",
      border: "1px solid #a7f3d0",
    },
    button: {
      width: "100%",
      padding: "0.75rem",
      fontSize: "1rem",
      fontWeight: "600",
      color: "#ffffff",
      backgroundColor: "#2c3e50",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "background-color 0.2s ease-in-out, opacity 0.2s ease-in-out",
    },
    buttonHover: {
      backgroundColor: "#1a242f",
    },
    buttonDisabled: {
      backgroundColor: "#9ca3af",
      cursor: "not-allowed",
      opacity: "0.7",
    },
    toggle: {
      textAlign: "center",
      fontSize: "0.875rem",
      color: "#6b7280",
      marginTop: "1.5rem",
    },
    toggleLink: {
      background: "none",
      border: "none",
      color: "#4f46e5",
      fontWeight: "500",
      cursor: "pointer",
      textDecoration: "underline",
      textUnderlineOffset: "4px",
      transition: "color 0.2s ease-in-out",
    },
    toggleLinkHover: {
      color: "#4338ca",
    },
  };

  return (
    <main style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>
            Welcome to
            <span style={styles.logoHighlight}> Image Caption AI</span>
          </h1>
          <p style={styles.subtitle}>
            {mode === "login" ? "Login to continue" : "Create a new account"}.
          </p>
        </div>

        <form onSubmit={submit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Username</label>
            <input
              name="username"
              value={form.username}
              onChange={onChange}
              placeholder="Your username"
              style={styles.formInput}
              autoComplete="username"
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              placeholder="••••••••"
              style={styles.formInput}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
            />
          </div>

          {msg && (
            <div
              style={{
                ...styles.message,
                ...(msg.includes("Success")
                  ? styles.messageSuccess
                  : styles.messageError),
              }}
            >
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={
              loading
                ? { ...styles.button, ...styles.buttonDisabled }
                : styles.button
            }
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : "Create Account"}
          </button>
        </form>

        <div style={styles.toggle}>
          {mode === "login" ? (
            <>
              Don’t have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                style={styles.toggleLink}
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                style={styles.toggleLink}
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}