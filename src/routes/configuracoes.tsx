import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { requireAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import {
  Bell,
  Copy,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  KeyRound,
  Landmark,
  LogOut,
  Moon,
  Palette,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sun,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useActiveFamilyInvite,
  useCreateFamilyInvite,
  useFamilyAccess,
  useFamilyMembers,
  useRedeemFamilyInvite,
  useRevokeFamilyGrant,
  useRevokeFamilyInvite,
} from "@/hooks/use-family";
import {
  useAiCredentialsStatus,
  useRemoveAiCredentials,
  useSaveAiCredentials,
} from "@/hooks/use-ai-chat";
import { useTheme } from "@/hooks/use-theme";
import {
  useConfirmTwoFactor,
  useDisableTwoFactor,
  useSetupTwoFactor,
} from "@/hooks/use-two-factor";
import { useDisableBiometric, useEnableBiometric } from "@/hooks/use-webauthn";
import {
  useChangePassword,
  useCurrentUser,
  usePluggyCredentialsStatus,
  useRemovePluggyCredentials,
  useSavePluggyCredentials,
  useUpdateNotificationPreferences,
  useUpdateProfile,
  useUpdateSecurityPreferences,
} from "@/hooks/use-user-settings";
import { ApiError } from "@/lib/api-client";
import { logoutAllSessions } from "@/lib/auth";
import { formatDateTime } from "@/lib/finance-format";
import { cn } from "@/lib/utils";
import type { AiProvider, NotificationPreferences, SecurityPreferences } from "@/types/user";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracoes")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Configurações | Método Certo" },
      {
        name: "description",
        content:
          "Ajuste perfil, tema, notificações, segurança com biometria e 2FA, e as preferências do app Método Certo.",
      },
      { property: "og:title", content: "Configurações | Método Certo" },
      {
        property: "og:description",
        content: "Perfil, aparência, notificações, segurança e preferências do aplicativo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConfiguracoesPage,
});

const notificacoes: { id: keyof NotificationPreferences; label: string; detalhe: string }[] = [
  { id: "notifyBillDue", label: "Contas vencendo", detalhe: "Aviso 3 dias antes do vencimento" },
  { id: "notifyCardInvoice", label: "Fatura do cartão", detalhe: "Fechamento e vencimento das faturas" },
  { id: "notifyGoalProgress", label: "Progresso de metas", detalhe: "Quando você atinge marcos importantes" },
  { id: "notifyLowBalance", label: "Saldo baixo", detalhe: "Quando o saldo ficar abaixo de R$ 500" },
  {
    id: "notifyInvestment",
    label: "Investimentos",
    detalhe: "Dividendos, vencimentos e rentabilidade",
  },
];

const seguranca: {
  id: keyof SecurityPreferences;
  label: string;
  detalhe: string;
  icon: typeof Fingerprint;
}[] = [
  {
    id: "biometricEnabled",
    label: "Biometria",
    detalhe: "Entrar com digital ou Face ID",
    icon: Fingerprint,
  },
  {
    id: "twoFactorEnabled",
    label: "Autenticação em 2 fatores",
    detalhe: "Código por app autenticador",
    icon: ShieldCheck,
  },
  {
    id: "newDeviceAlertEnabled",
    label: "Alerta de novo dispositivo",
    detalhe: "Avisar em cada novo login",
    icon: Smartphone,
  },
];

const aiProviderOptions: { value: AiProvider; label: string; placeholder: string }[] = [
  { value: "OPENAI", label: "ChatGPT (OpenAI)", placeholder: "sk-..." },
  { value: "ANTHROPIC", label: "Claude (Anthropic)", placeholder: "sk-ant-..." },
  { value: "GOOGLE", label: "Gemini (Google)", placeholder: "AIza..." },
];

const temas = [
  { id: "claro", label: "Claro", icon: Sun },
  { id: "escuro", label: "Escuro", icon: Moon },
  { id: "sistema", label: "Sistema", icon: Palette },
] as const;

