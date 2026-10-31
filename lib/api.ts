import { NextResponse } from "next/server";

export function apiSuccess<T>(data: T, message = "操作成功", status = 200) {
  return NextResponse.json({ code: 0, message, data }, { status });
}

export function apiError(status: number, message: string, data: unknown = null) {
  return NextResponse.json({ code: status, message, data }, { status });
}
