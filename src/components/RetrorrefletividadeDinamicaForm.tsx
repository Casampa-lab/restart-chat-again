import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface RetrorrefletividadeDinamicaFormProps {
  loteId: string;
  rodoviaId: string;
}

const FAIXAS = ["Faixa 1", "Faixa 2", "Faixa 3", "Acostamento"];
const TIPOS_DEMARCACAO = [
  "Linha Contínua",
  "Linha Tracejada",
  "Linha Dupla",
  "Zebrado",
  "Seta",
  "Símbolo",
  "Outros"
];
const CORES = ["Branca", "Amarela", "Azul"];
const CONDICOES_CLIMATICAS = ["Seco", "Úmido", "Chuva Leve", "Chuva Forte"];

const RetrorrefletividadeDinamicaForm = ({ loteId, rodoviaId }: RetrorrefletividadeDinamicaFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    data_medicao: new Date().toISOString().split('T')[0],
    km_inicial: "",
    km_final: "",
    faixa: "",
    tipo_demarcacao: "",
    cor: "",
    valor_medido: "",
    valor_minimo: "",
    velocidade_medicao: "",
    condicao_climatica: "",
    observacao: "",
  });

  const situacao = formData.valor_medido && formData.valor_minimo
    ? parseFloat(formData.valor_medido) >= parseFloat(formData.valor_minimo)
      ? "Conforme"
      : "Não Conforme"
    : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.km_inicial || !formData.km_final || !formData.faixa || 
        !formData.tipo_demarcacao || !formData.cor || !formData.valor_medido || !formData.valor_minimo) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { error } = await supabase
        .from("retrorrefletividade_dinamica")
        .insert({
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          data_medicao: formData.data_medicao,
          km_inicial: parseFloat(formData.km_inicial),
          km_final: parseFloat(formData.km_final),
          faixa: formData.faixa,
          tipo_demarcacao: formData.tipo_demarcacao,
          cor: formData.cor,
          valor_medido: parseFloat(formData.valor_medido),
          valor_minimo: parseFloat(formData.valor_minimo),
          situacao: situacao,
          velocidade_medicao: formData.velocidade_medicao ? parseFloat(formData.velocidade_medicao) : null,
          condicao_climatica: formData.condicao_climatica || null,
          observacao: formData.observacao || null,
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Medição de retrorrefletividade dinâmica registrada com sucesso",
      });

      // Reset form
      setFormData({
        data_medicao: new Date().toISOString().split('T')[0],
        km_inicial: "",
        km_final: "",
        faixa: "",
        tipo_demarcacao: "",
        cor: "",
        valor_medido: "",
        valor_minimo: "",
        velocidade_medicao: "",
        condicao_climatica: "",
        observacao: "",
      });
    } catch (error) {
      console.error("Erro ao salvar medição:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar medição. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>3.1.3.2 - Retrorrefletividade Dinâmica</CardTitle>
        <CardDescription>
          Medição de retrorrefletividade dinâmica da demarcação viária
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_medicao">Data da Medição *</Label>
              <Input
                id="data_medicao"
                type="date"
                value={formData.data_medicao}
                onChange={(e) =>
                  setFormData({ ...formData, data_medicao: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="velocidade_medicao">Velocidade de Medição (km/h)</Label>
              <Input
                id="velocidade_medicao"
                type="number"
                step="1"
                value={formData.velocidade_medicao}
                onChange={(e) =>
                  setFormData({ ...formData, velocidade_medicao: e.target.value })
                }
                placeholder="Ex: 60"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="km_inicial">KM Inicial *</Label>
              <Input
                id="km_inicial"
                type="number"
                step="0.001"
                value={formData.km_inicial}
                onChange={(e) =>
                  setFormData({ ...formData, km_inicial: e.target.value })
                }
                placeholder="0.000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="km_final">KM Final *</Label>
              <Input
                id="km_final"
                type="number"
                step="0.001"
                value={formData.km_final}
                onChange={(e) =>
                  setFormData({ ...formData, km_final: e.target.value })
                }
                placeholder="0.000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faixa">Faixa *</Label>
              <Select
                value={formData.faixa}
                onValueChange={(value) =>
                  setFormData({ ...formData, faixa: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a faixa" />
                </SelectTrigger>
                <SelectContent>
                  {FAIXAS.map((faixa) => (
                    <SelectItem key={faixa} value={faixa}>
                      {faixa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_demarcacao">Tipo de Demarcação *</Label>
              <Select
                value={formData.tipo_demarcacao}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_demarcacao: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DEMARCACAO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cor">Cor *</Label>
              <Select
                value={formData.cor}
                onValueChange={(value) =>
                  setFormData({ ...formData, cor: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a cor" />
                </SelectTrigger>
                <SelectContent>
                  {CORES.map((cor) => (
                    <SelectItem key={cor} value={cor}>
                      {cor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condicao_climatica">Condição Climática</Label>
              <Select
                value={formData.condicao_climatica}
                onValueChange={(value) =>
                  setFormData({ ...formData, condicao_climatica: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a condição" />
                </SelectTrigger>
                <SelectContent>
                  {CONDICOES_CLIMATICAS.map((condicao) => (
                    <SelectItem key={condicao} value={condicao}>
                      {condicao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_medido">Valor Medido (mcd/lx/m²) *</Label>
              <Input
                id="valor_medido"
                type="number"
                step="0.1"
                value={formData.valor_medido}
                onChange={(e) =>
                  setFormData({ ...formData, valor_medido: e.target.value })
                }
                placeholder="0.0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_minimo">Valor Mínimo Aceitável (mcd/lx/m²) *</Label>
              <Input
                id="valor_minimo"
                type="number"
                step="0.1"
                value={formData.valor_minimo}
                onChange={(e) =>
                  setFormData({ ...formData, valor_minimo: e.target.value })
                }
                placeholder="0.0"
                required
              />
            </div>

            {situacao && (
              <div className="space-y-2">
                <Label>Situação</Label>
                <div className={`p-3 rounded-md font-semibold ${
                  situacao === "Conforme" 
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" 
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                }`}>
                  {situacao}
                </div>
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observacao">Observações</Label>
              <Textarea
                id="observacao"
                value={formData.observacao}
                onChange={(e) =>
                  setFormData({ ...formData, observacao: e.target.value })
                }
                placeholder="Observações sobre a medição dinâmica"
                rows={3}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Medição
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default RetrorrefletividadeDinamicaForm;
