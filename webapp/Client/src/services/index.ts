import { IS_DEMO_MODE } from "../utils/constants";

// Import real services
import { api as realApi } from "./api";
import {
  authService as realAuthService,
  clearSessionPrivateKey as realClearSessionPrivateKey,
  getSessionPrivateKey as realGetSessionPrivateKey,
  setSessionPrivateKey as realSetSessionPrivateKey,
} from "./auth";
import {
  batchDecryptMessages as realBatchDecryptMessages,
  decryptMessageForDisplay as realDecryptMessageForDisplay,
} from "./messageDecryption";
import { websocket as realWebSocketService } from "./websocket";

// Import mock services
import { api as mockApi } from "./mockApi";
import {
  mockAuthService,
  clearSessionPrivateKey as mockClearSessionPrivateKey,
  getSessionPrivateKey as mockGetSessionPrivateKey,
  setSessionPrivateKey as mockSetSessionPrivateKey,
} from "./mockAuth";
import {
  batchDecryptMessages as mockBatchDecryptMessages,
  decryptMessageForDisplay as mockDecryptMessageForDisplay,
} from "./mockMessageDecryption";
import { mockWebSocketService } from "./mockWebSocket";

// Export the appropriate services based on demo mode
export const api = IS_DEMO_MODE ? mockApi : realApi;
export const webSocketService = IS_DEMO_MODE
  ? mockWebSocketService
  : realWebSocketService;
export const authService = IS_DEMO_MODE ? mockAuthService : realAuthService;
export const getSessionPrivateKey = IS_DEMO_MODE
  ? mockGetSessionPrivateKey
  : realGetSessionPrivateKey;
export const setSessionPrivateKey = IS_DEMO_MODE
  ? mockSetSessionPrivateKey
  : realSetSessionPrivateKey;
export const clearSessionPrivateKey = IS_DEMO_MODE
  ? mockClearSessionPrivateKey
  : realClearSessionPrivateKey;
export const decryptMessageForDisplay = IS_DEMO_MODE
  ? mockDecryptMessageForDisplay
  : realDecryptMessageForDisplay;
export const batchDecryptMessages = IS_DEMO_MODE
  ? mockBatchDecryptMessages
  : realBatchDecryptMessages;

console.log(
  `🔧 Services initialized in ${IS_DEMO_MODE ? "DEMO" : "PRODUCTION"} mode`,
);
