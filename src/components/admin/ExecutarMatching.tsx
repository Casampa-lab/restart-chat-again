import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { matchPontual, matchLinear, matchLinearKm, buildLineStringWKT, MatchResult } from "@/lib/matchingService";
import { Play, CheckCircle, XCircle, Loader2 } from "lucide-react";

type TipoElemento = "PLACA" | "PORTICO" | "INSCRICAO" | "MARCA_LONG" | "TACHAS" | "DEFENSA" | "CILINDRO" | "TODOS";

/** Mapeamento: tipo → tabela de necessidades */
const TIPO_TO_TABLE_MAP: Record<TipoElemento, string> = {
  PLACA: "necessidades_placas",
  PORTICO: "necessidades_porticos",
  INSCRICAO: "necessidades_marcas_transversais",
  MARCA_LONG: "necessidades_marcas_longitudinais",
  TACHAS: "necessidades_tachas",
  DEFENSA: "necessidades_defensas",
  CILINDRO: "necessidades_cilindros",
  TODOS: "", // não usado
};

/** ---------- Utils de normalização (comuns) ---------- */

const norm = (v: unknown) => (v ?? "").toString().trim().toUpperCase();

const normNoSpaces = (v: unknown) => norm(v).replace(/\s+/g, "");

const normLado = (v: unknown) => {
  const s = norm(v);
  if (s === "D" || s === "DIREITA") return "BD";
  if (s === "E" || s === "ESQUERDA") return "BE";
  if (s === "EIXO" || s === "CANTEIRO") return "EIXO";
  // já está padronizado?
  if (s === "BD" || s === "BE") return s;
  return s || null;
};

const hasGPSPontual = (n: any) => n?.latitude_inicial != null && n?.longitude_inicial != null;

const hasKMPontual = (n: any) => n?.km_inicial != null;

/** ---------- Componente ---------- */

