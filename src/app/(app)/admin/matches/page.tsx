"use client";

import { useEffect, useState } from "react";
import { formatDateTime, getStageLabel, getMatchStatusLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Match {
  id: string;
  matchNumber: number;
  kickoffAt: string;
  venue: string | null;
  status: string;
  groupCode: string | null;
  stage: { code: string; name: string };
  homeTeam: { name: string; fifaCode: string } | null;
  awayTeam: { name: string; fifaCode: string } | null;
  result: { homeGoalsFt: number; awayGoalsFt: number } | null;
  _count: { predictions: number };
}

interface ResultForm {
  homeGoalsFt: string;
  awayGoalsFt: string;
  penaltiesHome: string;
  penaltiesAway: string;
  qualifiedTeamId: string;
}

export default function MatchesAdminPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultMatchId, setResultMatchId] = useState<string | null>(null);
  const [form, setForm] = useState<ResultForm>({
    homeGoalsFt: "",
    awayGoalsFt: "",
    penaltiesHome: "",
    penaltiesAway: "",
    qualifiedTeamId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/matches");
    const data = await res.json();
    setMatches(data.matches ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const selectedMatch = matches.find((m) => m.id === resultMatchId);

  async function handleSubmitResult() {
    if (!resultMatchId) return;
    setSubmitting(true);
    setMessage("");
    try {
      const body: Record<string, unknown> = {
        homeGoalsFt: Number(form.homeGoalsFt),
        awayGoalsFt: Number(form.awayGoalsFt),
      };
      if (form.penaltiesHome) body.penaltiesHome = Number(form.penaltiesHome);
      if (form.penaltiesAway) body.penaltiesAway = Number(form.penaltiesAway);
      if (form.qualifiedTeamId) body.qualifiedTeamId = form.qualifiedTeamId;

      const res = await fetch(`/api/admin/matches/${resultMatchId}/result`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erro ao publicar resultado");
      setMessage("Resultado publicado e pontuação calculada!");
      setResultMatchId(null);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecalculate(matchId: string) {
    const res = await fetch("/api/admin/recalculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
    const data = await res.json();
    setMessage(`Reprocessado: ${data.totalScored} palpites recalculados.`);
  }

  async function handleReset(matchId: string, matchLabel: string) {
    if (!confirm(`Tem certeza que deseja resetar "${matchLabel}"?\n\nTodos os palpites e pontuações desta partida serão apagados permanentemente.`)) return;
    const res = await fetch(`/api/admin/matches/${matchId}/reset`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setMessage(`Erro ao resetar: ${data.error}`);
    } else {
      setMessage(`Resetado: ${data.deletedPredictions} palpites e ${data.deletedScoreEvents} pontuações removidos.`);
      load();
    }
  }

  const statusColors: Record<string, string> = {
    SCHEDULED: "bg-blue-50 text-blue-700",
    LIVE: "bg-red-50 text-red-700",
    FINISHED: "bg-gray-100 text-gray-600",
    POSTPONED: "bg-yellow-50 text-yellow-700",
    CANCELLED: "bg-gray-100 text-gray-400",
  };

  // Group by stage
  const grouped = new Map<string, Match[]>();
  for (const match of matches) {
    const k = match.stage.code;
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(match);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Partidas</h1>
        {message && (
          <p className="text-sm text-green-600">{message}</p>
        )}
      </div>

      {/* Result modal */}
      {resultMatchId && selectedMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Publicar Resultado</h2>
            <p className="text-sm text-gray-500 mb-4">
              {selectedMatch.homeTeam?.name} × {selectedMatch.awayTeam?.name}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Placar (tempo regulamentar)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="99"
                    value={form.homeGoalsFt}
                    onChange={(e) => setForm({ ...form, homeGoalsFt: e.target.value })}
                    className="w-16 h-10 text-center border border-gray-300 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                  <span className="text-gray-400">×</span>
                  <input
                    type="number" min="0" max="99"
                    value={form.awayGoalsFt}
                    onChange={(e) => setForm({ ...form, awayGoalsFt: e.target.value })}
                    className="w-16 h-10 text-center border border-gray-300 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {selectedMatch.stage.code !== "GROUP" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Pênaltis (se houver)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="0"
                        value={form.penaltiesHome}
                        onChange={(e) => setForm({ ...form, penaltiesHome: e.target.value })}
                        className="w-16 h-9 text-center border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="—"
                      />
                      <span className="text-gray-400 text-xs">×</span>
                      <input
                        type="number" min="0"
                        value={form.penaltiesAway}
                        onChange={(e) => setForm({ ...form, penaltiesAway: e.target.value })}
                        className="w-16 h-9 text-center border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="—"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">ID do time classificado</label>
                    <input
                      type="text"
                      value={form.qualifiedTeamId}
                      onChange={(e) => setForm({ ...form, qualifiedTeamId: e.target.value })}
                      placeholder="cuid do time..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setResultMatchId(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitResult}
                disabled={form.homeGoalsFt === "" || form.awayGoalsFt === "" || submitting}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? "Salvando..." : "Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([stageCode, stageMatches]) => (
            <div key={stageCode}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {getStageLabel(stageCode)}
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">#</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Partida</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 hidden sm:table-cell">Data</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Resultado</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500 hidden md:table-cell">Palpites</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageMatches.map((match) => (
                      <tr key={match.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-400">{match.matchNumber}</td>
                        <td className="px-4 py-2">
                          <p className="font-medium text-gray-900">
                            {match.homeTeam?.name ?? "A definir"} × {match.awayTeam?.name ?? "A definir"}
                          </p>
                          {match.groupCode && (
                            <p className="text-xs text-gray-400">Grupo {match.groupCode}</p>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500 hidden sm:table-cell">
                          {formatDateTime(match.kickoffAt)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {match.result ? (
                            <span className="font-bold text-gray-900">
                              {match.result.homeGoalsFt} × {match.result.awayGoalsFt}
                            </span>
                          ) : (
                            <span className={cn("text-xs px-2 py-0.5 rounded-full", statusColors[match.status])}>
                              {getMatchStatusLabel(match.status)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center text-gray-500 hidden md:table-cell">
                          {match._count.predictions}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setResultMatchId(match.id);
                                setForm({
                                  homeGoalsFt: match.result?.homeGoalsFt?.toString() ?? "",
                                  awayGoalsFt: match.result?.awayGoalsFt?.toString() ?? "",
                                  penaltiesHome: "",
                                  penaltiesAway: "",
                                  qualifiedTeamId: "",
                                });
                                setMessage("");
                              }}
                              className="text-xs text-green-600 hover:underline"
                            >
                              {match.result ? "Corrigir" : "Resultado"}
                            </button>
                            {match.result && (
                              <button
                                onClick={() => handleRecalculate(match.id)}
                                className="text-xs text-blue-500 hover:underline"
                              >
                                Recalc
                              </button>
                            )}
                            <button
                              onClick={() => handleReset(match.id, `${match.homeTeam?.name ?? "?"} × ${match.awayTeam?.name ?? "?"}`)}
                              className="text-xs text-red-400 hover:text-red-600 hover:underline"
                            >
                              Reset
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
