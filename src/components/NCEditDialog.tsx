import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIPOS_NC, PROBLEMAS_POR_TIPO, SITUACOES_NC, type TipoNC } from "@/constants/naoConformidades";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Bell } from "lucide-react";

interface NCEditDialogProps {
  ncId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface NCData {
  id: string;
  numero_nc: string;
  data_ocorrencia: string;
  tipo_nc: string;
  problema_identificado: string;
  descricao_problema: string | null;
  prazo_atendimento: number | null;
  situacao: string;
  data_atendimento: string | null;
  data_notificacao: string | null;
  observacao: string | null;
  km_inicial: number | null;
  latitude: number;
  longitude: number;
  empresa: string;
}

const NCEditDialog = ({ ncId, open, onOpenChange, onSaved }: NCEditDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NCData | null>(null);

  useEffect(() => {
    if (ncId && open) {
      loadNC();
    }
  }, [ncId, open]);

  const loadNC = async () => {
    if (!ncId) return;

    try {
      const { data, error } = await supabase
        .from("nao_conformidades")
        .select("*")
        .eq("id", ncId)
        .single();

      if (error) throw error;
      setFormData(data);
    } catch (error: any) {
      toast.error("Erro ao carregar NC: " + error.message);
    }
  };

  const handleSave = async () => {
    if (!formData || !ncId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("nao_conformidades")
        .update({
          numero_nc: formData.numero_nc,
          data_ocorrencia: formData.data_ocorrencia,
          tipo_nc: formData.tipo_nc,
          problema_identificado: formData.problema_identificado,
          descricao_problema: formData.descricao_problema,
          prazo_atendimento: formData.prazo_atendimento,
          situacao: formData.situacao,
          data_atendimento: formData.data_atendimento,
          data_notificacao: formData.data_notificacao,
          observacao: formData.observacao,
          km_inicial: formData.km_inicial,
        })
        .eq("id", ncId);

      if (error) throw error;

      toast.success("NC atualizada com sucesso!");
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao atualizar NC: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!formData) return null;

  const problemasDisponiveis = formData.tipo_nc 
    ? PROBLEMAS_POR_TIPO[formData.tipo_nc as TipoNC] || []
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Não-Conformidade</DialogTitle>
          <DialogDescription>
            NC: {formData.numero_nc} | Empresa: {formData.empresa}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações de Localização (somente leitura) */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="font-semibold text-sm">Localização GPS (não editável):</p>
            <p className="text-sm text-muted-foreground">
              Lat: {formData.latitude.toFixed(6)}, Lng: {formData.longitude.toFixed(6)}
            </p>
          </div>

          {/* Data e Número NC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_data_ocorrencia">Data da Ocorrência</Label>
              <Input
                id="edit_data_ocorrencia"
                type="date"
                value={formData.data_ocorrencia}
                onChange={(e) => setFormData({ ...formData, data_ocorrencia: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_numero_nc">Número NC</Label>
              <Input
                id="edit_numero_nc"
                type="text"
                value={formData.numero_nc}
                onChange={(e) => setFormData({ ...formData, numero_nc: e.target.value })}
              />
            </div>
          </div>

          {/* Tipo e Problema */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_tipo_nc">Tipo de NC</Label>
              <Select
                value={formData.tipo_nc}
                onValueChange={(value) => setFormData({ ...formData, tipo_nc: value, problema_identificado: "" })}
              >
                <SelectTrigger id="edit_tipo_nc">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TIPOS_NC).map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_problema_identificado">Problema Identificado</Label>
              <Select
                value={formData.problema_identificado}
                onValueChange={(value) => setFormData({ ...formData, problema_identificado: value })}
              >
                <SelectTrigger id="edit_problema_identificado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {problemasDisponiveis.map((problema) => (
                    <SelectItem key={problema} value={problema}>
                      {problema}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="edit_descricao_problema">Descrição Detalhada</Label>
            <Textarea
              id="edit_descricao_problema"
              value={formData.descricao_problema || ""}
              onChange={(e) => setFormData({ ...formData, descricao_problema: e.target.value })}
              rows={3}
            />
          </div>

          {/* Situação e Data de Atendimento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_situacao">Situação</Label>
              <Select
                value={formData.situacao}
                onValueChange={(value) => setFormData({ ...formData, situacao: value })}
              >
                <SelectTrigger id="edit_situacao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SITUACOES_NC.map((situacao) => (
                    <SelectItem key={situacao} value={situacao}>
                      {situacao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_data_atendimento">Data de Atendimento</Label>
              <Input
                id="edit_data_atendimento"
                type="date"
                value={formData.data_atendimento || ""}
                onChange={(e) => setFormData({ ...formData, data_atendimento: e.target.value })}
              />
            </div>
          </div>

          {/* km Inicial */}
          <div className="space-y-2">
            <Label htmlFor="edit_km_inicial">KM Inicial</Label>
            <Input
              id="edit_km_inicial"
              type="number"
              step="0.001"
              value={formData.km_inicial || ""}
              onChange={(e) => setFormData({ ...formData, km_inicial: parseFloat(e.target.value) || null })}
            />
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label htmlFor="edit_observacao">Observação</Label>
            <Textarea
              id="edit_observacao"
              value={formData.observacao || ""}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              rows={3}
            />
          </div>

          {/* Seção de Fotos - Placeholder */}
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold text-sm mb-2">Fotos da Não Conformidade</p>
            <p className="text-sm text-muted-foreground">
              As fotos são gerenciadas durante o cadastro da NC
            </p>
          </div>

          {/* Campos após as fotos */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold">Notificação e Prazo</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_prazo_atendimento">Prazo de Atendimento (dias)</Label>
                <Input
                  id="edit_prazo_atendimento"
                  type="number"
                  min="1"
                  value={formData.prazo_atendimento || ""}
                  onChange={(e) => setFormData({ ...formData, prazo_atendimento: parseInt(e.target.value) || null })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_data_notificacao">Data da Notificação</Label>
                <Input
                  id="edit_data_notificacao"
                  type="date"
                  value={formData.data_notificacao || ""}
                  onChange={(e) => setFormData({ ...formData, data_notificacao: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                // Gerar PDF da NC
                toast.info("Gerando PDF...");
                // A lógica será implementada
              }}
            >
              <Bell className="mr-2 h-4 w-4" />
              Notificar / Gerar PDF
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NCEditDialog;
