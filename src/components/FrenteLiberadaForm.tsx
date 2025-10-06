import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface FrenteLiberadaFormProps {
  loteId: string;
  rodoviaId: string;
}

const FrenteLiberadaForm = ({ loteId, rodoviaId }: FrenteLiberadaFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    data_liberacao: new Date().toISOString().split('T')[0],
    km_inicial: "",
    km_final: "",
    tipo_servico: "",
    responsavel: "",
    observacao: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Erro: Usuário não autenticado");
        return;
      }

      // Validações básicas
      if (!formData.km_inicial || !formData.km_final) {
        toast.error("Preencha os KMs inicial e final");
        return;
      }

      if (parseFloat(formData.km_final) <= parseFloat(formData.km_inicial)) {
        toast.error("KM final deve ser maior que KM inicial");
        return;
      }

      if (!formData.tipo_servico || !formData.responsavel) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }

      const { error } = await supabase
        .from("frentes_liberadas")
        .insert({
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          data_liberacao: formData.data_liberacao,
          km_inicial: parseFloat(formData.km_inicial),
          km_final: parseFloat(formData.km_final),
          tipo_servico: formData.tipo_servico,
          responsavel: formData.responsavel,
          observacao: formData.observacao || null,
        });

      if (error) throw error;

      toast.success("Frente liberada registrada com sucesso!");
      
      // Limpar formulário
      setFormData({
        data_liberacao: new Date().toISOString().split('T')[0],
        km_inicial: "",
        km_final: "",
        tipo_servico: "",
        responsavel: "",
        observacao: "",
      });
    } catch (error) {
      console.error("Erro ao salvar frente liberada:", error);
      toast.error("Erro ao salvar frente liberada");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>2.2 - Frente Liberada das Rodovias</CardTitle>
        <CardDescription>
          Registro de frentes liberadas para trabalho
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_liberacao">Data de Liberação *</Label>
              <Input
                id="data_liberacao"
                type="date"
                value={formData.data_liberacao}
                onChange={(e) => handleChange("data_liberacao", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável pela Liberação *</Label>
              <Input
                id="responsavel"
                value={formData.responsavel}
                onChange={(e) => handleChange("responsavel", e.target.value)}
                placeholder="Nome do responsável"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="km_inicial">KM Inicial *</Label>
              <Input
                id="km_inicial"
                type="number"
                step="0.001"
                value={formData.km_inicial}
                onChange={(e) => handleChange("km_inicial", e.target.value)}
                placeholder="Ex: 123.456"
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
                onChange={(e) => handleChange("km_final", e.target.value)}
                placeholder="Ex: 125.678"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tipo_servico">Tipo de Serviço Liberado *</Label>
              <Input
                id="tipo_servico"
                value={formData.tipo_servico}
                onChange={(e) => handleChange("tipo_servico", e.target.value)}
                placeholder="Ex: Sinalização Horizontal, Recuperação de Pavimento, etc."
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observacao">Observações</Label>
              <Textarea
                id="observacao"
                value={formData.observacao}
                onChange={(e) => handleChange("observacao", e.target.value)}
                placeholder="Observações adicionais (opcional)"
                rows={3}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Salvando..." : "Salvar Frente Liberada"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default FrenteLiberadaForm;
