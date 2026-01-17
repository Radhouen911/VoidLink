import { IS_DEMO_MODE } from "../utils/constants";

// Import real services
import { api as realApi } from "./api";
import { websocket as realWebSocketService } from "./websocket";

// Import mock services
import { api as mockApi } from "./mockApi";
import { mockWebSocketService } from "./mockWebSocket";

// Export the appropriate services based on demo mode
export const api = IS_DEMO_MODE ? mockApi : realApi;
export const webSocketService = IS_DEMO_MODE
  ? mockWebSocketService
  : realWebSocketService;

console.log(
  `🔧 Services initialized in ${IS_DEMO_MODE ? "DEMO" : "PRODUCTION"} mode`,
);
