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

interface IntervencoesInscricoesFormProps {
  inscricaoSelecionada?: {
    id: string;
    km_inicial: number;
    km_final: number;
    tipo_inscricao: string;
  };
  onIntervencaoRegistrada?: () => void;
}

const MATERIAIS = [
  "Tinta Acrílica",
  "Tinta Termoplástica",
  "Resina Acrílica",
  "Película Pré-fabricada",
  "Outros"
];

const CORES = ["Branca", "Amarela", "Azul", "Vermelha", "Verde"];

const TIPOS_INSCRICAO = [
  "Passagem de Pedestre",
  "Faixa Zebrada",
  "Área de Conflito",
  "Parada de Ônibus",
  "Área de Estacionamento",
  "Ciclofaixa",
  "Ciclovia",
  "Área de Canalização",
  "Outros"
];

const IntervencoesInscricoesForm = ({ inscricaoSelecionada, onIntervencaoRegistrada }: IntervencoesInscricoesFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    data_intervencao: new Date().toISOString().split('T')[0],
    motivo: "",
    tipo_inscricao: "",
    cor: "",
    dimensoes: "",
    area_m2: "",
    material_utilizado: "",
    estado_conservacao: "",
    observacao: "",
    foto_url: "",
    fora_plano_manutencao: false,
    justificativa_fora_plano: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inscricaoSelecionada) {
      toast({
        title: "Erro",
        description: "Selecione uma inscrição do inventário primeiro",
        variant: "destructive",
      });
      return;
    }

    if (!formData.motivo) {
      toast({
        title: "Erro",
        description: "Preencha o motivo da intervenção",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("ficha_inscricoes_intervencoes")
        .insert({
          ficha_inscricoes_id: inscricaoSelecionada.id,
          data_intervencao: formData.data_intervencao,
          motivo: formData.motivo,
          tipo_inscricao: formData.tipo_inscricao || null,
          cor: formData.cor || null,
          dimensoes: formData.dimensoes || null,
          area_m2: formData.area_m2 ? parseFloat(formData.area_m2) : null,
          material_utilizado: formData.material_utilizado || null,
          estado_conservacao: formData.estado_conservacao || null,
          observacao: formData.observacao || null,
          foto_url: formData.foto_url || null,
          fora_plano_manutencao: formData.fora_plano_manutencao,
          justificativa_fora_plano: formData.justificativa_fora_plano || null,
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Intervenção em inscrições registrada com sucesso",
      });

      // Reset form
      setFormData({
        data_intervencao: new Date().toISOString().split('T')[0],
        motivo: "",
        tipo_inscricao: "",
        cor: "",
        dimensoes: "",
        area_m2: "",
        material_utilizado: "",
        estado_conservacao: "",
        observacao: "",
        foto_url: "",
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
        <CardTitle>Intervenção em Zebrados, Setas, Símbolos e Legendas</CardTitle>
        <CardDescription>
          {inscricaoSelecionada 
            ? `Registrando intervenção para ${inscricaoSelecionada.tipo_inscricao} entre KM ${inscricaoSelecionada.km_inicial} - ${inscricaoSelecionada.km_final}`
            : "Selecione uma inscrição do inventário para registrar intervenção"
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
                onChange={(e) =>
                  setFormData({ ...formData, data_intervencao: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da Intervenção *</Label>
              <Select
                value={formData.motivo}
                onValueChange={(value) =>
                  setFormData({ ...formData, motivo: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Implantação">Implantação</SelectItem>
                  <SelectItem value="Pintura Nova">Pintura Nova</SelectItem>
                  <SelectItem value="Repintura">Repintura</SelectItem>
                  <SelectItem value="Recuperação">Recuperação</SelectItem>
                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_inscricao">Tipo de Inscrição</Label>
              <Select
                value={formData.tipo_inscricao}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_inscricao: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_INSCRICAO.map((tipo) => (
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
                onValueChange={(value) =>
                  setFormData({ ...formData, cor: value })
                }
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
              <Label htmlFor="area_m2">Área Executada (m²)</Label>
              <Input
                id="area_m2"
                type="number"
                step="0.01"
                value={formData.area_m2}
                onChange={(e) =>
                  setFormData({ ...formData, area_m2: e.target.value })
                }
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dimensoes">Dimensões</Label>
              <Input
                id="dimensoes"
                value={formData.dimensoes}
                onChange={(e) =>
                  setFormData({ ...formData, dimensoes: e.target.value })
                }
                placeholder="Ex: 3x2m, 10x1,5m"
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

            <div className="space-y-2">
              <Label htmlFor="estado_conservacao">Estado de Conservação</Label>
              <Select
                value={formData.estado_conservacao}
                onValueChange={(value) =>
                  setFormData({ ...formData, estado_conservacao: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bom">Bom</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Ruim">Ruim</SelectItem>
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
                placeholder="Observações sobre a intervenção..."
                rows={3}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="foto_url">URL da Foto</Label>
              <Input
                id="foto_url"
                value={formData.foto_url}
                onChange={(e) =>
                  setFormData({ ...formData, foto_url: e.target.value })
                }
                placeholder="Caminho da foto no storage..."
              />
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-md border p-4">
            <input
              type="checkbox"
              id="fora_plano"
              checked={formData.fora_plano_manutencao}
              onChange={(e) =>
                setFormData({ ...formData, fora_plano_manutencao: e.target.checked })
              }
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
                onChange={(e) =>
                  setFormData({ ...formData, justificativa_fora_plano: e.target.value })
                }
                placeholder="Explique o motivo da intervenção fora do plano..."
                rows={3}
                required={formData.fora_plano_manutencao}
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading || !inscricaoSelecionada}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Intervenção
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default IntervencoesInscricoesForm;