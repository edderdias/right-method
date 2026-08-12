import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User } from "lucide-react";

import poster from "@/assets/metodo-certo-poster.png";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { register } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta | Método Certo — Suas finanças, seu futuro" },
      {
        name: "description",
        content: "Crie sua conta no Método Certo e comece a organizar suas finanças hoje mesmo.",
      },
    ],
  }),
  component: RegisterPage,
});

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPasswordChecks(password: string) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function getPasswordStrength(password: string) {
  const checks = getPasswordChecks(password);
  const score = Object.values(checks).filter(Boolean).length;

  if (!password) return { score: 0, label: "", checks };
  if (score <= 2) return { score, label: "Fraca", checks };
  if (score <= 3) return { score, label: "Média", checks };
  if (score === 4) return { score, label: "Boa", checks };
  return { score, label: "Forte", checks };
}

const strengthColor = [
  "bg-border",
  "bg-destructive",
  "bg-destructive",
  "bg-warning",
  "bg-primary",
  "bg-info",
];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.85-.08-1.66-.22-2.44H12v4.62h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.54-5.17 3.54-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1C3.26 21.3 7.31 24 12 24z"
      />
      <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.28 6.61l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.462 2.16-1.211 2.93-.816.85-2.078 1.5-3.148 1.42-.135-1.09.44-2.24 1.18-2.98.82-.85 2.19-1.47 3.18-1.37zM20.79 17.24c-.5 1.16-.74 1.68-1.39 2.7-.9 1.41-2.17 3.17-3.75 3.19-1.4.02-1.76-.9-3.66-.89-1.9.01-2.3.91-3.7.89-1.58-.02-2.78-1.6-3.68-3-2.52-3.9-2.78-8.47-1.23-10.9.99-1.55 2.6-2.53 4.06-2.53 1.5 0 2.44.9 3.68.9 1.2 0 1.93-.9 3.68-.9 1.28 0 2.63.7 3.6 1.9-3.16 1.73-2.64 6.24.41 8.64z" />
    </svg>
  );
}

function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<{ message: string; code: string | undefined } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  function validate(): FormErrors {
    const next: FormErrors = {};

    if (!name.trim()) {
      next.name = "Informe seu nome completo.";
    }

    if (!email.trim()) {
      next.email = "Informe um e-mail válido.";
    } else if (!EMAIL_REGEX.test(email)) {
      next.email = "Informe um e-mail válido.";
    }

    if (!password) {
      next.password = "Crie uma senha.";
    } else if (!strength.checks.length) {
      next.password = "A senha deve ter no mínimo 8 caracteres.";
    }

    if (!confirmPassword) {
      next.confirmPassword = "Confirme sua senha.";
    } else if (password !== confirmPassword) {
      next.confirmPassword = "As senhas não coincidem.";
    }

    if (!acceptedTerms) {
      next.terms = "Você precisa aceitar os Termos de Uso e a Política de Privacidade.";
    }

    return next;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError(null);

    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError({ message: err.message, code: err.code });
      } else {
        setApiError({
          message: "Não foi possível criar sua conta. Tente novamente.",
          code: undefined,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <BrandLockup />

          {success ? (
            <div className="mt-10">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Check className="size-7" aria-hidden="true" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight">
                Conta criada com sucesso!
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enviamos um e-mail para confirmar sua conta. Verifique sua caixa de entrada para
                continuar.
              </p>
              <Button
                asChild
                className="mt-8 h-12 w-full rounded-xl bg-gradient-brand text-base font-semibold shadow-brand transition-transform hover:scale-[1.01]"
              >
                <Link to="/">Ir para o login</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-10">
                <h1 className="text-3xl font-semibold tracking-tight">Crie sua conta</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Comece agora a cuidar melhor das suas finanças.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <div className="relative">
                    <User
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Digite seu nome completo"
                      className={cn("h-12 rounded-xl pl-10", errors.name && "border-destructive")}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                  {errors.name && (
                    <p role="alert" className="text-sm font-medium text-destructive">
                      {errors.name}
                    </p>
                  )}
                </div>

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
                      autoComplete="email"
                      placeholder="Digite seu e-mail"
                      className={cn("h-12 rounded-xl pl-10", errors.email && "border-destructive")}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  {errors.email && (
                    <p role="alert" className="text-sm font-medium text-destructive">
                      {errors.email}
                    </p>
                  )}
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
                      autoComplete="new-password"
                      placeholder="Crie uma senha"
                      className={cn(
                        "h-12 rounded-xl px-10",
                        errors.password && "border-destructive",
                      )}
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

                  {password && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-1 gap-1">
                          {[1, 2, 3, 4, 5].map((segment) => (
                            <span
                              key={segment}
                              className={cn(
                                "h-1.5 flex-1 rounded-full transition-colors",
                                segment <= strength.score
                                  ? strengthColor[strength.score]
                                  : "bg-border",
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {strength.label}
                        </span>
                      </div>

                      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <PasswordRequirement
                          met={strength.checks.length}
                          label="Mínimo de 8 caracteres"
                        />
                        <PasswordRequirement
                          met={strength.checks.upper}
                          label="Uma letra maiúscula"
                        />
                        <PasswordRequirement met={strength.checks.number} label="Um número" />
                        <PasswordRequirement
                          met={strength.checks.special}
                          label="Um caractere especial"
                        />
                      </ul>
                    </div>
                  )}

                  {errors.password && (
                    <p role="alert" className="text-sm font-medium text-destructive">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar senha</Label>
                  <div className="relative">
                    <Lock
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Confirme sua senha"
                      className={cn(
                        "h-12 rounded-xl px-10",
                        errors.confirmPassword && "border-destructive",
                      )}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p role="alert" className="text-sm font-medium text-destructive">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
                      Li e concordo com os{" "}
                      <a href="#" className="font-medium text-info hover:underline">
                        Termos de Uso
                      </a>{" "}
                      e a{" "}
                      <a href="#" className="font-medium text-info hover:underline">
                        Política de Privacidade
                      </a>
                      .
                    </Label>
                  </div>
                  {errors.terms && (
                    <p role="alert" className="text-sm font-medium text-destructive">
                      {errors.terms}
                    </p>
                  )}
                </div>

                {apiError && (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {apiError.message}
                    {apiError.code === "EMAIL_ALREADY_EXISTS" && (
                      <>
                        {" "}
                        <Link to="/" className="font-semibold underline">
                          Entrar na minha conta
                        </Link>
                      </>
                    )}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={!acceptedTerms || loading}
                  className="h-12 w-full rounded-xl bg-gradient-brand text-base font-semibold shadow-brand transition-transform hover:scale-[1.01]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    "Criar minha conta"
                  )}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-widest text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                ou
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="outline" className="h-12 rounded-xl">
                  <GoogleIcon />
                  Continuar com Google
                </Button>
                <Button variant="outline" className="h-12 rounded-xl">
                  <AppleIcon />
                  Continuar com Apple
                </Button>
              </div>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                Já possui uma conta?{" "}
                <Link to="/" className="font-semibold text-primary hover:underline">
                  Entrar
                </Link>
              </p>
            </>
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
          <p className="text-lg font-semibold">Comece com o pé direito.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize, planeje, economize e invista — com o Certo IA ao seu lado.
          </p>
        </div>
      </section>
    </main>
  );
}

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-1.5", met && "text-primary")}>
      <Check
        className={cn("size-3.5 shrink-0", met ? "opacity-100" : "opacity-30")}
        aria-hidden="true"
      />
      {label}
    </li>
  );
}
