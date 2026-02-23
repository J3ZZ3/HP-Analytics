import { api } from "./client";
import type { HealthResponse, ReadyResponse, MetricsResponse } from "@/types";

export const systemApi = {
  health: () => api.get<HealthResponse>("/health").then((r) => r.data),
  ready: () => api.get<ReadyResponse>("/ready").then((r) => r.data),
  metrics: () => api.get<MetricsResponse>("/metrics").then((r) => r.data),
};
