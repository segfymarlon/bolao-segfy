import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStageLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ScoresPage() {
  const session = await getSession();
  if (!session) return null;

  const events = await prisma.scoreEvent.findMany({
    where: { userId: session.id },
    include: {
      match: {
        include: {
          stage: true,
          homeTeam: true,
          awayTeam: true,
          result: true,
        },
      },
      prediction: true,
    },
    orderBy: { match: { kickoffAt: "asc" } },
  });

  const total = events.reduce((sum, e) => sum + e.pointsTotal, 0);
  const exactCount = events.filter((e) => (e.explanationJson as any)?.exactScore).length;
  const correctCount = events.filter((e) => (e.explanationJson as any)?.correctResult).length;

  // Group by stage
  const grouped = new Map<string, typeof events>();
  for (const event of events) {
    const key = event.match.stage.code;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(event);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Minha Pontuação</h1>
        <p className="text-gray-500 text-sm mt-1">Memória de cálculo de cada jogo pontuado.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500 mt-1">Pontos totais</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{exactCount}</p>
          <p className="text-xs text-gray-500 mt-1">Placares exatos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{correctCount}</p>
          <p className="text-xs text-gray-500 mt-1">Resultados certos</p>
        </div>
      </div>

      {events.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p>Sua pontuação aparecerá aqui após os resultados serem publicados.</p>
        </div>
      )}

      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([stageCode, stageEvents]) => {
          const stageTotal = stageEvents.reduce((s, e) => s + e.pointsTotal, 0);
          return (
            <div key={stageCode}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  {getStageLabel(stageCode)}
                </h2>
                <span className="text-sm font-semibold text-gray-700">{stageTotal} pts</span>
              </div>
              <div className="space-y-2">
                {stageEvents.map((event) => {
                  const explanation = event.explanationJson as any;
                  const match = event.match;
                  const pred = event.prediction;
                  const result = match.result;
                  const home = match.homeTeam?.name ?? "Casa";
                  const away = match.awayTeam?.name ?? "Fora";

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "bg-white rounded-xl border p-4",
                        event.pointsTotal > 0 ? "border-gray-200" : "border-gray-100 opacity-70"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">
                            {home} × {away}
                          </p>
                          {result && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Resultado: <strong>{result.homeGoalsFt} × {result.awayGoalsFt}</strong>
                              {" · "}
                              Seu palpite: <strong>{pred.homeGoalsPred} × {pred.awayGoalsPred}</strong>
                            </p>
                          )}
                          <div className="mt-2 space-y-0.5">
                            {explanation?.breakdown?.map((line: string, i: number) => (
                              <p key={i} className="text-xs text-gray-500">{line}</p>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={cn(
                            "text-xl font-bold",
                            event.pointsTotal >= 10 ? "text-green-600" :
                            event.pointsTotal >= 5 ? "text-blue-600" :
                            event.pointsTotal > 0 ? "text-gray-700" : "text-gray-400"
                          )}>
                            {event.pointsTotal}
                          </span>
                          <p className="text-xs text-gray-400">pts</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
