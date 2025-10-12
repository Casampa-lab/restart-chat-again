import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const TIPOS_NECESSIDADES = [
  { value: "placas", label: "Placas" },
  { value: "marcas_longitudinais", label: "Marcas Longitudinais" },
  { value: "tachas", label: "Tachas" },
  { value: "marcas_transversais", label: "Zebrados (Marcas Transversais)" },
  { value: "cilindros", label: "Cilindros Delimitadores" },
  { value: "porticos", label: "Pórticos" },
  { value: "defensas", label: "Defensas" },
];

interface AuditoriaItem {
  necessidade_id: string;
  linha_planilha: number;
  km: number;
  codigo: string;
  solucao_planilha: string;
  servico: string;
  tem_match: boolean;
  distancia_match: number | null;
  cadastro_id: string | null;
  latitude_nec: number;
  longitude_nec: number;
  latitude_cad?: number;
  longitude_cad?: number;
  km_cad?: number;
  codigo_cad?: string;
}

export function NecessidadesAuditor() {
  const [tipo, setTipo] = useState<string>("");
  const [loteId, setLoteId] = useState<string>("");
  const [rodoviaId, setRodoviaId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [auditoria, setAuditoria] = useState<AuditoriaItem[]>([]);
  const { toast } = useToast();

  // Buscar lotes
  const { data: lotes } = useQuery({
    queryKey: ["lotes"],
    queryFn: async () => {
      const { data } = await supabase.from("lotes").select("*").order("numero");
      return data || [];
    },
  });

  // Buscar rodovias do lote selecionado
  const { data: rodovias } = useQuery({
    queryKey: ["rodovias", loteId],
    queryFn: async () => {
      if (!loteId) return [];
      const { data } = await supabase
        .from("lotes_rodovias")
        .select("rodovia:rodovias(*)")
        .eq("lote_id", loteId);
      return data?.map(lr => lr.rodovia) || [];
    },
    enabled: !!loteId,
  });

  const handleAuditar = async () => {
    if (!tipo || !loteId || !rodoviaId) {
      toast({
        title: "Erro",
        description: "Selecione o tipo, lote e rodovia",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setAuditoria([]);

    try {
      const tabelaNecessidade = `necessidades_${tipo}`;
      const tabelaCadastro = tipo === "placas" ? "ficha_placa" : 
                           tipo === "marcas_transversais" ? "ficha_inscricoes" :
                           tipo === "marcas_longitudinais" ? "ficha_marcas_longitudinais" :
                           tipo === "cilindros" ? "ficha_cilindros" :
                           tipo === "tachas" ? "ficha_tachas" :
                           tipo === "porticos" ? "ficha_porticos" :
                           "defensas";

      // Buscar necessidades
      const { data: necessidades, error: necError } = await supabase
        .from(tabelaNecessidade as any)
        .select("*")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .order("linha_planilha");

      if (necError) throw necError;
      if (!necessidades || necessidades.length === 0) {
        toast({
          title: "Nenhuma necessidade encontrada",
          description: "Não há necessidades importadas para este lote/rodovia",
        });
        setIsLoading(false);
        return;
      }

      // Para cada necessidade, buscar dados do cadastro se houver match
      const auditoriaData: AuditoriaItem[] = [];

      for (const nec of (necessidades as any[])) {
        const item: AuditoriaItem = {
          necessidade_id: nec.id,
          linha_planilha: nec.linha_planilha || 0,
          km: nec.km || nec.km_inicial || 0,
          codigo: nec.codigo || nec.tipo_demarcacao || nec.tipo || "-",
          solucao_planilha: nec.solucao_planilha || "-",
          servico: nec.servico || "-",
          tem_match: !!nec.cadastro_id,
          distancia_match: nec.distancia_match_metros,
          cadastro_id: nec.cadastro_id,
          latitude_nec: nec.latitude || nec.latitude_inicial,
          longitude_nec: nec.longitude || nec.longitude_inicial,
        };

        // Se tem match, buscar dados do cadastro
        if (nec.cadastro_id) {
          const { data: cadastro } = await supabase
            .from(tabelaCadastro as any)
            .select("*")
            .eq("id", nec.cadastro_id)
            .maybeSingle();

          if (cadastro) {
            item.latitude_cad = (cadastro as any).latitude || (cadastro as any).latitude_inicial;
            item.longitude_cad = (cadastro as any).longitude || (cadastro as any).longitude_inicial;
            item.km_cad = (cadastro as any).km || (cadastro as any).km_inicial;
            item.codigo_cad = (cadastro as any).codigo || (cadastro as any).tipo_demarcacao || (cadastro as any).tipo || "-";
          }
        }

        auditoriaData.push(item);
      }

      setAuditoria(auditoriaData);

      // Estatísticas
      const totalSubstituicoes = auditoriaData.filter(i => 
        i.solucao_planilha?.toLowerCase().includes("substitu")
      ).length;
      const substituicoesSemMatch = auditoriaData.filter(i => 
        i.solucao_planilha?.toLowerCase().includes("substitu") && !i.tem_match
      ).length;

      toast({
        title: "Auditoria concluída",
        description: `${auditoriaData.length} necessidades analisadas. ${substituicoesSemMatch} de ${totalSubstituicoes} substituições sem match.`,
        variant: substituicoesSemMatch > 0 ? "destructive" : "default",
      });

    } catch (error: any) {
      toast({
        title: "Erro na auditoria",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (item: AuditoriaItem) => {
    const ehSubstituicao = item.solucao_planilha?.toLowerCase().includes("substitu");
    
    if (ehSubstituicao && !item.tem_match) {
      return <Badge variant="destructive">❌ Substituição sem Match</Badge>;
    }
    if (ehSubstituicao && item.tem_match) {
      return <Badge variant="default">✅ Substituição com Match</Badge>;
    }
    if (!ehSubstituicao && item.tem_match) {
      return <Badge variant="secondary">⚠️ Inclusão com Match</Badge>;
    }
    return <Badge variant="outline">🟢 Inclusão sem Match</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditar Necessidades</CardTitle>
        <CardDescription>
          Verificar se necessidades de substituição possuem match com cadastro
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seleção de tipo */}
        <div className="space-y-2">
          <Label>Tipo de Necessidade</Label>
          <Select value={tipo} onValueChange={setTipo} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_NECESSIDADES.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seleção de Lote */}
        <div className="space-y-2">
          <Label>Lote</Label>
          <Select value={loteId} onValueChange={(value) => {
            setLoteId(value);
            setRodoviaId("");
          }} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o lote" />
            </SelectTrigger>
            <SelectContent>
              {lotes?.map(lote => (
                <SelectItem key={lote.id} value={lote.id}>
                  {lote.numero}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seleção de Rodovia */}
        <div className="space-y-2">
          <Label>Rodovia</Label>
          <Select value={rodoviaId} onValueChange={setRodoviaId} disabled={isLoading || !loteId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a rodovia" />
            </SelectTrigger>
            <SelectContent>
              {rodovias?.map((rodovia: any) => (
                <SelectItem key={rodovia.id} value={rodovia.id}>
                  {rodovia.codigo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Botão auditar */}
        <Button
          onClick={handleAuditar}
          disabled={!tipo || !loteId || !rodoviaId || isLoading}
          className="w-full"
        >
          <Search className="mr-2 h-4 w-4" />
          {isLoading ? "Auditando..." : "Auditar"}
        </Button>

        {/* Resultados */}
        {auditoria.length > 0 && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Legenda:</strong>
                <br />
                ❌ = Planilha diz "Substituir" mas não há match (PROBLEMA!)
                <br />
                ✅ = Substituição com match correto
                <br />
                ⚠️ = Inclusão mas achou match (pode ser duplicata)
                <br />
                🟢 = Inclusão sem match (normal)
              </AlertDescription>
            </Alert>

            <div className="rounded-md border max-h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Linha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>KM</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Planilha</TableHead>
                    <TableHead>Distância</TableHead>
                    <TableHead>Coord. Necessidade</TableHead>
                    <TableHead>Coord. Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditoria.map((item) => (
                    <TableRow 
                      key={item.necessidade_id}
                      className={
                        item.solucao_planilha?.toLowerCase().includes("substitu") && !item.tem_match
                          ? "bg-destructive/10"
                          : ""
                      }
                    >
                      <TableCell>{item.linha_planilha}</TableCell>
                      <TableCell>{getStatusBadge(item)}</TableCell>
                      <TableCell>
                        {item.km?.toFixed(2)}
                        {item.km_cad && (
                          <div className="text-xs text-muted-foreground">
                            Cad: {item.km_cad?.toFixed(2)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.codigo}
                        {item.codigo_cad && item.codigo !== item.codigo_cad && (
                          <div className="text-xs text-muted-foreground">
                            Cad: {item.codigo_cad}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{item.solucao_planilha}</TableCell>
                      <TableCell>
                        {item.distancia_match !== null 
                          ? `${item.distancia_match?.toFixed(0)}m`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.latitude_nec?.toFixed(6)}, {item.longitude_nec?.toFixed(6)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.latitude_cad 
                          ? `${item.latitude_cad?.toFixed(6)}, ${item.longitude_cad?.toFixed(6)}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
