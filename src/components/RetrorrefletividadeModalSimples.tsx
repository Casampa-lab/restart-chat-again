import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

interface RetrorrefletividadeModalSimplesProps {
  tipo: 'SH' | 'SV';
  campo: 'retro_bd' | 'retro_e' | 'retro_be' | 'retro_sv';
  loteId: string;
  rodoviaId: string;
  kmReferencia?: string;
  onComplete: (resultado: { media: number; medicoes: number[] }) => void;
}

const LABELS_CAMPO = {
  retro_bd: 'Retrorefletividade BD (Bordo Direito)',
  retro_e: 'Retrorefletividade Eixo',
  retro_be: 'Retrorefletividade BE (Bordo Esquerdo)',
  retro_sv: 'Retrorefletividade SV (Sinalização Vertical)'
};

const VALORES_MINIMOS = {
  retro_bd: 200,
  retro_e: 200,
  retro_be: 200,
  retro_sv: 100
};

export function RetrorrefletividadeModalSimples({
  tipo,
  campo,
  loteId,
  rodoviaId,
  kmReferencia,
  onComplete
}: RetrorrefletividadeModalSimplesProps) {
  const numLeituras = tipo === 'SH' ? 10 : 5;
  const [medicoes, setMedicoes] = useState<number[]>(Array(numLeituras).fill(0));
  const [observacao, setObservacao] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [capturandoGPS, setCapturandoGPS] = useState(false);

  // Cálculo conforme DNIT 080/2014-ME e NBR 14723:2012
  // Descarta o maior e o menor valor, calcula média dos valores centrais
  const media = useMemo(() => {
    const validos = medicoes.filter(m => m > 0);
    if (validos.length < 3) return 0; // Mínimo 3 para descartar 2 extremos
    
    // Ordena valores
    const ordenados = [...validos].sort((a, b) => a - b);
    
    // Descarta o menor (índice 0) e o maior (último índice)
    const centrais = ordenados.slice(1, -1);
    
    // Calcula média dos valores centrais
    const soma = centrais.reduce((a, b) => a + b, 0);
    return Math.round(soma / centrais.length);
  }, [medicoes]);

  const handleCapturarGPS = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada pelo navegador");
      return;
    }

    setCapturandoGPS(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        toast.success("GPS capturado com sucesso!");
        setCapturandoGPS(false);
      },
      (error) => {
        toast.error("Erro ao capturar GPS: " + error.message);
        setCapturandoGPS(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleMedicaoChange = (index: number, valor: string) => {
    const novasMedicoes = [...medicoes];
    novasMedicoes[index] = parseFloat(valor) || 0;
    setMedicoes(novasMedicoes);
  };

  const handleConfirmar = () => {
    const medicoesValidas = medicoes.filter(m => m > 0);
    if (medicoesValidas.length === 0) {
      toast.error("Preencha pelo menos uma leitura");
      return;
    }

    onComplete({ media, medicoes });
  };

  return (
    <div className="space-y-6">
      {/* Informações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{LABELS_CAMPO[campo]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={new Date().toISOString().split('T')[0]}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label>KM de Referência</Label>
              <Input
                value={kmReferencia || ''}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCapturarGPS}
                disabled={capturandoGPS}
                className="w-full"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {capturandoGPS ? 'Capturando...' : 'Capturar GPS'}
              </Button>
            </div>
          </div>

          {latitude && longitude && (
            <div className="text-sm text-muted-foreground">
              📍 GPS: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leituras */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leituras Individuais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {medicoes.map((medicao, index) => (
              <div key={index} className="space-y-1">
                <Label className="text-xs">Leitura #{index + 1}</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={medicao || ''}
                  onChange={(e) => handleMedicaoChange(index, e.target.value)}
                  placeholder="0.0"
                  className="text-center"
                />
              </div>
            ))}
          </div>

          {/* Média e Valor Mínimo */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Média Calculada:</p>
              <p className="text-3xl font-bold text-primary">{media.toFixed(1)} mcd/lux</p>
              <p className="text-xs text-muted-foreground mt-1">
                {medicoes.filter(m => m > 0).length} de {numLeituras} leituras preenchidas
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-muted-foreground">Valor Mínimo:</p>
              <Badge variant={media >= VALORES_MINIMOS[campo] ? 'default' : 'destructive'} className="text-lg px-3 py-1">
                {VALORES_MINIMOS[campo]} mcd/lux
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {media >= VALORES_MINIMOS[campo] ? '✓ Conforme' : '✗ Abaixo do mínimo'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <div className="space-y-2">
        <Label>Observações (opcional)</Label>
        <Textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Adicione observações sobre estas medições..."
          rows={3}
        />
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onComplete({ media: 0, medicoes: [] })}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleConfirmar}>
          Confirmar Medições
        </Button>
      </div>
    </div>
  );
}
