import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, ArrowLeft, ChevronRight } from "lucide-react";
import logoOperaVia from "@/assets/logo-operavia.png";

// Mapeamento de tipos para tabs (mesmo de RegistrarIntervencaoCampo)
const TABS_MAP: Record<string, string> = {
  "marcas_longitudinais": "sh",
  "placas": "sv",
  "inscricoes": "inscricoes",
  "tachas": "tacha",
  "cilindros": "cilindros",
  "porticos": "porticos",
  "defensas": "defensas",
};

const TIPOS_ELEMENTOS = [
  { value: "marcas_longitudinais", label: "Marcas Longitudinais (SH)", icon: "🛣️" },
  { value: "placas", label: "Placas (SV)", icon: "🪧" },
  { value: "inscricoes", label: "Inscrições", icon: "📝" },
  { value: "tachas", label: "Tachas", icon: "💎" },
  { value: "cilindros", label: "Cilindros", icon: "🎯" },
  { value: "porticos", label: "Pórticos", icon: "🌉" },
  { value: "defensas", label: "Defensas", icon: "🛡️" },
];

export default function EscolherAcaoCampo() {
  const navigate = useNavigate();
  const [modoOperacao, setModoOperacao] = useState<"manutencao" | "execucao" | null>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>("");

  const handleTipoClick = (tipo: string) => {
    if (!modoOperacao) {
      return;
    }
    
    const tab = TABS_MAP[tipo];
    navigate(`/minhas-intervencoes?tab=${tab}&modo=${modoOperacao}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 to-secondary/5">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <img src={logoOperaVia} alt="OperaVia" className="h-24 object-contain" />
            <Button variant="outline" size="sm" onClick={() => navigate("/modo-campo")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        {/* Passo 1: Escolher Modo de Operação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              1️⃣ Escolher Modo de Operação
              {modoOperacao && <Badge variant="outline" className="ml-auto">✓ Selecionado</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={modoOperacao || ""} onValueChange={(value) => setModoOperacao(value as "manutencao" | "execucao")}>
              <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="manutencao" id="modo-manutencao" />
                <Label htmlFor="modo-manutencao" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium">🟠 Manutenção Rotineira (IN-3/2025)</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Campos estruturais bloqueados
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="execucao" id="modo-execucao" />
                <Label htmlFor="modo-execucao" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium">🟢 Execução de Projeto</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Todos os campos editáveis
                  </p>
                </Label>
              </div>
            </RadioGroup>

            {!modoOperacao && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Selecione um modo de operação para continuar
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Passo 2: Escolher Tipo de Elemento */}
        <Card className={!modoOperacao ? "opacity-50 pointer-events-none" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              2️⃣ Escolher Tipo de Elemento
              {tipoSelecionado && <Badge variant="outline" className="ml-auto">✓ Selecionado</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {TIPOS_ELEMENTOS.map((tipo) => (
              <Card
                key={tipo.value}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => handleTipoClick(tipo.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{tipo.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold">{tipo.label}</h3>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}

            {!modoOperacao && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Primeiro selecione o modo de operação acima
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
