import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const TIPOS_ELEMENTOS = [
  { value: "marcas_longitudinais", label: "Marcas Longitudinais", tabela_cadastro: "ficha_marcas_longitudinais", tabela_necessidade: "necessidades_marcas_longitudinais" },
  { value: "tachas", label: "Tachas Refletivas", tabela_cadastro: "ficha_tachas", tabela_necessidade: "necessidades_tachas" },
  { value: "defensas", label: "Defensas", tabela_cadastro: "defensas", tabela_necessidade: "necessidades_defensas" },
];

interface LogEntry {
  tipo: "success" | "warning" | "error" | "info";
  mensagem: string;
}

export function RecalcularMatches() {
  const [tipo, setTipo] = useState<string>("");
  const [loteId, setLoteId] = useState<string>("");
  const [rodoviaId, setRodoviaId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progressInfo, setProgressInfo] = useState<{ current: number; total: number } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // ============= FUNÇÕES DE MATCHING (REUTILIZADAS) =============

  const calcularSobreposicaoKm = (
    nec_km_ini: number, 
    nec_km_fim: number,
    cad_km_ini: number, 
    cad_km_fim: number
  ): { overlap_km: number; porcentagem: number } => {
    const inicio = Math.max(nec_km_ini, cad_km_ini);
    const fim = Math.min(nec_km_fim, cad_km_fim);
    
    if (inicio >= fim) {
      return { overlap_km: 0, porcentagem: 0 };
    }
    
    const overlap_km = fim - inicio;
    const tamanho_necessidade = nec_km_fim - nec_km_ini;
    
    const porcentagem = tamanho_necessidade > 0 
      ? (overlap_km / tamanho_necessidade) * 100 
      : 0;
    
    return { 
      overlap_km: Math.round(overlap_km * 1000) / 1000,
      porcentagem: Math.round(porcentagem * 10) / 10
    };
  };

  const normalizarLado = (lado: string): string => {
    if (!lado) return "";
    const l = lado.toLowerCase().trim();
    if (l.includes("esq") || l === "e") return "esquerdo";
    if (l.includes("dir") || l === "d") return "direito";
    if (l.includes("eix") || l === "c" || l === "central") return "eixo";
    if (l.includes("amb") || l === "ambos") return "ambos";
    return lado;
  };

  const validarLadoPorTipo = (
    tipo: string, 
    ladoNec: string, 
    ladoCad: string
  ): boolean => {
    const config: Record<string, { validar: boolean; estrito: boolean }> = {
      marcas_longitudinais: { validar: true, estrito: true },
      defensas: { validar: true, estrito: true },
      tachas: { validar: true, estrito: false }
    };
    
    const tipoConfig = config[tipo];
    if (!tipoConfig || !tipoConfig.validar) return true;
    
    const ladoNecNorm = normalizarLado(ladoNec);
    const ladoCadNorm = normalizarLado(ladoCad);
    
    if (!ladoNecNorm || !ladoCadNorm) return true;
    
    if (tipoConfig.estrito) {
      return ladoNecNorm === ladoCadNorm;
    }
    
    return ladoNecNorm === ladoCadNorm || 
           ladoNecNorm === "ambos" || 
           ladoCadNorm === "ambos";
  };

  const buscarMatchSegmento = (
    necessidade: { 
      km_inicial: number; 
      km_final: number; 
      lado?: string;
      posicao?: string;
      cor?: string;
      tipo_demarcacao?: string;
      largura_cm?: number;
      local_implantacao?: string;
      corpo?: string;
      refletivo?: string;
      cor_refletivo?: string;
    },
    cadastros: any[],
    tipo: string,
    thresholdOverlap: number = 50
  ): Array<{
    cadastro_id: string;
    overlap_porcentagem: number;
    overlap_km: number;
    tipo_match: string;
  }> => {
    const matches = [];
    
    for (const cad of cadastros) {
      const ladoValido = validarLadoPorTipo(tipo, necessidade.lado || "", cad.lado || "");
      if (!ladoValido) continue;
      
      // VALIDAÇÕES ESPECÍFICAS PARA MARCAS LONGITUDINAIS
      if (tipo === 'marcas_longitudinais') {
        // 1. POSIÇÃO deve ser idêntica (BD, BE, E, CE, CD são elementos DIFERENTES)
        if (necessidade.posicao && cad.posicao && necessidade.posicao !== cad.posicao) {
          continue;
        }
        
        // 2. COR deve ser idêntica (Branco ≠ Amarelo)
        if (necessidade.cor && cad.cor && necessidade.cor !== cad.cor) {
          continue;
        }
        
        // 3. TIPO DE DEMARCAÇÃO deve ser compatível (LBO ≠ LFO-3 ≠ LMS-2)
        if (necessidade.tipo_demarcacao && cad.tipo_demarcacao) {
          if (necessidade.tipo_demarcacao !== cad.tipo_demarcacao) {
            continue;
          }
        }
        
        // 4. LARGURA deve ser compatível (tolerância de ±2cm)
        if (necessidade.largura_cm && cad.largura_cm) {
          const diferencaLargura = Math.abs(necessidade.largura_cm - cad.largura_cm);
          if (diferencaLargura > 2) {
            continue;
          }
        }
      }
      
      // VALIDAÇÕES ESPECÍFICAS PARA TACHAS
      if (tipo === 'tachas') {
        // 1. NÃO permite match com cadastros vazios ("Não se Aplica" ou null)
        if (!cad.local_implantacao || 
            cad.local_implantacao === "Não se Aplica" || 
            cad.local_implantacao.trim() === "") {
          continue; // Sempre rejeita cadastros sem implantação definida
        }
        
        // 2. LOCAL_IMPLANTACAO deve ser idêntico
        if (necessidade.local_implantacao && cad.local_implantacao && 
            necessidade.local_implantacao !== cad.local_implantacao) {
          continue;
        }
        
        // 3. CORPO deve ser compatível
        if (necessidade.corpo && cad.corpo && necessidade.corpo !== cad.corpo) {
          continue;
        }
        
        // 4. REFLETIVO deve ser compatível
        if (necessidade.refletivo && cad.refletivo && 
            necessidade.refletivo !== cad.refletivo) {
          continue;
        }
        
        // 5. COR_REFLETIVO deve ser compatível
        if (necessidade.cor_refletivo && cad.cor_refletivo && 
            necessidade.cor_refletivo !== cad.cor_refletivo) {
          continue;
        }
      }
      
      const { overlap_km, porcentagem } = calcularSobreposicaoKm(
        necessidade.km_inicial,
        necessidade.km_final,
        cad.km_inicial,
        cad.km_final
      );
      
      if (porcentagem >= thresholdOverlap) {
        let tipo_match = '';
        
        if (porcentagem >= 95) {
          tipo_match = 'exato';
        } else if (porcentagem >= 75) {
          tipo_match = 'alto';
        } else {
          tipo_match = 'parcial';
        }
        
        matches.push({
          cadastro_id: cad.id,
          overlap_porcentagem: porcentagem,
          overlap_km,
          tipo_match
        });
      }
    }
    
    return matches.sort((a, b) => b.overlap_porcentagem - a.overlap_porcentagem);
  };

  const buscarMatchPontual = (
    necessidade: { km: number; latitude?: number; longitude?: number; lado?: string },
    cadastros: any[],
    toleranciaKm: number = 0.05
  ): Array<{ cadastro_id: string; distancia_metros: number; diferenca_km: number }> => {
    const matches: Array<{ cadastro_id: string; distancia_metros: number; diferenca_km: number }> = [];

    for (const cadastro of cadastros) {
      // 1. Validar lado (se aplicável)
      if (necessidade.lado && cadastro.lado) {
        const ladoNec = normalizarLado(necessidade.lado);
        const ladoCad = normalizarLado(cadastro.lado);
        if (ladoNec !== ladoCad && ladoNec !== 'ambos' && ladoCad !== 'ambos') {
          continue;
        }
      }

      // 2. Calcular diferença de km
      const diferencaKm = Math.abs(cadastro.km - necessidade.km);
      if (diferencaKm > toleranciaKm) continue;

      // 3. Calcular distância GPS (se disponível)
      let distanciaMetros = null;
      if (necessidade.latitude && necessidade.longitude && 
          cadastro.latitude && cadastro.longitude) {
        distanciaMetros = calcularDistanciaHaversine(
          necessidade.latitude,
          necessidade.longitude,
          cadastro.latitude,
          cadastro.longitude
        );
      }

      matches.push({
        cadastro_id: cadastro.id,
        distancia_metros: distanciaMetros || diferencaKm * 1000,
        diferenca_km: diferencaKm,
      });
    }

    return matches.sort((a, b) => a.distancia_metros - b.distancia_metros);
  };

  const calcularDistanciaHaversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

  // ============= PROCESSO DE RECÁLCULO =============

  const handleRecalcular = async () => {
    if (!tipo || !loteId || !rodoviaId) {
      toast({
        title: "Erro",
        description: "Selecione o tipo, lote e rodovia antes de continuar",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setLogs([]);
    setProgress(0);
    setProgressInfo(null);

    try {
      const tipoConfig = TIPOS_ELEMENTOS.find(t => t.value === tipo);
      if (!tipoConfig) throw new Error("Tipo inválido");

      const { tabela_cadastro, tabela_necessidade } = tipoConfig;

      // 1. Buscar necessidades
      setLogs(prev => [...prev, {
        tipo: "info",
        mensagem: `🔍 Buscando necessidades de ${tipoConfig.label}...`
      }]);

      const { data: necessidadesData, error: errNec } = await supabase
        .from(tabela_necessidade as any)
        .select("*")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId);

      if (errNec) throw errNec;
      
      const necessidades: any[] = necessidadesData || [];

      if (!necessidades || necessidades.length === 0) {
        toast({
          title: "Nenhuma necessidade encontrada",
          description: "Não há necessidades para recalcular nesta rodovia",
        });
        setIsProcessing(false);
        return;
      }

      setLogs(prev => [...prev, {
        tipo: "success",
        mensagem: `✅ ${necessidades.length} necessidades encontradas`
      }]);

      // 2. Buscar cadastros
      setLogs(prev => [...prev, {
        tipo: "info",
        mensagem: `🔍 Buscando cadastro de ${tipoConfig.label}...`
      }]);

      const { data: cadastrosData, error: errCad } = await supabase
        .from(tabela_cadastro as any)
        .select("*")
        .eq("rodovia_id", rodoviaId);

      if (errCad) throw errCad;
      
      const cadastros: any[] = cadastrosData || [];

      setLogs(prev => [...prev, {
        tipo: "success",
        mensagem: `✅ ${cadastros.length} itens no cadastro`
      }]);

      // 3. Buscar tolerância da rodovia
      const { data: rodoviaData } = await supabase
        .from('rodovias')
        .select('tolerancia_match_metros')
        .eq('id', rodoviaId)
        .single();
      
      const tolerancia = rodoviaData?.tolerancia_match_metros || 50;

      setLogs(prev => [...prev, {
        tipo: "info",
        mensagem: `⚙️ Tolerância de matching: ${tolerancia}m`
      }]);

      // 4. Processar cada necessidade
      const total = necessidades.length;
      let matchesEncontrados = 0;
      let divergenciasDetectadas = 0;
      let elementosNovos = 0;
      let erros = 0;

      setProgressInfo({ current: 0, total });

      for (let i = 0; i < necessidades.length; i++) {
        const nec: any = necessidades[i];
        setProgressInfo({ current: i + 1, total });
        setProgress(((i + 1) / total) * 100);

        try {
          // Determinar tipo de geometria baseado no tipo de elemento
          const tipoElementoMap: Record<string, 'linear' | 'pontual'> = {
            'marcas_longitudinais': 'linear',
            'defensas': 'linear',
            'placas': 'pontual',
            'porticos': 'pontual',
            'inscricoes': 'pontual',
            'cilindros': 'pontual',
            'tachas': 'linear'
          };

          const tipoRecorrenteMap: Record<string, boolean> = {
            'marcas_longitudinais': true,
            'inscricoes': true,
            'defensas': false,
            'placas': false,
            'porticos': false,
            'cilindros': false,
            'tachas': true
          };

          const tipoGeometria = tipoElementoMap[tipo] || 'linear';
          const isRecorrente = tipoRecorrenteMap[tipo] || false;

          let matches: any[] = [];
          let cadastro_id = null;
          let distancia_match_metros = null;
          let overlap_porcentagem = null;
          let tipo_match = null;
          let servico_inferido = "Implantar";

          // MATCHING DIFERENCIADO POR GEOMETRIA
          if (tipoGeometria === 'linear') {
            // ELEMENTOS LINEARES
            matches = buscarMatchSegmento(
              {
                km_inicial: parseFloat(nec.km_inicial),
                km_final: parseFloat(nec.km_final),
                lado: nec.lado,
                posicao: nec.posicao,
                cor: nec.cor,
                tipo_demarcacao: nec.tipo_demarcacao,
                largura_cm: nec.largura_cm ? parseFloat(nec.largura_cm) : undefined,
                local_implantacao: nec.local_implantacao,
                corpo: nec.corpo,
                refletivo: nec.refletivo,
                cor_refletivo: nec.cor_refletivo
              },
              cadastros,
              tipo,
              50
            );

            if (matches.length > 0) {
              const melhorMatch = matches[0];
              cadastro_id = melhorMatch.cadastro_id;
              overlap_porcentagem = melhorMatch.overlap_porcentagem;
              tipo_match = melhorMatch.tipo_match;
              matchesEncontrados++;

              const cadastro = cadastros.find((c: any) => c.id === cadastro_id);
              if (cadastro && nec.latitude_inicial && nec.longitude_inicial && 
                  cadastro.latitude_inicial && cadastro.longitude_inicial) {
                distancia_match_metros = Math.round(
                  calcularDistanciaHaversine(
                    parseFloat(nec.latitude_inicial),
                    parseFloat(nec.longitude_inicial),
                    parseFloat(cadastro.latitude_inicial),
                    parseFloat(cadastro.longitude_inicial)
                  )
                );
              }
            }
          } else if (tipoGeometria === 'pontual') {
            // ELEMENTOS PONTUAIS
            matches = buscarMatchPontual(
              {
                km: parseFloat(nec.km_inicial || nec.km),
                latitude: nec.latitude_inicial || nec.latitude,
                longitude: nec.longitude_inicial || nec.longitude,
                lado: nec.lado
              },
              cadastros,
              0.05
            );

            if (matches.length > 0) {
              const melhorMatch = matches[0];
              cadastro_id = melhorMatch.cadastro_id;
              distancia_match_metros = melhorMatch.distancia_metros;
              tipo_match = 'pontual';
              matchesEncontrados++;
            }
          }

          // INFERIR SERVIÇO
          if (cadastro_id) {
            const sinaisRemocao = [
              nec.quantidade === 0 || nec.quantidade === "0",
              nec.extensao_metros === 0 || nec.extensao_metros === "0",
              nec.solucao_planilha?.toLowerCase().includes("remov"),
            ];
            servico_inferido = sinaisRemocao.some(Boolean) ? "Remover" : "Substituir";
          } else {
            elementosNovos++;
            servico_inferido = "Implantar";
          }

          // Normalizar solucao_planilha
          const normalizarServico = (s: string | null): string => {
            if (!s) return "";
            const sLower = s.toLowerCase().trim();
            if (sLower.includes("implant") || sLower.includes("instal")) return "Implantar";
            if (sLower.includes("substit") || sLower.includes("troca")) return "Substituir";
            if (sLower.includes("remov") || sLower.includes("desativ") || sLower.includes("retirar")) return "Remover";
            if (sLower.includes("manter") || sLower.includes("manutenção")) return "Manter";
            return s;
          };

          const solucaoPlanilhaNormalizada = normalizarServico(nec.solucao_planilha);

          // LÓGICA DE RECORRÊNCIA
          let servicoFinal: string;
          let divergencia: boolean;

          if (isRecorrente) {
            // ELEMENTOS RECORRENTES (Marcas, Inscrições)
            if (cadastro_id) {
              servicoFinal = "Substituir";
              divergencia = false;
            } else {
              servicoFinal = "Implantar";
              divergencia = false;
            }
            if (solucaoPlanilhaNormalizada) {
              servicoFinal = solucaoPlanilhaNormalizada;
              divergencia = (solucaoPlanilhaNormalizada !== servico_inferido);
            }
          } else {
            // ELEMENTOS NÃO-RECORRENTES (Placas, Defensas, etc)
            if (cadastro_id) {
              servicoFinal = servico_inferido;
              divergencia = true;
            } else {
              servicoFinal = "Implantar";
              divergencia = false;
            }
            if (solucaoPlanilhaNormalizada) {
              servicoFinal = solucaoPlanilhaNormalizada;
              divergencia = (solucaoPlanilhaNormalizada !== servico_inferido);
            }
          }

          if (divergencia) {
            divergenciasDetectadas++;
          }

          // Preparar dados de atualização
          const updateData: any = {
            servico_inferido,
            servico_final: servicoFinal,
            servico: servicoFinal,
            divergencia,
            reconciliado: false,
            status_revisao: 'ok'
          };

          if (cadastro_id !== null) updateData.cadastro_id = cadastro_id;
          if (distancia_match_metros !== null) updateData.distancia_match_metros = distancia_match_metros;
          if (overlap_porcentagem !== null) updateData.overlap_porcentagem = overlap_porcentagem;
          if (tipo_match !== null) updateData.tipo_match = tipo_match;

          // Atualizar necessidade
          const { error: updateError } = await supabase
            .from(tabela_necessidade as any)
            .update(updateData)
            .eq("id", nec.id);

          if (updateError) throw updateError;

          // Log a cada 10 processados
          if ((i + 1) % 10 === 0) {
            const tipoIcon = tipoGeometria === 'linear' ? '📏' : '📍';
            const matchIcon = cadastro_id ? "✅" : "🆕";
            const divIcon = divergencia ? " ⚠️" : "";
            const recorrenteIcon = isRecorrente ? " 🔄" : "";
            
            setLogs(prev => [...prev, {
              tipo: divergencia ? "warning" : "success",
              mensagem: `${tipoIcon}${matchIcon} [${i + 1}/${total}] ${tipoConfig.label}: ${servicoFinal}${divIcon}${recorrenteIcon}`
            }]);
          }

        } catch (error: any) {
          erros++;
          setLogs(prev => [...prev, {
            tipo: "error",
            mensagem: `❌ Erro ao processar item ${nec.id}: ${error.message}`
          }]);
        }
      }

      // Resumo final
      setLogs(prev => [...prev, 
        { tipo: "success", mensagem: `\n🎉 RECÁLCULO CONCLUÍDO!` },
        { tipo: "info", mensagem: `📊 Total processado: ${total}` },
        { tipo: "success", mensagem: `✅ Matches encontrados: ${matchesEncontrados}` },
        { tipo: "warning", mensagem: `⚠️ Divergências detectadas: ${divergenciasDetectadas}` },
        { tipo: "info", mensagem: `🆕 Elementos novos (sem match): ${elementosNovos}` },
        ...(erros > 0 ? [{ tipo: "error" as const, mensagem: `❌ Erros: ${erros}` }] : [])
      ]);

      toast({
        title: "Recálculo Concluído",
        description: `${matchesEncontrados} matches encontrados, ${divergenciasDetectadas} divergências detectadas`,
      });

      // Invalidar cache para atualizar viewers automaticamente
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('necessidades-match') || 
                 key?.includes('inventario-') ||
                 key === 'necessidades';
        }
      });

    } catch (error: any) {
      console.error("Erro no recálculo:", error);
      setLogs(prev => [...prev, {
        tipo: "error",
        mensagem: `❌ Erro fatal: ${error.message}`
      }]);
      toast({
        title: "Erro no Recálculo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgressInfo(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Recalcular Matches (Inventário ↔ Necessidades)
        </CardTitle>
        <CardDescription>
          Recalcula os vínculos entre cadastro e necessidades para elementos lineares, atualizando divergências e matches
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Elemento</label>
            <Select value={tipo} onValueChange={setTipo} disabled={isProcessing}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_ELEMENTOS.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lote</label>
            <Select value={loteId} onValueChange={setLoteId} disabled={isProcessing}>
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
            <label className="text-sm font-medium">Rodovia</label>
            <Select value={rodoviaId} onValueChange={setRodoviaId} disabled={isProcessing || !loteId}>
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
          onClick={handleRecalcular}
          disabled={!tipo || !loteId || !rodoviaId || isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Recalculando... {progressInfo && `(${progressInfo.current}/${progressInfo.total})`}
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recalcular Matches
            </>
          )}
        </Button>

        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            {progressInfo && (
              <p className="text-sm text-center text-muted-foreground">
                Processando {progressInfo.current} de {progressInfo.total}
              </p>
            )}
          </div>
        )}

        {logs.length > 0 && (
          <div className="border rounded-lg p-4 max-h-96 overflow-y-auto space-y-2 bg-muted/30">
            <div className="font-medium text-sm mb-2">Log de Processamento:</div>
            {logs.map((log, index) => (
              <Alert
                key={index}
                variant={log.tipo === "error" ? "destructive" : "default"}
                className="py-2"
              >
                <div className="flex items-start gap-2">
                  {log.tipo === "success" && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />}
                  {log.tipo === "warning" && <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />}
                  {log.tipo === "error" && <XCircle className="h-4 w-4 text-destructive mt-0.5" />}
                  {log.tipo === "info" && <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />}
                  <AlertDescription className="text-xs font-mono whitespace-pre-wrap">
                    {log.mensagem}
                  </AlertDescription>
                </div>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
