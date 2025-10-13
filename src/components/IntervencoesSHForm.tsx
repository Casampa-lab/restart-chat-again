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

interface IntervencoesSHFormProps {
  marcaSelecionada?: {
    id: string;
    km_inicial: number;
    km_final: number;
    snv?: string;
  };
  onIntervencaoRegistrada?: () => void;
  modo?: 'normal' | 'controlado';
  onDataChange?: (data: any) => void;
  hideSubmitButton?: boolean;
  loteId?: string;
  rodoviaId?: string;
}

const MATERIAIS = [
  "Tinta Acrílica",
  "Tinta Termoplástica",
  "Resina Acrílica",
  "Película Pré-fabricada",
  "Outros"
];

const CORES = ["Branca", "Amarela", "Azul", "Vermelha"];

const TIPOS_DEMARCACAO = [
  "Linha Contínua",
  "Linha Tracejada",
  "Linha Dupla Contínua",
  "Linha Dupla Tracejada",
  "Linha Mista",
  "Zebrado",
  "Faixa de Pedestres",
  "Seta Direcional",
  "Símbolo",
  "Linha de Bordo"
];

const IntervencoesSHForm = ({ 
  marcaSelecionada, 
  onIntervencaoRegistrada,
  modo = 'normal',
  onDataChange,
  hideSubmitButton = false,
  loteId,
  rodoviaId
}: IntervencoesSHFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    data_intervencao: new Date().toISOString().split('T')[0],
    motivo: "",
    tipo_demarcacao: "",
    cor: "",
    largura_cm: "",
    espessura_cm: "",
    material: "",
    fora_plano_manutencao: false,
    justificativa_fora_plano: "",
  });

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    
    if (modo === 'controlado' && onDataChange) {
      onDataChange(newData);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (modo === 'controlado') {
      if (onDataChange) onDataChange(formData);
      return;
    }
    
    if (!marcaSelecionada) {
      toast({
        title: "Erro",
        description: "Selecione uma marca longitudinal do inventário primeiro",
        variant: "destructive",
      });
      return;
    }

    if (!formData.motivo || !formData.cor) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("ficha_marcas_longitudinais_intervencoes")
        .insert({
          ficha_marcas_longitudinais_id: marcaSelecionada.id,
          data_intervencao: formData.data_intervencao,
          motivo: formData.motivo,
          tipo_demarcacao: formData.tipo_demarcacao || null,
          cor: formData.cor || null,
          largura_cm: formData.largura_cm ? parseFloat(formData.largura_cm) : null,
          espessura_cm: formData.espessura_cm ? parseFloat(formData.espessura_cm) : null,
          material: formData.material || null,
          fora_plano_manutencao: formData.fora_plano_manutencao,
          justificativa_fora_plano: formData.justificativa_fora_plano || null,
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Intervenção em sinalização horizontal registrada com sucesso",
      });

      // Reset form
      setFormData({
        data_intervencao: new Date().toISOString().split('T')[0],
        motivo: "",
        tipo_demarcacao: "",
        cor: "",
        largura_cm: "",
        espessura_cm: "",
        material: "",
        fora_plano_manutencao: false,
        justificativa_fora_plano: "",
      });
      
      onIntervencaoRegistrada?.();
    } catch (error) {
      console.error("Erro ao salvar intervenção:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar intervenção. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intervenção em Marcas Longitudinais</CardTitle>
        <CardDescription>
          {marcaSelecionada 
            ? `Registrando intervenção para marca entre KM ${marcaSelecionada.km_inicial} - ${marcaSelecionada.km_final}${marcaSelecionada.snv ? ` (SNV: ${marcaSelecionada.snv})` : ''}`
            : "Selecione uma marca longitudinal do inventário para registrar intervenção"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_intervencao">Data da Intervenção *</Label>
              <Input
                id="data_intervencao"
                type="date"
                value={formData.data_intervencao}
                onChange={(e) => handleChange("data_intervencao", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da Intervenção *</Label>
              <Select
                value={formData.motivo}
                onValueChange={(value) => handleChange("motivo", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Implantação">Implantação</SelectItem>
                  <SelectItem value="Pintura Nova">Pintura Nova</SelectItem>
                  <SelectItem value="Repintura">Repintura</SelectItem>
                  <SelectItem value="Reforço">Reforço</SelectItem>
                  <SelectItem value="Recuperação">Recuperação</SelectItem>
                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_demarcacao">Tipo de Demarcação</Label>
              <Select
                value={formData.tipo_demarcacao}
                onValueChange={(value) => handleChange("tipo_demarcacao", value)}
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
              <Label htmlFor="cor">Cor</Label>
              <Select
                value={formData.cor}
                onValueChange={(value) => handleChange("cor", value)}
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
              <Label htmlFor="largura_cm">Largura (cm)</Label>
              <Input
                id="largura_cm"
                type="number"
                step="0.1"
                value={formData.largura_cm}
                onChange={(e) => handleChange("largura_cm", e.target.value)}
                placeholder="0.0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="espessura_cm">Espessura (cm)</Label>
              <Input
                id="espessura_cm"
                type="number"
                step="0.1"
                value={formData.espessura_cm}
                onChange={(e) => handleChange("espessura_cm", e.target.value)}
                placeholder="0.0"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="material">Material Utilizado</Label>
              <Select
                value={formData.material}
                onValueChange={(value) => handleChange("material", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o material" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAIS.map((material) => (
                    <SelectItem key={material} value={material}>
                      {material}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-md border p-4">
            <input
              type="checkbox"
              id="fora_plano"
              checked={formData.fora_plano_manutencao}
              onChange={(e) => handleChange("fora_plano_manutencao", e.target.checked)}
              className="h-4 w-4 mt-1"
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="fora_plano">Fora do Plano de Manutenção</Label>
            </div>
          </div>

          {formData.fora_plano_manutencao && (
            <div className="space-y-2">
              <Label htmlFor="justificativa_fora_plano">Justificativa *</Label>
              <Textarea
                id="justificativa_fora_plano"
                value={formData.justificativa_fora_plano}
                onChange={(e) => handleChange("justificativa_fora_plano", e.target.value)}
                placeholder="Explique o motivo da intervenção fora do plano..."
                rows={3}
                required={formData.fora_plano_manutencao}
              />
            </div>
          )}

          {!hideSubmitButton && (
            <Button type="submit" className="w-full" disabled={isLoading || (!marcaSelecionada && modo !== 'controlado')}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Intervenção
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default IntervencoesSHForm;
export { IntervencoesSHForm };