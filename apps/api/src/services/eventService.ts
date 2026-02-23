import { analyticsQueue } from "../queue/analyticsQueue.js";
import * as repo from "../repositories/eventRepo.js";
import type { EventType } from "../repositories/eventRepo.js";

export async function ingestEvent(args: {
  userId: string | null;
  sessionId: string | null;
  productId: string;
  type: EventType;
  ts?: string;
  meta?: any;
}) {
  const id = await repo.insertEvent(args);
  await analyticsQueue.add("aggregate_event", { eventId: id }, { removeOnComplete: true, attempts: 3 });
  return id;
}

export async function ingestEventsBulk(args: {
  userId: string | null;
  sessionId: string | null;
  events: Array<{ productId: string; type: EventType; ts?: string; meta?: any }>;
}) {
  const rows = args.events.map((e) => ({
    userId: args.userId,
    sessionId: args.sessionId,
    productId: e.productId,
    type: e.type,
    ts: e.ts,
    meta: e.meta,
  }));
  const inserted = await repo.insertEventsBulk(rows);
  await analyticsQueue.add("aggregate_bulk", { count: inserted }, { removeOnComplete: true, attempts: 3 });
  return inserted;
}

export async function linkSession(sessionId: string, userId: string) {
  return repo.linkSession(sessionId, userId);
}
