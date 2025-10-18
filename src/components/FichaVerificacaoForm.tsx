import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FichaVerificacaoSHForm } from "./FichaVerificacaoSHForm";
import { FichaVerificacaoSVForm } from "./FichaVerificacaoSVForm";

interface FichaVerificacaoFormProps {
  loteId: string;
  rodoviaId: string;
  onSuccess?: () => void;
}

export function FichaVerificacaoForm({ loteId, rodoviaId, onSuccess }: FichaVerificacaoFormProps) {
  const [tipoSelecionado, setTipoSelecionado] = useState<"SH" | "SV" | null>(null);

  if (tipoSelecionado === "SH") {
    return <FichaVerificacaoSHForm loteId={loteId} rodoviaId={rodoviaId} onSuccess={onSuccess} />;
  }

  if (tipoSelecionado === "SV") {
    return <FichaVerificacaoSVForm loteId={loteId} rodoviaId={rodoviaId} onSuccess={onSuccess} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Selecione o Tipo de Ficha de Verificação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={() => setTipoSelecionado("SH")} 
          className="w-full"
          size="lg"
        >
          Sinalização Horizontal (SH)
        </Button>
        <Button 
          onClick={() => setTipoSelecionado("SV")} 
          className="w-full"
          size="lg"
        >
          Sinalização Vertical (SV)
        </Button>
      </CardContent>
    </Card>
  );
}
