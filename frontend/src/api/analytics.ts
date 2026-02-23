import { api } from "./client";
import type {
  TopProductsResponse,
  ProductTimeseriesResponse,
  UserSummaryResponse,
  OverviewResponse,
  OverallTimeseriesResponse,
  ProductStatsParams,
  ProductStatsResponse,
} from "@/types";

export const analyticsApi = {
  topProducts: (params?: { days?: number; limit?: number; sort_by?: string }) =>
    api.get<TopProductsResponse>("/analytics/products/top", { params }).then((r) => r.data),

  productStats: (params: ProductStatsParams) =>
    api.get<ProductStatsResponse>("/analytics/products/stats", { params }).then((r) => r.data),

  timeseries: (productId: string, days?: number) =>
    api
      .get<ProductTimeseriesResponse>(`/analytics/products/${productId}/timeseries`, {
        params: days ? { days } : undefined,
      })
      .then((r) => r.data),

  overview: (days?: number) =>
    api
      .get<OverviewResponse>("/analytics/overview", {
        params: days ? { days } : undefined,
      })
      .then((r) => r.data),

  overallTimeseries: (days?: number) =>
    api
      .get<OverallTimeseriesResponse>("/analytics/timeseries", {
        params: days ? { days } : undefined,
      })
      .then((r) => r.data),

  userSummary: (days?: number) =>
    api
      .get<UserSummaryResponse>("/analytics/users/me/summary", {
        params: days ? { days } : undefined,
      })
      .then((r) => r.data),
};
