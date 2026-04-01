"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"link" | "otp">("link");
  const [step, setStep] = useState<"email" | "otp" | "sent">("email");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const appName = "Bolão Copa 2026";

  async function handleRequestAccess() {
    setLoading(true);
    setError("");
    try {
      const endpoint =
        mode === "link" ? "/api/auth/request-link" : "/api/auth/request-otp";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Erro ao enviar");
      setStep(mode === "otp" ? "otp" : "sent");
    } catch {
      setError("Não foi possível enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: otp, type: "otp" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Código inválido");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl">⚽</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{appName}</h1>
          <p className="text-gray-500 mt-1">Copa do Mundo FIFA 2026</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {step === "email" && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Entrar</h2>
              <p className="text-gray-500 text-sm mb-6">
                Digite seu e-mail corporativo para receber o acesso.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRequestAccess()}
                    placeholder="seu@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setMode("link")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      mode === "link"
                        ? "bg-green-50 border-green-500 text-green-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Link mágico
                  </button>
                  <button
                    onClick={() => setMode("otp")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      mode === "otp"
                        ? "bg-green-50 border-green-500 text-green-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Código por e-mail
                  </button>
                </div>

                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}

                <button
                  onClick={handleRequestAccess}
                  disabled={!email || loading}
                  className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Enviando..." : "Continuar"}
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center mt-4">
                Acesso restrito a convidados da empresa.
              </p>
            </>
          )}

          {step === "sent" && (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">📧</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Verifique seu e-mail
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Se o e-mail <strong>{email}</strong> estiver cadastrado, você
                receberá um link de acesso em instantes.
              </p>
              <button
                onClick={() => {
                  setStep("email");
                  setError("");
                }}
                className="text-green-600 text-sm hover:underline"
              >
                Usar outro e-mail
              </button>
            </div>
          )}

          {step === "otp" && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Digite o código
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Enviamos um código de 6 dígitos para <strong>{email}</strong>.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
                    placeholder="000000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                    maxLength={6}
                  />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                  onClick={handleVerifyOTP}
                  disabled={otp.length !== 6 || loading}
                  className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Verificando..." : "Entrar"}
                </button>

                <button
                  onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                  className="w-full text-gray-500 text-sm hover:text-gray-700"
                >
                  Voltar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
