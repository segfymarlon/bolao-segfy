import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { cn } from "@/lib/utils";

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/invitations", label: "Convites" },
  { href: "/admin/matches", label: "Partidas" },
  { href: "/admin/ruleset", label: "Regulamento" },
  { href: "/admin/audit", label: "Auditoria" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  return (
    <div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-1 mb-6 flex gap-1 overflow-x-auto">
        {adminNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-100 whitespace-nowrap transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
