import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";

import poster from "@/assets/metodo-certo-poster.png";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { login } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar | Método Certo — Suas finanças, seu futuro" },
      {
        name: "description",
        content:
          "Acesse o Método Certo e controle receitas, despesas, metas e investimentos com inteligência.",
      },
      { property: "og:title", content: "Método Certo — Suas finanças, seu futuro" },
      {
        property: "og:description",
        content: "Controle financeiro pessoal inteligente, com metas, investimentos e IA.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <BrandLockup />

          <div className="mt-10">
            <h1 className="text-3xl font-semibold tracking-tight">Bem-vindo de volta</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Entre para acompanhar suas finanças em tempo real.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="voce@email.com"
                  className="h-12 rounded-xl pl-10"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-12 rounded-xl px-10"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" defaultChecked />
                <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
                  Lembrar acesso
                </Label>
              </div>
              <a href="#" className="text-sm font-medium text-info hover:underline">
                Esqueci a senha
              </a>
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-gradient-brand text-base font-semibold shadow-brand transition-transform hover:scale-[1.01]"
            >
              {loading ? <Loader2 className="size-5 animate-spin" /> : "Entrar"}
            </Button>
          </form>

          {/* <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div> */}

          {/* <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" className="h-12 rounded-xl">
              Continuar com Google
            </Button>
            <Button variant="outline" className="h-12 rounded-xl">
              Continuar com Apple
            </Button>
          </div> */}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="font-semibold text-primary hover:underline">
              Cadastre-se
            </Link>
          </p>

          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            Conexão criptografada e dados protegidos pela LGPD
          </p>
        </div>
      </section>

      <section className="relative hidden overflow-hidden lg:block">
        <img
          src={poster}
          alt="Ilustração de crescimento financeiro com moedas e gráfico em alta"
          className="absolute inset-0 size-full object-cover object-[center_30%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
        <div className="glass absolute inset-x-8 bottom-8 rounded-3xl p-6">
          <p className="text-lg font-semibold">Controle hoje, viva seu amanhã.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize, planeje, economize e invista — com o Certo IA ao seu lado.
          </p>
        </div>
      </section>
    </main>
  );
}
