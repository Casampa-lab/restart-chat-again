import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useWorkSession } from "@/hooks/useWorkSession";
import { PlayCircle } from "lucide-react";

interface Lote {
  id: string;
  numero: string;
  empresa_id: string;
  empresas?: {
    nome: string;
  } | null;
}

interface RodoviaSegmento {
  id: string;              // ID do vínculo (lotes_rodovias.id)
  rodovia_id: string;      // ID da rodovia original
  codigo: string;
  km_inicial: number;
  km_final: number;
  extensao_km: number;
}

interface SessionSelectorProps {
  userId: string | undefined;
  onSessionStarted: () => void;
}

const SessionSelector = ({ userId, onSessionStarted }: SessionSelectorProps) => {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [rodovias, setRodovias] = useState<RodoviaSegmento[]>([]);
  const [selectedLote, setSelectedLote] = useState<string>("");
  const [selectedRodovia, setSelectedRodovia] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { startSession } = useWorkSession(userId);

  useEffect(() => {
    loadLotes();
  }, []);

  useEffect(() => {
    if (selectedLote) {
      loadRodoviasByLote(selectedLote);
    } else {
      setRodovias([]);
      setSelectedRodovia("");
    }
  }, [selectedLote]);

  const loadLotes = async () => {
    try {
      const { data, error } = await supabase
        .from("lotes")
        .select("*, empresas(nome)")
        .order("numero");

      if (error) throw error;
      setLotes(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar lotes: " + error.message);
    }
  };

  const loadRodoviasByLote = async (loteId: string) => {
    try {
      const { data, error } = await supabase
        .rpc("get_segmentos_rodovias_by_lote", {
          p_lote_id: loteId,
        });

      if (error) throw error;
      setRodovias(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar rodovias: " + error.message);
    }
  };

  const handleStartSession = async () => {
    if (!selectedLote || !selectedRodovia) {
      toast.error("Selecione o lote e a rodovia");
      return;
    }

    // selectedRodovia agora é o ID do vínculo (lotes_rodovias.id)
    const segmentoSelecionado = rodovias.find(r => r.id === selectedRodovia);
    
    if (!segmentoSelecionado) {
      toast.error("Segmento não encontrado");
      return;
    }

    setLoading(true);
    try {
      // Passa o rodovia_id original para a sessão
      await startSession(selectedLote, segmentoSelecionado.rodovia_id);
      onSessionStarted();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Iniciar Sessão de Trabalho</CardTitle>
        <CardDescription>
          Selecione o lote e a rodovia onde você irá trabalhar hoje. Após iniciar, todos os
          dados coletados serão automaticamente vinculados a esta sessão.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lote">Lote</Label>
          <Select value={selectedLote} onValueChange={setSelectedLote}>
            <SelectTrigger id="lote">
              <SelectValue placeholder="Selecione o lote" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {lotes && lotes.length > 0 ? (
                lotes.map((lote) => (
                  <SelectItem key={lote.id} value={lote.id}>
                    Lote {lote.numero}{lote.empresas?.nome ? ` - ${lote.empresas.nome}` : ''}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-lotes" disabled>
                  Nenhum lote disponível
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedLote && (
          <div className="space-y-2">
            <Label htmlFor="rodovia">Rodovia</Label>
            <Select value={selectedRodovia} onValueChange={setSelectedRodovia}>
              <SelectTrigger id="rodovia">
                <SelectValue placeholder="Selecione a rodovia" />
              </SelectTrigger>
                <SelectContent className="bg-popover">
                  {rodovias && rodovias.length > 0 ? (
                    rodovias.map((segmento, idx) => {
                      // Calcular número do segmento se houver múltiplos da mesma rodovia
                      const segmentosIguais = rodovias.filter(r => r.codigo === segmento.codigo);
                      const numeroSegmento = segmentosIguais.length > 1 
                        ? segmentosIguais.findIndex(r => r.id === segmento.id) + 1 
                        : null;

                      return (
                        <SelectItem key={segmento.id} value={segmento.id}>
                          {segmento.codigo}
                          {numeroSegmento && ` - Segmento ${numeroSegmento}`}
                          {` (KM ${segmento.km_inicial?.toFixed(1)} - ${segmento.km_final?.toFixed(1)})`}
                        </SelectItem>
                      );
                    })
                  ) : (
                    <SelectItem value="no-rodovias" disabled>
                      Nenhuma rodovia disponível para este lote
                    </SelectItem>
                  )}
                </SelectContent>
            </Select>
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handleStartSession}
          disabled={!selectedLote || !selectedRodovia || loading}
        >
          <PlayCircle className="mr-2 h-5 w-5" />
          {loading ? "Iniciando..." : "Iniciar Sessão"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SessionSelector;
