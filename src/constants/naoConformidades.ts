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
    "Item Implantado Fora do Projeto",
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
    "Item Implantado Fora do Projeto",
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
    "Item Implantado Fora do Projeto",
    "Outros",
  ],
};

export const SITUACOES_NC = [
  "Atendida",
  "Não Atendida",
] as const;

export const NATUREZAS_NC = {
  SINALIZACAO_HORIZONTAL: "S.H.",
  SINALIZACAO_VERTICAL: "S.V.",
  DISPOSITIVOS_SEGURANCA: "D.S.",
  OUTRA: "OUTRA"
} as const;

export const GRAUS_NC = ["Leve", "Média", "Grave", "Gravíssima"] as const;
export const TIPOS_OBRA = ["Execução", "Manutenção"] as const;

// Mapeamento automático Tipo NC → Natureza
export const TIPO_NC_TO_NATUREZA: Record<string, string> = {
  "Sinalização Vertical": "S.V.",
  "Sinalização Horizontal": "S.H.",
  "Dispositivos de Segurança": "D.S."
};

export type TipoNC = typeof TIPOS_NC[keyof typeof TIPOS_NC];
export type SituacaoNC = typeof SITUACOES_NC[number];
export type NaturezaNC = typeof NATUREZAS_NC[keyof typeof NATUREZAS_NC];
export type GrauNC = typeof GRAUS_NC[number];
export type TipoObraNC = typeof TIPOS_OBRA[number];
