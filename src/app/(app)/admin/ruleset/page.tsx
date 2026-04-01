"use client";

import { useState } from "react";
import { DEFAULT_SCORING } from "@/lib/scoring";

export default function RulesetAdminPage() {
  const [title, setTitle] = useState("Regulamento Bolão Copa 2026");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [activate, setActivate] = useState(true);
  const [contentMd, setContentMd] = useState(DEFAULT_CONTENT);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    setSubmitting(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/ruleset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          contentMd,
          scoringJson: DEFAULT_SCORING,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : new Date().toISOString(),
          activate,
        }),
      });
      if (!res.ok) throw new Error("Erro ao publicar");
      setMessage("Regulamento publicado com sucesso!");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Regulamento</h1>
        <p className="text-gray-500 text-sm mt-1">Publique ou atualize o regulamento do bolão.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vigente a partir de</label>
          <input
            type="datetime-local"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo (Markdown)</label>
          <textarea
            value={contentMd}
            onChange={(e) => setContentMd(e.target.value)}
            rows={20}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="activate"
            checked={activate}
            onChange={(e) => setActivate(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="activate" className="text-sm text-gray-700">
            Ativar imediatamente (desativa versões anteriores)
          </label>
        </div>

        {message && (
          <p className={`text-sm ${message.includes("Erro") ? "text-red-600" : "text-green-600"}`}>
            {message}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || !title || !contentMd}
          className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Publicando..." : "Publicar Regulamento"}
        </button>
      </div>
    </div>
  );
}

const DEFAULT_CONTENT = `# Regulamento — Bolão Copa do Mundo FIFA 2026

## Participação

Este bolão é privado e destinado exclusivamente a colaboradores convidados pela empresa. O acesso é por e-mail, sem necessidade de senha.

## Palpites

- Cada participante pode palpitar o placar de qualquer partida da Copa.
- O palpite deve ser enviado **antes do início oficial da partida**.
- Após o início, o palpite é bloqueado automaticamente.
- Não é obrigatório palpitar todos os jogos.
- No mata-mata, é possível indicar também o time classificado (opcional, mas recomendado).

## Pontuação — Fase de Grupos

| Situação | Pontos |
|---|---|
| Placar exato | 10 pts |
| Saldo exato + vencedor correto (sem placar exato) | 7 pts |
| Vencedor ou empate correto (sem placar exato) | 5 pts |
| Errou resultado | 0 pts |

## Pontuação — Mata-mata

| Situação | Pontos |
|---|---|
| Placar exato no tempo regulamentar | 12 pts |
| Vencedor/empate correto no tempo regulamentar | 8 pts |
| Classificado correto (cumulativo) | +4 pts |
| Bônus Semifinal | +2 pts |
| Bônus Final | +3 pts |

## Critério de Desempate no Ranking

Em caso de empate em pontos, o desempate segue esta ordem:

1. Maior número de placares exatos
2. Maior número de acertos de resultado (vencedor/empate)
3. Maior pontuação no mata-mata
4. Maior pontuação em Semifinal + Final

## Mata-mata e Prorrogação

O palpite no mata-mata considera o **placar do tempo regulamentar (90 minutos)**. Se o jogo terminar empatado e houver decisão por prorrogação ou pênaltis, o campo "classificado" é usado para pontuação adicional.

## Transparência

Toda pontuação tem memória de cálculo disponível na área "Minha Pontuação". Qualquer correção de resultado é registrada em auditoria e a pontuação é recalculada automaticamente.
`;
