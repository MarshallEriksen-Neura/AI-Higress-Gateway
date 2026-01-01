import { useApiPost } from "./hooks";
import type {
  VideoGenerationRequest,
  VideoGenerationResponse,
} from "@/lib/api-types";

export function useVideoGenerations() {
  const { trigger, data, error, submitting } = useApiPost<
    VideoGenerationResponse,
    VideoGenerationRequest
  >("/v1/videos/generations");

  return {
    generateVideo: trigger,
    data,
    error,
    isGenerating: submitting,
  };
}
