export const TIPOS_NC = {
  SINALIZACAO_HORIZONTAL: "Sinalização Horizontal",
  SINALIZACAO_VERTICAL: "Sinalização Vertical",
  DISPOSITIVOS_SEGURANCA: "Dispositivos de Segurança",
} as const;

export const PROBLEMAS_POR_TIPO: Record<string, string[]> = {
  [TIPOS_NC.SINALIZACAO_HORIZONTAL]: [
    "Ausência de tachas refletivas",
    "Limpeza de tachas refletivas",
    "Ausência pintura de faixa",
    "Retrorrefletância abaixo do parâmetro",
    "Outros",
  ],
  [TIPOS_NC.SINALIZACAO_VERTICAL]: [
    "Película queimada",
    "Placa abalroada",
    "Placa danificada",
    "Ausência de Placa",
    "Retrorrefletividade abaixo do parâmetro",
    "Capina de Placa",
    "Limpeza de Placa",
    "Outros",
  ],
  [TIPOS_NC.DISPOSITIVOS_SEGURANCA]: [
    "Defensa abalroada",
    "Defensa danificada",
    "Ausência de defensa",
    "Ausência de refletivos de defensa",
    "Limpeza de defensas",
    "Ausência de terminal",
    "Terminal danificado",
    "Outros",
  ],
};

export const SITUACOES_NC = [
  "Atendida",
  "Não Atendida",
] as const;

export type TipoNC = typeof TIPOS_NC[keyof typeof TIPOS_NC];
export type SituacaoNC = typeof SITUACOES_NC[number];
