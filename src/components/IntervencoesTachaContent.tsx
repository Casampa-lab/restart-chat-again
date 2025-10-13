import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

interface IntervencaoTacha {
  id: string;
  data_intervencao: string;
  km_inicial: number;
  km_final: number;
  tipo_intervencao: string;
  quantidade: number;
  lote_id: string;
  rodovia_id: string;
  enviado_coordenador: boolean;
}

const IntervencoesTachaContent = () => {
  const { user } = useAuth();
  const [intervencoes, setIntervencoes] = useState<IntervencaoTacha[]>([]);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<Record<string, string>>({});
  const [rodovias, setRodovias] = useState<Record<string, string>>({});
  const [selectedIntervencoes, setSelectedIntervencoes] = useState<Set<string>>(new Set());
  const [showEnviadas, setShowEnviadas] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const { data: intervencoesData } = await supabase.from("intervencoes_tacha").select("*").eq("user_id", user.id).order("data_intervencao", { ascending: false });
        setIntervencoes(intervencoesData || []);
        const { data: lotesData } = await supabase.from("lotes").select("id, numero");
        if (lotesData) {
          const lotesMap: Record<string, string> = {};
          lotesData.forEach((lote) => { lotesMap[lote.id] = lote.numero; });
          setLotes(lotesMap);
        }
        const { data: rodoviasData } = await supabase.from("rodovias").select("id, codigo");
        if (rodoviasData) {
          const rodoviasMap: Record<string, string> = {};
          rodoviasData.forEach((rodovia) => { rodoviasMap[rodovia.id] = rodovia.codigo; });
          setRodovias(rodoviasMap);
        }
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const handleToggleSelect = (id: string) => {
    const newSelection = new Set(selectedIntervencoes);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedIntervencoes(newSelection);
  };

  const handleEnviarSelecionadas = async () => {
    if (selectedIntervencoes.size === 0) return;
    try {
      await supabase.from("intervencoes_tacha").update({ enviado_coordenador: true }).in("id", Array.from(selectedIntervencoes));
      toast.success(`${selectedIntervencoes.size} intervenção(ões) enviada(s)!`);
      setSelectedIntervencoes(new Set());
      const { data } = await supabase.from("intervencoes_tacha").select("*").eq("user_id", user!.id).order("data_intervencao", { ascending: false });
      setIntervencoes(data || []);
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const filteredIntervencoes = showEnviadas ? intervencoes : intervencoes.filter(i => !i.enviado_coordenador);

  if (loading) return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label htmlFor="show-enviadas-tacha" className="text-sm cursor-pointer">Mostrar intervenções enviadas</label>
          <input type="checkbox" id="show-enviadas-tacha" checked={showEnviadas} onChange={(e) => setShowEnviadas(e.target.checked)} className="h-4 w-4 cursor-pointer" />
        </div>
        {selectedIntervencoes.size > 0 && (
          <Button onClick={handleEnviarSelecionadas}><Send className="mr-2 h-4 w-4" />Enviar {selectedIntervencoes.size} ao Coordenador</Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Minhas Intervenções em Tachas</CardTitle>
          <CardDescription>Histórico de intervenções em tachas registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredIntervencoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{showEnviadas ? "Nenhuma intervenção registrada ainda." : "Nenhuma intervenção não enviada"}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Sel.</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Rodovia</TableHead>
                    <TableHead>Trecho (KM)</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIntervencoes.map((int) => (
                    <TableRow key={int.id}>
                      <TableCell><input type="checkbox" checked={selectedIntervencoes.has(int.id)} onChange={() => handleToggleSelect(int.id)} disabled={int.enviado_coordenador} className="h-4 w-4" /></TableCell>
                      <TableCell>{format(new Date(int.data_intervencao), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{lotes[int.lote_id] || "-"}</TableCell>
                      <TableCell>{rodovias[int.rodovia_id] || "-"}</TableCell>
                      <TableCell>{int.km_inicial.toFixed(3)} - {int.km_final.toFixed(3)}</TableCell>
                      <TableCell>{int.tipo_intervencao}</TableCell>
                      <TableCell>{int.quantidade}</TableCell>
                      <TableCell>{int.enviado_coordenador ? <Badge variant="outline" className="bg-green-50">Enviada</Badge> : <Badge variant="outline" className="bg-yellow-50">Não enviada</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IntervencoesTachaContent;
