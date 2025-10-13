import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface DefensasIntervencoesFormProps {
  defensaSelecionada?: any;
  onIntervencaoRegistrada?: () => void;
  modo?: 'normal' | 'controlado';
  onDataChange?: (data: any) => void;
  hideSubmitButton?: boolean;
  loteId?: string;
  rodoviaId?: string;
}

const TIPOS_DEFENSA = [
  "Defensa Metálica Simples",
  "Defensa Metálica Dupla",
  "Defensa New Jersey",
  "Defensa Tipo F",
  "Outros"
];

const ESTADOS_CONSERVACAO = [
  "Excelente",
  "Bom",
  "Regular",
  "Ruim",
  "Péssimo"
];

const TIPOS_AVARIA = [
  "Deformação",
  "Corrosão",
  "Desconexão",
  "Falta de peças",
  "Outros"
];

const NIVEIS_RISCO = [
  "Baixo",
  "Médio",
  "Alto",
  "Muito Alto"
];

const DefensasIntervencoesForm = ({ 
  defensaSelecionada, 
  onIntervencaoRegistrada,
  modo = 'normal',
  onDataChange,
  hideSubmitButton = false,
  loteId,
  rodoviaId
}: DefensasIntervencoesFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    data_intervencao: new Date().toISOString().split('T')[0],
    motivo: "",
    tipo_defensa: defensaSelecionada?.tipo_defensa || "",
    extensao_metros: defensaSelecionada?.extensao_metros?.toString() || "",
    tipo_avaria: "",
    estado_conservacao: "",
    nivel_risco: "",
    necessita_intervencao: false,
    observacao: "",
    foto_url: "",
    fora_plano_manutencao: false,
    justificativa_fora_plano: "",
  });

  // Preencher formulário com dados da defensa selecionada
  useEffect(() => {
    if (defensaSelecionada && modo === 'normal') {
      setFormData(prev => ({
        ...prev,
        tipo_defensa: (defensaSelecionada as any).tipo_defensa || "",
        extensao_metros: (defensaSelecionada as any).extensao_metros?.toString() || "",
      }));
    }
  }, [defensaSelecionada, modo]);

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    
    if (modo === 'controlado' && onDataChange) {
      onDataChange(newData);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!defensaSelecionada?.id) {
      toast.error("Selecione uma defensa para registrar a intervenção");
      return;
    }

    if (!formData.data_intervencao || !formData.motivo) {
      toast.error("Preencha os campos obrigatórios (Data e Motivo)");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("defensas_intervencoes")
        .insert({
          defensa_id: defensaSelecionada.id,
          data_intervencao: formData.data_intervencao,
          motivo: formData.motivo,
          tipo_defensa: formData.tipo_defensa || null,
          extensao_metros: formData.extensao_metros ? parseFloat(formData.extensao_metros) : null,
          tipo_avaria: formData.tipo_avaria || null,
          estado_conservacao: formData.estado_conservacao || null,
          nivel_risco: formData.nivel_risco || null,
          necessita_intervencao: formData.necessita_intervencao,
          observacao: formData.observacao || null,
          foto_url: formData.foto_url || null,
          fora_plano_manutencao: formData.fora_plano_manutencao,
          justificativa_fora_plano: formData.justificativa_fora_plano || null,
        });

      if (error) throw error;

      toast.success("Intervenção registrada com sucesso!");

      setFormData({
        data_intervencao: new Date().toISOString().split('T')[0],
        motivo: "",
        tipo_defensa: defensaSelecionada?.tipo_defensa || "",
        extensao_metros: defensaSelecionada?.extensao_metros?.toString() || "",
        tipo_avaria: "",
        estado_conservacao: "",
        nivel_risco: "",
        necessita_intervencao: false,
        observacao: "",
        foto_url: "",
        fora_plano_manutencao: false,
        justificativa_fora_plano: "",
      });

      if (onIntervencaoRegistrada) {
        onIntervencaoRegistrada();
      }
    } catch (error: any) {
      console.error("Erro ao registrar intervenção:", error);
      toast.error("Erro ao registrar intervenção: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formContent = (
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
          <Input
            id="motivo"
            value={formData.motivo}
            onChange={(e) => handleChange("motivo", e.target.value)}
            placeholder="Descreva o motivo"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipo_defensa">Tipo de Defensa</Label>
          <Select
            value={formData.tipo_defensa}
            onValueChange={(value) => handleChange("tipo_defensa", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_DEFENSA.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="extensao_metros">Extensão (metros)</Label>
          <Input
            id="extensao_metros"
            type="number"
            step="0.1"
            value={formData.extensao_metros}
            onChange={(e) => handleChange("extensao_metros", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipo_avaria">Tipo de Avaria</Label>
          <Select
            value={formData.tipo_avaria}
            onValueChange={(value) => handleChange("tipo_avaria", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de avaria" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_AVARIA.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="estado_conservacao">Estado de Conservação</Label>
          <Select
            value={formData.estado_conservacao}
            onValueChange={(value) => handleChange("estado_conservacao", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o estado" />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_CONSERVACAO.map((estado) => (
                <SelectItem key={estado} value={estado}>
                  {estado}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nivel_risco">Nível de Risco</Label>
          <Select
            value={formData.nivel_risco}
            onValueChange={(value) => handleChange("nivel_risco", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o nível de risco" />
            </SelectTrigger>
            <SelectContent>
              {NIVEIS_RISCO.map((nivel) => (
                <SelectItem key={nivel} value={nivel}>
                  {nivel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="foto_url">URL da Foto</Label>
          <Input
            id="foto_url"
            value={formData.foto_url}
            onChange={(e) => handleChange("foto_url", e.target.value)}
            placeholder="URL da foto da intervenção"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacao">Observações</Label>
        <Textarea
          id="observacao"
          value={formData.observacao}
          onChange={(e) => handleChange("observacao", e.target.value)}
          placeholder="Observações adicionais sobre a intervenção"
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="necessita_intervencao"
          checked={formData.necessita_intervencao}
          onCheckedChange={(checked) => handleChange("necessita_intervencao", checked)}
        />
        <Label htmlFor="necessita_intervencao" className="cursor-pointer">
          Necessita Intervenção Urgente
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="fora_plano_manutencao"
          checked={formData.fora_plano_manutencao}
          onCheckedChange={(checked) => handleChange("fora_plano_manutencao", checked)}
        />
        <Label htmlFor="fora_plano_manutencao" className="cursor-pointer">
          Fora do Plano de Manutenção
        </Label>
      </div>

      {formData.fora_plano_manutencao && (
        <div className="space-y-2">
          <Label htmlFor="justificativa_fora_plano">Justificativa *</Label>
          <Textarea
            id="justificativa_fora_plano"
            value={formData.justificativa_fora_plano}
            onChange={(e) => handleChange("justificativa_fora_plano", e.target.value)}
            placeholder="Justifique o motivo da intervenção estar fora do plano de manutenção"
            rows={3}
            required={formData.fora_plano_manutencao}
          />
        </div>
      )}

      {!hideSubmitButton && (
        <Button type="submit" disabled={isLoading || !defensaSelecionada}>
          {isLoading ? "Salvando..." : "Registrar Intervenção"}
        </Button>
      )}
    </form>
  );

  if (modo === 'controlado') {
    return formContent;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intervenção em Defensas</CardTitle>
        <CardDescription>
          {defensaSelecionada 
            ? `Registre uma intervenção para a defensa KM ${defensaSelecionada.km_inicial?.toFixed(3)} - ${defensaSelecionada.km_final?.toFixed(3)}`
            : "Selecione uma defensa no mapa ou na lista para registrar uma intervenção"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
};

export default DefensasIntervencoesForm;
