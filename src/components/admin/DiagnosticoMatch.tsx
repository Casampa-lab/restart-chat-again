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
    if (typeof valor === "number") {
      console.log(`  converterCoordenada: ${valor} é NUMBER, retornando direto`);
      return valor;
    }
    const valorStr = String(valor).replace(",", ".");
    const numero = parseFloat(valorStr);
    console.log(`  converterCoordenada: "${valor}" (${typeof valor}) -> string="${valorStr}" -> numero=${numero}`);
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
    if (!loteId || !rodoviaId) {
      toast({
        title: "Erro",
        description: "Selecione lote e rodovia",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResultados([]);

    try {
      // 1. Buscar necessidades de substituição
      const { data: necessidades, error: necError } = await supabase
        .from("necessidades_placas")
        .select("*")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .ilike("solucao_planilha", "%substitu%")
        .limit(50); // Aumentar para 50 para melhor amostra

      if (necError) throw necError;
      if (!necessidades || necessidades.length === 0) {
        toast({
          title: "Sem dados",
          description: "Nenhuma necessidade de substituição encontrada",
        });
        setIsLoading(false);
        return;
      }

      // 2. Buscar todas as placas do cadastro da rodovia
      const { data: cadastros, error: cadError } = await supabase
        .from("ficha_placa")
        .select("*")
        .eq("rodovia_id", rodoviaId);

      if (cadError) throw cadError;

      console.log("🔍 Diagnóstico Match:");
      console.log(`- Necessidades encontradas: ${necessidades.length}`);
      console.log(`- Cadastro de placas encontrado: ${cadastros?.length || 0}`);
      console.log(`- Cadastro com coordenadas: ${cadastros?.filter((c: any) => c.latitude && c.longitude).length || 0}`);
      
      // Debug: mostrar primeiras necessidades e cadastros
      console.log("📋 Primeira necessidade:", necessidades[0]);
      console.log("📋 Primeiro cadastro:", cadastros?.[0]);

      const diagnosticos: ResultadoDiagnostico[] = [];

      // 3. Para cada necessidade, encontrar a placa mais próxima
      for (const nec of (necessidades as any[])) {
        let maisProximo = null;
        let menorDistancia = Infinity;

        const necLat = converterCoordenada(nec.latitude);
        const necLong = converterCoordenada(nec.longitude);

        console.log(`🔍 Nec KM ${nec.km} (${nec.codigo}): lat BRUTO=${nec.latitude} -> CONVERTIDO=${necLat}, long BRUTO=${nec.longitude} -> CONVERTIDO=${necLong}`);

        if (cadastros && necLat !== null && necLong !== null) {
          let comparacoes = 0;
          let cadastrosValidos = 0;
          for (const cad of (cadastros as any[])) {
            const cadLat = converterCoordenada(cad.latitude);
            const cadLong = converterCoordenada(cad.longitude);
            
            if (cadLat !== null && cadLong !== null) {
              cadastrosValidos++;
              comparacoes++;
              const dist = calcularDistancia(
                necLat, 
                necLong, 
                cadLat, 
                cadLong
              );
              
              // Log apenas para as primeiras 3 placas do cadastro
              if (comparacoes <= 3) {
                console.log(`  Comparando com ${cad.codigo} (KM ${cad.km}): cadLat=${cadLat}, cadLong=${cadLong}, dist=${dist.toFixed(2)}m`);
              }
              
              if (dist < menorDistancia) {
                menorDistancia = dist;
                maisProximo = cad;
                console.log(`  ✅ NOVO MELHOR MATCH: ${cad.codigo} dist=${dist.toFixed(2)}m`);
              }
            } else {
              // Log se cadastro não tem coordenadas válidas
              if (comparacoes < 3) {
                console.log(`  ⚠️ Cadastro ${cad.codigo} sem coords: lat=${cad.latitude} (${cadLat}), long=${cad.longitude} (${cadLong})`);
              }
            }
          }
          console.log(`  Total comparações: ${comparacoes} de ${cadastros.length} cadastros (${cadastrosValidos} válidos)`);
        } else {
          console.log(`  ❌ Necessidade sem coordenadas válidas`);
        }

        diagnosticos.push({
          necessidade_id: nec.id,
          nec_km: nec.km,
          nec_lat: necLat || 0,
          nec_long: necLong || 0,
          nec_codigo: nec.codigo || "-",
          nec_solucao: nec.solucao_planilha,
          cadastro_mais_proximo_id: maisProximo?.id || null,
          cad_km: maisProximo?.km || null,
          cad_lat: converterCoordenada(maisProximo?.latitude) || null,
          cad_long: converterCoordenada(maisProximo?.longitude) || null,
          cad_codigo: maisProximo?.codigo || null,
          distancia_metros: menorDistancia !== Infinity ? menorDistancia : null,
        });
      }

      setResultados(diagnosticos);

      // Estatísticas detalhadas
      const comMatchPerto = diagnosticos.filter(d => d.distancia_metros && d.distancia_metros <= 100).length;
      const comMatchMedio = diagnosticos.filter(d => d.distancia_metros && d.distancia_metros > 100 && d.distancia_metros <= 500).length;
      const comMatchLonge = diagnosticos.filter(d => d.distancia_metros && d.distancia_metros > 500 && d.distancia_metros <= 2000).length;
      const semMatch = diagnosticos.filter(d => !d.distancia_metros || d.distancia_metros > 2000).length;
      const semCoordenadas = necessidades.filter((n: any) => !n.latitude || !n.longitude).length;
      const cadastroSemCoordenadas = cadastros?.filter((c: any) => !c.latitude || !c.longitude).length || 0;
      
      console.log("📊 Resultados:", { comMatchPerto, comMatchMedio, comMatchLonge, semMatch });

      if (cadastros?.length === 0) {
        toast({
          title: "❌ Sem cadastro de placas",
          description: `Encontradas ${necessidades.length} necessidades, mas não há placas cadastradas para esta rodovia. É necessário importar o inventário primeiro.`,
          variant: "destructive",
        });
      } else if (cadastroSemCoordenadas === cadastros?.length) {
        toast({
          title: "❌ Cadastro sem coordenadas",
          description: `Há ${cadastros.length} placas cadastradas, mas NENHUMA tem coordenadas. O inventário precisa ter lat/long.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Diagnóstico concluído",
          description: `Necessidades: ${necessidades.length} | Cadastro: ${cadastros?.length || 0} placas (${cadastroSemCoordenadas} sem coords) | Match <100m: ${comMatchPerto} | 100-500m: ${comMatchMedio} | 500m-2km: ${comMatchLonge} | >2km: ${semMatch}`,
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
    if (!distancia) return "destructive";
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
          Verificar distâncias reais entre necessidades de substituição e cadastro
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          disabled={!loteId || !rodoviaId || isLoading}
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
                        {item.distancia_metros 
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
