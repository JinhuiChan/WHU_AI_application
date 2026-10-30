import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function apiError(status: number, message: string) {
  return NextResponse.json({ code: status, message, data: null }, { status });
}

function inPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((item) => pathname === item || pathname.startsWith(`${item}/`));
}

function denyPage(message: string) {
  return new NextResponse(message, {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminApiPath(pathname: string) {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/api/auth/login" || pathname === "/api/auth/register") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (pathname === "/login" || pathname === "/register") {
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

  const role = session.role;
  const isAdmin = role === "ADMIN";

  // 管理类路由与接口：仅 ADMIN
  if (isAdminApiPath(pathname) && !isAdmin) {
    return apiError(403, "无权限访问管理接口");
  }
  if (isAdminPath(pathname) && !isAdmin) {
    return denyPage("无权限访问该页面");
  }
  if (
    inPrefix(pathname, ["/settings", "/review", "/import", "/api/settings", "/api/review", "/api/import"]) &&
    !isAdmin
  ) {
    return pathname.startsWith("/api/") ? apiError(403, "无权限访问管理接口") : denyPage("无权限访问该页面");
  }

  // 学生侧：仅 STUDENT（ADMIN 可代看/代操作）
  if (inPrefix(pathname, ["/apply", "/my", "/api/apply", "/api/my"]) && !(role === "STUDENT" || isAdmin)) {
    return pathname.startsWith("/api/") ? apiError(403, "该接口仅参赛学生可调用") : denyPage("该页面仅参赛学生可访问");
  }

  // 教师侧：仅 TEACHER（ADMIN 可代看）
  if (inPrefix(pathname, ["/teacher", "/api/teacher"]) && !(role === "TEACHER" || isAdmin)) {
    return pathname.startsWith("/api/") ? apiError(403, "该接口仅指导教师可调用") : denyPage("该页面仅指导教师可访问");
  }

  // 只读角色（财务/审计）不得执行写操作
  if (role === "FINANCE" && pathname.startsWith("/api/") && writeMethods.has(request.method)) {
    return apiError(403, "只读角色不可执行写操作");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
