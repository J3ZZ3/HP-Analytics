import { api } from "./client";
import type { AcceptedResponse, BulkAcceptedResponse, EventCreateRequest } from "@/types";

export const eventsApi = {
  create: (data: EventCreateRequest) =>
    api.post<AcceptedResponse>("/events", data).then((r) => r.data),

  bulk: (events: EventCreateRequest[], session_id?: string) =>
    api.post<BulkAcceptedResponse>("/events/bulk", { events, session_id }).then((r) => r.data),

  linkSession: (session_id: string) =>
    api.post<{ linked: number }>("/events/link-session", { session_id }).then((r) => r.data),
};
