import type { ModelParameters } from "./types";

export function buildModelPreset(
  parameters: ModelParameters
): Record<string, number> {
  return {
    temperature: parameters.temperature,
    top_p: parameters.top_p,
    frequency_penalty: parameters.frequency_penalty,
    presence_penalty: parameters.presence_penalty,
  };
}
