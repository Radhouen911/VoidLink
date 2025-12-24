const db = require("./db");

console.log("🗄️ Initializing VoidLink database...");

// The database tables are created automatically when db.js is required
// This script can be used for additional setup or data seeding

db.serialize(() => {
  // Create indexes for better performance
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id)"
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)"
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)"
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)"
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)"
  );

  console.log("✅ Database indexes created");
});

db.close((err) => {
  if (err) {
    console.error("❌ Error closing database:", err);
  } else {
    console.log("✅ Database initialization complete");
  }
});
