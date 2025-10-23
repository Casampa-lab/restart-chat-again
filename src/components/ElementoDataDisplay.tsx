import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Info } from "lucide-react";

interface ElementoDataDisplayProps {
  dados_elemento: Record<string, any>;
  tipo_elemento: string;
}

const fieldLabels: Record<string, string> = {
  // Comum
  motivo: 'Motivo',
  observacao: 'Observação',
  data_intervencao: 'Data da Intervenção',
  data_vistoria: 'Data da Vistoria',
  
  // Localização
  km_inicial: 'KM Inicial',
  km_final: 'KM Final',
  latitude_inicial: 'Latitude Inicial',
  longitude_inicial: 'Longitude Inicial',
  latitude_final: 'Latitude Final',
  longitude_final: 'Longitude Final',
  km_referencia: 'KM de Referência',
  lado: 'Lado',
  posicao: 'Posição',
  
  // Placas
  codigo_placa: 'Código da Placa',
  tipo_placa: 'Tipo de Placa',
  codigo: 'Código',
  tipo: 'Tipo',
  modelo: 'Modelo',
  suporte: 'Suporte',
  substrato: 'Substrato',
  tipo_secao_suporte: 'Tipo de Seção do Suporte',
  secao_suporte_mm: 'Seção do Suporte (mm)',
  qtde_suporte: 'Qtd. Suportes',
  altura_m: 'Altura (m)',
  largura_m: 'Largura (m)',
  area_m2: 'Área (m²)',
  dimensoes_mm: 'Dimensões (mm)',
  numero_patrimonio: 'Número Patrimônio',
  
  // Películas
  tipo_pelicula_fundo: 'Película de Fundo',
  cor_pelicula_fundo: 'Cor Película Fundo',
  tipo_pelicula_legenda_orla: 'Película Legenda/Orla',
  cor_pelicula_legenda_orla: 'Cor Legenda/Orla',
  retro_pelicula_fundo: 'Retro Fundo',
  retro_pelicula_legenda_orla: 'Retro Legenda/Orla',
  retro_fundo: 'Retrorrefletividade Fundo',
  retro_orla_legenda: 'Retrorrefletividade Orla/Legenda',
  solucao_planilha: 'Solução',
  status_servico: 'Status do Serviço',
  
  // Estado e condições
  placa_recuperada: 'Placa Recuperada',
  estado_conservacao: 'Estado de Conservação',
  vandalismo: 'Vandalismo',
  
  // Defensas
  extensao_metros: 'Extensão (m)',
  quantidade_laminas: 'Qtd. Lâminas',
  comprimento_total_tramo_m: 'Comprimento Total (m)',
  nivel_contencao_nchrp350: 'Nível NCHRP350',
  nivel_contencao_en1317: 'Nível EN1317',
  terminal_entrada: 'Terminal Entrada',
  terminal_saida: 'Terminal Saída',
  funcao: 'Função',
  geometria: 'Geometria',
  risco: 'Risco',
  especificacao_obstaculo_fixo: 'Especificação Obstáculo',
  
  // Marcas Longitudinais
  tipo_demarcacao: 'Tipo de Demarcação',
  cor: 'Cor',
  largura_cm: 'Largura (cm)',
  espessura_cm: 'Espessura (cm)',
  espessura_mm: 'Espessura (mm)',
  material: 'Material',
  material_utilizado: 'Material Utilizado',
  traco_m: 'Traço (m)',
  espacamento_m: 'Espaçamento (m)',
  
  // Tachas e Cilindros (campos compartilhados)
  quantidade: 'Quantidade',
  corpo: 'Corpo',
  refletivo: 'Descrição',
  tipo_refletivo: 'Tipo do Refletivo (NBR 14.644/2021)',
  cor_refletivo: 'Cor do Refletivo',
  local_implantacao: 'Local de Implantação',
  cor_corpo: 'Cor do Corpo',
  
  // Inscrições
  tipo_inscricao: 'Tipo de Inscrição',
  sigla: 'Sigla',
  dimensoes: 'Dimensões',
  
  // Pórticos
  tipo_portico: 'Tipo de Pórtico',
  altura_maxima_m: 'Altura Máxima (m)',
  
  // Outros
  snv: 'SNV',
  br: 'BR',
  contrato: 'Contrato',
  empresa: 'Empresa',
  velocidade: 'Velocidade',
};

