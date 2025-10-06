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
  loteId: string;
  rodoviaId: string;
}

const TIPOS_INTERVENCAO = [
  "Pintura Nova",
  "Repintura",
  "Reforço",
  "Implantação",
  "Recuperação",
  "Manutenção"
];

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

const CORES = ["Branca", "Amarela", "Azul", "Vermelha"];

const MATERIAIS = [
  "Tinta Acrílica",
  "Tinta Termoplástica",
  "Resina Acrílica",
  "Película Pré-fabricada",
  "Outros"
];

const IntervencoesSHForm = ({ loteId, rodoviaId }: IntervencoesSHFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    data_intervencao: new Date().toISOString().split('T')[0],
    km_inicial: "",
    km_final: "",
    tipo_intervencao: "",
    tipo_demarcacao: "",
    cor: "",
    espessura_cm: "",
    area_m2: "",
    material_utilizado: "",
    observacao: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.km_inicial || !formData.km_final || !formData.tipo_intervencao || 
        !formData.tipo_demarcacao || !formData.cor || !formData.area_m2) {
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
        .from("intervencoes_sh")
        .insert({
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          data_intervencao: formData.data_intervencao,
          km_inicial: parseFloat(formData.km_inicial),
          km_final: parseFloat(formData.km_final),
          tipo_intervencao: formData.tipo_intervencao,
          tipo_demarcacao: formData.tipo_demarcacao,
          cor: formData.cor,
          espessura_cm: formData.espessura_cm ? parseFloat(formData.espessura_cm) : null,
          area_m2: parseFloat(formData.area_m2),
          material_utilizado: formData.material_utilizado || null,
          observacao: formData.observacao || null,
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Intervenção em sinalização horizontal registrada com sucesso",
      });

      // Reset form
      setFormData({
        data_intervencao: new Date().toISOString().split('T')[0],
        km_inicial: "",
        km_final: "",
        tipo_intervencao: "",
        tipo_demarcacao: "",
        cor: "",
        espessura_cm: "",
        area_m2: "",
        material_utilizado: "",
        observacao: "",
      });
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
        <CardTitle>3.1.5 - Intervenções Realizadas - SH</CardTitle>
        <CardDescription>
          Registro de intervenções em sinalização horizontal
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
                onChange={(e) =>
                  setFormData({ ...formData, data_intervencao: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_intervencao">Tipo de Intervenção *</Label>
              <Select
                value={formData.tipo_intervencao}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_intervencao: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_INTERVENCAO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="area_m2">Área Executada (m²) *</Label>
              <Input
                id="area_m2"
                type="number"
                step="0.01"
                value={formData.area_m2}
                onChange={(e) =>
                  setFormData({ ...formData, area_m2: e.target.value })
                }
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="espessura_cm">Espessura (cm)</Label>
              <Input
                id="espessura_cm"
                type="number"
                step="0.1"
                value={formData.espessura_cm}
                onChange={(e) =>
                  setFormData({ ...formData, espessura_cm: e.target.value })
                }
                placeholder="0.0"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="material_utilizado">Material Utilizado</Label>
              <Select
                value={formData.material_utilizado}
                onValueChange={(value) =>
                  setFormData({ ...formData, material_utilizado: value })
                }
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

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observacao">Observações</Label>
              <Textarea
                id="observacao"
                value={formData.observacao}
                onChange={(e) =>
                  setFormData({ ...formData, observacao: e.target.value })
                }
                placeholder="Observações sobre a intervenção realizada"
                rows={3}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Intervenção
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default IntervencoesSHForm;
