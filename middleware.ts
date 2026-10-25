import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function apiError(status: number, message: string) {
  return NextResponse.json({ code: status, message, data: null }, { status });
}

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminApiPath(pathname: string) {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/api/auth/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return apiError(401, "未登录");
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/api/auth/logout") {
    return NextResponse.next();
  }

  if (session.role === "USER") {
    if (isAdminApiPath(pathname)) {
      return apiError(403, "无权限访问管理接口");
    }
    if (isAdminPath(pathname)) {
      return new NextResponse("无权限访问该页面", {
        status: 403,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    if (pathname.startsWith("/api/") && writeMethods.has(request.method)) {
      return apiError(403, "普通用户无写操作权限");
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
