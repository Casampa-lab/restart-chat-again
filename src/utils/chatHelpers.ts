export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const STORAGE_KEY = 'chat-assistant-history';
const MAX_HISTORY = 50;

export const formatTimestamp = (date: Date): string => {
  return date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const saveHistory = (messages: ChatMessage[]): void => {
  try {
    // Limitar histórico
    const limitedMessages = messages.slice(-MAX_HISTORY);
    
    // Converter Date para string para armazenamento
    const serializable = limitedMessages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString()
    }));
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.error('Erro ao salvar histórico do chat:', error);
  }
};

export const loadHistory = (): ChatMessage[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    
    // Converter string de volta para Date
    return parsed.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
  } catch (error) {
    console.error('Erro ao carregar histórico do chat:', error);
    return [];
  }
};

export const clearHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Erro ao limpar histórico do chat:', error);
  }
};

export const truncateHistory = (messages: ChatMessage[], limit: number = 10): ChatMessage[] => {
  // Manter apenas as últimas N mensagens para enviar à API
  return messages.slice(-limit);
};
