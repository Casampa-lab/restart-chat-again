import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const TIPOS_NECESSIDADES = [
  { value: "marcas_longitudinais", label: "Marcas Longitudinais", tabela_nec: "necessidades_marcas_longitudinais", tabela_cad: "ficha_marcas_longitudinais" },
  { value: "tachas", label: "Tachas", tabela_nec: "necessidades_tachas", tabela_cad: "ficha_tachas" },
  { value: "marcas_transversais", label: "Zebrados (Marcas Transversais)", tabela_nec: "necessidades_inscricoes", tabela_cad: "ficha_inscricoes" },
  { value: "cilindros", label: "Cilindros Delimitadores", tabela_nec: "necessidades_cilindros", tabela_cad: "ficha_cilindros" },
  { value: "placas", label: "Placas", tabela_nec: "necessidades_placas", tabela_cad: "ficha_placa" },
  { value: "porticos", label: "Pórticos", tabela_nec: "necessidades_porticos", tabela_cad: "ficha_porticos" },
  { value: "defensas", label: "Defensas", tabela_nec: "necessidades_defensas", tabela_cad: "defensas" },
];

interface ResultadoDiagnostico {
  necessidade_id: string;
  nec_km: number;
  nec_lat: number;
  nec_long: number;
  nec_codigo: string;
  nec_solucao: string;
  cadastro_mais_proximo_id: string | null;
  cad_km: number | null;
  cad_lat: number | null;
  cad_long: number | null;
  cad_codigo: string | null;
  distancia_metros: number | null;
}

