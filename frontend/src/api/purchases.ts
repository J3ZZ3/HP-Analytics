import { api } from "./client";
import type { Purchase, PurchaseHistoryResponse } from "@/types";

export const purchasesApi = {
  create: (product_id: string, qty?: number) =>
    api.post<Purchase>("/purchases", { product_id, qty }).then((r) => r.data),

  history: (params?: { page?: number; limit?: number; sort_by?: string; sort_dir?: string }) =>
    api.get<PurchaseHistoryResponse>("/purchases/me", { params }).then((r) => r.data),
};
