"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transacciones", icon: Receipt },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/settings", label: "Configuracion", icon: Settings },
];

function getInitials(name: string | undefined, email: string | undefined) {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email?.charAt(0).toUpperCase() ?? "U";
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary/10 text-primary dark:bg-primary/20"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserSection() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const displayName =
    user?.user_metadata?.full_name ?? user?.email ?? "Usuario";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = getInitials(
    user?.user_metadata?.full_name,
    user?.email ?? undefined
  );

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="border-t p-3">
      <div className="flex items-center gap-3">
        <Avatar size="sm">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 truncate">
          <p className="truncate text-sm font-medium">{displayName}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleSignOut}
          title="Cerrar sesion"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="text-lg font-bold">Finanzas AI</span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav />
      </div>
      <UserSection />
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0" showCloseButton={false}>
        <SheetTitle className="sr-only">Menu de navegacion</SheetTitle>
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <span className="text-lg font-bold">Finanzas AI</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
        <UserSection />
      </SheetContent>
    </Sheet>
  );
}
