"use client";

import { useEffect, useState } from "react";
import { getInvitationStatusLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  invitedAt: string;
  acceptedAt: string | null;
  user?: { lastLoginAt: string | null } | null;
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/invitations");
    const data = await res.json();
    setInvitations(data.invitations ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleInvite() {
    setSubmitting(true);
    setMessage("");
    try {
      const body = bulkMode
        ? { emails: bulkEmails.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean), role: "PARTICIPANT" }
        : { email, role: "PARTICIPANT" };

      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erro ao enviar convite");
      setMessage("Convite(s) enviado(s) com sucesso!");
      setEmail("");
      setBulkEmails("");
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAction(id: string, action: "revoke" | "resend") {
    const res = await fetch(`/api/admin/invitations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setMessage(action === "revoke" ? "Convite revogado." : "Convite reenviado.");
      load();
    }
  }

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-50 text-yellow-700",
    ACCEPTED: "bg-green-50 text-green-700",
    REVOKED: "bg-red-50 text-red-700",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Convites</h1>
        <span className="text-sm text-gray-400">{invitations.length} total</span>
      </div>

      {/* Invite form */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Novo Convite</h2>
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            {bulkMode ? "Individual" : "Em lote"}
          </button>
        </div>

        {bulkMode ? (
          <textarea
            value={bulkEmails}
            onChange={(e) => setBulkEmails(e.target.value)}
            placeholder={"email1@empresa.com\nemail2@empresa.com\nemail3@empresa.com"}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-3"
          />
        ) : (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            placeholder="email@empresa.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-3"
          />
        )}

        <div className="flex items-center gap-3">
          {message && (
            <p className="text-sm text-green-600 flex-1">{message}</p>
          )}
          <button
            onClick={handleInvite}
            disabled={submitting || (!email && !bulkEmails)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Enviando..." : "Enviar Convite"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-8 text-center text-gray-400">Carregando...</div>
        ) : invitations.length === 0 ? (
          <div className="py-8 text-center text-gray-400">Nenhum convite ainda.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">E-mail</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Convidado em</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Último acesso</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{inv.email}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[inv.status])}>
                      {getInvitationStatusLabel(inv.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                    {new Date(inv.invitedAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                    {inv.user?.lastLoginAt
                      ? new Date(inv.user.lastLoginAt).toLocaleString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {inv.status !== "REVOKED" && (
                        <button
                          onClick={() => handleAction(inv.id, "resend")}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Reenviar
                        </button>
                      )}
                      {inv.status !== "REVOKED" && (
                        <button
                          onClick={() => handleAction(inv.id, "revoke")}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Revogar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
