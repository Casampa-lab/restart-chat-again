import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, MapPin, Flag } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";

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

  const handleReconciliar = async (decisao: "confirmar_projeto" | "confirmar_sistema" | "solicitar_revisao") => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let updateData: any = {
        reconciliado_por: user.id,
        reconciliado_em: new Date().toISOString(),
      };

      if (decisao === "confirmar_projeto") {
        updateData.reconciliado = true;
        updateData.servico_final = necessidade.solucao_planilha;
        updateData.localizado_em_campo = true;
      } else if (decisao === "confirmar_sistema") {
        updateData.reconciliado = true;
        updateData.servico_final = necessidade.servico_inferido;
        updateData.solucao_planilha = necessidade.servico_inferido;
        updateData.divergencia = false;
        updateData.localizado_em_campo = true;
      } else if (decisao === "solicitar_revisao") {
        updateData.revisao_solicitada = true;
        updateData.revisao_solicitada_por = user.id;
        updateData.revisao_observacao = observacao;
      }

      const { error } = await supabase
        .from("necessidades_placas")
        .update(updateData)
        .eq("id", necessidade.id);

      if (error) throw error;

      const mensagens = {
        confirmar_projeto: "Projeto confirmado com sucesso",
        confirmar_sistema: "Sistema confirmado com sucesso",
        solicitar_revisao: "Revisão solicitada ao coordenador",
      };

      toast.success(mensagens[decisao]);
      onReconciliar();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao reconciliar:", error);
      toast.error("Erro ao processar reconciliação");
    } finally {
      setLoading(false);
    }
  };

  if (!necessidade || !cadastro) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Reconciliação de Divergência
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Localização */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>KM {necessidade.km} | Distância do match: {necessidade.distancia_match_metros}m</span>
          </div>

          {/* Comparação: Projeto vs Sistema */}
          <div className="grid grid-cols-2 gap-4">
            {/* Projeto */}
            <div className="border-2 border-primary rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎨</span>
                <div>
                  <div className="font-semibold">Projeto</div>
                  <div className="text-xs text-muted-foreground">Da planilha</div>
                </div>
              </div>
              <Badge className="w-full justify-center text-base py-2">
                {necessidade.solucao_planilha}
              </Badge>
              {necessidade.codigo && (
                <div className="text-sm">
                  <span className="font-medium">Código:</span> {necessidade.codigo}
                </div>
              )}
            </div>

            {/* Sistema */}
            <div className="border-2 border-blue-500 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <div>
                  <div className="font-semibold">Sistema</div>
                  <div className="text-xs text-muted-foreground">Match GPS</div>
                </div>
              </div>
              <Badge variant="outline" className="w-full justify-center text-base py-2">
                {necessidade.servico_inferido}
              </Badge>
              {cadastro.codigo && (
                <div className="text-sm">
                  <span className="font-medium">Código:</span> {cadastro.codigo}
                </div>
              )}
            </div>
          </div>

          {/* Foto da placa (se disponível) */}
          {cadastro.foto_url && (
            <div className="space-y-2">
              <div className="font-medium text-sm">Foto do Cadastro:</div>
              <img 
                src={cadastro.foto_url} 
                alt="Placa cadastrada"
                className="w-full rounded-lg border"
              />
            </div>
          )}

          {/* Campo de observação para revisão */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Observação (opcional para revisão)
            </label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Descreva o que você viu no local ou qualquer dúvida..."
              rows={3}
            />
          </div>
        </div>

        <DrawerFooter className="flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button
              onClick={() => handleReconciliar("confirmar_projeto")}
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmar Projeto
            </Button>
            <Button
              onClick={() => handleReconciliar("confirmar_sistema")}
              disabled={loading}
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmar Sistema
            </Button>
          </div>
          <Button
            onClick={() => handleReconciliar("solicitar_revisao")}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            <Flag className="h-4 w-4 mr-2" />
            Marcar para Revisão
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
