import type { Prisma, Role } from "@prisma/client";

export function awardWhereForRole(role: Role): Prisma.AwardRecordWhereInput {
  return role === "ADMIN" ? {} : { status: "PUBLISHED" };
}
