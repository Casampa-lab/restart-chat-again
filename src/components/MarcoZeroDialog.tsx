import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Trophy, FileSpreadsheet } from "lucide-react";

interface MarcoZeroDialogProps {
  loteId: string;
  rodoviaId: string;
  totalPendentes: number;
  userId: string;
  onMarcoCreated?: () => void;
}

export function MarcoZeroDialog({
  loteId,
  rodoviaId,
  totalPendentes,
  userId,
  onMarcoCreated,
}: MarcoZeroDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Verificar se já existe marco_zero para este lote/rodovia
  const { data: marcoExistente } = useQuery({
    queryKey: ["marco-zero", loteId, rodoviaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marcos_inventario")
        .select("*")
        .eq("lote_id", loteId)
        .eq("rodovia_id", rodoviaId)
        .eq("tipo", "marco_zero")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!loteId && !!rodoviaId,
  });

  // Mutation para criar marco zero
  const criarMarcoMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("marcos_inventario").insert({
        lote_id: loteId,
        rodovia_id: rodoviaId,
        tipo: "marco_zero",
        criado_por: userId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marco-zero"] });
      toast({
        title: "🎯 Marco Zero Registrado!",
        description: "Redirecionando para geração de Relatórios Iniciais...",
        duration: 3000,
      });
      setOpen(false);
      onMarcoCreated?.();
      
      // Redirecionar após pequeno delay
      setTimeout(() => {
        navigate("/minhas-necessidades-relatorios");
      }, 1500);
    },
    onError: (error) => {
      console.error("Erro ao criar marco zero:", error);
      toast({
        title: "Erro ao gravar marco",
        description: "Não foi possível registrar o marco zero. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Abrir modal automaticamente quando pendentes chegarem a zero
  // e não houver marco registrado ainda
  useState(() => {
    if (totalPendentes === 0 && !marcoExistente && loteId && rodoviaId) {
      // Pequeno delay para não abrir imediatamente
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  });

  // Se já existe marco ou ainda há pendentes, não renderiza nada
  if (marcoExistente || totalPendentes > 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Trophy className="h-12 w-12 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            🎯 Marco Zero Alcançado!
          </DialogTitle>
          <DialogDescription className="text-center space-y-4 pt-4">
            <div className="flex items-center justify-center gap-2 text-lg font-semibold text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              <span>Zero Reconciliações Pendentes</span>
            </div>
            
            <p className="text-muted-foreground">
              Todas as divergências foram reconciliadas! Este é o momento do{" "}
              <strong>Inventário Dinâmico Definitivo</strong> da rodovia.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">O que significa isso?</p>
              <p className="text-muted-foreground">
                Este marco registra o instante em que o inventário reflete
                perfeitamente o estado real da rodovia, após todas as
                intervenções e reconciliações.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <div className="flex items-start gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900 mb-2">
                    📋 Próximo Passo Obrigatório:
                  </p>
                  <ol className="text-blue-800 space-y-1 list-decimal list-inside text-left">
                    <li>Gerar <strong>Relatório Inicial SUPRA</strong> (templates .xlsm oficiais)</li>
                    <li>Documentar oficialmente esta baseline aos fiscalizadores</li>
                    <li>Iniciar registro de intervenções de manutenção</li>
                  </ol>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground italic">
              Deseja gravar este marco e ir direto para os relatórios?
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setOpen(false)}
          >
            Gravar Depois
          </Button>
          <Button
            className="flex-1"
            onClick={() => criarMarcoMutation.mutate()}
            disabled={criarMarcoMutation.isPending}
          >
            {criarMarcoMutation.isPending ? "Gravando..." : "Gravar e Ir para Relatórios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
