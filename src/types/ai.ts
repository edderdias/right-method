export type AiMessageRole = "USER" | "ASSISTANT";

export interface AiMessage {
  id: string;
  conversationId: string;
  role: AiMessageRole;
  content: string;
  suggestedRoute?: string | null;
  suggestedLabel?: string | null;
  createdAt: string;
}

export interface AiConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiConversationDetail extends AiConversation {
  messages: AiMessage[];
}

export interface SendAiMessageResult {
  userMessage: AiMessage;
  assistantMessage: AiMessage;
}
