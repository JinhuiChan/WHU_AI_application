import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getActiveUser } from "@/lib/auth.server";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getActiveUser();
  if (!user) {
    redirect("/login");
  }
  return <AppShell user={user}>{children}</AppShell>;
}
