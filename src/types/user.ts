export interface UserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  status: string;
  role: string;
  createdAt: string;
  phone: string | null;
  currency: string;
  notifyBillDue: boolean;
  notifyCardInvoice: boolean;
  notifyGoalProgress: boolean;
  notifyLowBalance: boolean;
  notifyInvestment: boolean;
  biometricEnabled: boolean;
  twoFactorEnabled: boolean;
  newDeviceAlertEnabled: boolean;
  hasOpenAiApiKey: boolean;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  currency?: string;
}

export type NotificationPreferences = Pick<
  UserProfile,
  "notifyBillDue" | "notifyCardInvoice" | "notifyGoalProgress" | "notifyLowBalance" | "notifyInvestment"
>;

export type SecurityPreferences = Pick<
  UserProfile,
  "biometricEnabled" | "twoFactorEnabled" | "newDeviceAlertEnabled"
>;
