import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FichaVerificacaoSHForm } from "./FichaVerificacaoSHForm";
import { FichaVerificacaoSVForm } from "./FichaVerificacaoSVForm";

interface FichaVerificacaoFormProps {
  loteId: string;
  rodoviaId: string;
}

export function FichaVerificacaoForm({ loteId, rodoviaId }: FichaVerificacaoFormProps) {
  const [tipo, setTipo] = useState<"Sinalização Horizontal" | "Sinalização Vertical">("Sinalização Horizontal");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tipo de Verificação</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={tipo}
            onValueChange={(value) => setTipo(value as any)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Sinalização Horizontal" id="sh" />
              <Label htmlFor="sh">Sinalização Horizontal</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Sinalização Vertical" id="sv" />
              <Label htmlFor="sv">Sinalização Vertical</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {tipo === "Sinalização Horizontal" ? (
        <FichaVerificacaoSHForm loteId={loteId} rodoviaId={rodoviaId} />
      ) : (
        <FichaVerificacaoSVForm loteId={loteId} rodoviaId={rodoviaId} />
      )}
    </div>
  );
}
