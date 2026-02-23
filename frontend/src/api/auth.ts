import { api } from "./client";
import type { AuthResponse, User } from "@/types";

export const authApi = {
  register: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/register", { email, password }).then((r) => r.data),

  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }).then((r) => r.data),

  me: () => api.get<User>("/auth/me").then((r) => r.data),
};
