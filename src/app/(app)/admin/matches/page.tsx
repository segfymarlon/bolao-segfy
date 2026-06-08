"use client";

import { useEffect, useState } from "react";
import { formatDateTime, getStageLabel, getMatchStatusLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  fifaCode: string;
  groupCode: string | null;
}

interface Stage {
  id: string;
  code: string;
  name: string;
}

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

interface CreateForm {
  stageId: string;
  groupCode: string;
  matchNumber: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: string;
  venue: string;
}

const EMPTY_CREATE: CreateForm = {
  stageId: "",
  groupCode: "",
  matchNumber: "",
  homeTeamId: "",
  awayTeamId: "",
  kickoffAt: "",
  venue: "",
};

export default function MatchesAdminPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"ok" | "err">("ok");

  // Result modal
  const [resultMatchId, setResultMatchId] = useState<string | null>(null);
  const [resultForm, setResultForm] = useState<ResultForm>({
    homeGoalsFt: "", awayGoalsFt: "", penaltiesHome: "", penaltiesAway: "", qualifiedTeamId: "",
  });
  const [submittingResult, setSubmittingResult] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  function notify(msg: string, type: "ok" | "err" = "ok") {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  }

  async function load() {
    setLoading(true);
    const [matchRes, stageRes, teamRes] = await Promise.all([
      fetch("/api/admin/matches"),
      fetch("/api/admin/stages"),
      fetch("/api/admin/teams"),
    ]);
    const [matchData, stageData, teamData] = await Promise.all([
      matchRes.json(), stageRes.json(), teamRes.json(),
    ]);
    setMatches(matchData.matches ?? []);
    setStages(stageData.stages ?? []);
    const raw: Team[] = teamData.teams ?? [];
    setTeams([...raw].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const selectedMatch = matches.find((m) => m.id === resultMatchId);

  async function handleSubmitResult() {
    if (!resultMatchId) return;
    setSubmittingResult(true);
    try {
      const body: Record<string, unknown> = {
        homeGoalsFt: Number(resultForm.homeGoalsFt),
        awayGoalsFt: Number(resultForm.awayGoalsFt),
      };
      if (resultForm.penaltiesHome) body.penaltiesHome = Number(resultForm.penaltiesHome);
      if (resultForm.penaltiesAway) body.penaltiesAway = Number(resultForm.penaltiesAway);
      if (resultForm.qualifiedTeamId) body.qualifiedTeamId = resultForm.qualifiedTeamId;

      const res = await fetch(`/api/admin/matches/${resultMatchId}/result`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erro ao publicar resultado");
      notify("Resultado publicado e pontuação calculada!");
      setResultMatchId(null);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro", "err");
    } finally {
      setSubmittingResult(false);
    }
  }

  async function handleRecalculate(matchId: string) {
    const res = await fetch("/api/admin/recalculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
    const data = await res.json();
    notify(`Reprocessado: ${data.totalScored} palpites recalculados.`);
  }

  async function handleReset(matchId: string, matchLabel: string) {
    if (!confirm(`Tem certeza que deseja resetar "${matchLabel}"?\n\nTodos os palpites e pontuações desta partida serão apagados permanentemente.`)) return;
    const res = await fetch(`/api/admin/matches/${matchId}/reset`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      notify(`Erro ao resetar: ${data.error}`, "err");
    } else {
      notify(`Resetado: ${data.deletedPredictions} palpites e ${data.deletedScoreEvents} pontuações removidos.`);
      load();
    }
  }

  async function handleDelete(matchId: string, matchLabel: string) {
    if (!confirm(`Excluir permanentemente "${matchLabel}"?`)) return;
    const res = await fetch(`/api/admin/matches/${matchId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      notify(data.error ?? "Erro ao excluir", "err");
    } else {
      notify("Partida excluída.");
      load();
    }
  }

  async function handleDeleteAll() {
    if (!confirm(`Excluir TODAS as partidas?\n\nIsso apagará permanentemente todas as partidas, palpites e pontuações do banco. Esta ação não pode ser desfeita.`)) return;
    setDeletingAll(true);
    const res = await fetch("/api/admin/matches", { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      notify(data.error ?? "Erro ao excluir", "err");
    } else {
      notify(`${data.deletedCount} partida(s) excluída(s) com sucesso.`);
      load();
    }
    setDeletingAll(false);
  }

  async function handleCreate() {
    if (!createForm.stageId || !createForm.kickoffAt || !createForm.matchNumber) return;
    setSubmittingCreate(true);
    try {
      const body: Record<string, unknown> = {
        stageId: createForm.stageId,
        matchNumber: Number(createForm.matchNumber),
        kickoffAt: new Date(createForm.kickoffAt).toISOString(),
      };
      if (createForm.groupCode) body.groupCode = createForm.groupCode;
      if (createForm.homeTeamId) body.homeTeamId = createForm.homeTeamId;
      if (createForm.awayTeamId) body.awayTeamId = createForm.awayTeamId;
      if (createForm.venue) body.venue = createForm.venue;

      const res = await fetch("/api/admin/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar");
      notify("Partida criada com sucesso!");
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro", "err");
    } finally {
      setSubmittingCreate(false);
    }
  }

  const statusColors: Record<string, string> = {
    SCHEDULED: "bg-blue-50 text-blue-700",
    LIVE: "bg-red-50 text-red-700",
    FINISHED: "bg-gray-100 text-gray-600",
    POSTPONED: "bg-yellow-50 text-yellow-700",
    CANCELLED: "bg-gray-100 text-gray-400",
  };

  const grouped = new Map<string, Match[]>();
  for (const match of matches) {
    const k = match.stage.code;
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(match);
  }

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Partidas</h1>
        <div className="flex items-center gap-3">
          {message && (
            <p className={cn("text-sm", messageType === "err" ? "text-red-600" : "text-green-600")}>
              {message}
            </p>
          )}
          <button
            onClick={handleDeleteAll}
            disabled={deletingAll || matches.length === 0}
            className="text-sm px-4 py-2 rounded-lg font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            {deletingAll ? "Excluindo..." : "Excluir Todas"}
          </button>
          <button
            onClick={() => { setShowCreate(true); setCreateForm(EMPTY_CREATE); }}
            className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            + Nova Partida
          </button>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Nova Partida</h2>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fase *</label>
                  <select
                    value={createForm.stageId}
                    onChange={(e) => setCreateForm({ ...createForm, stageId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Selecione...</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nº da partida *</label>
                  <input
                    type="number" min="1"
                    value={createForm.matchNumber}
                    onChange={(e) => setCreateForm({ ...createForm, matchNumber: e.target.value })}
                    className={inputCls}
                    placeholder="ex: 73"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Data e hora *</label>
                <input
                  type="datetime-local"
                  value={createForm.kickoffAt}
                  onChange={(e) => setCreateForm({ ...createForm, kickoffAt: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Time da casa</label>
                  <select
                    value={createForm.homeTeamId}
                    onChange={(e) => setCreateForm({ ...createForm, homeTeamId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">A definir</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.fifaCode})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Time visitante</label>
                  <select
                    value={createForm.awayTeamId}
                    onChange={(e) => setCreateForm({ ...createForm, awayTeamId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">A definir</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.fifaCode})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Grupo (ex: A)</label>
                  <input
                    type="text" maxLength={2}
                    value={createForm.groupCode}
                    onChange={(e) => setCreateForm({ ...createForm, groupCode: e.target.value.toUpperCase() })}
                    className={inputCls}
                    placeholder="A–L"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Estádio</label>
                  <input
                    type="text"
                    value={createForm.venue}
                    onChange={(e) => setCreateForm({ ...createForm, venue: e.target.value })}
                    className={inputCls}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!createForm.stageId || !createForm.kickoffAt || !createForm.matchNumber || submittingCreate}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {submittingCreate ? "Criando..." : "Criar Partida"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                    value={resultForm.homeGoalsFt}
                    onChange={(e) => setResultForm({ ...resultForm, homeGoalsFt: e.target.value })}
                    className="w-16 h-10 text-center border border-gray-300 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                  <span className="text-gray-400">×</span>
                  <input
                    type="number" min="0" max="99"
                    value={resultForm.awayGoalsFt}
                    onChange={(e) => setResultForm({ ...resultForm, awayGoalsFt: e.target.value })}
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
                        value={resultForm.penaltiesHome}
                        onChange={(e) => setResultForm({ ...resultForm, penaltiesHome: e.target.value })}
                        className="w-16 h-9 text-center border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="—"
                      />
                      <span className="text-gray-400 text-xs">×</span>
                      <input
                        type="number" min="0"
                        value={resultForm.penaltiesAway}
                        onChange={(e) => setResultForm({ ...resultForm, penaltiesAway: e.target.value })}
                        className="w-16 h-9 text-center border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="—"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">ID do time classificado</label>
                    <input
                      type="text"
                      value={resultForm.qualifiedTeamId}
                      onChange={(e) => setResultForm({ ...resultForm, qualifiedTeamId: e.target.value })}
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
                disabled={resultForm.homeGoalsFt === "" || resultForm.awayGoalsFt === "" || submittingResult}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {submittingResult ? "Salvando..." : "Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>Nenhuma partida cadastrada.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 text-green-600 text-sm hover:underline"
          >
            Criar primeira partida
          </button>
        </div>
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
                    {stageMatches.map((match) => {
                      const matchLabel = `${match.homeTeam?.name ?? "?"} × ${match.awayTeam?.name ?? "?"}`;
                      return (
                        <tr key={match.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-400">{match.matchNumber}</td>
                          <td className="px-4 py-2">
                            <p className="font-medium text-gray-900">{matchLabel}</p>
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
                                  setResultForm({
                                    homeGoalsFt: match.result?.homeGoalsFt?.toString() ?? "",
                                    awayGoalsFt: match.result?.awayGoalsFt?.toString() ?? "",
                                    penaltiesHome: "",
                                    penaltiesAway: "",
                                    qualifiedTeamId: "",
                                  });
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
                                onClick={() => handleReset(match.id, matchLabel)}
                                className="text-xs text-orange-400 hover:text-orange-600 hover:underline"
                              >
                                Reset
                              </button>
                              <button
                                onClick={() => handleDelete(match.id, matchLabel)}
                                className="text-xs text-red-400 hover:text-red-600 hover:underline"
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
