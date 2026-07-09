import { prisma } from "@/lib/prisma";

export const AuditService = {
  async log(params: {
    cabangId?: string | null;
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    detail?: Record<string, unknown> | null;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          cabangId: params.cabangId || null,
          userId: params.userId || null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId || null,
          detail: params.detail ? JSON.stringify(params.detail) : null,
        },
      });
    } catch (err) {
      console.error("Audit log failed:", err);
    }
  },
};
