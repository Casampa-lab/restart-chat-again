// Index.tsx (routerless-safe) — força remount + limpeza
// ======================================
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { IntervencoesCilindrosForm } from "@/components/IntervencoesCilindrosForm";

export default function Index() {
  const [intervencaoDialogOpen, setIntervencaoDialogOpen] = useState(false);
  const [tipoIntervencao, setTipoIntervencao] = useState<string | null>("cilindros");
  const [elementoParaIntervencao, setElementoParaIntervencao] = useState<any | null>(null);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Operações de Campo</h1>
        <Dialog
          open={intervencaoDialogOpen}
          onOpenChange={(open) => {
            setIntervencaoDialogOpen(open);
            if (!open) {
              // 🔄 limpeza ao fechar para evitar versão antiga
              setElementoParaIntervencao(null);
              setTipoIntervencao(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setTipoIntervencao("cilindros");
                setElementoParaIntervencao(null);
              }}
            >
              Nova intervenção (Cilindros)
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Registrar Intervenção</DialogTitle>
            </DialogHeader>

            {tipoIntervencao === "cilindros" && (
              <IntervencoesCilindrosForm
                key={`cil-${elementoParaIntervencao?.id ?? "new"}-${intervencaoDialogOpen ? "open" : "closed"}`}
                cilindroSelecionado={elementoParaIntervencao ?? undefined}
                modo="normal"
                tipoOrigem="execucao"
                onIntervencaoRegistrada={() => {
                  setIntervencaoDialogOpen(false);
                  toast.success("Intervenção em Cilindro registrada com sucesso!");
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Conteúdo da página (lista, filtros, etc.) */}
    </div>
  );
}
