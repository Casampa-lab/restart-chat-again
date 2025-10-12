import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Search, AlertCircle, CheckCircle2, XCircle, StopCircle } from "lucide-react";
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
  sigla: string;
  descricao: string;
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
  sigla_cad?: string;
  descricao_cad?: string;
}

export function NecessidadesAuditor() {
  const [tipo, setTipo] = useState<string>("");
  const [loteId, setLoteId] = useState<string>("");
  const [rodoviaId, setRodoviaId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [auditoria, setAuditoria] = useState<AuditoriaItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [progressInfo, setProgressInfo] = useState<{ current: number; total: number } | null>(null);
  const cancelRef = useRef(false);
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

  const converterCoordenada = (valor: any): number | null => {
    if (valor === null || valor === undefined || valor === "") return null;
    if (typeof valor === "number") return valor;
    const valorStr = String(valor).replace(",", ".");
    const numero = parseFloat(valorStr);
    return isNaN(numero) ? null : numero;
  };

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
    setProgress(0);
    setProgressInfo(null);
    cancelRef.current = false;

    try {
      const tabelaNecessidade = tipo === "marcas_transversais" ? "necessidades_marcas_transversais" : `necessidades_${tipo}`;
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

      // Buscar TODOS os cadastros de uma vez para otimizar
      const cadastrosIds = necessidades
        .filter((n: any) => n.cadastro_id)
        .map((n: any) => n.cadastro_id);

      let cadastrosMap = new Map();
      if (cadastrosIds.length > 0) {
        const { data: cadastrosData } = await supabase
          .from(tabelaCadastro as any)
          .select("*")
          .in("id", cadastrosIds);
        
        if (cadastrosData) {
          cadastrosData.forEach((cad: any) => {
            cadastrosMap.set(cad.id, cad);
          });
        }
      }

      // Para cada necessidade, processar com os dados já carregados
      const auditoriaData: AuditoriaItem[] = [];
      const total = necessidades.length;
      setProgressInfo({ current: 0, total });

      for (let i = 0; i < necessidades.length; i++) {
        // Verificar cancelamento
        if (cancelRef.current) {
          toast({
            title: "Auditoria Cancelada",
            description: `Processadas ${i} de ${total} necessidades`,
          });
          break;
        }

        const nec = necessidades[i] as any;
        setProgressInfo({ current: i + 1, total });
        setProgress(Math.round(((i + 1) / total) * 100));
        // Construir código descritivo para tachas
        let necCodigo = nec.codigo || nec.tipo_demarcacao || nec.tipo || "-";
        if (tipo === "tachas") {
          const necParts = [];
          if (nec.descricao) necParts.push(nec.descricao);
          if (nec.quantidade) necParts.push(`Qtd: ${nec.quantidade}`);
          necCodigo = necParts.length > 0 ? necParts.join(" | ") : "-";
        }

        const item: AuditoriaItem = {
          necessidade_id: nec.id,
          linha_planilha: nec.linha_planilha || 0,
          km: nec.km || nec.km_inicial || 0,
          codigo: necCodigo,
          sigla: nec.sigla || "-",
          descricao: nec.descricao || "-",
          solucao_planilha: nec.solucao_planilha || nec.servico || "-",
          servico: nec.servico || "-",
          tem_match: !!nec.cadastro_id,
          distancia_match: nec.distancia_match_metros,
          cadastro_id: nec.cadastro_id,
          latitude_nec: converterCoordenada(nec.latitude || nec.latitude_inicial) || 0,
          longitude_nec: converterCoordenada(nec.longitude || nec.longitude_inicial) || 0,
        };

        // Se tem match, usar dados do cadastro já carregado
        if (nec.cadastro_id) {
          const cadastro = cadastrosMap.get(nec.cadastro_id);

          if (cadastro) {
            item.latitude_cad = converterCoordenada((cadastro as any).latitude || (cadastro as any).latitude_inicial) || undefined;
            item.longitude_cad = converterCoordenada((cadastro as any).longitude || (cadastro as any).longitude_inicial) || undefined;
            item.km_cad = (cadastro as any).km || (cadastro as any).km_inicial;
            item.sigla_cad = (cadastro as any).sigla || "-";
            item.descricao_cad = (cadastro as any).descricao || "-";
            
            // Construir código descritivo para tachas do cadastro
            if (tipo === "tachas") {
              const cadParts = [];
              if ((cadastro as any).descricao) cadParts.push((cadastro as any).descricao);
              if ((cadastro as any).quantidade) cadParts.push(`Qtd: ${(cadastro as any).quantidade}`);
              item.codigo_cad = cadParts.length > 0 ? cadParts.join(" | ") : "-";
            } else {
              item.codigo_cad = (cadastro as any).codigo || (cadastro as any).tipo_demarcacao || (cadastro as any).tipo || "-";
            }
          }
        }

        auditoriaData.push(item);
      }

      setAuditoria(auditoriaData);

      // Estatísticas
      let totalSubstituicoes, substituicoesSemMatch;
      
      if (tipo === "tachas") {
        // Para tachas, todas são necessidades válidas (não filtramos por substituição)
        totalSubstituicoes = auditoriaData.length;
        substituicoesSemMatch = auditoriaData.filter(i => !i.tem_match).length;
      } else {
        // Para outros tipos, contar apenas substituições
        totalSubstituicoes = auditoriaData.filter(i => 
          i.solucao_planilha?.toLowerCase().includes("substitu")
        ).length;
        substituicoesSemMatch = auditoriaData.filter(i => 
          i.solucao_planilha?.toLowerCase().includes("substitu") && !i.tem_match
        ).length;
      }

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
      setProgressInfo(null);
      setProgress(0);
    }
  };

  const getStatusBadge = (item: AuditoriaItem) => {
    if (tipo === "tachas") {
      // Para tachas, todas são necessidades válidas
      if (!item.tem_match) {
        return <Badge variant="destructive">❌ Sem Match</Badge>;
      }
      return <Badge variant="default">✅ Com Match</Badge>;
    }
    
    // Lógica original para outros tipos
    const ehSubstituicao = item.solucao_planilha?.toLowerCase().includes("substitu");
    
    if (ehSubstituicao && !item.tem_match) {
      return <Badge variant="destructive">❌ Substituir sem Match</Badge>;
    }
    if (ehSubstituicao && item.tem_match) {
      return <Badge variant="default">✅ Substituir com Match</Badge>;
    }
    if (!ehSubstituicao && item.tem_match) {
      return <Badge variant="secondary">⚠️ Implantar com Match</Badge>;
    }
    return <Badge variant="outline">🟢 Implantar sem Match</Badge>;
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

        {/* Botões auditar/cancelar */}
        <div className="flex gap-2">
          <Button
            onClick={handleAuditar}
            disabled={!tipo || !loteId || !rodoviaId || isLoading}
            className="flex-1"
          >
            <Search className="mr-2 h-4 w-4" />
            {isLoading ? "Auditando..." : "Auditar"}
          </Button>

          {isLoading && (
            <Button
              onClick={() => {
                cancelRef.current = true;
                toast({
                  title: "Cancelando...",
                  description: "A auditoria será interrompida",
                });
              }}
              variant="destructive"
              className="flex-shrink-0"
            >
              <StopCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          )}
        </div>

        {/* Barra de progresso */}
        {isLoading && progressInfo && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              Processando: <span className="font-semibold">{progressInfo.current}</span> / {progressInfo.total} necessidades ({progress}%)
            </p>
          </div>
        )}

        {/* Resultados */}
        {auditoria.length > 0 && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Legenda:</strong>
                <br />
                {tipo === "tachas" ? (
                  <>
                    ❌ = Sem match no cadastro (precisa verificar)
                    <br />
                    ✅ = Com match no cadastro
                  </>
                ) : (
                  <>
                    ❌ = Planilha diz "Substituir" mas não há match (PROBLEMA!)
                    <br />
                    ✅ = Substituir com match correto
                    <br />
                    ⚠️ = Implantar mas achou match (pode ser duplicata)
                    <br />
                    🟢 = Implantar sem match (normal)
                  </>
                )}
              </AlertDescription>
            </Alert>

            <div className="rounded-md border max-h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Linha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>KM</TableHead>
                    <TableHead>Sigla</TableHead>
                    <TableHead>Descrição</TableHead>
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
                        tipo === "tachas"
                          ? (!item.tem_match ? "bg-destructive/10" : "")
                          : (item.solucao_planilha?.toLowerCase().includes("substitu") && !item.tem_match
                              ? "bg-destructive/10"
                              : "")
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
                        {item.sigla}
                        {item.sigla_cad && item.sigla !== item.sigla_cad && (
                          <div className="text-xs text-muted-foreground">
                            Cad: {item.sigla_cad}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.descricao}
                        {item.descricao_cad && item.descricao !== item.descricao_cad && (
                          <div className="text-xs text-muted-foreground">
                            Cad: {item.descricao_cad}
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
