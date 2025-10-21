import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MapPin, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { GrupoElemento, getConfig, formatarCampo, CAMPO_LABELS } from "@/lib/reconciliacaoConfig";

interface ReconciliacaoDrawerUniversalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  necessidade: any;
  cadastro: any;
  onReconciliar: () => void;
  tipoElemento: GrupoElemento;
}

export function ReconciliacaoDrawerUniversal({ 
  open, 
  onOpenChange, 
  necessidade, 
  cadastro,
  onReconciliar,
  tipoElemento
}: ReconciliacaoDrawerUniversalProps) {
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCoordenador, setIsCoordenador] = useState(false);

  const config = getConfig(tipoElemento);

  // Verificar se usuário é coordenador
  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["coordenador", "admin"]);

      setIsCoordenador(!!roles && roles.length > 0);
    };
    checkRole();
  }, []);

  const handleSolicitarReconciliacao = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (isCoordenador) {
        // Coordenador aprova diretamente - CRIA NOVO ELEMENTO NO INVENTÁRIO
        
        // 1. Preparar dados para o novo elemento (mapear necessidade -> inventário)
        const dadosNovoElemento: any = {
          user_id: user.id,
          lote_id: necessidade.lote_id,
          rodovia_id: necessidade.rodovia_id,
          origem: 'necessidade', // ROXO - criado pelo match
          ativo: true,
          data_vistoria: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
        };

        // Mapear campos específicos por tipo
        if (tipoElemento === 'placas') {
          dadosNovoElemento.codigo = necessidade.codigo;
          dadosNovoElemento.tipo = necessidade.tipo || necessidade.tipo_placa;
          dadosNovoElemento.lado = necessidade.lado;
          dadosNovoElemento.suporte = necessidade.suporte;
          dadosNovoElemento.substrato = necessidade.substrato;
          dadosNovoElemento.km = necessidade.km;
          dadosNovoElemento.latitude_inicial = necessidade.latitude || necessidade.latitude_inicial;
          dadosNovoElemento.longitude_inicial = necessidade.longitude || necessidade.longitude_inicial;
          dadosNovoElemento.snv = necessidade.snv;
        } else if (tipoElemento === 'marcas_longitudinais') {
          dadosNovoElemento.tipo_demarcacao = necessidade.tipo_demarcacao;
          dadosNovoElemento.cor = necessidade.cor;
          dadosNovoElemento.largura_cm = necessidade.largura_cm;
          dadosNovoElemento.km_inicial = necessidade.km_inicial;
          dadosNovoElemento.km_final = necessidade.km_final;
          dadosNovoElemento.extensao_metros = necessidade.extensao_metros;
          dadosNovoElemento.material = necessidade.material;
          dadosNovoElemento.latitude_inicial = necessidade.latitude_inicial;
          dadosNovoElemento.longitude_inicial = necessidade.longitude_inicial;
          dadosNovoElemento.snv = necessidade.snv;
          dadosNovoElemento.posicao = necessidade.posicao;
        } else if (tipoElemento === 'tachas') {
          dadosNovoElemento.tipo_tacha = necessidade.tipo_tacha;
          dadosNovoElemento.cor = necessidade.cor;
          dadosNovoElemento.quantidade = necessidade.quantidade;
          dadosNovoElemento.km_inicial = necessidade.km_inicial;
          dadosNovoElemento.km_final = necessidade.km_final;
          dadosNovoElemento.latitude_inicial = necessidade.latitude_inicial;
          dadosNovoElemento.longitude_inicial = necessidade.longitude_inicial;
          dadosNovoElemento.snv = necessidade.snv;
          dadosNovoElemento.local_implantacao = necessidade.local_implantacao;
        } else if (tipoElemento === 'cilindros') {
          dadosNovoElemento.cor_corpo = necessidade.cor_corpo;
          dadosNovoElemento.cor_refletivo = necessidade.cor_refletivo;
          dadosNovoElemento.tipo_refletivo = necessidade.tipo_refletivo;
          dadosNovoElemento.quantidade = necessidade.quantidade;
          dadosNovoElemento.km_inicial = necessidade.km_inicial;
          dadosNovoElemento.km_final = necessidade.km_final;
          dadosNovoElemento.latitude_inicial = necessidade.latitude_inicial;
          dadosNovoElemento.longitude_inicial = necessidade.longitude_inicial;
          dadosNovoElemento.snv = necessidade.snv;
          dadosNovoElemento.local_implantacao = necessidade.local_implantacao;
        } else if (tipoElemento === 'inscricoes') {
          dadosNovoElemento.sigla = necessidade.sigla;
          dadosNovoElemento.tipo_inscricao = necessidade.tipo_inscricao;
          dadosNovoElemento.cor = necessidade.cor;
          dadosNovoElemento.dimensoes = necessidade.dimensoes;
          dadosNovoElemento.area_m2 = necessidade.area_m2;
          dadosNovoElemento.km_inicial = necessidade.km_inicial;
          dadosNovoElemento.latitude_inicial = necessidade.latitude_inicial;
          dadosNovoElemento.longitude_inicial = necessidade.longitude_inicial;
          dadosNovoElemento.snv = necessidade.snv;
        } else if (tipoElemento === 'porticos') {
          dadosNovoElemento.tipo = necessidade.tipo;
          dadosNovoElemento.vao_horizontal_m = necessidade.vao_horizontal_m;
          dadosNovoElemento.altura_livre_m = necessidade.altura_livre_m;
          dadosNovoElemento.km = necessidade.km;
          dadosNovoElemento.latitude_inicial = necessidade.latitude || necessidade.latitude_inicial;
          dadosNovoElemento.longitude_inicial = necessidade.longitude || necessidade.longitude_inicial;
          dadosNovoElemento.snv = necessidade.snv;
        } else if (tipoElemento === 'defensas') {
          dadosNovoElemento.lado = necessidade.lado;
          dadosNovoElemento.funcao = necessidade.funcao;
          dadosNovoElemento.geometria = necessidade.geometria;
          dadosNovoElemento.extensao_metros = necessidade.extensao_metros;
          dadosNovoElemento.km_inicial = necessidade.km_inicial;
          dadosNovoElemento.km_final = necessidade.km_final;
          dadosNovoElemento.latitude_inicial = necessidade.latitude_inicial;
          dadosNovoElemento.longitude_inicial = necessidade.longitude_inicial;
          dadosNovoElemento.snv = necessidade.snv;
          dadosNovoElemento.nivel_contencao_en1317 = necessidade.nivel_contencao_en1317;
          dadosNovoElemento.nivel_contencao_nchrp350 = necessidade.nivel_contencao_nchrp350;
        }

        // 2. Inserir novo elemento no inventário
        const { data: novoElemento, error: insertError } = await supabase
          .from(config.tabelaCadastro as any)
          .insert([dadosNovoElemento])
          .select()
          .single();

        if (insertError) throw insertError;
        if (!novoElemento) {
          throw new Error("Falha ao criar elemento no inventário");
        }
        
        // Type guard: validar que tem id
        const elementoCriado: any = novoElemento;
        if (!elementoCriado.id) {
          throw new Error("Elemento criado sem ID");
        }

        const novoElementoId: string = elementoCriado.id;

        // 3. Se existe cadastro_id (match), desativar o elemento antigo
        if (necessidade.cadastro_id) {
          const { error: desativarError } = await supabase
            .from(config.tabelaCadastro as any)
            .update({
              ativo: false,
              substituido_por: novoElementoId,
              substituido_em: new Date().toISOString(),
            })
            .eq("id", necessidade.cadastro_id);

          if (desativarError) throw desativarError;
        }

        // 4. Atualizar reconciliação para apontar para o novo elemento
        const { error: reconciliacaoError } = await supabase
          .from('reconciliacoes')
          .update({
            status: 'aprovado',
            reconciliado: true,
            aprovado_por: user.id,
            aprovado_em: new Date().toISOString(),
            observacao_coordenador: observacao,
            cadastro_id: novoElementoId, // Vincular ao novo elemento
          })
          .eq("necessidade_id", necessidade.id)
          .eq("tipo_elemento", tipoElemento);

        if (reconciliacaoError) throw reconciliacaoError;

        // 5. Atualizar necessidade
        const { error: necessidadeError } = await supabase
          .from(config.tabelaNecessidades as any)
          .update({
            servico_final: "Substituir",
            servico: "Substituir",
            localizado_em_campo: true,
            reconciliado: true,
          })
          .eq("id", necessidade.id);

        if (necessidadeError) throw necessidadeError;
        toast.success("✓ Substituição aprovada! Novo elemento criado no inventário.");
      } else {
        // Técnico envia para aprovação - apenas atualiza reconciliacao
        const { error: reconciliacaoError } = await supabase
          .from('reconciliacoes')
          .update({
            status: 'pendente_aprovacao',
            solicitado_por: user.id,
            solicitado_em: new Date().toISOString(),
            observacao_usuario: observacao,
          })
          .eq("necessidade_id", necessidade.id)
          .eq("tipo_elemento", tipoElemento);

        if (reconciliacaoError) throw reconciliacaoError;

        const { error: necessidadeError } = await supabase
          .from(config.tabelaNecessidades as any)
          .update({
            localizado_em_campo: true,
          })
          .eq("id", necessidade.id);

        if (necessidadeError) throw necessidadeError;
        toast.success("✓ Reconciliação enviada ao coordenador!");
      }

      onReconciliar();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao processar reconciliação");
    } finally {
      setLoading(false);
    }
  };

  const handleRejeitarReconciliacao = async () => {
    if (!observacao.trim()) {
      toast.error(`Por favor, adicione uma observação explicando por que não é o mesmo elemento`);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Atualizar reconciliacao para rejeitado
      const { error: reconciliacaoError } = await supabase
        .from('reconciliacoes')
        .update({
          status: 'rejeitado',
          reconciliado: true,
          rejeitado_por: user.id,
          rejeitado_em: new Date().toISOString(),
          motivo_rejeicao: observacao,
        })
        .eq("necessidade_id", necessidade.id)
        .eq("tipo_elemento", tipoElemento);

      if (reconciliacaoError) throw reconciliacaoError;

      // Atualizar necessidade para Implantar
      const { error: necessidadeError } = await supabase
        .from(config.tabelaNecessidades as any)
        .update({
          servico_final: 'Implantar',
          servico: 'Implantar',
          reconciliado: true,
        })
        .eq("id", necessidade.id);

      if (necessidadeError) throw necessidadeError;
      
      toast.success("✓ Reconciliação rejeitada. Item marcado para implantação.");
      onReconciliar();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao rejeitar reconciliação:", error);
      toast.error("Erro ao processar rejeição");
    } finally {
      setLoading(false);
    }
  };

  if (!necessidade || !cadastro) return null;

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        if (!loading) {
          onOpenChange(newOpen);
        }
      }}
    >
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Reconciliação de Divergência - {config.labelGrupo}
          </DialogTitle>
          <DialogDescription>
            Compare o inventário existente com a necessidade do projeto para confirmar a substituição
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 overflow-y-auto max-h-[65vh] pb-safe scroll-smooth space-y-6">
          {/* Localização */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>
              {necessidade.km !== undefined && `km ${necessidade.km?.toFixed(3)}`}
              {necessidade.km_inicial !== undefined && ` ${necessidade.km_inicial?.toFixed(3)} - ${necessidade.km_final?.toFixed(3)}`}
              {necessidade.distancia_match_metros && ` | Distância do match: ${necessidade.distancia_match_metros}m`}
            </span>
          </div>

          {/* Comparação: Inventário (Esquerda) vs Projeto (Direita) */}
          <div className="grid grid-cols-2 gap-4">
            {/* ESQUERDA: Inventário/Cadastro */}
            <div 
              className="border-2 border-green-500 rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{config.iconeCadastro}</span>
                <div>
                  <div className="font-semibold text-green-700">Inventário (Cadastro)</div>
                  <div className="text-xs text-muted-foreground">O que existe no local</div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                {config.camposComparacao.map((campo) => (
                  <div key={`cadastro-${campo}`}>
                    <strong>{CAMPO_LABELS[campo] || campo}:</strong> {formatarCampo(campo, cadastro[campo])}
                  </div>
                ))}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  GPS: {cadastro.latitude?.toFixed(6) || cadastro.latitude_inicial?.toFixed(6) || "N/A"}, {cadastro.longitude?.toFixed(6) || cadastro.longitude_inicial?.toFixed(6) || "N/A"}
                </div>
              </div>

              {/* Foto do Cadastro */}
              {cadastro.foto_frontal_url && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Foto:</div>
                  <img 
                    src={cadastro.foto_frontal_url} 
                    alt="Elemento cadastrado"
                    className="w-full rounded-lg border"
                  />
                </div>
              )}
              {cadastro.foto_url && !cadastro.foto_frontal_url && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Foto:</div>
                  <img 
                    src={cadastro.foto_url} 
                    alt="Elemento cadastrado"
                    className="w-full rounded-lg border"
                  />
                </div>
              )}
              
              {/* Espaço reservado para foto do desenho técnico (futuro) */}
              <div className="bg-gray-50 border-2 border-dashed rounded-lg p-3 text-center text-xs text-muted-foreground">
                📸 Espaço reservado para<br/>foto do desenho técnico
              </div>
            </div>

            {/* DIREITA: Projeto/Necessidade */}
            <div 
              className="border-2 border-primary rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{config.iconeProjeto}</span>
                  <div>
                    <div className="font-semibold text-primary">Projeto (Necessidade)</div>
                    <div className="text-xs text-muted-foreground">O que prevê a planilha</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-1">Serviço:</div>
                  <Badge variant="default" className="bg-primary">{necessidade.solucao_planilha || necessidade.servico}</Badge>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                {config.camposComparacao.map((campo) => (
                  <div key={`necessidade-${campo}`}>
                    <strong>{CAMPO_LABELS[campo] || campo}:</strong> {formatarCampo(campo, necessidade[campo])}
                  </div>
                ))}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  GPS projeto: {necessidade.latitude?.toFixed(6) || necessidade.latitude_inicial?.toFixed(6) || "N/A"}, {necessidade.longitude?.toFixed(6) || necessidade.longitude_inicial?.toFixed(6) || "N/A"}
                </div>
              </div>
              
              {/* Divergência entre Planilha e Sistema */}
              {necessidade.solucao_planilha !== necessidade.servico_inferido && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 space-y-1">
                  <div className="text-xs font-semibold text-yellow-800">⚠️ Divergência detectada:</div>
                  <div className="text-xs">
                    <strong>Planilha:</strong> {necessidade.solucao_planilha}
                  </div>
                  <div className="text-xs">
                    <strong>Sistema inferiu:</strong> {necessidade.servico_inferido}
                  </div>
                  <div className="text-xs text-yellow-700 mt-1">
                    Sistema encontrou elemento a {necessidade.distancia_match_metros}m do local previsto
                  </div>
                </div>
              )}
              
              {/* Info do Match GPS */}
              {necessidade.distancia_match_metros !== undefined && (
                <div className="pt-2 border-t">
                  <Badge variant="outline" className="text-xs">
                    📍 Match GPS: {necessidade.distancia_match_metros?.toFixed(1) || "0"}m
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Campo de observação */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Observação {!isCoordenador && <span className="text-muted-foreground text-xs">(obrigatória para rejeitar)</span>}
            </label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder={isCoordenador 
                ? "Ex: Confirmado em campo que é o mesmo elemento..." 
                : "Ex: Elemento diferente no local..."}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-3">
          {/* Ação Principal: Confirmar que é substituição */}
          <Button
            onClick={handleSolicitarReconciliacao}
            disabled={loading}
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            {isCoordenador 
              ? "✓ Aprovar Substituição" 
              : "✓ Confirmar: É o mesmo elemento (Substituição)"}
          </Button>

          {/* Ação Secundária: Não é a mesma */}
          <Button
            onClick={handleRejeitarReconciliacao}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            ✗ Cancelar - Não é o mesmo elemento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
