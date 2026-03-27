import { Platform } from "react-native";
import { NutritionPrediction } from "@/src/lib/types";

// Directly calling the external AI service instead of our backend
const AI_API_URL = "https://sadly-unyearned-pedro.ngrok-free.dev/analyze";

type ReactNativeFilePart = {
  uri: string;
  name: string;
  type: string;
};

async function errorMessageFromResponse(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  const text = await response.text();
  if (!text) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(text) as { detail?: string };
    return parsed.detail ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function parsePredictionResult(data: any): NutritionPrediction {
  if (data && "vl_result" in data && data.vl_result) {
    return data.vl_result as NutritionPrediction;
  }
  return data as NutritionPrediction;
}

export const api = {
  async predict(imageUrl: string) {
    const formData = new FormData();
    formData.append("image_url", imageUrl);

    const response = await fetch(`${AI_API_URL}?mode=vl`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const message = await errorMessageFromResponse(response);
      throw new Error(message);
    }

    const data = await response.json();
    return parsePredictionResult(data);
  },

  async predictUpload(fileUri: string, imageUrl?: string) {
    const formData = new FormData();
    if (Platform.OS === "web") {
      try {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        formData.append("image", blob, "meal.jpg"); // AI service expects 'image'
      } catch (err) {
        console.error("Failed to fetch file for web upload", err);
        throw new Error("Unable to prepare image for upload");
      }
    } else {
      const filePart: ReactNativeFilePart = {
        uri: fileUri,
        name: "meal.jpg",
        type: "image/jpeg",
      };
      formData.append("image", filePart as never);
    }
    
    // AI service expects image_url field as well
    if (imageUrl) {
      formData.append("image_url", imageUrl);
    } else {
      formData.append("image_url", "");
    }

    const response = await fetch(`${AI_API_URL}?mode=vl`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const message = await errorMessageFromResponse(response);
      throw new Error(message);
    }

    const data = await response.json();
    return parsePredictionResult(data);
  },
};

export const API_BASE_URL = AI_API_URL;
