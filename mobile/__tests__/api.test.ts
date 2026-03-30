/**
 * Unit tests for ApiService.
 * global.fetch and AsyncStorage are mocked.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiService } from "../src/services/api";

// Mock react-native (Platform needed by api.ts)
jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (obj: any) => obj.ios },
}));

// Reset mocks and service state before each test
beforeEach(() => {
  jest.clearAllMocks();
  // Reset internal state so init() runs fresh
  (apiService as any).initialized = false;
  (apiService as any).baseUrl = "http://localhost:8000";
});

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------
describe("init", () => {
  it("loads persisted URL from AsyncStorage", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("http://192.168.1.50:8000");
    await apiService.init();
    expect(apiService.getBaseUrl()).toBe("http://192.168.1.50:8000");
  });

  it("uses default URL when storage is empty", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    await apiService.init();
    expect(apiService.getBaseUrl()).toBe("http://localhost:8000");
  });

  it("does not re-initialize when called twice", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    await apiService.init();
    await apiService.init();
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// setBaseUrl / getBaseUrl
// ---------------------------------------------------------------------------
describe("setBaseUrl", () => {
  it("strips trailing slash", async () => {
    await apiService.setBaseUrl("http://192.168.1.100:8000/");
    expect(apiService.getBaseUrl()).toBe("http://192.168.1.100:8000");
  });

  it("persists URL to AsyncStorage", async () => {
    await apiService.setBaseUrl("http://10.0.0.1:8000");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@nutrivision_api_url",
      "http://10.0.0.1:8000"
    );
  });
});

// ---------------------------------------------------------------------------
// healthCheck
// ---------------------------------------------------------------------------
describe("healthCheck", () => {
  it("returns parsed health data on success", async () => {
    const mockHealth = {
      status: "ok",
      models_loaded: { vl_model: false, pipeline: false },
      device: "cpu",
      cuda_available: false,
      uptime_seconds: 42,
    };
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockHealth),
    } as any);

    const result = await apiService.healthCheck();
    expect(result.status).toBe("ok");
    expect(result.device).toBe("cpu");
  });

  it("throws on non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
    } as any);

    await expect(apiService.healthCheck()).rejects.toThrow("503");
  });
});

// ---------------------------------------------------------------------------
// analyzeFood
// ---------------------------------------------------------------------------
describe("analyzeFood", () => {
  const MOCK_RESULT = {
    id: "abc-123",
    timestamp: "2024-03-15T12:00:00Z",
    nutrition: { food_name: "Pizza", calories: 800 },
    processing_time_ms: 5000,
  };

  beforeEach(() => {
    // Silence FormData usage — RN FormData is already available in jsdom
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("returns analysis result on success", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_RESULT),
    } as any);

    const result = await apiService.analyzeFood("file:///photo.jpg");
    expect(result.id).toBe("abc-123");
    expect(result.nutrition.food_name).toBe("Pizza");
  });

  it("throws descriptive error on AbortError (timeout)", async () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    global.fetch = jest.fn().mockRejectedValueOnce(abortError);

    await expect(apiService.analyzeFood("file:///photo.jpg")).rejects.toThrow("timed out");
  });

  it("throws network error when server unreachable", async () => {
    // fetchWithRetry retries network errors up to 2 times — mock all 3 attempts
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error("Network request failed"))
      .mockRejectedValueOnce(new Error("Network request failed"))
      .mockRejectedValueOnce(new Error("Network request failed"));

    await expect(apiService.analyzeFood("file:///photo.jpg")).rejects.toThrow("Cannot reach server");
  });

  it("throws on 400 server error", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: "Bad image format" }),
    } as any);

    await expect(apiService.analyzeFood("file:///photo.jpg")).rejects.toThrow("Bad image format");
  });

  it("throws on 500 server error", async () => {
    // fetchWithRetry retries 5xx up to 2 times — mock all 3 attempts with 500
    const mock500 = { ok: false, status: 500, json: () => Promise.resolve({ message: "Internal server error" }) } as any;
    global.fetch = jest.fn()
      .mockResolvedValueOnce(mock500)
      .mockResolvedValueOnce(mock500)
      .mockResolvedValueOnce(mock500);

    await expect(apiService.analyzeFood("file:///photo.jpg")).rejects.toThrow("Internal server error");
  });
});
