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
        .limit(10); // Limitar para teste

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

      const diagnosticos: ResultadoDiagnostico[] = [];

      // 3. Para cada necessidade, encontrar a placa mais próxima
      for (const nec of (necessidades as any[])) {
        let maisProximo = null;
        let menorDistancia = Infinity;

        if (cadastros && nec.latitude && nec.longitude) {
          for (const cad of (cadastros as any[])) {
            if (cad.latitude && cad.longitude) {
              const dist = calcularDistancia(
                nec.latitude, 
                nec.longitude, 
                cad.latitude, 
                cad.longitude
              );
              
              if (dist < menorDistancia) {
                menorDistancia = dist;
                maisProximo = cad;
              }
            }
          }
        }

        diagnosticos.push({
          necessidade_id: nec.id,
          nec_km: nec.km,
          nec_lat: nec.latitude,
          nec_long: nec.longitude,
          nec_codigo: nec.codigo || "-",
          nec_solucao: nec.solucao_planilha,
          cadastro_mais_proximo_id: maisProximo?.id || null,
          cad_km: maisProximo?.km || null,
          cad_lat: maisProximo?.latitude || null,
          cad_long: maisProximo?.longitude || null,
          cad_codigo: maisProximo?.codigo || null,
          distancia_metros: menorDistancia !== Infinity ? menorDistancia : null,
        });
      }

      setResultados(diagnosticos);

      // Estatísticas
      const comMatchPerto = diagnosticos.filter(d => d.distancia_metros && d.distancia_metros <= 50).length;
      const comMatchLonge = diagnosticos.filter(d => d.distancia_metros && d.distancia_metros > 50 && d.distancia_metros <= 500).length;
      const semMatch = diagnosticos.filter(d => !d.distancia_metros || d.distancia_metros > 500).length;

      toast({
        title: "Diagnóstico concluído",
        description: `${comMatchPerto} com match < 50m | ${comMatchLonge} entre 50-500m | ${semMatch} sem match > 500m`,
      });

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
    if (distancia <= 50) return "default";
    if (distancia <= 200) return "secondary";
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
          {isLoading ? "Diagnosticando..." : "Executar Diagnóstico (10 primeiras)"}
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
