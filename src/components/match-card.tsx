"use client";

import { useState } from "react";
import { formatTime, formatDate, isMatchLocked, getStageLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  fifaCode: string;
  flagUrl: string | null;
  isPlaceholder: boolean;
  placeholderKey: string | null;
}

interface Stage {
  code: string;
  name: string;
  type: string;
}

interface Prediction {
  id: string;
  homeGoalsPred: number;
  awayGoalsPred: number;
  qualifiedTeamId: string | null;
  status: string;
  updatedAt: Date | string;
}

interface MatchResult {
  homeGoalsFt: number;
  awayGoalsFt: number;
  qualifiedTeamId: string | null;
}

interface Match {
  id: string;
  kickoffAt: Date | string;
  venue: string | null;
  status: string;
  groupCode: string | null;
  stage: Stage;
  homeTeam: Team | null;
  awayTeam: Team | null;
  result: MatchResult | null;
}

interface MatchCardProps {
  match: Match;
  prediction: Prediction | null;
  userId: string;
}

function TeamDisplay({ team }: { team: Team | null }) {
  if (!team) return <span className="text-gray-400 text-sm">A definir</span>;
  return (
    <div className="flex items-center gap-2">
      {team.flagUrl ? (
        <img src={team.flagUrl} alt={team.fifaCode} className="w-6 h-4 object-cover rounded-sm" />
      ) : (
        <div className="w-6 h-4 bg-gray-200 rounded-sm flex items-center justify-center text-xs">
          {team.fifaCode.slice(0, 2)}
        </div>
      )}
      <span className="font-medium text-gray-900 text-sm">{team.isPlaceholder ? (team.placeholderKey ?? team.name) : team.name}</span>
    </div>
  );
}

