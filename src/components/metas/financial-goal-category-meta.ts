import {
  Briefcase,
  Car,
  CreditCard,
  GraduationCap,
  Home,
  Landmark,
  type LucideIcon,
  Plane,
  ShoppingBag,
  Shield,
  Target,
  TrendingUp,
} from "lucide-react";

import type { FinancialGoalCategory, GoalPaceStatus, GoalPriority } from "@/types/financial-goal";

export const GOAL_CATEGORY_LABELS: Record<FinancialGoalCategory, string> = {
  RESERVA_EMERGENCIA: "Reserva de emergência",
  VIAGEM: "Viagem",
  CASA: "Casa",
  CARRO: "Carro",
  EDUCACAO: "Educação",
  APOSENTADORIA: "Aposentadoria",
  INVESTIMENTO: "Investimento",
  COMPRA: "Compra",
  DIVIDA: "Quitar dívida",
  NEGOCIO: "Negócio",
  OUTROS: "Outros",
};

export const GOAL_CATEGORY_ICONS: Record<FinancialGoalCategory, LucideIcon> = {
  RESERVA_EMERGENCIA: Shield,
  VIAGEM: Plane,
  CASA: Home,
  CARRO: Car,
  EDUCACAO: GraduationCap,
  APOSENTADORIA: Landmark,
  INVESTIMENTO: TrendingUp,
  COMPRA: ShoppingBag,
  DIVIDA: CreditCard,
  NEGOCIO: Briefcase,
  OUTROS: Target,
};

export const GOAL_CATEGORY_OPTIONS = Object.entries(GOAL_CATEGORY_LABELS).map(([value, label]) => ({
  value: value as FinancialGoalCategory,
  label,
}));

export const GOAL_PRIORITY_LABELS: Record<GoalPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

export const GOAL_PRIORITY_OPTIONS = Object.entries(GOAL_PRIORITY_LABELS).map(([value, label]) => ({
  value: value as GoalPriority,
  label,
}));

const GOAL_CARD_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** Cycles through the chart palette by list position — goals don't persist a color, mirroring
 * how Investment (the closest architectural sibling) also derives its visuals from `type` alone. */
export function goalColorByIndex(index: number): string {
  return GOAL_CARD_COLORS[index % GOAL_CARD_COLORS.length] ?? GOAL_CARD_COLORS[0]!;
}

export const GOAL_PACE_LABELS: Record<GoalPaceStatus, string> = {
  ahead: "Adiantada",
  on_track: "No ritmo certo",
  behind: "Abaixo do ritmo",
};
