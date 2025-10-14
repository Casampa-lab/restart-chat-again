import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MapPin, AlertCircle } from "lucide-react";
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

  const handleSolicitarReconciliacao = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

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
      onReconciliar();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao enviar reconciliação");
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

          {/* Comparação: Inventário (Esquerda) vs Projeto (Direita) */}
          <div className="grid grid-cols-2 gap-4">
            {/* ESQUERDA: Inventário/Cadastro */}
            <div className="border-2 border-green-500 rounded-lg p-4 space-y-3">
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
                <div><strong>KM:</strong> {cadastro.km?.toFixed(3) || "N/A"}</div>
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
            <div className="border-2 border-primary rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎨</span>
                <div>
                  <div className="font-semibold text-primary">Projeto (Necessidade)</div>
                  <div className="text-xs text-muted-foreground">O que prevê a planilha</div>
                </div>
              </div>

              <Badge className="w-full justify-center text-base py-2 bg-primary">
                {necessidade.solucao_planilha || necessidade.servico}
              </Badge>
              
              <div className="space-y-2 text-sm">
                <div><strong>Código:</strong> {necessidade.codigo || "N/A"}</div>
                <div><strong>Tipo:</strong> {necessidade.tipo || "N/A"}</div>
                <div><strong>KM projeto:</strong> {necessidade.km?.toFixed(3) || "N/A"}</div>
                <div><strong>Lado:</strong> {necessidade.lado || "N/A"}</div>
                
                {/* Info do Match */}
                <div className="pt-2 border-t">
                  <Badge variant="outline" className="text-xs">
                    📍 Match GPS: {necessidade.distancia_match_metros?.toFixed(1) || "0"}m
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Campo de observação */}
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

        <DrawerFooter className="flex-col gap-3">
          {/* Ação Principal: Confirmar que é substituição */}
          <Button
            onClick={handleSolicitarReconciliacao}
            disabled={loading}
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            ✓ Confirmar: É a mesma placa (Substituição)
          </Button>

          {/* Ação Secundária: Não é a mesma */}
          <Button
            onClick={() => onOpenChange(false)}
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