export function MatchCard({ match, prediction: initialPrediction, userId }: MatchCardProps) {
  const [prediction, setPrediction] = useState(initialPrediction);
  const [homeGoals, setHomeGoals] = useState(initialPrediction?.homeGoalsPred?.toString() ?? "");
  const [awayGoals, setAwayGoals] = useState(initialPrediction?.awayGoalsPred?.toString() ?? "");
  const [qualifiedTeamId, setQualifiedTeamId] = useState(initialPrediction?.qualifiedTeamId ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(!initialPrediction);

  const locked = isMatchLocked(match.kickoffAt);
  const isKnockout = match.stage.type === "KNOCKOUT";
  const hasResult = !!match.result;

  async function handleSave() {
    if (homeGoals === "" || awayGoals === "") return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/matches/${match.id}/prediction`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeGoalsPred: Number(homeGoals),
          awayGoalsPred: Number(awayGoals),
          qualifiedTeamId: qualifiedTeamId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao salvar");
      }
      const data = await res.json();
      setPrediction(data.prediction);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  const statusColors: Record<string, string> = {
    SCHEDULED: "bg-blue-50 text-blue-600",
    LIVE: "bg-red-50 text-red-600",
    FINISHED: "bg-gray-100 text-gray-600",
    POSTPONED: "bg-amber-50 text-amber-600",
    CANCELLED: "bg-gray-100 text-gray-500",
  };

  const statusLabels: Record<string, string> = {
    SCHEDULED: locked ? "Encerrado" : "Aberto",
    LIVE: "Ao vivo",
    FINISHED: "Encerrado",
    POSTPONED: "Adiado",
    CANCELLED: "Cancelado",
  };

  return (
    <div className={cn(
      "bg-white rounded-xl border p-4 transition-all",
      locked ? "border-gray-200" : "border-green-200 shadow-sm"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {getStageLabel(match.stage.code)}
            {match.groupCode ? ` · Grupo ${match.groupCode}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {formatDate(match.kickoffAt)} · {formatTime(match.kickoffAt)}
            {match.venue ? ` · ${match.venue}` : ""}
          </span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[match.status] ?? statusColors.SCHEDULED)}>
            {statusLabels[match.status] ?? match.status}
          </span>
        </div>
      </div>

      {/* Teams + Score */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <TeamDisplay team={match.homeTeam} />
        </div>

        {/* Result or input */}
        {hasResult ? (
          <div className="flex items-center gap-2 text-center">
            <span className="text-xl font-bold text-gray-900">
              {match.result!.homeGoalsFt}
            </span>
            <span className="text-gray-400">×</span>
            <span className="text-xl font-bold text-gray-900">
              {match.result!.awayGoalsFt}
            </span>
          </div>
        ) : locked ? (
          <div className="text-gray-400 text-sm font-medium px-2">vs</div>
        ) : editing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="99"
              value={homeGoals}
              onChange={(e) => setHomeGoals(e.target.value)}
              className="w-12 h-10 text-center border border-gray-300 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <span className="text-gray-400">×</span>
            <input
              type="number"
              min="0"
              max="99"
              value={awayGoals}
              onChange={(e) => setAwayGoals(e.target.value)}
              className="w-12 h-10 text-center border border-gray-300 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        ) : (
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => !locked && setEditing(true)}
          >
            {prediction ? (
              <>
                <span className="text-lg font-bold text-green-700">{prediction.homeGoalsPred}</span>
                <span className="text-gray-400">×</span>
                <span className="text-lg font-bold text-green-700">{prediction.awayGoalsPred}</span>
              </>
            ) : (
              <span className="text-sm text-gray-400 border border-dashed border-gray-300 px-3 py-1 rounded-lg">
                + palpitar
              </span>
            )}
          </div>
        )}

        <div className="flex-1 flex justify-end">
          <TeamDisplay team={match.awayTeam} />
        </div>
      </div>

      {/* Knockout qualified field */}
      {isKnockout && !locked && editing && match.homeTeam && match.awayTeam && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <label className="block text-xs text-gray-500 mb-1.5">Classificado (opcional)</label>
          <div className="flex gap-2">
            <button
              onClick={() => setQualifiedTeamId(match.homeTeam!.id)}
              className={cn(
                "flex-1 py-1.5 px-2 text-xs rounded-lg border font-medium transition-colors",
                qualifiedTeamId === match.homeTeam.id
                  ? "bg-green-50 border-green-500 text-green-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {match.homeTeam.name}
            </button>
            <button
              onClick={() => setQualifiedTeamId(match.awayTeam!.id)}
              className={cn(
                "flex-1 py-1.5 px-2 text-xs rounded-lg border font-medium transition-colors",
                qualifiedTeamId === match.awayTeam.id
                  ? "bg-green-50 border-green-500 text-green-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {match.awayTeam.name}
            </button>
            {qualifiedTeamId && (
              <button
                onClick={() => setQualifiedTeamId("")}
                className="text-xs text-gray-400 hover:text-gray-600 px-2"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {!locked && editing && (
        <div className="mt-3 flex items-center gap-2">
          {error && <p className="text-red-500 text-xs flex-1">{error}</p>}
          {!error && <div className="flex-1" />}
          {prediction && (
            <button
              onClick={() => { setEditing(false); setHomeGoals(prediction.homeGoalsPred.toString()); setAwayGoals(prediction.awayGoalsPred.toString()); }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={homeGoals === "" || awayGoals === "" || saving}
            className="bg-green-600 text-white text-xs px-4 py-1.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Salvando..." : saved ? "Salvo ✓" : "Salvar"}
          </button>
        </div>
      )}

      {/* Prediction display when locked */}
      {locked && prediction && !hasResult && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-center">
          <span className="text-xs text-gray-500">
            Seu palpite: <strong className="text-gray-700">{prediction.homeGoalsPred} × {prediction.awayGoalsPred}</strong>
            {prediction.qualifiedTeamId && " (classificado indicado)"}
          </span>
        </div>
      )}

      {/* Score comparison when result exists */}
      {hasResult && prediction && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-center">
          <span className="text-xs text-gray-500">
            Seu palpite: <strong>{prediction.homeGoalsPred} × {prediction.awayGoalsPred}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