function ConfiguracoesPage() {
  const navigate = useNavigate();
  const { theme: tema, setTheme: setTema } = useTheme();

  const { data: currentUser } = useCurrentUser();
  const updateProfileMutation = useUpdateProfile();
  const notificationPrefsMutation = useUpdateNotificationPreferences();
  const securityPrefsMutation = useUpdateSecurityPreferences();
  const changePasswordMutation = useChangePassword();

  const [profileForm, setProfileForm] = useState({ name: "", phone: "", currency: "BRL" });
  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name,
        phone: currentUser.phone ?? "",
        currency: currentUser.currency,
      });
    }
  }, [currentUser]);

  function handleSaveProfile() {
    updateProfileMutation.mutate({
      name: profileForm.name,
      phone: profileForm.phone,
      currency: profileForm.currency,
    });
  }

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [twoFactorSetupOpen, setTwoFactorSetupOpen] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState<{
    otpauthUrl: string;
    qrCodeDataUrl: string;
  } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const setupTwoFactorMutation = useSetupTwoFactor();
  const confirmTwoFactorMutation = useConfirmTwoFactor();
  const disableTwoFactorMutation = useDisableTwoFactor();
  const enableBiometricMutation = useEnableBiometric();
  const disableBiometricMutation = useDisableBiometric();

  function handleToggleBiometric(checked: boolean) {
    if (checked) {
      enableBiometricMutation.mutate();
    } else {
      disableBiometricMutation.mutate();
    }
  }

  function handleToggleTwoFactor(checked: boolean) {
    if (!checked) {
      disableTwoFactorMutation.mutate();
      return;
    }
    setupTwoFactorMutation.mutate(undefined, {
      onSuccess: (data) => {
        setTwoFactorSetupData(data);
        setTwoFactorCode("");
        setTwoFactorSetupOpen(true);
      },
    });
  }

  function handleConfirmTwoFactor() {
    confirmTwoFactorMutation.mutate(twoFactorCode, {
      onSuccess: () => {
        setTwoFactorSetupOpen(false);
        setTwoFactorSetupData(null);
        setTwoFactorCode("");
      },
    });
  }

  function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setPasswordDialogOpen(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
      },
    );
  }

  const [loggingOutAll, setLoggingOutAll] = useState(false);
  async function handleLogoutAll() {
    setLoggingOutAll(true);
    try {
      const message = await logoutAllSessions();
      toast.success(message);
      navigate({ to: "/" });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Não foi possível encerrar as sessões.",
      );
    } finally {
      setLoggingOutAll(false);
    }
  }

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiProviderInput, setAiProviderInput] = useState<AiProvider>("OPENAI");
  const { data: aiCredentialsStatus } = useAiCredentialsStatus();
  const saveAiCredentialsMutation = useSaveAiCredentials();
  const removeAiCredentialsMutation = useRemoveAiCredentials();

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    saveAiCredentialsMutation.mutate(
      { provider: aiProviderInput, apiKey: trimmed },
      { onSuccess: () => setApiKeyInput("") },
    );
  };

  const [pluggyClientIdInput, setPluggyClientIdInput] = useState("");
  const [pluggyClientSecretInput, setPluggyClientSecretInput] = useState("");
  const [showPluggySecret, setShowPluggySecret] = useState(false);
  const { data: pluggyCredentialsStatus } = usePluggyCredentialsStatus();
  const savePluggyCredentialsMutation = useSavePluggyCredentials();
  const removePluggyCredentialsMutation = useRemovePluggyCredentials();

  const handleSavePluggyCredentials = () => {
    const clientId = pluggyClientIdInput.trim();
    const clientSecret = pluggyClientSecretInput.trim();
    if (!clientId || !clientSecret) return;
    savePluggyCredentialsMutation.mutate(
      { clientId, clientSecret },
      {
        onSuccess: () => {
          setPluggyClientIdInput("");
          setPluggyClientSecretInput("");
        },
      },
    );
  };

  const { data: activeInvite } = useActiveFamilyInvite();
  const createInviteMutation = useCreateFamilyInvite();
  const revokeInviteMutation = useRevokeFamilyInvite();
  const { data: familyMembers } = useFamilyMembers();
  const { data: accessibleAccounts } = useFamilyAccess();
  const redeemInviteMutation = useRedeemFamilyInvite();
  const revokeGrantMutation = useRevokeFamilyGrant();
  const [redeemCode, setRedeemCode] = useState("");

  function handleCopyCode() {
    if (!activeInvite) return;
    void navigator.clipboard.writeText(activeInvite.code);
    toast.success("Código copiado!");
  }

  function handleRedeem() {
    const trimmed = redeemCode.trim();
    if (!trimmed) return;
    redeemInviteMutation.mutate(trimmed, { onSuccess: () => setRedeemCode("") });
  }

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie seu perfil, aparência, alertas e segurança.
        </p>
      </div>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl border-border/70 bg-gradient-surface shadow-soft xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <User className="size-4 text-primary" aria-hidden="true" />
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid size-16 place-items-center rounded-2xl bg-gradient-brand text-lg font-semibold text-primary-foreground">
                {(currentUser?.name ?? "?")
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold">{currentUser?.name ?? "..."}</p>
                <p className="text-sm text-muted-foreground">{currentUser?.email ?? ""}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="nome" className="text-sm font-medium">
                  Nome completo
                </label>
                <input
                  id="nome"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-2 h-11 w-full rounded-xl border border-input bg-surface px-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-medium">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={currentUser?.email ?? ""}
                  disabled
                  className="mt-2 h-11 w-full rounded-xl border border-input bg-surface-2 px-4 text-sm text-muted-foreground outline-none"
                />
              </div>
              <div>
                <label htmlFor="telefone" className="text-sm font-medium">
                  Telefone
                </label>
                <PhoneInput
                  id="telefone"
                  value={profileForm.phone}
                  onChange={(phone) => setProfileForm((f) => ({ ...f, phone }))}
                  placeholder="(11) 98877-4321"
                  className="mt-2 h-11 w-full rounded-xl border border-input bg-surface px-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <div>
                <label htmlFor="moeda" className="text-sm font-medium">
                  Moeda
                </label>
                <select
                  id="moeda"
                  value={profileForm.currency}
                  onChange={(e) => setProfileForm((f) => ({ ...f, currency: e.target.value }))}
                  className="mt-2 h-11 w-full rounded-xl border border-input bg-surface px-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="BRL">Real brasileiro (R$)</option>
                  <option value="USD">Dólar americano (US$)</option>
                  <option value="EUR">Euro (€)</option>
                </select>
              </div>
            </div>
            <Button
              className="rounded-xl bg-gradient-brand font-semibold"
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending || !profileForm.name.trim()}
            >
              Salvar alterações
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Palette className="size-4 text-primary" aria-hidden="true" />
                Aparência
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              {temas.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTema(t.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border border-transparent bg-surface-2 p-3 text-xs font-medium transition-colors",
                    tema === t.id
                      ? "border-primary/40 bg-gradient-surface text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <t.icon className="size-5" aria-hidden="true" />
                  {t.label}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Globe className="size-4 text-primary" aria-hidden="true" />
                Preferências
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Idioma</span>
                <span className="text-muted-foreground">Português (BR)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Fuso horário</span>
                <span className="text-muted-foreground">GMT-3 São Paulo</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Início da semana</span>
                <span className="text-muted-foreground">Domingo</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ocultar saldos</span>
                <Switch
                  checked={currentUser?.hideBalances ?? false}
                  onCheckedChange={(checked) =>
                    securityPrefsMutation.mutate({ hideBalances: checked })
                  }
                  disabled={securityPrefsMutation.isPending}
                  aria-label="Ocultar saldos"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <BrandMark className="size-5" />
                Certo IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Escolha o provedor de IA e cadastre sua própria chave para usar o Certo IA com a
                sua conta.
              </p>
              {aiCredentialsStatus?.hasKey ? (
                <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-primary">
                      <KeyRound className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {
                          aiProviderOptions.find((o) => o.value === aiCredentialsStatus.provider)
                            ?.label
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">••••••••••••••••</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => removeAiCredentialsMutation.mutate()}
                    disabled={removeAiCredentialsMutation.isPending}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Select
                    value={aiProviderInput}
                    onValueChange={(value) => setAiProviderInput(value as AiProvider)}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aiProviderOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      placeholder={
                        aiProviderOptions.find((o) => o.value === aiProviderInput)?.placeholder
                      }
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="h-11 rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      aria-label={showApiKey ? "Ocultar chave" : "Mostrar chave"}
                    >
                      {showApiKey ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <Button
                    className="w-full rounded-xl bg-gradient-brand font-semibold"
                    onClick={handleSaveApiKey}
                    disabled={!apiKeyInput.trim() || saveAiCredentialsMutation.isPending}
                  >
                    Salvar chave
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/70 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Landmark className="size-4 text-primary" aria-hidden="true" />
                Open Finance (Pluggy)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Cadastre suas credenciais do Pluggy para conectar contas e cartões via Open
                Finance. Crie uma conta gratuita em{" "}
                <a
                  href="https://dashboard.pluggy.ai"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary underline underline-offset-2"
                >
                  dashboard.pluggy.ai
                </a>{" "}
                para obter suas credenciais.
              </p>
              {pluggyCredentialsStatus?.hasCredentials ? (
                <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-primary">
                      <KeyRound className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">Credenciais configuradas</p>
                      <p className="text-xs text-muted-foreground">••••••••••••••••</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => removePluggyCredentialsMutation.mutate()}
                    disabled={removePluggyCredentialsMutation.isPending}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Client ID"
                    value={pluggyClientIdInput}
                    onChange={(e) => setPluggyClientIdInput(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                  <div className="relative">
                    <Input
                      type={showPluggySecret ? "text" : "password"}
                      placeholder="Client Secret"
                      value={pluggyClientSecretInput}
                      onChange={(e) => setPluggyClientSecretInput(e.target.value)}
                      className="h-11 rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPluggySecret((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      aria-label={showPluggySecret ? "Ocultar segredo" : "Mostrar segredo"}
                    >
                      {showPluggySecret ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <Button
                    className="w-full rounded-xl bg-gradient-brand font-semibold"
                    onClick={handleSavePluggyCredentials}
                    disabled={
                      !pluggyClientIdInput.trim() ||
                      !pluggyClientSecretInput.trim() ||
                      savePluggyCredentialsMutation.isPending
                    }
                  >
                    Salvar credenciais
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Bell className="size-4 text-primary" aria-hidden="true" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notificacoes.map((n) => (
              <div key={n.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.detalhe}</p>
                </div>
                <Switch
                  checked={currentUser?.[n.id] ?? false}
                  onCheckedChange={(checked) =>
                    notificationPrefsMutation.mutate({ [n.id]: checked })
                  }
                  disabled={notificationPrefsMutation.isPending}
                  aria-label={n.label}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {seguranca.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-primary">
                  <s.icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.detalhe}</p>
                </div>
                <Switch
                  checked={currentUser?.[s.id] ?? false}
                  onCheckedChange={
                    s.id === "twoFactorEnabled"
                      ? handleToggleTwoFactor
                      : s.id === "biometricEnabled"
                        ? handleToggleBiometric
                        : (checked) => securityPrefsMutation.mutate({ [s.id]: checked })
                  }
                  disabled={
                    s.id === "twoFactorEnabled"
                      ? setupTwoFactorMutation.isPending || disableTwoFactorMutation.isPending
                      : s.id === "biometricEnabled"
                        ? enableBiometricMutation.isPending || disableBiometricMutation.isPending
                        : securityPrefsMutation.isPending
                  }
                  aria-label={s.label}
                />
              </div>
            ))}
            <Button
              variant="secondary"
              className="w-full rounded-xl"
              onClick={() => setPasswordDialogOpen(true)}
            >
              Alterar senha
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-xl text-destructive"
              onClick={handleLogoutAll}
              disabled={loggingOutAll}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Encerrar todas as sessões
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-3xl border-border/70 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <UserPlus className="size-4 text-primary" aria-hidden="true" />
            Convidar familiar
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Seu código de convite</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Compartilhe este código com um familiar. Quem cadastrar o código passa a
                visualizar seus lançamentos, cartões, investimentos e metas — somente leitura.
              </p>
              {activeInvite ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3">
                    <span className="flex-1 font-mono text-lg font-semibold tracking-[0.2em]">
                      {activeInvite.code}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-xl"
                      aria-label="Copiar código"
                      onClick={handleCopyCode}
                    >
                      <Copy className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expira em {formatDateTime(activeInvite.expiresAt)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => createInviteMutation.mutate()}
                      disabled={createInviteMutation.isPending}
                    >
                      <RefreshCw className="size-3.5" aria-hidden="true" />
                      Gerar novo código
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-destructive"
                      onClick={() => revokeInviteMutation.mutate(activeInvite.id)}
                      disabled={revokeInviteMutation.isPending}
                    >
                      Revogar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  className="mt-3 rounded-xl bg-gradient-brand font-semibold"
                  onClick={() => createInviteMutation.mutate()}
                  disabled={createInviteMutation.isPending}
                >
                  Gerar código de convite
                </Button>
              )}
            </div>

            <div>
              <p className="text-sm font-medium">Tenho um código</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cadastre o código recebido de um familiar para visualizar as finanças dele.
              </p>
              <div className="mt-3 flex gap-2">
                <Input
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  placeholder="Ex: 7K9QXP4M"
                  className="h-11 rounded-xl font-mono uppercase tracking-widest"
                />
                <Button
                  type="button"
                  className="shrink-0 rounded-xl bg-gradient-brand font-semibold"
                  onClick={handleRedeem}
                  disabled={!redeemCode.trim() || redeemInviteMutation.isPending}
                >
                  Resgatar
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Quem tem acesso aos seus dados</p>
              {familyMembers && familyMembers.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {familyMembers.map((grant) => (
                    <div
                      key={grant.id}
                      className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-primary">
                        <Users className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{grant.member?.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {grant.member?.email}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-xl text-destructive"
                        aria-label="Remover acesso"
                        onClick={() => revokeGrantMutation.mutate(grant.id)}
                        disabled={revokeGrantMutation.isPending}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Ninguém tem acesso aos seus dados ainda.
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium">Contas que você pode visualizar</p>
              {accessibleAccounts && accessibleAccounts.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {accessibleAccounts.map((grant) => (
                    <div
                      key={grant.id}
                      className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-primary">
                        <Users className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{grant.owner?.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {grant.owner?.email}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-destructive"
                        onClick={() => revokeGrantMutation.mutate(grant.id)}
                        disabled={revokeGrantMutation.isPending}
                      >
                        Sair
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Você ainda não tem acesso a nenhuma conta compartilhada.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label htmlFor="current-password" className="text-sm font-medium">
                Senha atual
              </label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-2 h-11 rounded-xl"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="text-sm font-medium">
                Nova senha
              </label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-2 h-11 rounded-xl"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Mínimo de 8 caracteres, com maiúscula, minúscula, número e caractere especial.
              </p>
            </div>
            <div>
              <label htmlFor="confirm-password" className="text-sm font-medium">
                Confirmar nova senha
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 h-11 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="rounded-xl bg-gradient-brand font-semibold"
              onClick={handleChangePassword}
              disabled={
                changePasswordMutation.isPending ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              Salvar nova senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={twoFactorSetupOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTwoFactorSetupOpen(false);
            setTwoFactorSetupData(null);
            setTwoFactorCode("");
          }
        }}
      >
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ativar autenticação em dois fatores</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Escaneie o QR code com seu app autenticador (Google Authenticator, Authy, etc.) e
              digite o código gerado para confirmar.
            </p>
            {twoFactorSetupData && (
              <img
                src={twoFactorSetupData.qrCodeDataUrl}
                alt="QR code para configurar autenticação em dois fatores"
                className="mx-auto size-48 rounded-2xl border border-border/70"
              />
            )}
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={twoFactorCode} onChange={setTwoFactorCode}>
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full rounded-xl bg-gradient-brand font-semibold"
              onClick={handleConfirmTwoFactor}
              disabled={confirmTwoFactorMutation.isPending || twoFactorCode.length !== 6}
            >
              Confirmar e ativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
