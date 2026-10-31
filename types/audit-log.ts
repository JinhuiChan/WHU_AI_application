import type { Paginated } from "@/types/api";

export type AuditLogItem = {
  id: string;
  actor: {
    id: string;
    name: string;
    phone: string;
  };
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
  createdAt: string;
};

export type AuditLogPage = Paginated<AuditLogItem>;
