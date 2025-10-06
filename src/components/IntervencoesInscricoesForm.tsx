import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, MapPin } from "lucide-react";

interface IntervencoesInscricoesFormProps {
  loteId: string;
  rodoviaId: string;
}

const TIPOS_INTERVENCAO = [
  "Pintura Nova",
  "Repintura",
  "Implantação",
  "Recuperação",
  "Manutenção"
];

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

const CORES = ["Branca", "Amarela", "Azul", "Vermelha", "Verde"];

const MATERIAIS = [
  "Tinta Acrílica",
  "Tinta Termoplástica",
  "Resina Acrílica",
  "Película Pré-fabricada",
  "Outros"
];

const IntervencoesInscricoesForm = ({ loteId, rodoviaId }: IntervencoesInscricoesFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturingInicial, setIsCapturingInicial] = useState(false);
  const [isCapturingFinal, setIsCapturingFinal] = useState(false);
  const [formData, setFormData] = useState({
    data_intervencao: new Date().toISOString().split('T')[0],
    km_inicial: "",
    km_final: "",
    tipo_intervencao: "",
    tipo_inscricao: "",
    cor: "",
    dimensoes: "",
    area_m2: "",
    material_utilizado: "",
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
    
    if (!formData.km_inicial || !formData.km_final || !formData.tipo_intervencao || 
        !formData.tipo_inscricao || !formData.cor || !formData.area_m2) {
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
        .from("intervencoes_inscricoes")
        .insert({
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          data_intervencao: formData.data_intervencao,
          km_inicial: parseFloat(formData.km_inicial),
          km_final: parseFloat(formData.km_final),
          tipo_intervencao: formData.tipo_intervencao,
          tipo_inscricao: formData.tipo_inscricao,
          cor: formData.cor,
          dimensoes: formData.dimensoes || null,
          area_m2: parseFloat(formData.area_m2),
          material_utilizado: formData.material_utilizado || null,
          observacao: formData.observacao || null,
          latitude_inicial: formData.latitude_inicial ? parseFloat(formData.latitude_inicial) : null,
          longitude_inicial: formData.longitude_inicial ? parseFloat(formData.longitude_inicial) : null,
          latitude_final: formData.latitude_final ? parseFloat(formData.latitude_final) : null,
          longitude_final: formData.longitude_final ? parseFloat(formData.longitude_final) : null,
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Intervenção em inscrições registrada com sucesso",
      });

      // Reset form
      setFormData({
        data_intervencao: new Date().toISOString().split('T')[0],
        km_inicial: "",
        km_final: "",
        tipo_intervencao: "",
        tipo_inscricao: "",
        cor: "",
        dimensoes: "",
        area_m2: "",
        material_utilizado: "",
        observacao: "",
        latitude_inicial: "",
        longitude_inicial: "",
        latitude_final: "",
        longitude_final: "",
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
        <CardTitle>3.1.5 - Intervenções Realizadas - Inscrições</CardTitle>
        <CardDescription>
          Registro de intervenções em inscrições nos pavimentos
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
              <Label htmlFor="tipo_inscricao">Tipo de Inscrição *</Label>
              <Select
                value={formData.tipo_inscricao}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_inscricao: value })
                }
                required
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
              <Label htmlFor="dimensoes">Dimensões (Ex: 3x2m)</Label>
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

export default IntervencoesInscricoesForm;
