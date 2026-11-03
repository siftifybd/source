export type SessionState = 'disconnected' | 'connecting' | 'listening' | 'speaking';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  url?: string;
  duration?: number;
}

export interface WebToolCall {
  id: string;
  name: string;
  args: {
    url: string;
    siteName?: string;
  };
}
