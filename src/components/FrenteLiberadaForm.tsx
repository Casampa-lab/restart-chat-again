import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface FrenteLiberadaFormProps {
  loteId: string;
  rodoviaId: string;
}

const FrenteLiberadaForm = ({ loteId, rodoviaId }: FrenteLiberadaFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    data_liberacao: new Date().toISOString().split('T')[0],
    km_inicial: "",
    km_final: "",
    tipo_servico: "",
    responsavel: "",
    observacao: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.km_inicial || !formData.km_final || !formData.tipo_servico || !formData.responsavel) {
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

      toast({
        title: "Sucesso!",
        description: "Frente liberada registrada com sucesso",
      });

      // Reset form
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
      toast({
        title: "Erro",
        description: "Erro ao salvar frente liberada. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>2.2 - Frente Liberada das Rodovias</CardTitle>
        <CardDescription>
          Registro de frentes liberadas para trabalho nas rodovias
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
                onChange={(e) =>
                  setFormData({ ...formData, data_liberacao: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável pela Liberação *</Label>
              <Input
                id="responsavel"
                value={formData.responsavel}
                onChange={(e) =>
                  setFormData({ ...formData, responsavel: e.target.value })
                }
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

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tipo_servico">Tipo de Serviço *</Label>
              <Input
                id="tipo_servico"
                value={formData.tipo_servico}
                onChange={(e) =>
                  setFormData({ ...formData, tipo_servico: e.target.value })
                }
                placeholder="Ex: Conservação Rodoviária, Sinalização, etc."
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observacao">Observações</Label>
              <Textarea
                id="observacao"
                value={formData.observacao}
                onChange={(e) =>
                  setFormData({ ...formData, observacao: e.target.value })
                }
                placeholder="Observações adicionais sobre a frente liberada"
                rows={3}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Frente Liberada
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default FrenteLiberadaForm;
