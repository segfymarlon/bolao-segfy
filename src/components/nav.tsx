"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavProps {
  user: { name?: string | null; email: string; role: string };
}

const navItems = [
  { href: "/", label: "Jogos" },
  { href: "/ranking", label: "Ranking" },
  { href: "/scores", label: "Minha Pontuação" },
  { href: "/regulamento", label: "Regulamento" },
];

export function Nav({ user }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            <span className="text-green-600 text-lg mr-2">⚽</span>
            <span className="font-bold text-gray-900 text-sm hidden sm:block">
              Bolão Copa 2026
            </span>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-green-50 text-green-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                {item.label}
              </Link>
            ))}
            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-amber-50 text-amber-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 hidden sm:block truncate max-w-[120px]">
              {user.name ?? user.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-50"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
