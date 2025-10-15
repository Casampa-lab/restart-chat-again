import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MapPin, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";

interface ReconciliacaoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  necessidade: any;
  cadastro: any;
  onReconciliar: () => void;
}

export function ReconciliacaoDrawer({ 
  open, 
  onOpenChange, 
  necessidade, 
  cadastro,
  onReconciliar 
}: ReconciliacaoDrawerProps) {
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCoordenador, setIsCoordenador] = useState(false);

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

  const handleSolicitarReconciliacao = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (isCoordenador) {
        // Coordenador aprova diretamente
        const { error } = await supabase
          .from("necessidades_placas")
          .update({
            status_reconciliacao: 'aprovado',
            aprovado_por: user.id,
            aprovado_em: new Date().toISOString(),
            observacao_coordenador: observacao,
            servico_final: "Substituir",
            servico: "Substituir",
            reconciliado: true,
            localizado_em_campo: true,
          })
          .eq("id", necessidade.id);

        if (error) throw error;
        toast.success("✓ Substituição aprovada com sucesso!");
      } else {
        // Técnico envia para aprovação
        const { error } = await supabase
          .from("necessidades_placas")
          .update({
            status_reconciliacao: 'pendente_aprovacao',
            solicitado_por: user.id,
            solicitado_em: new Date().toISOString(),
            observacao_usuario: observacao,
            localizado_em_campo: true,
          })
          .eq("id", necessidade.id);

        if (error) throw error;
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

  const handleRejeitarReconciliacao = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    
    if (!observacao.trim()) {
      toast.error("Por favor, adicione uma observação explicando por que não é a mesma placa");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("necessidades_placas")
        .update({
          status_reconciliacao: 'rejeitado',
          servico_final: 'Implantar',
          servico: 'Implantar',
          observacao_reconciliacao: observacao,
          rejeitado_por: user.id,
          rejeitado_em: new Date().toISOString()
        })
        .eq("id", necessidade.id);

      if (error) throw error;
      
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
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={false} modal={true}>
      <DrawerContent 
        className="max-h-[90vh]"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Reconciliação de Divergência
          </DrawerTitle>
          <DrawerDescription>
            Compare o inventário existente com a necessidade do projeto para confirmar a substituição
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 overflow-y-auto max-h-[65vh] pb-safe scroll-smooth space-y-6">
          {/* Localização */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>km {necessidade.km} | Distância do match: {necessidade.distancia_match_metros}m</span>
          </div>

          {/* Comparação: Inventário (Esquerda) vs Projeto (Direita) */}
          <div className="grid grid-cols-2 gap-4">
            {/* ESQUERDA: Inventário/Cadastro */}
            <div 
              className="border-2 border-green-500 rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">📷</span>
                <div>
                  <div className="font-semibold text-green-700">Inventário (Cadastro)</div>
                  <div className="text-xs text-muted-foreground">O que existe no local</div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div><strong>Código:</strong> {cadastro.codigo || "N/A"}</div>
                <div><strong>Tipo:</strong> {cadastro.tipo || "N/A"}</div>
                <div><strong>km:</strong> {cadastro.km?.toFixed(3) || "N/A"}</div>
                <div><strong>Lado:</strong> {cadastro.lado || "N/A"}</div>
                <div><strong>Suporte:</strong> {cadastro.suporte || "N/A"}</div>
                <div><strong>Substrato:</strong> {cadastro.substrato || "N/A"}</div>
                <div className="text-xs text-muted-foreground">
                  GPS: {cadastro.latitude?.toFixed(6)}, {cadastro.longitude?.toFixed(6)}
                </div>
              </div>

              {/* Foto do Cadastro */}
              {cadastro.foto_frontal_url && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Foto Frontal:</div>
                  <img 
                    src={cadastro.foto_frontal_url} 
                    alt="Placa cadastrada"
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
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎨</span>
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
                <div><strong>Código:</strong> {cadastro.codigo || "N/A"}</div>
                <div><strong>Tipo:</strong> {cadastro.tipo || "N/A"}</div>
                <div><strong>km projeto:</strong> {necessidade.km?.toFixed(3) || "N/A"}</div>
                <div><strong>Lado:</strong> {cadastro.lado || "N/A"}</div>
                <div><strong>Suporte:</strong> {cadastro.suporte || "N/A"}</div>
                <div><strong>Substrato:</strong> {cadastro.substrato || "N/A"}</div>
                <div className="text-xs text-muted-foreground">
                  GPS projeto: {cadastro.latitude?.toFixed(6)}, {cadastro.longitude?.toFixed(6)}
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
                    Sistema encontrou placa a {necessidade.distancia_match_metros}m do local previsto
                  </div>
                </div>
              )}
              
              {/* Info do Match GPS */}
              <div className="pt-2 border-t">
                <Badge variant="outline" className="text-xs">
                  📍 Match GPS: {necessidade.distancia_match_metros?.toFixed(1) || "0"}m
                </Badge>
              </div>
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
                ? "Ex: Confirmado em campo que é a mesma placa..." 
                : "Ex: Placa R-1 no local, apesar do projeto indicar R-1A..."}
              rows={3}
            />
          </div>
        </div>

        <DrawerFooter 
          className="flex-col gap-3"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Ação Principal: Confirmar que é substituição */}
          <Button
            onClick={(e) => handleSolicitarReconciliacao(e)}
            disabled={loading}
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            {isCoordenador 
              ? "✓ Aprovar Substituição" 
              : "✓ Confirmar: É a mesma placa (Substituição)"}
          </Button>

          {/* Ação Secundária: Não é a mesma */}
          <Button
            onClick={(e) => handleRejeitarReconciliacao(e)}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            ✗ Cancelar - Não é a mesma placa
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
