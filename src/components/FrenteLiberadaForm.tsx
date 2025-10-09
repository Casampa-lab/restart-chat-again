import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, MapPin } from "lucide-react";
interface FrenteLiberadaFormProps {
  loteId: string;
  rodoviaId: string;
}
const FrenteLiberadaForm = ({
  loteId,
  rodoviaId
}: FrenteLiberadaFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturingInicial, setIsCapturingInicial] = useState(false);
  const [isCapturingFinal, setIsCapturingFinal] = useState(false);
  const capturarCoordenadas = (tipo: 'inicial' | 'final') => {
    if (tipo === 'inicial') setIsCapturingInicial(true);else setIsCapturingFinal(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        if (tipo === 'inicial') {
          setFormData({
            ...formData,
            latitude_inicial: position.coords.latitude.toString(),
            longitude_inicial: position.coords.longitude.toString()
          });
          toast({
            title: "Coordenadas capturadas!",
            description: `Ponto inicial: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
          });
          setIsCapturingInicial(false);
        } else {
          setFormData({
            ...formData,
            latitude_final: position.coords.latitude.toString(),
            longitude_final: position.coords.longitude.toString()
          });
          toast({
            title: "Coordenadas capturadas!",
            description: `Ponto final: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
          });
          setIsCapturingFinal(false);
        }
      }, error => {
        toast({
          title: "Erro ao capturar localização",
          description: "Verifique se você permitiu acesso à localização",
          variant: "destructive"
        });
        if (tipo === 'inicial') setIsCapturingInicial(false);else setIsCapturingFinal(false);
      });
    } else {
      toast({
        title: "Geolocalização não suportada",
        description: "Seu navegador não suporta geolocalização",
        variant: "destructive"
      });
      if (tipo === 'inicial') setIsCapturingInicial(false);else setIsCapturingFinal(false);
    }
  };
  const [formData, setFormData] = useState({
    data_liberacao: new Date().toISOString().split('T')[0],
    km_inicial: "",
    km_final: "",
    extensao_contratada: "",
    portaria_aprovacao_projeto: "",
    observacao: "",
    latitude_inicial: "",
    longitude_inicial: "",
    latitude_final: "",
    longitude_final: ""
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.km_inicial || !formData.km_final || !formData.extensao_contratada || !formData.portaria_aprovacao_projeto) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }
      const {
        error
      } = await supabase.from("frentes_liberadas").insert({
        user_id: user.id,
        lote_id: loteId,
        rodovia_id: rodoviaId,
        data_liberacao: formData.data_liberacao,
        km_inicial: parseFloat(formData.km_inicial),
        km_final: parseFloat(formData.km_final),
        extensao_contratada: parseFloat(formData.extensao_contratada),
        portaria_aprovacao_projeto: formData.portaria_aprovacao_projeto,
        observacao: formData.observacao || null,
        latitude_inicial: formData.latitude_inicial ? parseFloat(formData.latitude_inicial) : null,
        longitude_inicial: formData.longitude_inicial ? parseFloat(formData.longitude_inicial) : null,
        latitude_final: formData.latitude_final ? parseFloat(formData.latitude_final) : null,
        longitude_final: formData.longitude_final ? parseFloat(formData.longitude_final) : null
      });
      if (error) throw error;
      toast({
        title: "Sucesso!",
        description: "Frente liberada registrada com sucesso"
      });

      // Reset form
      setFormData({
        data_liberacao: new Date().toISOString().split('T')[0],
        km_inicial: "",
        km_final: "",
        extensao_contratada: "",
        portaria_aprovacao_projeto: "",
        observacao: "",
        latitude_inicial: "",
        longitude_inicial: "",
        latitude_final: "",
        longitude_final: ""
      });
    } catch (error) {
      console.error("Erro ao salvar frente liberada:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar frente liberada. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_liberacao">Data de Liberação *</Label>
              <Input id="data_liberacao" type="date" value={formData.data_liberacao} onChange={e => setFormData({
              ...formData,
              data_liberacao: e.target.value
            })} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="portaria_aprovacao_projeto">Portaria de Aprovação de Projeto *</Label>
              <Input id="portaria_aprovacao_projeto" value={formData.portaria_aprovacao_projeto} onChange={e => setFormData({
              ...formData,
              portaria_aprovacao_projeto: e.target.value
            })} placeholder="Número da portaria" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="km_inicial">km Inicial *</Label>
              <Input id="km_inicial" type="number" step="0.001" value={formData.km_inicial} onChange={e => setFormData({
              ...formData,
              km_inicial: e.target.value
            })} placeholder="0.000" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="km_final">km Final *</Label>
              <Input id="km_final" type="number" step="0.001" value={formData.km_final} onChange={e => setFormData({
              ...formData,
              km_final: e.target.value
            })} placeholder="0.000" required />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Coordenadas GPS do Ponto Inicial</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => capturarCoordenadas('inicial')} disabled={isCapturingInicial}>
                  {isCapturingInicial ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                  Capturar Ponto Inicial
                </Button>
                <Input placeholder="Latitude" value={formData.latitude_inicial} onChange={e => setFormData({
                ...formData,
                latitude_inicial: e.target.value
              })} className="flex-1" />
                <Input placeholder="Longitude" value={formData.longitude_inicial} onChange={e => setFormData({
                ...formData,
                longitude_inicial: e.target.value
              })} className="flex-1" />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Coordenadas GPS do Ponto Final</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => capturarCoordenadas('final')} disabled={isCapturingFinal}>
                  {isCapturingFinal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                  Capturar Ponto Final
                </Button>
                <Input placeholder="Latitude" value={formData.latitude_final} onChange={e => setFormData({
                ...formData,
                latitude_final: e.target.value
              })} className="flex-1" />
                <Input placeholder="Longitude" value={formData.longitude_final} onChange={e => setFormData({
                ...formData,
                longitude_final: e.target.value
              })} className="flex-1" />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="extensao_contratada">Extensão Contratada e Liberada (km) *</Label>
              <Input id="extensao_contratada" type="number" step="0.001" value={formData.extensao_contratada} onChange={e => setFormData({
              ...formData,
              extensao_contratada: e.target.value
            })} placeholder="0.000" required />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observacao">Observações</Label>
              <Textarea id="observacao" value={formData.observacao} onChange={e => setFormData({
              ...formData,
              observacao: e.target.value
            })} placeholder="Observações adicionais sobre a frente liberada" rows={3} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Frente Liberada
          </Button>
        </form>
      </CardContent>
    </Card>;
};
export default FrenteLiberadaForm;