export function DiagnosticoMatch() {
  const [tipoServico, setTipoServico] = useState<string>("");
  const [loteId, setLoteId] = useState<string>("");
  const [rodoviaId, setRodoviaId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [resultados, setResultados] = useState<ResultadoDiagnostico[]>([]);
  const { toast } = useToast();

  // Buscar lotes
  const { data: lotes } = useQuery({
    queryKey: ["lotes"],
    queryFn: async () => {
      const { data } = await supabase.from("lotes").select("*").order("numero");
      return data || [];
    },
  });

  // Buscar rodovias
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

  const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    // Fórmula de Haversine
    const R = 6371000; // Raio da Terra em metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleDiagnostico = async () => {
    if (!tipoServico || !loteId || !rodoviaId) {
      toast({
        title: "Erro",
        description: "Selecione tipo de serviço, lote e rodovia",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResultados([]);

    try {
      const tipoConfig = TIPOS_NECESSIDADES.find(t => t.value === tipoServico);
      if (!tipoConfig) throw new Error("Tipo de serviço inválido");

      // Determinar campos de coordenadas baseado no tipo
      const usaLatLongInicial = tipoServico !== "placas" && tipoServico !== "porticos";
      const latField = usaLatLongInicial ? "latitude_inicial" : "latitude";
      const longField = usaLatLongInicial ? "longitude_inicial" : "longitude";

      // 1. Buscar necessidades para match
      let query = supabase
        .from(tipoConfig.tabela_nec as any)
        .select("*")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId);

      // Para marcas longitudinais, filtrar por Posição = 'E' (eixo)
      // Para tachas, não filtrar (todas são necessidades)
      // Para outros tipos, filtrar por solucao_planilha contendo "substitu"
      if (tipoServico === "marcas_longitudinais") {
        query = query.eq("posicao", "E");
      } else if (tipoServico !== "tachas") {
        query = query.ilike("solucao_planilha", "%substitu%");
      }

      const { data: necessidades, error: necError } = await query.limit(50);

      if (necError) throw necError;
      if (!necessidades || necessidades.length === 0) {
        let descricao = "Nenhuma necessidade encontrada";
        if (tipoServico === "marcas_longitudinais") {
          descricao = "Nenhuma marca longitudinal de eixo (Posição = E) encontrada";
        } else if (tipoServico === "tachas") {
          descricao = "Nenhuma tacha encontrada para este lote/rodovia";
        }
        toast({
          title: "Sem dados",
          description: descricao,
        });
        setIsLoading(false);
        return;
      }

      // 2. Buscar todos os cadastros da rodovia
      const { data: cadastros, error: cadError } = await supabase
        .from(tipoConfig.tabela_cad as any)
        .select("*")
        .eq("rodovia_id", rodoviaId);

      if (cadError) throw cadError;

      const cadastroLatField = usaLatLongInicial ? "latitude_inicial" : "latitude";
      const cadastroLongField = usaLatLongInicial ? "longitude_inicial" : "longitude";

      console.log("🔍 Diagnóstico Match:");
      console.log(`- Tipo: ${tipoConfig.label}`);
      console.log(`- Necessidades encontradas: ${necessidades.length}`);
      console.log(`- Cadastro encontrado: ${cadastros?.length || 0}`);
      console.log(`- Cadastro com coordenadas: ${cadastros?.filter((c: any) => c[cadastroLatField] && c[cadastroLongField]).length || 0}`);

      const diagnosticos: ResultadoDiagnostico[] = [];

      // 3. Para cada necessidade, encontrar o cadastro mais próximo
      for (const nec of (necessidades as any[])) {
        let maisProximo = null;
        let menorDistancia = Infinity;

        const necLat = converterCoordenada(nec[latField]);
        const necLong = converterCoordenada(nec[longField]);

        if (cadastros && necLat !== null && necLong !== null) {
          for (const cad of (cadastros as any[])) {
            const cadLat = converterCoordenada(cad[cadastroLatField]);
            const cadLong = converterCoordenada(cad[cadastroLongField]);
            
            if (cadLat !== null && cadLong !== null) {
              const dist = calcularDistancia(necLat, necLong, cadLat, cadLong);
              
              if (dist < menorDistancia) {
                menorDistancia = dist;
                maisProximo = cad;
              }
            }
          }
        }

        // Construir código descritivo para tachas
        let necCodigo = nec.codigo || nec.tipo_demarcacao || nec.tipo || "-";
        let cadCodigo = maisProximo?.codigo || maisProximo?.tipo_demarcacao || maisProximo?.tipo || null;
        
        if (tipoServico === "tachas") {
          const necParts = [];
          if (nec.descricao) necParts.push(nec.descricao);
          if (nec.quantidade) necParts.push(`Qtd: ${nec.quantidade}`);
          necCodigo = necParts.length > 0 ? necParts.join(" | ") : "-";
          
          if (maisProximo) {
            const cadParts = [];
            if (maisProximo.descricao) cadParts.push(maisProximo.descricao);
            if (maisProximo.quantidade) cadParts.push(`Qtd: ${maisProximo.quantidade}`);
            cadCodigo = cadParts.length > 0 ? cadParts.join(" | ") : null;
          }
        }

        diagnosticos.push({
          necessidade_id: nec.id,
          nec_km: nec.km || nec.km_inicial || 0,
          nec_lat: necLat || 0,
          nec_long: necLong || 0,
          nec_codigo: necCodigo,
          nec_solucao: nec.solucao_planilha,
          cadastro_mais_proximo_id: maisProximo?.id || null,
          cad_km: maisProximo?.km || maisProximo?.km_inicial || null,
          cad_lat: converterCoordenada(maisProximo?.[cadastroLatField]) || null,
          cad_long: converterCoordenada(maisProximo?.[cadastroLongField]) || null,
          cad_codigo: cadCodigo,
          distancia_metros: menorDistancia !== Infinity ? menorDistancia : null,
        });
      }

      setResultados(diagnosticos);

      // Estatísticas detalhadas
      const comMatchPerto = diagnosticos.filter(d => d.distancia_metros && d.distancia_metros <= 100).length;
      const comMatchMedio = diagnosticos.filter(d => d.distancia_metros && d.distancia_metros > 100 && d.distancia_metros <= 500).length;
      const comMatchLonge = diagnosticos.filter(d => d.distancia_metros && d.distancia_metros > 500 && d.distancia_metros <= 2000).length;
      const semMatch = diagnosticos.filter(d => !d.distancia_metros || d.distancia_metros > 2000).length;
      const semCoordenadas = necessidades.filter((n: any) => !n[latField] || !n[longField]).length;
      const cadastroSemCoordenadas = cadastros?.filter((c: any) => !c[cadastroLatField] || !c[cadastroLongField]).length || 0;

      if (cadastros?.length === 0) {
        toast({
          title: "❌ Sem cadastro",
          description: `Encontradas ${necessidades.length} necessidades, mas não há itens cadastrados para esta rodovia. É necessário importar o inventário primeiro.`,
          variant: "destructive",
        });
      } else if (cadastroSemCoordenadas === cadastros?.length) {
        toast({
          title: "❌ Cadastro sem coordenadas",
          description: `Há ${cadastros.length} itens cadastrados, mas NENHUM tem coordenadas. O inventário precisa ter lat/long.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Diagnóstico concluído",
          description: `Necessidades: ${necessidades.length} | Cadastro: ${cadastros?.length || 0} (${cadastroSemCoordenadas} sem coords) | Match <100m: ${comMatchPerto} | 100-500m: ${comMatchMedio} | 500m-2km: ${comMatchLonge} | >2km: ${semMatch}`,
        });
      }

    } catch (error: any) {
      toast({
        title: "Erro no diagnóstico",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDistanciaColor = (distancia: number | null) => {
    if (distancia === null || distancia === undefined) return "destructive";
    if (distancia <= 100) return "default";
    if (distancia <= 500) return "secondary";
    return "destructive";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Diagnóstico de Match de Coordenadas
        </CardTitle>
        <CardDescription>
          Verificar distâncias entre necessidades e cadastro (Marcas Longitudinais: apenas eixo | Outros: substituição)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de Serviço</Label>
          <Select value={tipoServico} onValueChange={(value) => {
            setTipoServico(value);
            setLoteId("");
            setRodoviaId("");
            setResultados([]);
          }} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de serviço" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_NECESSIDADES.map(tipo => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Lote</Label>
            <Select value={loteId} onValueChange={(value) => {
              setLoteId(value);
              setRodoviaId("");
            }} disabled={isLoading || !tipoServico}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o lote" />
              </SelectTrigger>
              <SelectContent>
                {lotes?.map(lote => (
                  <SelectItem key={lote.id} value={lote.id}>
                    Lote {lote.numero}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
        </div>

        <Button
          onClick={handleDiagnostico}
          disabled={!tipoServico || !loteId || !rodoviaId || isLoading}
          className="w-full"
        >
          <Search className="mr-2 h-4 w-4" />
          {isLoading ? "Diagnosticando..." : "Executar Diagnóstico (50 primeiras)"}
        </Button>

        {resultados.length > 0 && (
          <div className="rounded-md border max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KM Nec.</TableHead>
                  <TableHead>Código Nec.</TableHead>
                  <TableHead>KM Cadastro</TableHead>
                  <TableHead>Código Cadastro</TableHead>
                  <TableHead>Distância</TableHead>
                  <TableHead>Coords Nec.</TableHead>
                  <TableHead>Coords Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultados.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.nec_km?.toFixed(3)}</TableCell>
                    <TableCell>{item.nec_codigo}</TableCell>
                    <TableCell>
                      {item.cad_km ? item.cad_km.toFixed(3) : "-"}
                    </TableCell>
                    <TableCell>{item.cad_codigo || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={getDistanciaColor(item.distancia_metros)}>
                        {item.distancia_metros !== null && item.distancia_metros !== undefined
                          ? `${Math.round(item.distancia_metros)}m`
                          : "Sem match"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.nec_lat?.toFixed(6)}, {item.nec_long?.toFixed(6)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.cad_lat 
                        ? `${item.cad_lat.toFixed(6)}, ${item.cad_long?.toFixed(6)}`
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