export function ExecutarMatching() {
  const { toast } = useToast();
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoElemento>("TODOS");
  const [executando, setExecutando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [tipoAtual, setTipoAtual] = useState<string>("");
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    processados: 0,
    matches: 0,
    substituicoes: 0,
    ambiguos: 0,
    semMatch: 0,
    erros: 0,
  });

  const executarMatching = async () => {
    setExecutando(true);
    setProgresso(0);
    setTipoAtual("");
    setEstatisticas({ total: 0, processados: 0, matches: 0, substituicoes: 0, ambiguos: 0, semMatch: 0, erros: 0 });

    try {
      // ✅ VALIDAR SESSÃO ATIVA
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "❌ Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return;
      }

      const { data: session, error: sessionError } = await supabase
        .from("sessoes_trabalho")
        .select("lote_id, rodovia_id")
        .eq("user_id", user.id)
        .eq("ativa", true)
        .maybeSingle();

      if (sessionError || !session) {
        toast({
          title: "❌ Nenhuma Sessão Ativa",
          description: "Inicie uma sessão de trabalho antes de executar o matching",
          variant: "destructive",
        });
        return;
      }

      console.log("✅ Matching autorizado para sessão:", {
        lote_id: session.lote_id,
        rodovia_id: session.rodovia_id,
      });

      const tipos: Exclude<TipoElemento, "TODOS">[] =
        tipoSelecionado === "TODOS"
          ? ["PLACA", "PORTICO", "INSCRICAO", "MARCA_LONG", "TACHAS", "DEFENSA", "CILINDRO"]
          : [tipoSelecionado as Exclude<TipoElemento, "TODOS">];

      let totalNecessidades = 0;
      let processados = 0;
      const stats = { matches: 0, substituicoes: 0, ambiguos: 0, semMatch: 0, erros: 0 };

      for (const tipo of tipos) {
        setTipoAtual(tipo);
        const tabela = TIPO_TO_TABLE_MAP[tipo];
        if (!tabela) continue;

        // 1) Buscar necessidades PENDENTES (ainda sem decisão) - com paginação
        let todasNecessidades: any[] = [];
        let page = 0;
        const pageSize = 5000; // ⚡ Otimizado: reduz chamadas ao banco
        let hasMore = true;

        console.log(`📥 Buscando ${tipo} em páginas de ${pageSize}...`);

        while (hasMore) {
          const { data: batch, error: batchError } = await supabase
            .from(tabela as any)
            .select("*")
            .is("match_decision", null)
            .eq("lote_id", session.lote_id) // ✅ FILTRAR POR LOTE DA SESSÃO
            .eq("rodovia_id", session.rodovia_id) // ✅ FILTRAR POR RODOVIA DA SESSÃO
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (batchError) {
            console.error(`❌ Erro ao buscar ${tipo} (página ${page}):`, batchError);
            stats.erros++;
            break;
          }

          if (!batch || batch.length === 0) {
            hasMore = false;
          } else {
            todasNecessidades.push(...batch);
            console.log(`📄 Página ${page}: ${batch.length} registros. Total acumulado: ${todasNecessidades.length}`);
            page++;
            
            if (batch.length < pageSize) {
              hasMore = false;
            }
          }
        }

        let necessidades = todasNecessidades;
        const error = null; // para compatibilidade com código existente

        if (error) {
          console.error(`❌ Erro ao buscar ${tipo}:`, error);
          stats.erros++;
          continue;
        }

        // Filtro adicional para INSCRICAO: só processar registros com tipo_inscricao e sigla
        if (tipo === "INSCRICAO" && necessidades) {
          necessidades = necessidades.filter(
            (n: any) => n.tipo_inscricao != null && n.sigla != null
          );
        }

        if (!necessidades?.length) {
          console.log(`ℹ️ Tipo ${tipo}: sem necessidades pendentes.`);
          continue;
        }

        totalNecessidades += necessidades.length;
        setEstatisticas((prev) => ({ ...prev, total: totalNecessidades }));
        console.log(`🔄 ${tipo}: processando ${necessidades.length} itens...`);

        // 2) ⚡ Processar em BATCHES PARALELOS (10-15x mais rápido)
        const BATCH_SIZE = 20;
        
        for (let batchStart = 0; batchStart < necessidades.length; batchStart += BATCH_SIZE) {
          const batch = necessidades.slice(batchStart, batchStart + BATCH_SIZE);
          
          // Processa 20 registros simultaneamente
          const batchResults = await Promise.allSettled(
            batch.map(async (nec: any) => {
              try {
                let result: MatchResult | null = null;

                /** -------- Pontuais -------- */
                if (tipo === "PLACA" || tipo === "PORTICO" || tipo === "INSCRICAO") {
                  const temGPS = hasGPSPontual(nec);
                  const temKM = hasKMPontual(nec);

                  if (!temGPS && !temKM) {
                    console.error(`⚠️ ${tipo} ${nec.id}: sem GPS e sem KM — impossível casar.`);
                    return { success: false, tipo: 'erro' };
                  }
                  if (!temGPS && temKM) {
                    console.warn(`⚠️ ${tipo} ${nec.id}: usando fallback por KM (sem GPS). km_inicial=${nec.km_inicial}`);
                  }

                  // Atributos normalizados por tipo
                  const atributos: Record<string, any> = {};
                  if (tipo === "PLACA") {
                    atributos.codigo = normNoSpaces(nec.codigo);
                    atributos.lado = normLado(nec.lado);
                  }
                  if (tipo === "PORTICO") {
                    atributos.tipo = norm(nec.tipo);
                    atributos.lado = normLado(nec.lado);
                  }
                  if (tipo === "INSCRICAO") {
                    atributos.sigla = norm(nec.sigla ?? nec.codigo ?? nec.texto);
                    atributos.tipo_inscricao = norm(nec.tipo_inscricao ?? nec.tipo);
                    atributos.lado = normLado(nec.lado);
                  }
                  if (temKM) atributos.km_inicial = Number(nec.km_inicial);

                  result = await matchPontual(
                    tipo,
                    temGPS ? Number(nec.latitude_inicial) : null,
                    temGPS ? Number(nec.longitude_inicial) : null,
                    nec.rodovia_id,
                    atributos,
                    nec.servico || "Substituição",
                  );
                } else {
                  /** -------- Lineares (com fallback por KM) -------- */
                  const hasGPSLine =
                    nec.latitude_inicial != null && nec.longitude_inicial != null &&
                    nec.latitude_final   != null && nec.longitude_final   != null;

                  const hasKMLine =
                    nec.km_inicial != null && nec.km_final != null &&
                    Number(nec.km_final) >= Number(nec.km_inicial);

                  if (!hasGPSLine && !hasKMLine) {
                    console.error(`⚠️ ${tipo} ${nec.id}: sem dados suficientes (nem GPS nem KM).`, {
                      km_ini: nec.km_inicial, km_fim: nec.km_final,
                      lat_ini: nec.latitude_inicial, lon_ini: nec.longitude_inicial,
                      lat_fim: nec.latitude_final,   lon_fim: nec.longitude_final,
                    });
                    return { success: false, tipo: 'erro' };
                  }

                  // Atributos normalizados por tipo
                  const atributos: Record<string, any> = {};
                  if (tipo === 'MARCA_LONG') {
                    atributos.tipo_demarcacao = norm(nec.tipo_demarcacao);
                    atributos.cor             = norm(nec.cor);
                    atributos.lado            = normLado(nec.lado);
                  }
                  if (tipo === 'TACHAS') {
                    atributos.corpo         = norm(nec.corpo);
                    atributos.cor_refletivo = norm(nec.cor_refletivo);
                  }
                  if (tipo === 'DEFENSA') {
                    atributos.funcao = norm(nec.funcao);
                    atributos.lado   = normLado(nec.lado);
                  }
                  if (tipo === 'CILINDRO') {
                    atributos.cor_corpo         = norm(nec.cor_corpo);
                    atributos.local_implantacao = norm(nec.local_implantacao);
                  }

                  try {
                    if (hasGPSLine) {
                      const wkt = buildLineStringWKT(
                        Number(nec.latitude_inicial), Number(nec.longitude_inicial),
                        Number(nec.latitude_final),   Number(nec.longitude_final)
                      );
                      result = await matchLinear(
                        tipo, wkt, nec.rodovia_id, atributos, nec.servico || 'Substituição'
                      );
                    } else {
                      console.warn(`⚠️ ${tipo} ${nec.id}: usando fallback por KM (sem GPS). km_inicial=${nec.km_inicial}, km_final=${nec.km_final}`);
                      result = await matchLinearKm(
                        tipo,
                        Number(nec.km_inicial),
                        Number(nec.km_final),
                        nec.rodovia_id,
                        atributos,
                        nec.servico || 'Substituição'
                      );
                    }
                  } catch (e) {
                    console.error(`❌ ERRO MATCH LINEAR — ${tipo} ${nec.id}`, { atributos, e });
                    return { success: false, tipo: 'erro' };
                  }
                }

                // Persiste decisão
                const { error: upErr } = await supabase
                  .from(TIPO_TO_TABLE_MAP[tipo] as any)
                  .update({
                    cadastro_id: result.cadastro_id ?? null,
                    match_decision: result.decision,
                    match_score: result.match_score ?? null,
                    reason_code: result.reason_code ?? null,
                    estado: result.decision === "MATCH_DIRECT" || result.decision === "SUBSTITUICAO" ? "ATIVO" : "PROPOSTO",
                    match_at: new Date().toISOString(),
                  })
                  .eq("id", nec.id);

                if (upErr) {
                  console.error(`❌ Falha ao atualizar necessidade ${tipo} ${nec.id}:`, upErr);
                  return { success: false, tipo: 'erro' };
                }

                return { 
                  success: true, 
                  decision: result.decision,
                  tipo: result.decision === "MATCH_DIRECT" ? 'match' 
                      : result.decision === "SUBSTITUICAO" ? 'substituicao'
                      : result.decision === "AMBIGUOUS" ? 'ambiguo'
                      : 'sem_match'
                };
              } catch (e) {
                console.error(`❌ Erro geral ao processar ${tipo} ${nec?.id}`, e);
                return { success: false, tipo: 'erro' };
              }
            })
          );

          // Processa resultados do batch
          batchResults.forEach((promiseResult) => {
            processados++;
            
            if (promiseResult.status === 'fulfilled' && promiseResult.value.success) {
              const tipo = promiseResult.value.tipo;
              if (tipo === 'match') stats.matches++;
              else if (tipo === 'substituicao') stats.substituicoes++;
              else if (tipo === 'ambiguo') stats.ambiguos++;
              else if (tipo === 'sem_match') stats.semMatch++;
            } else {
              stats.erros++;
            }
          });

          setProgresso((processados / totalNecessidades) * 100);
          setEstatisticas((prev) => ({ ...prev, processados, ...stats }));

          // ⚡ Throttling: pequena pausa entre batches para não sobrecarregar o banco
          if (batchStart + BATCH_SIZE < necessidades.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      toast({
        title: "✅ Matching Concluído",
        description: `Processadas ${processados} necessidades do lote/rodovia ativo. ${stats.matches} MATCH, ${stats.substituicoes} SUBSTITUIÇÃO, ${stats.ambiguos} AMBÍGUO, ${stats.semMatch} SEM MATCH.`,
      });
    } catch (error) {
      console.error("Erro ao executar matching:", error);
      toast({
        title: "Erro ao executar matching",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setExecutando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Executar Matching
        </CardTitle>
        <CardDescription>
          Associa automaticante necessidades ao inventário, com fallback por KM em pontuais e overlap em lineares.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Elemento</label>
          <Select
            value={tipoSelecionado}
            onValueChange={(v) => setTipoSelecionado(v as TipoElemento)}
            disabled={executando}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os Tipos</SelectItem>
              <SelectItem value="PLACA">Placas</SelectItem>
              <SelectItem value="PORTICO">Pórticos</SelectItem>
              <SelectItem value="INSCRICAO">Inscrições</SelectItem>
              <SelectItem value="MARCA_LONG">Marcas Longitudinais</SelectItem>
              <SelectItem value="TACHAS">Tachas</SelectItem>
              <SelectItem value="DEFENSA">Defensas</SelectItem>
              <SelectItem value="CILINDRO">Cilindros</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={executarMatching} disabled={executando} className="w-full" size="lg">
          {executando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executando...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Executar Matching
            </>
          )}
        </Button>

        {executando && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span>{Math.round(progresso)}%</span>
            </div>
            <Progress value={progresso} />
            <div className="flex flex-col gap-1">
              {tipoAtual && (
                <p className="text-sm font-medium text-primary">
                  Processando: {tipoAtual}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {estatisticas.processados} de {estatisticas.total} processados
              </p>
            </div>
          </div>
        )}

        {estatisticas.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
            <Kpi title="Total" value={estatisticas.total} />
            <Kpi
              title="Matches"
              value={estatisticas.matches}
              color="text-green-600"
              icon={<CheckCircle className="h-4 w-4 text-green-500" />}
            />
            <Kpi title="Substituições" value={estatisticas.substituicoes} color="text-blue-600" />
            <Kpi title="Ambíguos" value={estatisticas.ambiguos} color="text-yellow-600" />
            <Kpi
              title="Sem Match"
              value={estatisticas.semMatch}
              color="text-red-600"
              icon={<XCircle className="h-4 w-4 text-red-500" />}
            />
            <Kpi title="Erros" value={estatisticas.erros} color="text-destructive" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** KPI helper */
function Kpi({
  title,
  value,
  color = "",
  icon,
}: {
  title: string;
  value: number;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-medium">{title}</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
