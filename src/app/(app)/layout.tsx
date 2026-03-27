export const dynamic = "force-dynamic";

import { AuthGuard } from "@/modules/auth/components/AuthGuard";
import { Sidebar } from "@/modules/shared/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </AuthGuard>
  );
}
