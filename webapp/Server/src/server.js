const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { createServer } = require("http");
const WebSocket = require("ws");

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

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

// WebSocket for real-time messaging (TODO: Implement crypto session validation)
wss.on("connection", (ws, req) => {
  console.log("Client connected from:", req.socket.remoteAddress);

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data);
      console.log("Received WebSocket message:", message.type);

      // TODO: Implement real-time message routing with crypto session validation
      // For now, just echo back for testing
      ws.send(
        JSON.stringify({
          type: "echo",
          data: message,
          timestamp: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error("Invalid WebSocket message format:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "VoidLink Server",
    version: "2.0.0-two-layer-auth",
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

server.listen(PORT, () => {
  console.log(`🔐 VoidLink Server v2.0 running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for real-time messaging`);
  console.log(`🛡️  Two-layer authentication system active`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
