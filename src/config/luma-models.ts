// Centralized Luma AI model configuration
// Update this file when new models or capabilities are added

export type LumaModel = "ray-flash-2" | "ray-2" | "ray-1-6";
export type VideoDuration = "5s" | "9s" | "10s";

export interface ModelConfig {
  id: LumaModel;
  name: string;
  description: string;
  supportedDurations: VideoDuration[];
}

export const LUMA_MODELS: ModelConfig[] = [
  {
    id: "ray-2",
    name: "Ray 2",
    description: "Najbolji kvalitet, sva trajanja",
    supportedDurations: ["5s", "9s", "10s"],
  },
  {
    id: "ray-flash-2",
    name: "Ray 2 Flash",
    description: "Najbrži, samo 5s",
    supportedDurations: ["5s"],
  },
  {
    id: "ray-1-6",
    name: "Ray 1.6",
    description: "Starija verzija",
    supportedDurations: ["5s"],
  },
];

// Default settings
export const DEFAULT_MODEL: LumaModel = "ray-2";
export const DEFAULT_DURATION: VideoDuration = "5s";

// Get supported durations for a model
export function getSupportedDurations(model: LumaModel): VideoDuration[] {
  const modelConfig = LUMA_MODELS.find((m) => m.id === model);
  return modelConfig?.supportedDurations || ["5s"];
}

// Parse duration string to seconds
export function durationToSeconds(duration: VideoDuration): number {
  return parseInt(duration);
}
