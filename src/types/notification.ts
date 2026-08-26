export type NotificationType =
  | "BILL_DUE"
  | "CARD_INVOICE_CLOSING"
  | "CARD_INVOICE_DUE"
  | "GOAL_MILESTONE"
  | "LOW_BALANCE"
  | "INVESTMENT_INCOME"
  | "INVESTMENT_MATURITY";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}
