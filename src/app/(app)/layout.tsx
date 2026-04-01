import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Nav } from "@/components/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav user={session} />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
