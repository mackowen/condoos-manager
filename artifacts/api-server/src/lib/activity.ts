import { db, activityLogsTable } from "@workspace/db";
import type { AuthClaims } from "./auth";

export async function logActivity(
  auth: AuthClaims | undefined,
  action: string,
  entity: string,
  entityId: string | null,
  message: string,
): Promise<void> {
  if (!auth) return;
  try {
    await db.insert(activityLogsTable).values({
      condominiumId: auth.condominiumId,
      userId: auth.userId,
      userName: auth.email,
      action,
      entity,
      entityId: entityId ?? null,
      message,
    });
  } catch {
    // best-effort
  }
}
