import type { AwardLevel, CompetitionLevel } from "@prisma/client";

export function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function pageParams(pageValue?: string, pageSizeValue?: string) {
  const parsedPage = Number(pageValue);
  const parsedPageSize = Number(pageSizeValue);
  return {
    page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    pageSize: Number.isInteger(parsedPageSize) && parsedPageSize > 0 ? Math.min(parsedPageSize, 50) : 10,
  };
}

export function optionalYear(value?: string) {
  if (!value) return undefined;
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : undefined;
}

export function optionalText(value?: string) {
  const text = value?.trim();
  return text ? text.slice(0, 100) : undefined;
}

export function optionalCompetitionLevel(value?: string): CompetitionLevel | undefined {
  return value === "SCHOOL" || value === "PROVINCE" || value === "NATIONAL" ? value : undefined;
}

export function optionalAwardLevel(value?: string): AwardLevel | undefined {
  return value === "S" || value === "A" || value === "B" || value === "C" || value === "EXCELLENT" ? value : undefined;
}
