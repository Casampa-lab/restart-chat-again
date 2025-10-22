import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, Wrench, Info, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ComparacaoAntesDepoisProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  necessidadeId: string;
  cadastroId: string;
  tipoElemento: 'cilindros' | 'placas' | 'porticos' | 'inscricoes' | 'tachas' | 'marcas_longitudinais' | 'defensas';
}

export function ComparacaoAntesDepois({ 
  open, 
  onOpenChange, 
  necessidadeId, 
  cadastroId,
  tipoElemento 
}: ComparacaoAntesDepoisProps) {
  
  const tabelasCadastro = {
    cilindros: 'ficha_cilindros',
    placas: 'ficha_placa',
    porticos: 'ficha_porticos',
    inscricoes: 'ficha_inscricoes',
    tachas: 'ficha_tachas',
    marcas_longitudinais: 'ficha_marcas_longitudinais',
    defensas: 'defensas'
  };

  const tabelasNecessidades = {
    cilindros: 'necessidades_cilindros',
    placas: 'necessidades_placas',
    porticos: 'necessidades_porticos',
    inscricoes: 'necessidades_inscricoes',
    tachas: 'necessidades_tachas',
    marcas_longitudinais: 'necessidades_marcas_longitudinais',
    defensas: 'necessidades_defensas'
  };

  // Buscar dados do cadastro (ANTES)
  const { data: cadastro, isLoading: loadingCadastro } = useQuery({
    queryKey: ['cadastro-comparacao', tipoElemento, cadastroId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tabelasCadastro[tipoElemento] as any)
        .select('*')
        .eq('id', cadastroId)
        .single();
      
      if (error) throw error;
      return data as any;
    },
    enabled: open && !!cadastroId
  });

  // Buscar dados da necessidade (DEPOIS)
  const { data: necessidade, isLoading: loadingNecessidade } = useQuery({
    queryKey: ['necessidade-comparacao', tipoElemento, necessidadeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tabelasNecessidades[tipoElemento] as any)
        .select('*')
        .eq('id', necessidadeId)
        .single();
      
      if (error) throw error;
      return data as any;
    },
    enabled: open && !!necessidadeId
  });

  const renderCampoComparacao = (
    label: string, 
    valorAntes: any, 
    valorDepois: any,
    isDivergente: boolean = false
  ) => {
    const valorAntesStr = valorAntes?.toString() || 'N/A';
    const valorDepoisStr = valorDepois?.toString() || 'N/A';
    
    return (
      <>
        <span className="font-medium text-sm">{label}:</span>
        <span className={`text-sm ${isDivergente ? 'font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded' : ''}`}>
          {valorAntesStr}
        </span>
        <span className="font-medium text-sm">{label}:</span>
        <span className={`text-sm ${isDivergente ? 'font-bold text-green-700 bg-green-100 px-2 py-1 rounded' : ''}`}>
          {valorDepoisStr}
        </span>
      </>
    );
  };

  const renderComparacaoCilindros = () => {
    if (!cadastro || !necessidade) return null;

    const divergencias = {
      corCorpo: cadastro.cor_corpo !== necessidade.cor_corpo,
      corRefletivo: cadastro.cor_refletivo !== necessidade.cor_refletivo,
      tipoRefletivo: cadastro.tipo_refletivo !== necessidade.tipo_refletivo,
      quantidade: cadastro.quantidade !== necessidade.quantidade,
      espacamento: cadastro.espacamento_m !== necessidade.espacamento_m,
    };

    return (
      <div className="grid grid-cols-2 gap-6">
        {/* Coluna ANTES */}
        <Card className="border-2 border-gray-400">
          <CardHeader className="bg-gray-100">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5" />
              ANTES - Cadastro Original
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {renderCampoComparacao('KM', `${cadastro.km_inicial} - ${cadastro.km_final}`, `${necessidade.km_inicial} - ${necessidade.km_final}`, false)}
              {renderCampoComparacao('Cor Corpo', cadastro.cor_corpo, necessidade.cor_corpo, divergencias.corCorpo)}
              {renderCampoComparacao('Cor Refletivo', cadastro.cor_refletivo, necessidade.cor_refletivo, divergencias.corRefletivo)}
              {renderCampoComparacao('Tipo Refletivo', cadastro.tipo_refletivo, necessidade.tipo_refletivo, divergencias.tipoRefletivo)}
              {renderCampoComparacao('Quantidade', cadastro.quantidade, necessidade.quantidade, divergencias.quantidade)}
              {renderCampoComparacao('Espaçamento', `${cadastro.espacamento_m}m`, `${necessidade.espacamento_m}m`, divergencias.espacamento)}
              {renderCampoComparacao('Local', cadastro.local_implantacao, necessidade.local_implantacao, false)}
            </div>
            
            {cadastro.fotos_urls && cadastro.fotos_urls.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium mb-2">Foto do Cadastro:</p>
                <img 
                  src={cadastro.fotos_urls[0]} 
                  alt="Foto cadastro"
                  className="w-full h-48 object-cover rounded border"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna DEPOIS */}
        <Card className="border-2 border-green-500">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-5 w-5" />
              DEPOIS - Estado Proposto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {/* Os valores já foram renderizados na coluna ANTES */}
            </div>
            
            {necessidade.motivo && (
              <div className="mt-4">
                <p className="text-xs font-medium mb-1">Motivo da Intervenção:</p>
                <p className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
                  {necessidade.motivo}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loadingCadastro || loadingNecessidade) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>📊 Comparação: Estado Anterior vs Proposto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📊 Comparação: Estado Anterior vs Proposto</DialogTitle>
          <DialogDescription>
            Análise comparativa do elemento no cadastro original vs. proposta de intervenção
          </DialogDescription>
        </DialogHeader>

        {renderComparacaoCilindros()}

        {/* Rodapé com estatísticas */}
        <Alert className="mt-4">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <strong>Distância GPS:</strong><br/>
                {necessidade?.distancia_match_metros 
                  ? `${necessidade.distancia_match_metros.toFixed(2)}m` 
                  : 'N/A'}
              </div>
              <div>
                <strong>Score de Match:</strong><br/>
                {necessidade?.match_score 
                  ? `${Math.round(necessidade.match_score * 100)}%` 
                  : 'N/A'}
              </div>
              <div>
                <strong>Decisão de Match:</strong><br/>
                {necessidade?.match_decision || 'N/A'}
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {necessidade?.erro_projeto_detectado && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Tipo de Erro Detectado:</strong> {necessidade.tipo_erro_projeto}<br/>
              Este item foi identificado como possível erro de projeto porque a necessidade 
              está marcada como "Implantar" mas há um elemento similar no cadastro.
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
