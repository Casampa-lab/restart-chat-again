import { useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Navigation, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AlertaProximidadeProps {
  necessidade: any;
  distance: number;
  onVerDetalhes: () => void;
  onRegistrarAgora: () => void;
}

export function AlertaProximidade({
  necessidade,
  distance,
  onVerDetalhes,
  onRegistrarAgora,
}: AlertaProximidadeProps) {
  useEffect(() => {
    // Vibrar quando o alerta aparecer
    const vibrate = async () => {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
        setTimeout(async () => {
          await Haptics.impact({ style: ImpactStyle.Light });
        }, 100);
      } catch (error) {
        console.error('Erro ao vibrar:', error);
      }
    };

    vibrate();
  }, [necessidade.id]);

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      placas: '🚦 Placa',
      marcas_longitudinais: '➖ Marca SH',
      tachas: '⚪ Tacha',
      defensas: '🛡️ Defensa',
      cilindros: '🔵 Cilindro',
      porticos: '🌉 Pórtico',
      inscricoes: '📝 Inscrição',
    };
    return labels[tipo] || tipo;
  };

  const getAcaoLabel = (acao: string) => {
    const labels: Record<string, string> = {
      Substituição: '🔄',
      Implantação: '➕',
      Remoção: '➖',
      Manutenção: '🔧',
      Recuperação: '🔨',
    };
    return labels[acao] || '⚙️';
  };

  return (
    <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950 animate-pulse">
      <AlertTriangle className="h-5 w-5 text-orange-600" />
      <AlertTitle className="text-lg font-bold text-orange-900 dark:text-orange-100">
        ATENÇÃO! Você está próximo
      </AlertTitle>
      <AlertDescription className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-background text-base px-3 py-1">
              {getTipoLabel(necessidade.tipo_elemento)}
            </Badge>
            <Badge variant="outline" className="bg-background text-base px-3 py-1">
              {getAcaoLabel(necessidade.acao)} {necessidade.acao}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">km:</span>{' '}
              <span className="font-semibold">{necessidade.km_inicial?.toFixed(3) || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Lado:</span>{' '}
              <span className="font-semibold">{necessidade.lado || '-'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Distância:</span>{' '}
              <span className="font-bold text-orange-600">
                {distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(2)}km`}
              </span>
            </div>
          </div>

          {necessidade.descricao_servico && (
            <p className="text-sm text-muted-foreground bg-background p-2 rounded">
              {necessidade.descricao_servico}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onVerDetalhes}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver Detalhes
          </Button>
          <Button
            onClick={onRegistrarAgora}
            size="lg"
            className="flex-1 bg-orange-600 hover:bg-orange-700"
          >
            <Navigation className="mr-2 h-4 w-4" />
            Registrar Agora
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
