import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { WorkSession } from "@/hooks/useWorkSession";

interface SessionManagerMobileProps {
  userId: string;
  activeSession: WorkSession;
  onSessionChanged: () => void;
}

interface Lote {
  id: string;
  numero: string;
  empresa?: {
    nome: string;
  };
}

interface Rodovia {
  id: string;
  codigo: string;
}

export function SessionManagerMobile({
  userId,
  activeSession,
  onSessionChanged,
}: SessionManagerMobileProps) {
  const [open, setOpen] = useState(false);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [rodovias, setRodovias] = useState<Rodovia[]>([]);
  const [selectedLote, setSelectedLote] = useState<string>("");
  const [selectedRodovia, setSelectedRodovia] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Carregar lotes quando o drawer abre
  useEffect(() => {
    if (open) {
      loadLotes();
    }
  }, [open]);

  // Carregar rodovias quando lote é selecionado
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
        .select("id, numero, empresa:empresas(nome)")
        .order("numero");

      if (error) throw error;
      setLotes(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar lotes:", error);
      toast.error("Erro ao carregar lotes");
    }
  };

  const loadRodoviasByLote = async (loteId: string) => {
    try {
      const { data, error } = await supabase.rpc("get_rodovias_by_lote", {
        p_lote_id: loteId,
      });

      if (error) throw error;
      setRodovias(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar rodovias:", error);
      toast.error("Erro ao carregar rodovias");
    }
  };

  const handleChangeSession = async () => {
    if (!selectedLote || !selectedRodovia) {
      toast.error("Selecione lote e rodovia");
      return;
    }

    setLoading(true);
    try {
      // Finalizar sessão atual
      const { error: endError } = await supabase
        .from("sessoes_trabalho")
        .update({ ativa: false, data_fim: new Date().toISOString() })
        .eq("id", activeSession.id);

      if (endError) throw endError;

      // Criar nova sessão
      const { error: startError } = await supabase
        .from("sessoes_trabalho")
        .insert({
          user_id: userId,
          lote_id: selectedLote,
          rodovia_id: selectedRodovia,
          ativa: true,
        });

      if (startError) throw startError;

      const lote = lotes.find((l) => l.id === selectedLote);
      const rodovia = rodovias.find((r) => r.id === selectedRodovia);

      toast.success(
        `Sessão trocada para ${lote?.numero} - ${rodovia?.codigo}`
      );

      setOpen(false);
      onSessionChanged();
    } catch (error: any) {
      console.error("Erro ao trocar sessão:", error);
      toast.error("Erro ao trocar sessão: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Sessão Ativa</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="bg-background">
                📍 {activeSession.lote?.numero || "Lote não identificado"}
              </Badge>
              <Badge variant="outline" className="bg-background">
                🛣️ {activeSession.rodovia?.codigo || "Rodovia não identificada"}
              </Badge>
            </div>
          </div>

          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Trocar
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Trocar Lote/Rodovia</DrawerTitle>
                <DrawerDescription>
                  Selecione o novo lote e rodovia para trabalhar
                </DrawerDescription>
              </DrawerHeader>

              <div className="px-4 pb-4 space-y-4">
                {/* Alerta */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-900 dark:text-amber-200">
                    A sessão atual será finalizada ao confirmar a troca
                  </p>
                </div>

                {/* Seletor de Lote */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">📍 Novo Lote</label>
                  <Select value={selectedLote} onValueChange={setSelectedLote}>
                    <SelectTrigger className="h-14">
                      <SelectValue placeholder="Selecione o lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {lotes.map((lote) => (
                        <SelectItem key={lote.id} value={lote.id}>
                          {lote.numero}
                          {lote.empresa?.nome && ` - ${lote.empresa.nome}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Seletor de Rodovia */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">🛣️ Nova Rodovia</label>
                  <Select
                    value={selectedRodovia}
                    onValueChange={setSelectedRodovia}
                    disabled={!selectedLote}
                  >
                    <SelectTrigger className="h-14">
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
              </div>

              <DrawerFooter>
                <Button
                  onClick={handleChangeSession}
                  disabled={!selectedLote || !selectedRodovia || loading}
                  className="h-14"
                >
                  {loading ? "Trocando..." : "✅ Confirmar Troca"}
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline" className="h-14">
                    Cancelar
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </CardContent>
    </Card>
  );
}
