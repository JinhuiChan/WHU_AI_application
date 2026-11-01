import type { Role } from "@prisma/client";

export type ManagedUser = {
  id: string;
  phone: string;
  name: string;
  role: Role;
  externalId: string | null;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
};
