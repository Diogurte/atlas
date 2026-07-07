import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { session, signIn, signUp } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (session) return <Navigate to={from} replace />;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setErrorMessage("");

    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(name || email, email, password);
        setMessage("Conta criada. Se o Supabase pedir confirmação, confirma o email antes de entrar.");
        setMode("login");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível autenticar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.45em] text-cyan-400">Atlas Ecosystem</p>
          <h1 className="mt-4 text-5xl font-bold text-white">Atlas</h1>
          <p className="mt-3 text-slate-400">Entra para continuar o trabalho da empresa.</p>
        </div>

        <Card>
          <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl bg-slate-950 p-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                mode === "login" ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                mode === "register" ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              Criar conta
            </button>
          </div>

          {message && (
            <div className="mb-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
              {message}
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {mode === "register" && (
              <TextInput label="Nome" value={name} onChange={setName} autoComplete="name" />
            )}

            <TextInput label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
            <TextInput label="Password" type="password" value={password} onChange={setPassword} autoComplete={mode === "login" ? "current-password" : "new-password"} required />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "A processar..." : mode === "login" ? "Entrar no Atlas" : "Criar conta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            Para partilhar com o teu pai: cria-lhe um perfil em Definições → Utilizadores e ele cria conta com esse email.
          </p>
        </Card>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-white outline-none transition focus:border-cyan-400"
      />
    </label>
  );
}
