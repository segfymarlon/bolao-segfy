import { prisma } from "./prisma";

export async function createAuditLog({
  actorUserId,
  action,
  entityType,
  entityId,
  beforeJson,
  afterJson,
}: {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson?: object;
  afterJson?: object;
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId,
      action,
      entityType,
      entityId,
      beforeJson: beforeJson ?? undefined,
      afterJson: afterJson ?? undefined,
    },
  });
}

export const AuditAction = {
  INVITE_CREATED: "INVITE_CREATED",
  INVITE_RESENT: "INVITE_RESENT",
  INVITE_REVOKED: "INVITE_REVOKED",
  USER_LOGIN: "USER_LOGIN",
  PREDICTION_CREATED: "PREDICTION_CREATED",
  PREDICTION_UPDATED: "PREDICTION_UPDATED",
  RESULT_PUBLISHED: "RESULT_PUBLISHED",
  RESULT_UPDATED: "RESULT_UPDATED",
  SCORE_CALCULATED: "SCORE_CALCULATED",
  RECALC_TRIGGERED: "RECALC_TRIGGERED",
  RULESET_PUBLISHED: "RULESET_PUBLISHED",
  MATCH_CREATED: "MATCH_CREATED",
  MATCH_UPDATED: "MATCH_UPDATED",
  SLOT_RESOLVED: "SLOT_RESOLVED",
} as const;
