import { api } from "./client";
import type {
  Product,
  ProductCreateRequest,
  ProductListResponse,
  ProductListParams,
  ProductUpdateRequest,
  CategoriesResponse,
} from "@/types";

export const productsApi = {
  list: (params?: ProductListParams) =>
    api.get<ProductListResponse>("/products", { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<Product>(`/products/${id}`).then((r) => r.data),

  create: (data: ProductCreateRequest) =>
    api.post<Product>("/products", data).then((r) => r.data),

  update: (id: string, data: ProductUpdateRequest) =>
    api.patch<Product>(`/products/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/products/${id}`).then((r) => r.data),

  categories: () =>
    api.get<CategoriesResponse>("/products/categories").then((r) => r.data.categories),
};
