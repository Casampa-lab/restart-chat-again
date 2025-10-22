import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Eye } from 'lucide-react';

interface AlertaErroProjetoProps {
  necessidadeId: string;
  cadastroMatchId: string;
  tipoErro: string;
  distanciaMetros?: number;
  onVerDetalhes: () => void;
  onDecisao: (decisao: 'MANTER_IMPLANTAR' | 'CORRIGIR_PARA_SUBSTITUIR') => void;
}

export function AlertaErroProjeto({ 
  necessidadeId, 
  cadastroMatchId, 
  tipoErro,
  distanciaMetros,
  onVerDetalhes,
  onDecisao 
}: AlertaErroProjetoProps) {
  const [processando, setProcessando] = useState(false);

  const handleDecisao = async (decisao: 'MANTER_IMPLANTAR' | 'CORRIGIR_PARA_SUBSTITUIR') => {
    setProcessando(true);
    try {
      await onDecisao(decisao);
    } finally {
      setProcessando(false);
    }
  };

  const getDescricaoErro = () => {
    switch (tipoErro) {
      case 'IMPLANTAR_COM_CADASTRO_EXISTENTE':
        return 'Foi encontrado um elemento com características similares no cadastro.';
      case 'COORDENADAS_PROXIMAS_ATRIBUTOS_DIVERGENTES':
        return 'Foi encontrado um elemento próximo no cadastro, mas com atributos diferentes.';
      default:
        return 'Foi detectada uma inconsistência que requer revisão.';
    }
  };

  return (
    <Alert variant="destructive" className="my-4 border-2 border-orange-500 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-700" />
      <AlertTitle className="text-orange-900 font-bold">
        ⚠️ Possível Erro de Projeto Detectado
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-3 mt-2">
          <p className="text-sm text-orange-800">
            Esta necessidade está marcada como <strong>"Implantar"</strong>, mas {getDescricaoErro()}
          </p>
          
          {distanciaMetros !== undefined && (
            <p className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded inline-block">
              📍 Distância: {distanciaMetros.toFixed(2)}m
            </p>
          )}
          
          <div className="flex flex-wrap gap-2 mt-3">
            <Button 
              size="sm" 
              variant="outline"
              onClick={onVerDetalhes}
              className="border-orange-300 hover:bg-orange-100"
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver Comparação
            </Button>
            
            <Button 
              size="sm" 
              variant="default"
              onClick={() => handleDecisao('CORRIGIR_PARA_SUBSTITUIR')}
              disabled={processando}
              className="bg-green-600 hover:bg-green-700"
            >
              ✅ Corrigir para "Substituir"
            </Button>
            
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => handleDecisao('MANTER_IMPLANTAR')}
              disabled={processando}
            >
              Manter "Implantar" (novo elemento)
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            💡 Se este elemento deve <strong>substituir</strong> o existente, clique em "Corrigir". 
            Se for realmente um <strong>novo elemento</strong>, clique em "Manter".
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
