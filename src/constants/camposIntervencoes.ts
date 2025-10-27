type CampoTipo = 'text' | 'number' | 'date' | 'boolean';

type CampoDef = { 
  campo: string; 
  label: string; 
  tipo: CampoTipo; 
  decimais?: number; 
  mask?: 'km' | 'gps' | 'snv' 
};

type SecaoDef = { 
  titulo: string; 
  campos: CampoDef[] 
};

export const CAMPOS_INTERVENCOES: Record<string, SecaoDef[]> = {
  // 1. PLACAS
  ficha_placa_intervencoes: [
    {
      titulo: '📍 Localização',
      campos: [
        { campo: 'snv', label: 'SNV', tipo: 'text', mask: 'snv' },
        { campo: 'km_inicial', label: 'KM', tipo: 'number', decimais: 3, mask: 'km' },
        { campo: 'latitude_inicial', label: 'Latitude', tipo: 'text', mask: 'gps' },
        { campo: 'longitude_inicial', label: 'Longitude', tipo: 'text', mask: 'gps' },
        { campo: 'velocidade', label: 'Velocidade', tipo: 'text' },
      ],
    },
    {
      titulo: '🔧 Identificação da Placa',
      campos: [
        { campo: 'tipo', label: 'Tipo de Placa', tipo: 'text' },
        { campo: 'codigo', label: 'Código', tipo: 'text' },
        { campo: 'posicao', label: 'Posição', tipo: 'text' },
        { campo: 'lado', label: 'Lado', tipo: 'text' },
        { campo: 'suporte', label: 'Tipo de Suporte', tipo: 'text' },
        { campo: 'substrato', label: 'Substrato', tipo: 'text' },
        { campo: 'qtde_suporte', label: 'Qtd. Suportes', tipo: 'number' },
        { campo: 'tipo_secao_suporte', label: 'Tipo de Seção', tipo: 'text' },
        { campo: 'secao_suporte_mm', label: 'Seção (mm)', tipo: 'text' },
        { campo: 'substrato_suporte', label: 'Substrato do Suporte', tipo: 'text' },
        { campo: 'si_sinal_impresso', label: 'Sinal Impresso', tipo: 'text' },
        { campo: 'detalhamento_pagina', label: 'Detalhamento/Página', tipo: 'number' },
        { campo: 'area_m2', label: 'Área (m²)', tipo: 'number', decimais: 2 },
      ],
    },
    {
      titulo: '🎨 Películas e Materiais',
      campos: [
        { campo: 'pelicula_fundo', label: 'Película (Fundo)', tipo: 'text' },
        { campo: 'pelicula_legenda', label: 'Película (Legenda/Orla)', tipo: 'text' },
        { campo: 'retrorrefletividade', label: 'Classe Retrorrefletiva', tipo: 'text' },
      ],
    },
    {
      titulo: '📝 Observações',
      campos: [
        { campo: 'observacao', label: 'Observações', tipo: 'text' },
      ],
    },
  ],

  // 2. MARCAS LONGITUDINAIS (SH)
  ficha_marcas_longitudinais_intervencoes: [
    {
      titulo: '📍 Localização',
      campos: [
        { campo: 'snv', label: 'SNV', tipo: 'text' },
        { campo: 'km_inicial', label: 'KM Inicial', tipo: 'number', decimais: 3, mask: 'km' },
        { campo: 'km_final', label: 'KM Final', tipo: 'number', decimais: 3, mask: 'km' },
        { campo: 'lado', label: 'Lado', tipo: 'text' },
      ],
    },
    {
      titulo: '🔧 Características Técnicas',
      campos: [
        { campo: 'tipo_demarcacao', label: 'Tipo de Demarcação', tipo: 'text' },
        { campo: 'cor', label: 'Cor', tipo: 'text' },
        { campo: 'material', label: 'Material', tipo: 'text' },
        { campo: 'largura_cm', label: 'Largura (cm)', tipo: 'number', decimais: 2 },
        { campo: 'espessura_mm', label: 'Espessura (mm)', tipo: 'number', decimais: 2 },
        { campo: 'extensao_metros', label: 'Extensão (m)', tipo: 'number', decimais: 2 },
      ],
    },
    {
      titulo: '📝 Observações',
      campos: [
        { campo: 'observacao', label: 'Observações', tipo: 'text' },
      ],
    },
  ],

  // 3. TACHAS
  ficha_tachas_intervencoes: [
    {
      titulo: '📍 Localização',
      campos: [
        { campo: 'snv', label: 'SNV', tipo: 'text' },
        { campo: 'km_inicial', label: 'KM Inicial', tipo: 'number', decimais: 3, mask: 'km' },
        { campo: 'km_final', label: 'KM Final', tipo: 'number', decimais: 3, mask: 'km' },
        { campo: 'local_implantacao', label: 'Local de Implantação', tipo: 'text' },
      ],
    },
    {
      titulo: '🔧 Características',
      campos: [
        { campo: 'tipo_tacha', label: 'Tipo de Tacha', tipo: 'text' },
        { campo: 'material', label: 'Material', tipo: 'text' },
        { campo: 'tipo_refletivo', label: 'Tipo Refletivo', tipo: 'text' },
        { campo: 'cor', label: 'Cor', tipo: 'text' },
        { campo: 'quantidade', label: 'Quantidade', tipo: 'number' },
        { campo: 'espacamento_m', label: 'Espaçamento (m)', tipo: 'number', decimais: 2 },
      ],
    },
    {
      titulo: '📝 Observações',
      campos: [
        { campo: 'observacao', label: 'Observações', tipo: 'text' },
      ],
    },
  ],

  // 4. PÓRTICOS
  ficha_porticos_intervencoes: [
    {
      titulo: '📍 Localização',
      campos: [
        { campo: 'snv', label: 'SNV', tipo: 'text' },
        { campo: 'km_inicial', label: 'KM', tipo: 'number', decimais: 3, mask: 'km' },
      ],
    },
    {
      titulo: '🔧 Características Estruturais',
      campos: [
        { campo: 'tipo', label: 'Tipo de Pórtico', tipo: 'text' },
        { campo: 'descricao', label: 'Descrição', tipo: 'text' },
        { campo: 'altura_livre_m', label: 'Altura Livre (m)', tipo: 'number', decimais: 2 },
        { campo: 'vao_horizontal_m', label: 'Vão Horizontal (m)', tipo: 'number', decimais: 2 },
      ],
    },
    {
      titulo: '📝 Observações',
      campos: [
        { campo: 'observacao', label: 'Observações', tipo: 'text' },
      ],
    },
  ],

  // 5. CILINDROS
  ficha_cilindros_intervencoes: [
    {
      titulo: '📍 Localização',
      campos: [
        { campo: 'snv', label: 'SNV', tipo: 'text' },
        { campo: 'km_inicial', label: 'KM Inicial', tipo: 'number', decimais: 3, mask: 'km' },
        { campo: 'km_final', label: 'KM Final', tipo: 'number', decimais: 3, mask: 'km' },
        { campo: 'local_implantacao', label: 'Local de Implantação', tipo: 'text' },
      ],
    },
    {
      titulo: '🔧 Características',
      campos: [
        { campo: 'cor_corpo', label: 'Cor do Corpo', tipo: 'text' },
        { campo: 'cor_refletivo', label: 'Cor do Refletivo', tipo: 'text' },
        { campo: 'tipo_refletivo', label: 'Tipo Refletivo', tipo: 'text' },
        { campo: 'quantidade', label: 'Quantidade', tipo: 'number' },
        { campo: 'espacamento_m', label: 'Espaçamento (m)', tipo: 'number', decimais: 2 },
      ],
    },
    {
      titulo: '📝 Observações',
      campos: [
        { campo: 'observacao', label: 'Observações', tipo: 'text' },
      ],
    },
  ],

  // 6. DEFENSAS
  defensas_intervencoes: [
    {
      titulo: '📍 Localização',
      campos: [
        { campo: 'snv', label: 'SNV', tipo: 'text' },
        { campo: 'km_inicial', label: 'KM Inicial', tipo: 'number', decimais: 3, mask: 'km' },
        { campo: 'km_final', label: 'KM Final', tipo: 'number', decimais: 3, mask: 'km' },
        { campo: 'lado', label: 'Lado', tipo: 'text' },
      ],
    },
    {
      titulo: '🔧 Estado de Conservação',
      campos: [
        { campo: 'extensao_metros', label: 'Extensão (m)', tipo: 'number', decimais: 2 },
        { campo: 'tipo_avaria', label: 'Tipo de Avaria', tipo: 'text' },
        { campo: 'estado_conservacao', label: 'Estado de Conservação', tipo: 'text' },
        { campo: 'nivel_risco', label: 'Nível de Risco', tipo: 'text' },
      ],
    },
    {
      titulo: '📝 Observações',
      campos: [
        { campo: 'observacao', label: 'Observações', tipo: 'text' },
      ],
    },
  ],

  // 7. INSCRIÇÕES
  ficha_inscricoes_intervencoes: [
    {
      titulo: '📍 Localização',
      campos: [
        { campo: 'snv', label: 'SNV', tipo: 'text' },
        { campo: 'km_inicial', label: 'KM', tipo: 'number', decimais: 3, mask: 'km' },
      ],
    },
    {
      titulo: '🔧 Características',
      campos: [
        { campo: 'sigla', label: 'Sigla', tipo: 'text' },
        { campo: 'tipo_inscricao', label: 'Tipo de Inscrição', tipo: 'text' },
        { campo: 'cor', label: 'Cor', tipo: 'text' },
        { campo: 'dimensoes', label: 'Dimensões', tipo: 'text' },
        { campo: 'area_m2', label: 'Área (m²)', tipo: 'number', decimais: 2 },
      ],
    },
    {
      titulo: '🎨 Materiais',
      campos: [
        { campo: 'espessura_mm', label: 'Espessura (mm)', tipo: 'number', decimais: 2 },
        { campo: 'material_utilizado', label: 'Material Utilizado', tipo: 'text' },
      ],
    },
    {
      titulo: '📝 Observações',
      campos: [
        { campo: 'observacao', label: 'Observações', tipo: 'text' },
      ],
    },
  ],
};
