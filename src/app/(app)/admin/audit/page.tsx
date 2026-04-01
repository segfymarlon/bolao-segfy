"use client";

import { useEffect, useState } from "react";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor: { name: string | null; email: string } | null;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load(p = 1) {
    setLoading(true);
    const res = await fetch(`/api/admin/audit-logs?page=${p}&limit=50`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }

  useEffect(() => { load(page); }, [page]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Auditoria</h1>
        <span className="text-sm text-gray-400">{total} registros</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-8 text-center text-gray-400">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-gray-400">Nenhum registro de auditoria.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ação</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Entidade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Ator</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <>
                  <tr key={log.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{log.action}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 hidden sm:table-cell">
                      {log.entityType}:{log.entityId.slice(-8)}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 hidden md:table-cell">
                      {log.actor?.email ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {(log.beforeJson || log.afterJson) && (
                        <button
                          onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                          className="text-xs text-blue-500 hover:underline"
                        >
                          {expanded === log.id ? "Fechar" : "Ver"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr key={`${log.id}-detail`} className="bg-gray-50">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {log.beforeJson && (
                            <div>
                              <p className="font-semibold text-gray-500 mb-1">Antes</p>
                              <pre className="bg-white p-2 rounded border border-gray-200 overflow-auto max-h-32 text-gray-600">
                                {JSON.stringify(log.beforeJson, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.afterJson && (
                            <div>
                              <p className="font-semibold text-gray-500 mb-1">Depois</p>
                              <pre className="bg-white p-2 rounded border border-gray-200 overflow-auto max-h-32 text-gray-600">
                                {JSON.stringify(log.afterJson, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 50 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-500">
            Página {page} de {Math.ceil(total / 50)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page * 50 >= total}
            className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
