import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RegulamentoPage() {
  const session = await getSession();
  if (!session) return null;

  const ruleset = await prisma.ruleset.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });

  if (!ruleset) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">📋</p>
        <p>O regulamento ainda não foi publicado.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Regulamento</h1>
        <p className="text-gray-500 text-sm mt-1">
          Versão {ruleset.version} · Vigente desde {formatDateTime(ruleset.effectiveFrom)}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{ruleset.title}</h2>

        {/* Scoring table */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Tabela de Pontuação
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Situação</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-semibold text-gray-700">Pontos</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="px-3 py-2 border border-gray-200 text-gray-600" colSpan={2}><strong className="text-gray-800">Fase de Grupos</strong></td></tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">Placar exato</td>
                  <td className="px-3 py-2 border border-gray-200 text-right font-bold text-green-600">10 pts</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">Saldo exato + vencedor correto (sem placar exato)</td>
                  <td className="px-3 py-2 border border-gray-200 text-right font-bold text-blue-600">7 pts</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">Vencedor ou empate correto (sem placar exato)</td>
                  <td className="px-3 py-2 border border-gray-200 text-right font-bold text-gray-700">5 pts</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">Errou resultado</td>
                  <td className="px-3 py-2 border border-gray-200 text-right text-gray-400">0 pts</td>
                </tr>
                <tr><td className="px-3 py-2 border border-gray-200 text-gray-600" colSpan={2}><strong className="text-gray-800">Mata-mata</strong></td></tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">Placar exato no tempo regulamentar</td>
                  <td className="px-3 py-2 border border-gray-200 text-right font-bold text-green-600">12 pts</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">Vencedor/empate correto no tempo regulamentar</td>
                  <td className="px-3 py-2 border border-gray-200 text-right font-bold text-blue-600">8 pts</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">Classificado correto (cumulativo)</td>
                  <td className="px-3 py-2 border border-gray-200 text-right font-bold text-gray-700">+4 pts</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">Bônus Semifinal</td>
                  <td className="px-3 py-2 border border-gray-200 text-right font-bold text-amber-600">+2 pts</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">Bônus Final</td>
                  <td className="px-3 py-2 border border-gray-200 text-right font-bold text-amber-600">+3 pts</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Markdown content */}
        <div className="prose prose-sm max-w-none text-gray-600">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{ruleset.contentMd}</pre>
        </div>
      </div>
    </div>
  );
}
