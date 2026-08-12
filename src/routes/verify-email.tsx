import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Loader2, Mail, ShieldCheck } from "lucide-react";

import poster from "@/assets/metodo-certo-poster.png";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { resendVerification, verifyEmail } from "@/lib/auth";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : undefined,
  }),
  head: () => ({
    meta: [{ title: "Confirmar e-mail | Método Certo — Suas finanças, seu futuro" }],
  }),
  component: VerifyEmailPage,
});

type Status = "verifying" | "success" | "error";

function VerifyEmailPage() {
  const { token } = Route.useSearch();
  const requested = useRef(false);

  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "Link de confirmação inválido. Verifique o e-mail que enviamos.",
  );

  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;

    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setErrorMessage(
          err instanceof ApiError ? err.message : "Não foi possível confirmar seu e-mail.",
        );
        setStatus("error");
      });
  }, [token]);

  async function handleResend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResendLoading(true);
    try {
      await resendVerification(resendEmail.trim());
      setResendSent(true);
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <BrandLockup />

          {status === "verifying" && (
            <div className="mt-10">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Loader2 className="size-7 animate-spin" aria-hidden="true" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight">Confirmando seu e-mail</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Aguarde um instante enquanto validamos seu link de confirmação.
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="mt-10">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Check className="size-7" aria-hidden="true" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight">E-mail confirmado!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sua conta está ativa. Agora você já pode entrar e começar a organizar suas finanças.
              </p>
              <Button
                asChild
                className="mt-8 h-12 w-full rounded-xl bg-gradient-brand text-base font-semibold shadow-brand transition-transform hover:scale-[1.01]"
              >
                <Link to="/">Ir para o login</Link>
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="mt-10">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
                <AlertTriangle className="size-7" aria-hidden="true" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight">
                Não foi possível confirmar
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>

              {resendSent ? (
                <p className="mt-8 rounded-xl bg-primary/10 p-4 text-sm text-primary">
                  Se o e-mail informado existir, enviaremos um novo link de confirmação.
                </p>
              ) : (
                <form onSubmit={handleResend} className="mt-8 space-y-3">
                  <Label htmlFor="resend-email">Reenviar e-mail de confirmação</Label>
                  <div className="relative">
                    <Mail
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="resend-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="Digite seu e-mail"
                      className="h-12 rounded-xl pl-10"
                      value={resendEmail}
                      onChange={(event) => setResendEmail(event.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={resendLoading}
                    className="h-12 w-full rounded-xl bg-gradient-brand text-base font-semibold shadow-brand transition-transform hover:scale-[1.01]"
                  >
                    {resendLoading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      "Reenviar e-mail"
                    )}
                  </Button>
                </form>
              )}

              <p className="mt-8 text-center text-sm text-muted-foreground">
                <Link to="/" className="font-semibold text-primary hover:underline">
                  Voltar para o login
                </Link>
              </p>
            </div>
          )}

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
          <p className="text-lg font-semibold">Quase lá.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirme seu e-mail para liberar o acesso ao Certo IA e a todas as ferramentas.
          </p>
        </div>
      </section>
    </main>
  );
}
