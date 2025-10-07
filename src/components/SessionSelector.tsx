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
  empresas: {
    nome: string;
  };
}

interface Rodovia {
  id: string;
  codigo: string;
  nome: string;
}

interface SessionSelectorProps {
  userId: string | undefined;
  onSessionStarted: () => void;
}

const SessionSelector = ({ userId, onSessionStarted }: SessionSelectorProps) => {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [rodovias, setRodovias] = useState<Rodovia[]>([]);
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
      console.log("🔍 Carregando lotes...");
      const { data, error } = await supabase
        .from("lotes")
        .select("*, empresas(nome)")
        .order("numero");

      if (error) {
        console.error("❌ Erro ao carregar lotes:", error);
        throw error;
      }
      
      console.log("✅ Lotes carregados:", data);
      console.log("📊 Estrutura dos dados:", JSON.stringify(data, null, 2));
      
      // Filtrar lotes válidos
      const validLotes = (data || []).filter(lote => {
        const isValid = lote && lote.id && lote.numero;
        if (!isValid) {
          console.warn("⚠️ Lote inválido encontrado:", lote);
        }
        return isValid;
      });
      
      console.log("✅ Lotes válidos:", validLotes.length);
      setLotes(validLotes);
    } catch (error: any) {
      console.error("❌ Erro catch:", error);
      toast.error("Erro ao carregar lotes: " + error.message);
    }
  };

  const loadRodoviasByLote = async (loteId: string) => {
    try {
      const { data, error } = await supabase
        .from("lotes_rodovias")
        .select("rodovias(*)")
        .eq("lote_id", loteId);

      if (error) throw error;
      const rodoviasList = data?.map((lr: any) => lr.rodovias) || [];
      setRodovias(rodoviasList);
    } catch (error: any) {
      toast.error("Erro ao carregar rodovias: " + error.message);
    }
  };

  const handleStartSession = async () => {
    if (!selectedLote || !selectedRodovia) {
      toast.error("Selecione o lote e a rodovia");
      return;
    }

    setLoading(true);
    try {
      await startSession(selectedLote, selectedRodovia);
      onSessionStarted(); // Notifica o componente pai que a sessão foi criada
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
            <SelectContent>
              {lotes.map((lote) => (
                <SelectItem key={lote.id} value={lote.id}>
                  Lote {lote.numero}{lote.empresas?.nome ? ` - ${lote.empresas.nome}` : ''}
                </SelectItem>
              ))}
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
                <SelectContent>
                  {rodovias.map((rodovia) => (
                    <SelectItem key={rodovia.id} value={rodovia.id}>
                      {rodovia.codigo}
                    </SelectItem>
                  ))}
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
