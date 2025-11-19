const express = require("express");
const authRoutes = require("./routes/auth.routes");
const captionRoutes = require("./routes/caption.routes");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const app = express();

// CORS configuration with enhanced security
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Static files
app.use(express.static("public"));

// API routes
app.use("/auth", authRoutes);
app.use("/api", captionRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ 
    error: "Endpoint not found",
    path: req.path 
  });
});

app.use("/auth/*", (req, res) => {
  res.status(404).json({ 
    error: "Auth endpoint not found",
    path: req.path 
  });
});

// Serve frontend for all other routes
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "/public/index.html"));
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
