import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth.server";
import { attachmentDisposition } from "@/lib/download";
import { writeExportRecord } from "@/lib/export-record";
import { createPackageStream, packageFileName, PackageError, prepareSealedPackage } from "@/lib/package-export";
import { parseReviewQuery } from "@/lib/review";

export const runtime = "nodejs";

const filterKeys = ["competitionId", "stage", "college", "status", "trackId", "q"] as const;

export async function POST(request: NextRequest) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const params = new URLSearchParams();
    for (const key of filterKeys) {
      const value = body[key];
      if (typeof value === "string" && value.trim()) params.set(key, value.trim());
    }
    const filters = parseReviewQuery(params);
    const prepared = await prepareSealedPackage(filters);
    const fileName = packageFileName(prepared.entries);
    await writeExportRecord({
      exporterId: authorization.user.id,
      type: "PACKAGE",
      fields: ["赛事", "阶段", "学院", "项目名", "队长", "版本号", "盖章件"],
      rowCount: prepared.entries.length,
      fileName,
      filters: {
        ...Object.fromEntries(params),
        projectCount: prepared.projectCount,
        skippedProjects: prepared.skippedProjects,
        totalBytes: prepared.totalBytes,
      },
    });
    return new NextResponse(createPackageStream(prepared.entries), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": attachmentDisposition(fileName, "sealed-package.zip"),
        "Cache-Control": "no-store",
        "X-Packaged-Count": String(prepared.entries.length),
        "X-Skipped-Count": String(prepared.skippedProjects),
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof PackageError) return apiError(error.status, error.message);
    console.error("打包盖章件失败：", error instanceof Error ? error.message : error);
    return apiError(500, "打包盖章件失败");
  }
}
