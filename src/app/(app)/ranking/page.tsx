import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const session = await getSession();
  if (!session) return null;

  // Fetch score aggregates per user
  const scoreEvents = await prisma.scoreEvent.groupBy({
    by: ["userId"],
    _sum: { pointsTotal: true },
  });

  const userIds = scoreEvents.map((e) => e.userId);

  const [users, exactCounts, resultCounts, knockoutSums, sfSums] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    }),
    prisma.scoreEvent.findMany({
      where: { userId: { in: userIds }, explanationJson: { path: ["exactScore"], equals: true } },
      select: { userId: true },
    }),
    prisma.scoreEvent.findMany({
      where: { userId: { in: userIds }, explanationJson: { path: ["correctResult"], equals: true } },
      select: { userId: true },
    }),
    prisma.scoreEvent.groupBy({
      by: ["userId"],
      where: { match: { stage: { type: "KNOCKOUT" } } },
      _sum: { pointsTotal: true },
    }),
    prisma.scoreEvent.groupBy({
      by: ["userId"],
      where: { match: { stage: { code: { in: ["SF", "FINAL", "THIRD"] } } } },
      _sum: { pointsTotal: true },
    }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const exactMap = new Map<string, number>();
  for (const e of exactCounts) exactMap.set(e.userId, (exactMap.get(e.userId) ?? 0) + 1);
  const resultMap = new Map<string, number>();
  for (const e of resultCounts) resultMap.set(e.userId, (resultMap.get(e.userId) ?? 0) + 1);
  const knockoutMap = new Map(knockoutSums.map((e) => [e.userId, e._sum.pointsTotal ?? 0]));
  const sfMap = new Map(sfSums.map((e) => [e.userId, e._sum.pointsTotal ?? 0]));

  const ranking = scoreEvents
    .map((e) => ({
      userId: e.userId,
      user: userMap.get(e.userId)!,
      totalPoints: e._sum.pointsTotal ?? 0,
      exactScores: exactMap.get(e.userId) ?? 0,
      correctResults: resultMap.get(e.userId) ?? 0,
      knockoutPoints: knockoutMap.get(e.userId) ?? 0,
      sfFinalPoints: sfMap.get(e.userId) ?? 0,
    }))
    .filter((e) => e.user)
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
      if (b.correctResults !== a.correctResults) return b.correctResults - a.correctResults;
      if (b.knockoutPoints !== a.knockoutPoints) return b.knockoutPoints - a.knockoutPoints;
      return b.sfFinalPoints - a.sfFinalPoints;
    })
    .map((e, i) => ({ ...e, position: i + 1 }));

  const myPosition = ranking.find((r) => r.userId === session.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ranking</h1>
        <p className="text-gray-500 text-sm mt-1">
          Atualizado após publicação de cada resultado.
        </p>
      </div>

      {myPosition && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-green-700 font-medium">Sua posição</p>
            <p className="text-2xl font-bold text-green-800">#{myPosition.position}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-green-700">Pontuação total</p>
            <p className="text-2xl font-bold text-green-800">{myPosition.totalPoints} pts</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-green-600">Placares exatos</p>
            <p className="text-lg font-bold text-green-700">{myPosition.exactScores}</p>
          </div>
        </div>
      )}

      {ranking.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏆</p>
          <p>O ranking será exibido após os primeiros resultados.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {ranking.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Participante</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pts</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Exatos</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Resultados</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Mata-mata</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((entry) => (
                <tr
                  key={entry.userId}
                  className={cn(
                    "border-b border-gray-100 last:border-0 transition-colors",
                    entry.userId === session.id
                      ? "bg-green-50"
                      : "hover:bg-gray-50"
                  )}
                >
                  <td className="px-4 py-3 font-bold text-gray-400">
                    {entry.position <= 3 ? (
                      <span>{entry.position === 1 ? "🥇" : entry.position === 2 ? "🥈" : "🥉"}</span>
                    ) : (
                      entry.position
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {entry.user.name ?? entry.user.email.split("@")[0]}
                      {entry.userId === session.id && (
                        <span className="ml-2 text-xs text-green-600 font-normal">(você)</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 hidden sm:block">{entry.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{entry.totalPoints}</td>
                  <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">{entry.exactScores}</td>
                  <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">{entry.correctResults}</td>
                  <td className="px-4 py-3 text-right text-gray-600 hidden lg:table-cell">{entry.knockoutPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        Desempate: placares exatos → acertos de resultado → pontos no mata-mata → pontos em SF/Final
      </p>
    </div>
  );
}
