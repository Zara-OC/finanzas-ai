export const dynamic = "force-dynamic";

import { AuthGuard } from "@/modules/auth/components/AuthGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
