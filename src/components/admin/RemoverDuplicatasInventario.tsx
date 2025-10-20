import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface LogEntry {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

interface Stats {
  gruposEncontrados: number;
  registrosRemovidos: number;
  necessidadesReassociadas: number;
}

const TIPOS_ELEMENTOS = [
  {
    value: 'marcas_longitudinais',
    label: 'Marcas Longitudinais',
    tabela_cadastro: 'ficha_marcas_longitudinais',
    tabela_necessidade: 'necessidades_marcas_longitudinais',
    coluna_referencia: 'cadastro_id',
    campos_chave: ['snv', 'tipo_demarcacao', 'posicao', 'cor', 'largura_cm', 'km_inicial', 'km_final', 'rodovia_id', 'lote_id'],
  },
  {
    value: 'tachas',
    label: 'Tachas',
    tabela_cadastro: 'ficha_tachas',
    tabela_necessidade: 'necessidades_tachas',
    coluna_referencia: 'cadastro_id',
    campos_chave: ['snv', 'corpo', 'refletivo', 'cor_refletivo', 'local_implantacao', 'km_inicial', 'km_final', 'rodovia_id', 'lote_id'],
  },
  {
    value: 'cilindros',
    label: 'Cilindros',
    tabela_cadastro: 'ficha_cilindros',
    tabela_necessidade: 'necessidades_cilindros',
    coluna_referencia: 'cadastro_id',
    campos_chave: ['snv', 'local_implantacao', 'cor_corpo', 'cor_refletivo', 'tipo_refletivo', 'km_inicial', 'km_final', 'rodovia_id', 'lote_id'],
  },
  {
    value: 'inscricoes',
    label: 'Inscrições (Marcas Transversais)',
    tabela_cadastro: 'ficha_inscricoes',
    tabela_necessidade: 'necessidades_marcas_transversais',
    coluna_referencia: 'cadastro_id',
    campos_chave: ['snv', 'sigla', 'tipo_inscricao', 'km_inicial', 'km_final', 'rodovia_id', 'lote_id'],
  },
  {
    value: 'defensas',
    label: 'Defensas',
    tabela_cadastro: 'defensas',
    tabela_necessidade: 'necessidades_defensas',
    coluna_referencia: 'cadastro_id',
    campos_chave: ['id_defensa', 'lado', 'funcao', 'especificacao_obstaculo_fixo', 'nivel_contencao_en1317', 'nivel_contencao_nchrp350', 'geometria', 'km_inicial', 'km_final', 'rodovia_id', 'lote_id'],
  },
  {
    value: 'porticos',
    label: 'Pórticos',
    tabela_cadastro: 'ficha_porticos',
    tabela_necessidade: 'necessidades_porticos',
    coluna_referencia: 'cadastro_id',
    campos_chave: ['snv', 'tipo', 'lado', 'vao_horizontal_m', 'altura_livre_m', 'km', 'rodovia_id', 'lote_id'],
  },
  {
    value: 'placas',
    label: 'Placas',
    tabela_cadastro: 'ficha_placa',
    tabela_necessidade: 'necessidades_placas',
    coluna_referencia: 'cadastro_id',
    campos_chave: ['snv', 'codigo', 'km', 'rodovia_id', 'lote_id'],
  },
];

interface RemoverDuplicatasInventarioProps {
  loteId?: string;
  rodoviaId?: string;
}

export function RemoverDuplicatasInventario({ loteId: propLoteId, rodoviaId: propRodoviaId }: RemoverDuplicatasInventarioProps = {}) {
  const [tipo, setTipo] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ gruposEncontrados: 0, registrosRemovidos: 0, necessidadesReassociadas: 0 });

  const queryClient = useQueryClient();

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev, { type, message }]);
  };

  const gerarChaveGrupo = (registro: any, campos: string[]): string => {
    return campos.map(campo => String(registro[campo] || '')).join('|');
  };

  const handleRemoverDuplicatas = async () => {
    if (!tipo || !propLoteId || !propRodoviaId) {
      toast.error("Selecione tipo, lote e rodovia no topo da página");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setLogs([]);
    setStats({ gruposEncontrados: 0, registrosRemovidos: 0, necessidadesReassociadas: 0 });

    try {
      const config = TIPOS_ELEMENTOS.find(t => t.value === tipo);
      if (!config) throw new Error("Tipo inválido");

      addLog('info', `🔍 Buscando registros de ${config.label}...`);

      // Buscar todos os registros do tipo
      const { data: registros, error: errorRegistros } = await supabase
        .from(config.tabela_cadastro as any)
        .select('*')
        .eq('lote_id', propLoteId)
        .eq('rodovia_id', propRodoviaId);

      if (errorRegistros) throw errorRegistros;
      if (!registros || registros.length === 0) {
        addLog('warning', 'Nenhum registro encontrado');
        toast.warning("Nenhum registro encontrado");
        setIsProcessing(false);
        return;
      }

      addLog('info', `📊 Total de registros: ${registros.length}`);

      // Agrupar por campos-chave
      const grupos = new Map<string, any[]>();
      registros.forEach(reg => {
        const chave = gerarChaveGrupo(reg, config.campos_chave);
        if (!grupos.has(chave)) {
          grupos.set(chave, []);
        }
        grupos.get(chave)!.push(reg);
      });

      // Filtrar apenas grupos com duplicatas
      const gruposDuplicados = Array.from(grupos.values()).filter(grupo => grupo.length > 1);

      if (gruposDuplicados.length === 0) {
        addLog('success', '✅ Nenhuma duplicata encontrada!');
        toast.success("Nenhuma duplicata encontrada");
        setIsProcessing(false);
        return;
      }

      addLog('warning', `⚠️ ${gruposDuplicados.length} grupos de duplicatas encontrados`);
      setStats(prev => ({ ...prev, gruposEncontrados: gruposDuplicados.length }));

      let totalRemovidos = 0;
      let totalReassociados = 0;

      // Processar cada grupo de duplicatas
      for (let i = 0; i < gruposDuplicados.length; i++) {
        const grupo = gruposDuplicados[i];
        setProgress(((i + 1) / gruposDuplicados.length) * 100);

        // Buscar qual registro tem necessidades associadas
        const idsGrupo = grupo.map(r => r.id);
        const { data: necessidades } = await supabase
          .from(config.tabela_necessidade as any)
          .select('id, ' + config.coluna_referencia)
          .in(config.coluna_referencia, idsGrupo);

        let idManter: string;
        const idsComNecessidade = necessidades?.map(n => n[config.coluna_referencia]) || [];

        if (idsComNecessidade.length > 0) {
          // Manter o primeiro que tem necessidade
          idManter = idsComNecessidade[0];
        } else {
          // Manter o mais antigo (created_at)
          const maisAntigo = grupo.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )[0];
          idManter = maisAntigo.id;
        }

        const idsRemover = grupo.filter(r => r.id !== idManter).map(r => r.id);

        // Reassociar necessidades órfãs ao registro mantido
        if (idsRemover.length > 0 && necessidades && necessidades.length > 0) {
          const necessidadesOrfas = necessidades.filter((n: any) => idsRemover.includes(n[config.coluna_referencia]));
          
          if (necessidadesOrfas.length > 0) {
            const { error: errorUpdate } = await supabase
              .from(config.tabela_necessidade as any)
              .update({ [config.coluna_referencia]: idManter })
              .in('id', necessidadesOrfas.map((n: any) => n.id));

            if (errorUpdate) throw errorUpdate;
            totalReassociados += necessidadesOrfas.length;
          }
        }

        // Remover registros duplicados
        if (idsRemover.length > 0) {
          const { error: errorDelete } = await supabase
            .from(config.tabela_cadastro as any)
            .delete()
            .in('id', idsRemover);

          if (errorDelete) throw errorDelete;
          totalRemovidos += idsRemover.length;

          const exemplo = grupo[0];
          const descricao = config.campos_chave.map(c => `${c}=${exemplo[c]}`).join(', ');
          addLog('success', `✅ Grupo ${i + 1}: ${descricao} - Mantido: ${idManter.substring(0, 8)}... | Removidos: ${idsRemover.length}`);
        }
      }

      setStats({
        gruposEncontrados: gruposDuplicados.length,
        registrosRemovidos: totalRemovidos,
        necessidadesReassociadas: totalReassociados,
      });

      addLog('success', `🎉 Processo concluído!`);
      addLog('info', `📊 ${totalRemovidos} registros removidos`);
      addLog('info', `🔗 ${totalReassociados} necessidades reassociadas`);

      toast.success(`${totalRemovidos} duplicatas removidas com sucesso!`);

      // Invalidar caches
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['necessidades'] });

    } catch (error: any) {
      addLog('error', `❌ Erro: ${error.message}`);
      toast.error("Erro ao processar: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Remover Duplicatas do Cadastro
        </CardTitle>
        <CardDescription>
          Detecta e remove registros duplicados do cadastro inicial, mantendo o registro com necessidades associadas.
          <strong className="text-primary block mt-1">
            ℹ️ Nota: Novas importações já previnem duplicatas automaticamente. Use esta ferramenta apenas para limpar dados históricos.
          </strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <Button
          onClick={handleRemoverDuplicatas}
          disabled={!tipo || !propLoteId || !propRodoviaId || isProcessing}
          className="w-full"
          size="lg"
        >
          <Trash2 className="mr-2 h-5 w-5" />
          {isProcessing ? 'Processando...' : 'Analisar e Remover Duplicatas'}
        </Button>

        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              Processando: {progress.toFixed(0)}%
            </p>
          </div>
        )}

        {stats.gruposEncontrados > 0 && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.gruposEncontrados}</div>
              <div className="text-sm text-muted-foreground">Grupos Duplicados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{stats.registrosRemovidos}</div>
              <div className="text-sm text-muted-foreground">Registros Removidos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{stats.necessidadesReassociadas}</div>
              <div className="text-sm text-muted-foreground">Necessidades Reassociadas</div>
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <ScrollArea className="h-64 rounded-lg border p-4">
            <div className="space-y-2">
              {logs.map((log, i) => (
                <Alert key={i} variant={log.type === 'error' ? 'destructive' : 'default'}>
                  <div className="flex items-start gap-2">
                    {log.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />}
                    {log.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />}
                    {log.type === 'error' && <AlertCircle className="h-4 w-4 mt-0.5" />}
                    {log.type === 'info' && <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />}
                    <AlertDescription className="text-sm">{log.message}</AlertDescription>
                  </div>
                </Alert>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
