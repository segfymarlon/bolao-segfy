"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const type = searchParams.get("type") as "magic_link" | "otp" | null;

    if (!token || !type) {
      setStatus("error");
      setMessage("Link inválido.");
      return;
    }

    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, type }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Token inválido");
        }
        setStatus("success");
        setTimeout(() => router.push("/"), 1000);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.message);
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {status === "loading" && (
            <>
              <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">Verificando...</h2>
            </>
          )}
          {status === "success" && (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">✓</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Acesso confirmado!</h2>
              <p className="text-gray-500 mt-2">Redirecionando...</p>
            </>
          )}
          {status === "error" && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">✗</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Link expirado</h2>
              <p className="text-gray-500 mt-2 text-sm">{message}</p>
              <a
                href="/login"
                className="mt-4 inline-block text-green-600 text-sm hover:underline"
              >
                Solicitar novo acesso
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <VerifyContent />
    </Suspense>
  );
}
