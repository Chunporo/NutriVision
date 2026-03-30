/**
 * NutriVision API service layer.
 *
 * Handles all communication with the FastAPI backend.
 * Configure API_BASE_URL to point to your server.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const API_URL_KEY = "@nutrivision_api_url";
// Android emulator reaches the host via 10.0.2.2; browser and iOS use localhost.
const DEFAULT_API_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 120_000; // 2 minutes

export interface NutritionData {
  food_name?: string;
  total_calories?: number;
  total_weight_grams?: number;
  calories?: number | string;
  protein?: number | string;
  carbohydrates?: number | string;
  fat?: number | string;
  fiber?: number | string;
  sugar?: number | string;
  sodium?: number | string;
  serving_size?: string;
  confidence?: number;
  error?: string;
  raw_output?: string;
  items?: Array<{
    name?: string;
    calories?: number | string;
    protein?: number | string;
    carbohydrates?: number | string;
    fat?: number | string;
    portion_size?: string;
  }>;
  [key: string]: unknown;
}

export interface AnalysisResult {
  id: string;
  timestamp: string;
  nutrition: NutritionData;
  processing_time_ms: number;
}

export interface HealthStatus {
  status: string;
  models_loaded: {
    vl_model: boolean;
    pipeline: boolean;
  };
  device: string;
  cuda_available: boolean;
  uptime_seconds: number;
}

export interface ApiError {
  error_code: string;
  message: string;
  detail?: string;
}

/**
 * Fetch with timeout support.
 */
function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

/** Simple delay helper. */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch with retry logic.
 * - Retries on network errors and 5xx responses.
 * - Does NOT retry on AbortError (timeout) or 4xx (client/server contract errors).
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  retries = 2,
  delayMs = 2000
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, options, timeoutMs);
      // 4xx — client/server contract errors, no point retrying
      if (res.status >= 400 && res.status < 500) return res;
      // 5xx — backend error, retry if attempts remain
      if (res.status >= 500 && attempt < retries) {
        await sleep(delayMs);
        continue;
      }
      return res;
    } catch (err: any) {
      // AbortError = intentional timeout — propagate immediately
      if (err.name === "AbortError") throw err;
      // Network error — retry if attempts remain
      if (attempt < retries) {
        await sleep(delayMs);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unexpected retry loop exit");
}

/**
 * Build a FormData object that works on both React Native and web.
 *
 * React Native: the { uri, name, type } object trick is required.
 * Web: fetch the URI as a Blob and append a real File object.
 */
async function buildImageFormData(imageUri: string): Promise<FormData> {
  const formData = new FormData();
  const filename = imageUri.split("/").pop() || "photo.jpg";
  const ext = (/\.(\w+)$/.exec(filename)?.[1] ?? "jpg").toLowerCase();
  const mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;

  if (Platform.OS === "web") {
    const res = await fetch(imageUri);
    const blob = await res.blob();
    formData.append("image", new File([blob], filename, { type: mimeType }));
  } else {
    formData.append("image", {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);
  }

  return formData;
}

class ApiService {
  private baseUrl: string = DEFAULT_API_URL;
  private initialized: boolean = false;

  /**
   * Load persisted server URL from storage (call once at app start).
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const saved = await AsyncStorage.getItem(API_URL_KEY);
      if (saved) this.baseUrl = saved;
    } catch {
      // ignore — use default
    }
    this.initialized = true;
  }

  async setBaseUrl(url: string): Promise<void> {
    // Normalize: strip trailing slash
    this.baseUrl = url.replace(/\/+$/, "");
    await AsyncStorage.setItem(API_URL_KEY, this.baseUrl);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async healthCheck(): Promise<HealthStatus> {
    const response = await fetchWithTimeout(
      `${this.baseUrl}/health`,
      { method: "GET", headers: { Accept: "application/json" } },
      10_000 // 10 s timeout for health
    );

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Analyze a food image using the quick VL endpoint.
   * @param imageUri Local file URI of the image (from camera or gallery)
   */
  async analyzeFood(imageUri: string): Promise<AnalysisResult> {
    await this.init();

    const formData = await buildImageFormData(imageUri);

    let response: Response;
    try {
      response = await fetchWithRetry(`${this.baseUrl}/analyze/quick`, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      }, REQUEST_TIMEOUT_MS);
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error(
          "Request timed out. Check your network or try a smaller image."
        );
      }
      throw new Error(
        `Cannot reach server at ${this.baseUrl}. Is it running?\n\n${err.message}`
      );
    }

    if (!response.ok) {
      let errorMsg = `Server error (${response.status})`;
      try {
        const body: ApiError = await response.json();
        errorMsg = body.message || body.detail || errorMsg;
      } catch {
        // ignore parse failure
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  /**
   * Analyze with full pipeline (ViT + Mask R-CNN + VL).
   */
  async analyzeFoodFull(
    imageUri: string,
    mode: "vl" | "pipeline" | "both" = "both"
  ): Promise<unknown> {
    await this.init();

    const formData = await buildImageFormData(imageUri);

    let response: Response;
    try {
      response = await fetchWithRetry(
        `${this.baseUrl}/analyze?mode=${mode}`,
        { method: "POST", body: formData, headers: { Accept: "application/json" } },
        REQUEST_TIMEOUT_MS
      );
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Request timed out.");
      }
      throw new Error(`Cannot reach server. ${err.message}`);
    }

    if (!response.ok) {
      let errorMsg = `Server error (${response.status})`;
      try {
        const body: ApiError = await response.json();
        errorMsg = body.message || body.detail || errorMsg;
      } catch {
        // ignore
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }
}

export const apiService = new ApiService();
export default apiService;
