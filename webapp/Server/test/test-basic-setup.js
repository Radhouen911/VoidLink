/**
 * Basic Setup Test - Verify core components are working
 * This test checks if the basic infrastructure is ready before running full messaging tests
 */

const MessageQueueService = require("../src/services/message-queue-service");
const db = require("../src/database/db");

class BasicSetupTest {
  constructor() {
    this.messageQueueService = null;
  }

  /**
   * Test database connection and basic queries
   */
  async testDatabaseConnection() {
    console.log("🗄️  Testing database connection...");

    try {
      // Test basic connection
      const result = await db.query("SELECT NOW() as current_time");
      console.log(`✅ Database connected at: ${result.rows[0].current_time}`);

      // Test required tables exist
      const tables = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('accounts', 'crypto_profiles', 'messages', 'message_queue', 'user_presence')
        ORDER BY table_name
      `);

      console.log(`✅ Found ${tables.rows.length}/5 required tables:`);
      tables.rows.forEach((row) => console.log(`   - ${row.table_name}`));

      // Test required functions exist
      const functions = await db.query(`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name IN ('get_queued_messages', 'update_user_presence', 'cleanup_expired_messages')
        ORDER BY routine_name
      `);

      console.log(`✅ Found ${functions.rows.length}/3 required functions:`);
      functions.rows.forEach((row) => console.log(`   - ${row.routine_name}`));

      return tables.rows.length >= 5 && functions.rows.length >= 3;
    } catch (error) {
      console.error("❌ Database connection test failed:", error.message);
      return false;
    }
  }

  /**
   * Test message queue service initialization
   */
  async testMessageQueueService() {
    console.log("\n🔧 Testing Message Queue Service...");

    try {
      // Create mock connection manager
      const mockConnectionManager = {
        isUserOnline: () => false,
        broadcastToUser: () => 0,
      };

      // Initialize service
      this.messageQueueService = new MessageQueueService(mockConnectionManager);
      console.log("✅ Message Queue Service created");

      // Test service methods
      const isRunning = this.messageQueueService.isRunning();
      console.log(`✅ Service running check: ${isRunning}`);

      // Start service
      this.messageQueueService.start();
      console.log("✅ Message Queue Service started");

      // Test stats
      const stats = await this.messageQueueService.getStats();
      console.log("✅ Service stats retrieved:");
      console.log(`   - Running: ${stats.isRunning}`);
      console.log(`   - Total messages: ${stats.totalMessages}`);
      console.log(`   - Online users: ${stats.onlineUsers}`);

      return true;
    } catch (error) {
      console.error("❌ Message Queue Service test failed:", error.message);
      return false;
    }
  }

  /**
   * Test database functions with mock data
   */
  async testDatabaseFunctions() {
    console.log("\n📋 Testing database functions...");

    try {
      // Test get_queued_messages function with non-existent user (should return empty)
      const mockCryptoId = "550e8400-e29b-41d4-a716-446655440000";

      const queueResult = await db.query(
        "SELECT * FROM get_queued_messages($1)",
        [mockCryptoId]
      );
      console.log(
        `✅ get_queued_messages function works (returned ${queueResult.rows.length} messages)`
      );

      // Test cleanup function (safe to run on empty database)
      const cleanupResult = await db.query("SELECT cleanup_expired_messages()");
      const deletedCount = cleanupResult.rows[0].cleanup_expired_messages;
      console.log(
        `✅ cleanup_expired_messages function works (cleaned ${deletedCount} messages)`
      );

      // Test update_user_presence function by creating a test user first
      console.log("📋 Testing update_user_presence with test data...");

      // Create a test account and crypto profile for presence testing
      const testAccount = await db.query(
        "INSERT INTO accounts (username, password_hash) VALUES ($1, $2) RETURNING id",
        [`test_user_${Date.now()}`, "test_hash"]
      );

      const testCrypto = await db.query(
        "INSERT INTO crypto_profiles (account_id, public_key) VALUES ($1, $2) RETURNING id",
        [testAccount.rows[0].id, "test_public_key_" + Date.now()]
      );

      const testCryptoId = testCrypto.rows[0].id;

      // Now test update_user_presence with valid crypto profile
      await db.query("SELECT update_user_presence($1, $2, $3)", [
        testCryptoId,
        "online",
        1,
      ]);
      console.log("✅ update_user_presence function works");

      // Test user presence query
      const presenceResult = await db.getUserPresence(testCryptoId);
      console.log(
        `✅ getUserPresence works (status: ${
          presenceResult?.status || "not found"
        })`
      );

      // Cleanup test data
      await db.query("DELETE FROM accounts WHERE id = $1", [
        testAccount.rows[0].id,
      ]);
      console.log("✅ Test data cleaned up");

      return true;
    } catch (error) {
      console.error("❌ Database functions test failed:", error.message);
      return false;
    }
  }

  /**
   * Test API endpoints are accessible
   */
  async testAPIEndpoints() {
    console.log("\n🌐 Testing API endpoints...");

    try {
      const BASE_URL = "http://localhost:5000";

      // Test server is running
      const response = await fetch(`${BASE_URL}/api/auth/session`, {
        method: "GET",
        headers: { Authorization: "Bearer invalid_token" },
      });

      // We expect 401 (unauthorized) which means server is running
      if (response.status === 401) {
        console.log("✅ Server is running and responding");
        return true;
      } else {
        console.log(
          `⚠️  Server responded with unexpected status: ${response.status}`
        );
        return false;
      }
    } catch (error) {
      if (error.code === "ECONNREFUSED") {
        console.error(
          "❌ Server is not running. Please start the server first."
        );
      } else {
        console.error("❌ API endpoint test failed:", error.message);
      }
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.messageQueueService) {
      this.messageQueueService.stop();
      console.log("🔧 Message Queue Service stopped");
    }
  }

  /**
   * Run all basic setup tests
   */
  async runTests() {
    console.log("🔍 VoidLink Basic Setup Test");
    console.log("============================");
    console.log("Verifying core components are ready...\n");

    const results = {
      database: false,
      service: false,
      functions: false,
      api: false,
    };

    try {
      results.database = await this.testDatabaseConnection();
      results.service = await this.testMessageQueueService();
      results.functions = await this.testDatabaseFunctions();
      results.api = await this.testAPIEndpoints();

      // Print summary
      console.log("\n📊 Basic Setup Test Results");
      console.log("============================");
      console.log(
        `Database Connection: ${results.database ? "✅ PASS" : "❌ FAIL"}`
      );
      console.log(
        `Message Queue Service: ${results.service ? "✅ PASS" : "❌ FAIL"}`
      );
      console.log(
        `Database Functions: ${results.functions ? "✅ PASS" : "❌ FAIL"}`
      );
      console.log(`API Endpoints: ${results.api ? "✅ PASS" : "❌ FAIL"}`);

      const passCount = Object.values(results).filter(Boolean).length;
      const totalTests = Object.keys(results).length;

      console.log(
        `\n🎯 Overall Result: ${passCount}/${totalTests} tests passed`
      );

      if (passCount === totalTests) {
        console.log(
          "🎉 ALL BASIC TESTS PASSED! System is ready for messaging tests."
        );
      } else {
        console.log(
          "⚠️  Some basic tests failed. Fix these issues before running full messaging tests."
        );
      }

      return passCount === totalTests;
    } catch (error) {
      console.error("❌ Test execution failed:", error);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
async function main() {
  const test = new BasicSetupTest();
  try {
    const success = await test.runTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = BasicSetupTest;
