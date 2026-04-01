import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MatchCard } from "@/components/match-card";
import { isMatchLocked } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (!session) return null;

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const matches = await prisma.match.findMany({
    where: {
      status: { notIn: ["CANCELLED"] },
      kickoffAt: { gte: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
    },
    include: {
      stage: true,
      homeTeam: true,
      awayTeam: true,
      result: true,
      predictions: {
        where: { userId: session.id },
        select: {
          id: true,
          homeGoalsPred: true,
          awayGoalsPred: true,
          qualifiedTeamId: true,
          status: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { kickoffAt: "asc" },
    take: 30,
  });

  // Group by date
  const grouped = new Map<string, typeof matches>();
  for (const match of matches) {
    const key = match.kickoffAt.toISOString().split("T")[0];
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(match);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Próximos Jogos</h1>
        <p className="text-gray-500 text-sm mt-1">
          Palpite antes do início de cada partida.
        </p>
      </div>

      {matches.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">⚽</p>
          <p>Nenhum jogo disponível no momento.</p>
        </div>
      )}

      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([date, dayMatches]) => (
          <div key={date}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h2>
            <div className="space-y-3">
              {dayMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  prediction={match.predictions[0] ?? null}
                  userId={session.id}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
