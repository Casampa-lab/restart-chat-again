import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, MapPin } from "lucide-react";

interface DefensasFormProps {
  loteId: string;
  rodoviaId: string;
}

const LADOS = ["Direito", "Esquerdo", "Ambos"];
const TIPOS_DEFENSA = [
  "Defensa Metálica Simples",
  "Defensa Metálica Dupla",
  "Defensa New Jersey",
  "Defensa Tipo F",
  "Outros"
];
const ESTADOS_CONSERVACAO = ["Ótimo", "Bom", "Regular", "Ruim", "Péssimo"];
const TIPOS_AVARIA = [
  "Deformação",
  "Corrosão",
  "Falta de Elementos",
  "Fixação Comprometida",
  "Pintura Deteriorada",
  "Outros"
];
const NIVEIS_RISCO = ["Baixo", "Médio", "Alto", "Crítico"];

const DefensasForm = ({ loteId, rodoviaId }: DefensasFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturingInicial, setIsCapturingInicial] = useState(false);
  const [isCapturingFinal, setIsCapturingFinal] = useState(false);
  const [formData, setFormData] = useState({
    data_inspecao: new Date().toISOString().split('T')[0],
    km_inicial: "",
    km_final: "",
    lado: "",
    tipo_defensa: "",
    extensao_metros: "",
    estado_conservacao: "",
    tipo_avaria: "",
    necessita_intervencao: false,
    nivel_risco: "",
    observacao: "",
    latitude_inicial: "",
    longitude_inicial: "",
    latitude_final: "",
    longitude_final: "",
  });

  const capturarCoordenadas = (tipo: 'inicial' | 'final') => {
    if (tipo === 'inicial') setIsCapturingInicial(true);
    else setIsCapturingFinal(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (tipo === 'inicial') {
            setFormData({
              ...formData,
              latitude_inicial: position.coords.latitude.toString(),
              longitude_inicial: position.coords.longitude.toString(),
            });
            toast({
              title: "Coordenadas capturadas!",
              description: `Ponto inicial: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
            });
            setIsCapturingInicial(false);
          } else {
            setFormData({
              ...formData,
              latitude_final: position.coords.latitude.toString(),
              longitude_final: position.coords.longitude.toString(),
            });
            toast({
              title: "Coordenadas capturadas!",
              description: `Ponto final: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
            });
            setIsCapturingFinal(false);
          }
        },
        (error) => {
          toast({
            title: "Erro ao capturar localização",
            description: "Verifique se você permitiu acesso à localização",
            variant: "destructive",
          });
          if (tipo === 'inicial') setIsCapturingInicial(false);
          else setIsCapturingFinal(false);
        }
      );
    } else {
      toast({
        title: "Geolocalização não suportada",
        description: "Seu navegador não suporta geolocalização",
        variant: "destructive",
      });
      if (tipo === 'inicial') setIsCapturingInicial(false);
      else setIsCapturingFinal(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.km_inicial || !formData.km_final || !formData.lado || 
        !formData.tipo_defensa || !formData.extensao_metros || !formData.estado_conservacao) {
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
        .from("defensas")
        .insert({
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          data_inspecao: formData.data_inspecao,
          km_inicial: parseFloat(formData.km_inicial),
          km_final: parseFloat(formData.km_final),
          lado: formData.lado,
          tipo_defensa: formData.tipo_defensa,
          extensao_metros: parseFloat(formData.extensao_metros),
          estado_conservacao: formData.estado_conservacao,
          tipo_avaria: formData.tipo_avaria || null,
          necessita_intervencao: formData.necessita_intervencao,
          nivel_risco: formData.nivel_risco || null,
          observacao: formData.observacao || null,
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Inspeção de defensa registrada com sucesso",
      });

      // Reset form
      setFormData({
        data_inspecao: new Date().toISOString().split('T')[0],
        km_inicial: "",
        km_final: "",
        lado: "",
        tipo_defensa: "",
        extensao_metros: "",
        estado_conservacao: "",
        tipo_avaria: "",
        necessita_intervencao: false,
        nivel_risco: "",
        observacao: "",
        latitude_inicial: "",
        longitude_inicial: "",
        latitude_final: "",
        longitude_final: "",
      });
    } catch (error) {
      console.error("Erro ao salvar inspeção:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar inspeção. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_inspecao">Data da Inspeção *</Label>
              <Input
                id="data_inspecao"
                type="date"
                value={formData.data_inspecao}
                onChange={(e) =>
                  setFormData({ ...formData, data_inspecao: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="extensao_metros">Extensão (metros) *</Label>
              <Input
                id="extensao_metros"
                type="number"
                step="0.1"
                value={formData.extensao_metros}
                onChange={(e) =>
                  setFormData({ ...formData, extensao_metros: e.target.value })
                }
                placeholder="0.0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="km_inicial">km Inicial *</Label>
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
              <Label htmlFor="km_final">km Final *</Label>
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
              <Label>Coordenadas GPS do Ponto Inicial</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => capturarCoordenadas('inicial')}
                  disabled={isCapturingInicial}
                >
                  {isCapturingInicial ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="mr-2 h-4 w-4" />
                  )}
                  Capturar Ponto Inicial
                </Button>
                <Input
                  placeholder="Latitude"
                  value={formData.latitude_inicial}
                  onChange={(e) => setFormData({ ...formData, latitude_inicial: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="Longitude"
                  value={formData.longitude_inicial}
                  onChange={(e) => setFormData({ ...formData, longitude_inicial: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Coordenadas GPS do Ponto Final</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => capturarCoordenadas('final')}
                  disabled={isCapturingFinal}
                >
                  {isCapturingFinal ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="mr-2 h-4 w-4" />
                  )}
                  Capturar Ponto Final
                </Button>
                <Input
                  placeholder="Latitude"
                  value={formData.latitude_final}
                  onChange={(e) => setFormData({ ...formData, latitude_final: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="Longitude"
                  value={formData.longitude_final}
                  onChange={(e) => setFormData({ ...formData, longitude_final: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lado">Lado *</Label>
              <Select
                value={formData.lado}
                onValueChange={(value) =>
                  setFormData({ ...formData, lado: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o lado" />
                </SelectTrigger>
                <SelectContent>
                  {LADOS.map((lado) => (
                    <SelectItem key={lado} value={lado}>
                      {lado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_defensa">Tipo de Defensa *</Label>
              <Select
                value={formData.tipo_defensa}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_defensa: value })
                }
                required
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
              <Label htmlFor="estado_conservacao">Estado de Conservação *</Label>
              <Select
                value={formData.estado_conservacao}
                onValueChange={(value) =>
                  setFormData({ ...formData, estado_conservacao: value })
                }
                required
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
              <Label htmlFor="tipo_avaria">Tipo de Avaria</Label>
              <Select
                value={formData.tipo_avaria}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_avaria: value })
                }
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
              <Label htmlFor="nivel_risco">Nível de Risco</Label>
              <Select
                value={formData.nivel_risco}
                onValueChange={(value) =>
                  setFormData({ ...formData, nivel_risco: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
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

            <div className="space-y-2 flex items-center gap-2 pt-8">
              <Checkbox
                id="necessita_intervencao"
                checked={formData.necessita_intervencao}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, necessita_intervencao: checked as boolean })
                }
              />
              <Label htmlFor="necessita_intervencao" className="cursor-pointer">
                Necessita Intervenção Imediata
              </Label>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observacao">Observações</Label>
              <Textarea
                id="observacao"
                value={formData.observacao}
                onChange={(e) =>
                  setFormData({ ...formData, observacao: e.target.value })
                }
                placeholder="Observações sobre a inspeção da defensa"
                rows={3}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Inspeção
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default DefensasForm;
