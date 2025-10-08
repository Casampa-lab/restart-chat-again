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
import { TODAS_PLACAS } from "@/constants/codigosPlacas";

interface RetrorrefletividadeEstaticaFormProps {
  loteId: string;
  rodoviaId: string;
}

const LADOS = ["Direito", "Esquerdo", "Centro"];
const TIPOS_DISPOSITIVO = [
  "Placa de Regulamentação",
  "Placa de Advertência",
  "Placa de Indicação",
  "Placa Educativa",
  "Tacha Refletiva",
  "Demarcação Horizontal",
  "Outros"
];

const RetrorrefletividadeEstaticaForm = ({ loteId, rodoviaId }: RetrorrefletividadeEstaticaFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [formData, setFormData] = useState({
    data_medicao: new Date().toISOString().split('T')[0],
    km_referencia: "",
    lado: "",
    tipo_dispositivo: "",
    codigo_dispositivo: "",
    leitura1: "",
    leitura2: "",
    leitura3: "",
    leitura4: "",
    leitura5: "",
    valor_medido: "",
    valor_minimo: "",
    observacao: "",
    latitude: "",
    longitude: "",
  });

  // Calcula a média das leituras automaticamente
  const calcularMedia = (l1: string, l2: string, l3: string, l4: string, l5: string) => {
    const leituras = [l1, l2, l3, l4, l5]
      .filter(l => l !== "" && !isNaN(parseFloat(l)))
      .map(l => parseFloat(l));
    
    if (leituras.length === 0) return "";
    
    const soma = leituras.reduce((acc, val) => acc + val, 0);
    const media = soma / leituras.length;
    return media.toFixed(1);
  };

  const capturarCoordenadas = () => {
    setIsCapturing(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          });
          toast({
            title: "Coordenadas capturadas!",
            description: `Localização: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
          });
          setIsCapturing(false);
        },
        (error) => {
          toast({
            title: "Erro ao capturar localização",
            description: "Verifique se você permitiu acesso à localização",
            variant: "destructive",
          });
          setIsCapturing(false);
        }
      );
    } else {
      toast({
        title: "Geolocalização não suportada",
        description: "Seu navegador não suporta geolocalização",
        variant: "destructive",
      });
      setIsCapturing(false);
    }
  };

  const situacao = formData.valor_medido && formData.valor_minimo
    ? parseFloat(formData.valor_medido) >= parseFloat(formData.valor_minimo)
      ? "Conforme"
      : "Não Conforme"
    : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.km_referencia || !formData.lado || !formData.tipo_dispositivo || 
        !formData.valor_medido || !formData.valor_minimo) {
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
        .from("retrorrefletividade_estatica")
        .insert({
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          data_medicao: formData.data_medicao,
          km_referencia: parseFloat(formData.km_referencia),
          lado: formData.lado,
          tipo_dispositivo: formData.tipo_dispositivo,
          codigo_dispositivo: formData.codigo_dispositivo || null,
          valor_medido: parseFloat(formData.valor_medido),
          valor_minimo: parseFloat(formData.valor_minimo),
          situacao: situacao,
          observacao: formData.observacao || null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Medição de retrorrefletividade registrada com sucesso",
      });

      // Reset form
      setFormData({
        data_medicao: new Date().toISOString().split('T')[0],
        km_referencia: "",
        lado: "",
        tipo_dispositivo: "",
        codigo_dispositivo: "",
        leitura1: "",
        leitura2: "",
        leitura3: "",
        leitura4: "",
        leitura5: "",
        valor_medido: "",
        valor_minimo: "",
        observacao: "",
        latitude: "",
        longitude: "",
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
        <CardTitle>3.1.3.1 - Retrorrefletividade Estática</CardTitle>
        <CardDescription>
          Medição de retrorrefletividade estática da sinalização viária
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
              <Label htmlFor="km_referencia">km de Referência *</Label>
              <Input
                id="km_referencia"
                type="number"
                step="0.001"
                value={formData.km_referencia}
                onChange={(e) =>
                  setFormData({ ...formData, km_referencia: e.target.value })
                }
                placeholder="0.000"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Coordenadas GPS</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={capturarCoordenadas}
                  disabled={isCapturing}
                >
                  {isCapturing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="mr-2 h-4 w-4" />
                  )}
                  Capturar Localização
                </Button>
                <Input
                  placeholder="Latitude"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="Longitude"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
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
              <Label htmlFor="tipo_dispositivo">Tipo de Dispositivo *</Label>
              <Select
                value={formData.tipo_dispositivo}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_dispositivo: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DISPOSITIVO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo_dispositivo">Código do Dispositivo</Label>
              <Select
                value={formData.codigo_dispositivo}
                onValueChange={(value) =>
                  setFormData({ ...formData, codigo_dispositivo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o código da placa" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {TODAS_PLACAS.map((placa) => (
                    <SelectItem key={placa.codigo} value={placa.codigo}>
                      {placa.codigo} - {placa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Leituras de Retrorrefletividade</Label>
                <p className="text-sm text-muted-foreground">
                  Digite até 5 leituras. A média será calculada automaticamente.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leitura1">Leitura 1</Label>
                  <Input
                    id="leitura1"
                    type="number"
                    step="0.1"
                    value={formData.leitura1}
                    onChange={(e) => {
                      const novoFormData = { ...formData, leitura1: e.target.value };
                      const media = calcularMedia(
                        novoFormData.leitura1,
                        novoFormData.leitura2,
                        novoFormData.leitura3,
                        novoFormData.leitura4,
                        novoFormData.leitura5
                      );
                      setFormData({ ...novoFormData, valor_medido: media });
                    }}
                    placeholder="0.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leitura2">Leitura 2</Label>
                  <Input
                    id="leitura2"
                    type="number"
                    step="0.1"
                    value={formData.leitura2}
                    onChange={(e) => {
                      const novoFormData = { ...formData, leitura2: e.target.value };
                      const media = calcularMedia(
                        novoFormData.leitura1,
                        novoFormData.leitura2,
                        novoFormData.leitura3,
                        novoFormData.leitura4,
                        novoFormData.leitura5
                      );
                      setFormData({ ...novoFormData, valor_medido: media });
                    }}
                    placeholder="0.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leitura3">Leitura 3</Label>
                  <Input
                    id="leitura3"
                    type="number"
                    step="0.1"
                    value={formData.leitura3}
                    onChange={(e) => {
                      const novoFormData = { ...formData, leitura3: e.target.value };
                      const media = calcularMedia(
                        novoFormData.leitura1,
                        novoFormData.leitura2,
                        novoFormData.leitura3,
                        novoFormData.leitura4,
                        novoFormData.leitura5
                      );
                      setFormData({ ...novoFormData, valor_medido: media });
                    }}
                    placeholder="0.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leitura4">Leitura 4</Label>
                  <Input
                    id="leitura4"
                    type="number"
                    step="0.1"
                    value={formData.leitura4}
                    onChange={(e) => {
                      const novoFormData = { ...formData, leitura4: e.target.value };
                      const media = calcularMedia(
                        novoFormData.leitura1,
                        novoFormData.leitura2,
                        novoFormData.leitura3,
                        novoFormData.leitura4,
                        novoFormData.leitura5
                      );
                      setFormData({ ...novoFormData, valor_medido: media });
                    }}
                    placeholder="0.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leitura5">Leitura 5</Label>
                  <Input
                    id="leitura5"
                    type="number"
                    step="0.1"
                    value={formData.leitura5}
                    onChange={(e) => {
                      const novoFormData = { ...formData, leitura5: e.target.value };
                      const media = calcularMedia(
                        novoFormData.leitura1,
                        novoFormData.leitura2,
                        novoFormData.leitura3,
                        novoFormData.leitura4,
                        novoFormData.leitura5
                      );
                      setFormData({ ...novoFormData, valor_medido: media });
                    }}
                    placeholder="0.0"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_medido">Valor Medido - Média (cd/lx/m²) *</Label>
              <Input
                id="valor_medido"
                type="number"
                step="0.1"
                value={formData.valor_medido}
                readOnly
                className="bg-muted"
                placeholder="Calculado automaticamente"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_minimo">Valor Mínimo Aceitável (cd/lx/m²) *</Label>
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
                placeholder="Observações sobre a medição"
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

export default RetrorrefletividadeEstaticaForm;
