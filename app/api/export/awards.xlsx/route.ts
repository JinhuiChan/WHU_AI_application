import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { apiError } from "@/lib/api";
import { getActiveUser } from "@/lib/auth.server";
import { listAwardExportRows, parseStatisticYear } from "@/lib/dashboard";
import { awardLevelLabels, awardStatusLabels, competitionLevelLabels, evidenceTypeLabels } from "@/lib/presentation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getActiveUser();
    if (!user) return apiError(401, "未登录或账号不可用");
    const year = parseStatisticYear(request.nextUrl.searchParams.get("year"));
    if (year === null) return apiError(422, "请提供有效的 year 赛年参数");
    const rows = await listAwardExportRows(year, user.role);
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["赛年", "学院", "项目名称", "赛事名称", "赛事等级", "奖项等级", "获奖状态", "证据类型", "证据地址", "核验人", "核验时间", "记录时间"],
      ...rows.map((row) => [
        row.competition.year,
        row.project.college,
        row.project.name,
        row.competition.name,
        competitionLevelLabels[row.competition.level],
        awardLevelLabels[row.awardLevel],
        awardStatusLabels[row.status],
        evidenceTypeLabels[row.evidenceType],
        row.evidenceRef,
        row.verifier.name,
        row.verifiedAt.toISOString(),
        row.createdAt.toISOString(),
      ]),
    ]);
    worksheet["!cols"] = [10, 24, 42, 32, 12, 12, 12, 12, 52, 16, 24, 24].map((wch) => ({ wch }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "获奖汇总");
    const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const fileName = `获奖汇总-${year}.xlsx`;
    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="awards-${year}.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Content-Length": String(output.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("获奖导出接口错误：", error);
    return apiError(500, "导出获奖汇总失败");
  }
}
