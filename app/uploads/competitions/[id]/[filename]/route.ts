import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Context = { params: { id: string; filename: string } };

const contentTypes: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  txt: "text/plain; charset=utf-8",
};

export async function GET(_request: NextRequest, { params }: Context) {
  const filename = params.filename;
  if (path.basename(filename) !== filename) return NextResponse.json({ message: "文件不存在" }, { status: 404 });
  const base = path.resolve(process.cwd(), "public", "uploads", "competitions", params.id);
  const diskPath = path.resolve(base, filename);
  if (!diskPath.startsWith(`${base}${path.sep}`)) return NextResponse.json({ message: "文件不存在" }, { status: 404 });
  try {
    const data = await readFile(diskPath);
    const extension = filename.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentTypes[extension] ?? "application/octet-stream",
        "Content-Length": String(data.length),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json({ message: "文件不存在" }, { status: 404 });
  }
}
