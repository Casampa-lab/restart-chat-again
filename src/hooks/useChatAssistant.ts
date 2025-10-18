import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { ChatMessage, loadHistory, saveHistory, clearHistory as clearStoredHistory, truncateHistory } from '@/utils/chatHelpers';

export const useChatAssistant = () => {
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Carregar histórico ao montar
  useEffect(() => {
    const history = loadHistory();
    setMessages(history);
  }, []);

  // Salvar histórico quando mensagens mudarem
  useEffect(() => {
    if (messages.length > 0) {
      saveHistory(messages);
    }
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!session) {
      toast.error('Você precisa estar autenticado para usar o assistente');
      return;
    }

    if (!content.trim()) {
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsStreaming(true);

    let assistantContent = '';
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };

    try {
      // Preparar histórico para enviar (últimas 10 mensagens apenas)
      const historyToSend = truncateHistory([...messages, userMessage], 10);
      const apiMessages = historyToSend.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`;
      
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: apiMessages })
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Limite de requisições atingido. Aguarde alguns instantes.');
          setMessages(prev => prev.slice(0, -1)); // Remove user message
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // Adicionar mensagem do assistente vazia
      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('[Chat Assistant] Stream completed');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '' || line.startsWith(':')) {
            continue;
          }

          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                assistantContent += content;
                
                // Atualizar mensagem do assistente
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage.role === 'assistant') {
                    lastMessage.content = assistantContent;
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              console.error('[Chat Assistant] Error parsing SSE:', e);
            }
          }
        }
      }

      // Processar qualquer dado restante no buffer
      if (buffer.trim() && buffer.startsWith('data: ')) {
        try {
          const data = buffer.slice(6);
          if (data !== '[DONE]') {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === 'assistant') {
                  lastMessage.content = assistantContent;
                }
                return newMessages;
              });
            }
          }
        } catch (e) {
          console.error('[Chat Assistant] Error parsing final buffer:', e);
        }
      }

    } catch (error) {
      console.error('[Chat Assistant] Error:', error);
      toast.error('Erro ao se comunicar com o assistente. Tente novamente.');
      
      // Remover mensagem do usuário em caso de erro
      setMessages(prev => prev.slice(0, -2));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [session, messages]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    clearStoredHistory();
    toast.success('Histórico limpo com sucesso');
  }, []);

  return {
    messages,
    isLoading,
    isStreaming,
    sendMessage,
    clearHistory
  };
};
