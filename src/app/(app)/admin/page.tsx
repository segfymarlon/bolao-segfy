import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session) return null;

  const [
    totalInvitations,
    acceptedInvitations,
    totalMatches,
    finishedMatches,
    totalPredictions,
    totalParticipants,
  ] = await Promise.all([
    prisma.invitation.count(),
    prisma.invitation.count({ where: { status: "ACCEPTED" } }),
    prisma.match.count({ where: { status: { notIn: ["CANCELLED"] } } }),
    prisma.match.count({ where: { status: "FINISHED" } }),
    prisma.prediction.count(),
    prisma.user.count({ where: { role: "PARTICIPANT" } }),
  ]);

  const nextMatches = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      kickoffAt: { gte: new Date() },
    },
    include: { homeTeam: true, awayTeam: true, stage: true },
    orderBy: { kickoffAt: "asc" },
    take: 5,
  });

  const stats = [
    { label: "Convidados aceitos", value: acceptedInvitations, total: totalInvitations, color: "text-green-600" },
    { label: "Partidas finalizadas", value: finishedMatches, total: totalMatches, color: "text-blue-600" },
    { label: "Palpites registrados", value: totalPredictions, color: "text-purple-600" },
    { label: "Participantes ativos", value: totalParticipants, color: "text-amber-600" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Painel Admin</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do bolão.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            {stat.total !== undefined && (
              <p className="text-xs text-gray-400">de {stat.total}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {nextMatches.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Próximas Partidas
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {nextMatches.map((match) => (
              <div key={match.id} className="px-4 py-3 flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium text-gray-900">
                    {match.homeTeam?.name ?? "A definir"} × {match.awayTeam?.name ?? "A definir"}
                  </span>
                  <span className="text-gray-400 ml-2">· {match.stage.name}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(match.kickoffAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Sao_Paulo",
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
