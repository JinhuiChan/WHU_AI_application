import { prisma } from "@/lib/prisma";

export async function listOptions(type: string) {
  return prisma.dictOption.findMany({
    where: { type, enabled: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}

export async function getLabelMap(type: string): Promise<Record<string, string>> {
  const options = await listOptions(type);
  return Object.fromEntries(options.map((option) => [option.value, option.label]));
}
