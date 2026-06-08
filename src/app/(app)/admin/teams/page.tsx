"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  fifaCode: string;
  groupCode: string | null;
}

const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

interface FormState { name: string; fifaCode: string; groupCode: string }
const EMPTY: FormState = { name: "", fifaCode: "", groupCode: "" };

export default function TeamsAdminPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"ok" | "err">("ok");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY);

  function notify(msg: string, type: "ok" | "err" = "ok") {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 4000);
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/teams");
    const data = await res.json();
    const raw: Team[] = data.teams ?? [];
    setTeams(raw.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!createForm.name || !createForm.fifaCode) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          fifaCode: createForm.fifaCode.trim().toUpperCase(),
          groupCode: createForm.groupCode || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar");
      notify("Seleção adicionada!");
      setShowCreate(false);
      setCreateForm(EMPTY);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro", "err");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(id: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/teams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          fifaCode: editForm.fifaCode.trim().toUpperCase(),
          groupCode: editForm.groupCode || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao atualizar");
      notify("Seleção atualizada!");
      setEditId(null);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro", "err");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir "${name}"?`)) return;
    const res = await fetch(`/api/admin/teams/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      notify(data.error ?? "Erro ao excluir", "err");
    } else {
      notify("Seleção excluída.");
      load();
    }
  }

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seleções</h1>
          <p className="text-gray-400 text-sm mt-0.5">{teams.length} cadastradas</p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <p className={cn("text-sm", messageType === "err" ? "text-red-600" : "text-green-600")}>
              {message}
            </p>
          )}
          <button
            onClick={() => { setShowCreate(true); setCreateForm(EMPTY); }}
            className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            + Nova Seleção
          </button>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Nova Seleção</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nome *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className={inputCls}
                  placeholder="ex: Escócia"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Código FIFA *</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={createForm.fifaCode}
                    onChange={(e) => setCreateForm({ ...createForm, fifaCode: e.target.value.toUpperCase() })}
                    className={inputCls}
                    placeholder="ex: SCO"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Grupo</label>
                  <select
                    value={createForm.groupCode}
                    onChange={(e) => setCreateForm({ ...createForm, groupCode: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">—</option>
                    {GROUPS.map((g) => <option key={g} value={g}>Grupo {g}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!createForm.name || !createForm.fifaCode || submitting}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? "Salvando..." : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código FIFA</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Grupo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  {editId === team.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          autoFocus
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          maxLength={4}
                          value={editForm.fifaCode}
                          onChange={(e) => setEditForm({ ...editForm, fifaCode: e.target.value.toUpperCase() })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={editForm.groupCode}
                          onChange={(e) => setEditForm({ ...editForm, groupCode: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">—</option>
                          {GROUPS.map((g) => <option key={g} value={g}>Grupo {g}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(team.id)} disabled={submitting} className="text-xs text-green-600 hover:underline disabled:opacity-50">
                            Salvar
                          </button>
                          <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:underline">
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{team.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{team.fifaCode}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {team.groupCode ? (
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-medium">
                            Grupo {team.groupCode}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditId(team.id); setEditForm({ name: team.name, fifaCode: team.fifaCode, groupCode: team.groupCode ?? "" }); }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(team.id, team.name)}
                            className="text-xs text-red-400 hover:text-red-600 hover:underline"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
