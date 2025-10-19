import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";

interface AprovacaoNCDialogProps {
  ncId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved: () => void;
  tipo: 'aprovar' | 'rejeitar';
}

const AprovacaoNCDialog = ({
  ncId,
  open,
  onOpenChange,
  onApproved,
  tipo
}: AprovacaoNCDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [observacao, setObservacao] = useState("");

  const handleSubmit = async () => {
    if (!ncId) return;

    if (tipo === 'rejeitar' && !observacao.trim()) {
      toast.error("Adicione uma observação explicando o motivo da rejeição");
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const updateData: any = {
        status_aprovacao: tipo === 'aprovar' ? 'aprovado' : 'rejeitado',
        aprovado_por: user.id,
        data_aprovacao: new Date().toISOString(),
      };

      // Se rejeitado, resetar enviado_coordenador para permitir correção
      if (tipo === 'rejeitar') {
        updateData.enviado_coordenador = false;
      }

      if (observacao.trim()) {
        updateData.observacao_coordenador = observacao;
      }

      const { error } = await supabase
        .from("nao_conformidades")
        .update(updateData)
        .eq("id", ncId);

      if (error) throw error;

      // Buscar dados da NC para criar notificação
      const { data: ncData } = await supabase
        .from("nao_conformidades")
        .select("user_id, numero_nc")
        .eq("id", ncId)
        .single();

      if (ncData) {
        // Criar notificação para o técnico
        await supabase.from("notificacoes").insert({
          user_id: ncData.user_id,
          tipo: tipo === 'aprovar' ? 'nc_aprovada' : 'nc_rejeitada',
          titulo: tipo === 'aprovar' ? 'NC Aprovada' : 'NC Rejeitada',
          mensagem: tipo === 'aprovar' 
            ? `NC ${ncData.numero_nc} foi aprovada pelo coordenador`
            : `NC ${ncData.numero_nc} foi rejeitada. Verifique as observações e faça as correções necessárias`,
          nc_id: ncId,
          lida: false
        });
      }

      toast.success(
        tipo === 'aprovar' 
          ? "NC aprovada com sucesso!" 
          : "NC rejeitada. O técnico será notificado."
      );
      
      setObservacao("");
      onOpenChange(false);
      onApproved();
    } catch (error: any) {
      toast.error("Erro ao processar aprovação: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tipo === 'aprovar' ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Aprovar Não Conformidade
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                Rejeitar Não Conformidade
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {tipo === 'aprovar' 
              ? "Esta NC será aprovada e poderá ser notificada à executora."
              : "Esta NC será rejeitada e retornará ao técnico para correção."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="observacao">
              Observações {tipo === 'rejeitar' && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="observacao"
              placeholder={
                tipo === 'aprovar'
                  ? "Adicione observações complementares (opcional)"
                  : "Explique o motivo da rejeição para que o técnico possa corrigir"
              }
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            variant={tipo === 'aprovar' ? 'default' : 'destructive'}
          >
            {loading ? "Processando..." : tipo === 'aprovar' ? "Aprovar" : "Rejeitar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AprovacaoNCDialog;
