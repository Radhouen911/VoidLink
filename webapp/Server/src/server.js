const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { createServer } = require("http");
const WebSocket = require("ws");
const db = require("./database/db");

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/messages", require("./routes/messages"));

// WebSocket for real-time messaging
wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data);
      // TODO: Handle real-time message routing
      console.log("Received message:", message.type);
    } catch (error) {
      console.error("Invalid message format:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "VoidLink Server" });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🔐 VoidLink Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});
