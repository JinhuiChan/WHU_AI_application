import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function apiError(status: number, message: string) {
  return NextResponse.json({ code: status, message, data: null }, { status });
}

function inPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((item) => pathname === item || pathname.startsWith(`${item}/`));
}

function denyPage(request: NextRequest, message: string) {
  // 页面级拒绝统一渲染 /forbidden，避免用户看到一行裸文本、也没有返回入口
  const url = new URL("/forbidden", request.url);
  url.searchParams.set("reason", message);
  return NextResponse.rewrite(url);
}

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminApiPath(pathname: string) {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/api/auth/login" || pathname === "/api/auth/register" || pathname === "/api/health" || pathname.startsWith("/uploads/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (pathname === "/login" || pathname === "/register") {
    // 不在这里根据 JWT 判断“已登录”：JWT 可能对应已删除/重建的账号，
    // 若此处强制跳 /dashboard，会与页面内的 getActiveUser() 校验形成死循环。
    // 登录页会自行校验有效会话并决定是否跳转。
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

  const roles = session.roles;
  const isAdmin = roles.includes("ADMIN");

  // 管理类路由与接口：仅 ADMIN
  if (isAdminApiPath(pathname) && !isAdmin) {
    return apiError(403, "无权限访问管理接口");
  }
  if (isAdminPath(pathname) && !isAdmin) {
    return denyPage(request, "无权限访问该页面");
  }
  if (
    inPrefix(pathname, ["/settings", "/review", "/import", "/api/settings", "/api/review", "/api/import"]) &&
    !isAdmin
  ) {
    return pathname.startsWith("/api/") ? apiError(403, "无权限访问管理接口") : denyPage(request, "无权限访问该页面");
  }

  // 学生侧：仅 STUDENT（ADMIN 可代看/代操作）
  if (inPrefix(pathname, ["/apply", "/my", "/api/apply", "/api/my"]) && !(roles.includes("STUDENT") || isAdmin)) {
    return pathname.startsWith("/api/") ? apiError(403, "该接口仅参赛学生可调用") : denyPage(request, "该页面仅参赛学生可访问");
  }

  // 教师侧：仅 TEACHER（ADMIN 可代看）
  if (inPrefix(pathname, ["/teacher", "/api/teacher"]) && !(roles.includes("TEACHER") || isAdmin)) {
    return pathname.startsWith("/api/") ? apiError(403, "该接口仅指导教师可调用") : denyPage(request, "该页面仅指导教师可访问");
  }

  // 只读角色（财务/审计）不得执行写操作
  if (!isAdmin && roles.includes("FINANCE") && pathname.startsWith("/api/") && writeMethods.has(request.method)) {
    return apiError(403, "只读角色不可执行写操作");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
