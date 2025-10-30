export async function fetchWithRetry(
  url: string,
  {
    retries = 5,        // tenta até 5 vezes
    timeoutMs = 30000,  // 30 segundos pra cada tentativa
    retryDelayMs = 2000 // espera 2s entre tentativas
  } = {}
) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Cria um AbortController pra implementar timeout manual
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      const res = await fetch(url, { signal: controller.signal });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ao buscar ${url}`);
      }

      // Se deu certo, retorna o JSON e sai da função
      return await res.json();
    } catch (err) {
      console.error(
        `[fetchWithRetry] Falha na tentativa ${attempt}/${retries} para ${url}:`,
        err
      );

      // Se esta foi a última tentativa, propaga o erro
      if (attempt === retries) {
        throw err;
      }

      // Aguarda um pouco antes de tentar de novo
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  // (teoricamente não chega aqui)
  throw new Error('Falha inesperada em fetchWithRetry');
}
