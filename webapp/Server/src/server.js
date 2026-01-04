const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { createServer } = require("http");
const WebSocketManager = require("./websocket/websocket-manager");
const db = require("./database/db");

const app = express();
const server = createServer(app);

// WebSocket manager will be initialized after database is ready
let wsManager = null;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/contacts", require("./routes/contacts"));

// WebSocket statistics endpoint
app.get("/api/websocket/stats", (req, res) => {
  if (!wsManager) {
    return res.status(503).json({
      error: "SERVICE_UNAVAILABLE",
      message: "WebSocket service not initialized yet",
    });
  }

  res.json({
    success: true,
    data: wsManager.getStats(),
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "VoidLink Server",
    version: "2.0.0-websocket-realtime",
    websocket: {
      enabled: true,
      path: "/ws",
      authentication: "two-layer",
    },
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "ENDPOINT_NOT_FOUND",
    message: "The requested endpoint does not exist",
    path: req.originalUrl,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
});

const PORT = process.env.PORT || 5000;

// Initialize services and start server
async function startServer() {
  try {
    console.log("Starting VoidLink Server...");

    // Initialize database FIRST and wait for it to complete
    console.log("Initializing database schema...");
    await db.initializeDatabase();
    console.log("Database initialization complete");

    // Initialize WebSocket Manager AFTER database is ready
    console.log("Initializing WebSocket Manager...");
    wsManager = new WebSocketManager(server);

    // Start message queue service AFTER database is confirmed ready
    wsManager.startMessageQueue();

    console.log("WebSocket Manager initialized");

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`VoidLink Server v2.0 running on port ${PORT}`);
      console.log(`WebSocket server ready at ws://localhost:${PORT}/ws`);
      console.log(`Two-layer authentication system active`);
      console.log(`Real-time messaging with crypto session validation`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(
        `WebSocket stats: http://localhost:${PORT}/api/websocket/stats`
      );
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  if (wsManager) {
    await wsManager.shutdown();
  }
  server.close(() => {
    console.log("Server shutdown complete");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  if (wsManager) {
    await wsManager.shutdown();
  }
  server.close(() => {
    console.log("Server shutdown complete");
    process.exit(0);
  });
});
