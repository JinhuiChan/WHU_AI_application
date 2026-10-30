import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth.server";
import { createDatasetExport, DatasetError } from "@/lib/dataset-export";
import { attachmentDisposition } from "@/lib/download";
import { newExportWatermarkNo, writeExportRecord } from "@/lib/export-record";
import { defaultDatasetFields, normalizeDatasetFields } from "@/lib/export-fields";
import { parseReviewQuery } from "@/lib/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const filterKeys = ["competitionId", "stage", "college", "status", "trackId", "q"] as const;

function confirmation(value: unknown) {
  if (value === undefined || value === null || value === "" || value === false || value === 0 || value === "0") return false;
  if (value === true || value === 1 || value === "1") return true;
  return null;
}

async function handle(request: NextRequest, body?: Record<string, unknown>) {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization.response;
  try {
    const params = request.nextUrl.searchParams;
    if (body) {
      for (const key of filterKeys) {
        const value = body[key];
        if (typeof value === "string" && value.trim()) params.set(key, value.trim());
      }
    }
    const scope = body?.scope ?? params.get("scope") ?? (authorization.user.role === "ADMIN" ? "all" : "mine");
    if (scope !== "mine" && scope !== "all") return apiError(422, "scope 仅支持 mine 或 all");
    let inputFields: unknown;
    if (body) {
      inputFields = body.fields ?? body["fields[]"];
      if (typeof inputFields === "string") inputFields = inputFields.split(",");
    } else if (params.has("fields") || params.has("fields[]")) {
      inputFields = [...params.getAll("fields"), ...params.getAll("fields[]")]
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean);
    }
    const fields = inputFields === undefined ? defaultDatasetFields : normalizeDatasetFields(inputFields);
    if (!fields) return apiError(422, "fields 包含无效字段或为空");
    const confirmSensitive = confirmation(body?.confirmSensitive ?? params.get("confirmSensitive"));
    if (confirmSensitive === null) return apiError(422, "confirmSensitive 仅支持 0 或 1");
    const filters = parseReviewQuery(params);
    const watermarkNo = newExportWatermarkNo();
    const result = await createDatasetExport({
      ...filters,
      scope,
      fields,
      confirmSensitive,
    }, authorization.user, watermarkNo, new Date());
    const fileName = result.fileName;
    await writeExportRecord({
      exporterId: authorization.user.id,
      type: "DATASET",
      fields,
      rowCount: result.rowCount,
      fileName,
      includeSensitive: result.includeSensitive,
      filters: {
        scope,
        confirmSensitive,
        ...Object.fromEntries(params),
      },
      watermarkNo,
    });
    return new NextResponse(new Uint8Array(result.output), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": attachmentDisposition(fileName, "dataset.xlsx"),
        "Content-Length": String(result.output.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof DatasetError) return apiError(error.status, error.message);
    console.error("导出数据表失败：", error instanceof Error ? error.message : error);
    return apiError(500, "导出数据表失败");
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(422, "请求格式不正确");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return apiError(422, "请求内容不正确");
  return handle(request, body as Record<string, unknown>);
}