export function ElementoDataDisplay({ dados_elemento, tipo_elemento }: ElementoDataDisplayProps) {
  // Filtrar campos vazios/nulos e IDs de relacionamento
  const camposVisiveis = Object.entries(dados_elemento).filter(([key, value]) => {
    const isEmptyValue = value === null || value === "" || value === false || value === undefined;
    const isIdField = key.includes('_id') || key === 'id';
    const isMetadataField = ['created_at', 'updated_at', 'user_id', 'lote_id', 'rodovia_id', 
                              'enviado_coordenador', 'ultima_intervencao_id', 
                              'modificado_por_intervencao', 'data_ultima_modificacao',
                              'origem', 'fotos_urls', 'foto_url', 'link_fotografia',
                              'pendente_aprovacao_coordenador', 'coordenador_id',
                              'data_aprovacao_coordenador', 'aplicado_ao_inventario',
                              'justificativa_fora_plano', 'fora_plano_manutencao',
                              'observacao_coordenador'].includes(key);
    
    return !isEmptyValue && !isIdField && !isMetadataField;
  });

  // Agrupar campos por categoria
  const localizacao = camposVisiveis.filter(([key]) => 
    ['latitude_inicial', 'longitude_inicial', 
     'latitude_final', 'longitude_final', 'km_inicial', 'km_final', 
     'km_referencia', 'lado', 'posicao', 'snv', 'br'].includes(key)
  );
  
  const caracteristicas = camposVisiveis.filter(([key]) => 
    !['latitude_inicial', 'longitude_inicial',
      'latitude_final', 'longitude_final', 'km_inicial', 'km_final',
      'km_referencia', 'lado', 'posicao', 'snv', 'br'].includes(key)
  );

  const renderField = (key: string, value: any) => {
    let label = fieldLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Se for largura_m e não houver altura_m (placa circular), exibir "Diâmetro"
    if (key === 'largura_m' && !dados_elemento.altura_m) {
      label = 'Diâmetro (m)';
    }
    
    // Formatar valores especiais
    let displayValue = value;
    
    if (key.includes('data') && typeof value === 'string') {
      try {
        displayValue = new Date(value).toLocaleDateString('pt-BR');
      } catch {
        displayValue = value;
      }
    } else if (typeof value === 'boolean') {
      displayValue = value ? '✅ Sim' : '❌ Não';
    } else if ((key === 'latitude' || key === 'longitude' || key.includes('latitude') || key.includes('longitude')) && typeof value === 'number') {
      displayValue = value.toFixed(6);
    } else if (typeof value === 'number' && !key.includes('quantidade')) {
      displayValue = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    return (
      <div key={key} className="space-y-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <p className="text-sm font-medium break-words">{displayValue}</p>
      </div>
    );
  };

  if (camposVisiveis.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum dado adicional disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-2">
      {/* Seção de Localização */}
      {localizacao.length > 0 && (
        <Card className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <h4 className="font-semibold mb-3 flex items-center text-blue-900 dark:text-blue-100">
            <MapPin className="h-4 w-4 mr-2" />
            Localização
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {localizacao.map(([key, value]) => renderField(key, value))}
          </div>
        </Card>
      )}

      {/* Características do Elemento */}
      {caracteristicas.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3 flex items-center">
            <Info className="h-4 w-4 mr-2" />
            Características
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {caracteristicas.map(([key, value]) => renderField(key, value))}
          </div>
        </Card>
      )}
      
      {/* Badge do tipo de elemento */}
      <div className="flex justify-end">
        <Badge variant="outline" className="text-xs">
          {tipo_elemento.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Badge>
      </div>
    </div>
  );
}
