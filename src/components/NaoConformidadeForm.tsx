import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Save, Bell } from "lucide-react";
import { TIPOS_NC, PROBLEMAS_POR_TIPO, SITUACOES_NC, type TipoNC } from "@/constants/naoConformidades";
interface NaoConformidadeFormProps {
  loteId: string;
  rodoviaId: string;
}
interface LoteInfo {
  empresa: {
    nome: string;
  };
}
const NaoConformidadeForm = ({
  loteId,
  rodoviaId
}: NaoConformidadeFormProps) => {
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [empresaNome, setEmpresaNome] = useState<string>("");
  const [formData, setFormData] = useState({
    data_ocorrencia: new Date().toISOString().split("T")[0],
    numero_nc: "",
    tipo_nc: "",
    problema_identificado: "",
    descricao_problema: "",
    prazo_atendimento: "",
    situacao: "Não Atendida",
    data_atendimento: "",
    data_notificacao: "",
    observacao: "",
    km_referencia: ""
  });

  // Buscar empresa do lote automaticamente
  useEffect(() => {
    const loadEmpresaDoLote = async () => {
      try {
        const {
          data,
          error
        } = await supabase.from("lotes").select("empresas(nome)").eq("id", loteId).single();
        if (error) throw error;
        if (data && (data as any).empresas) {
          setEmpresaNome((data as any).empresas.nome);
        }
      } catch (error: any) {
        console.error("Erro ao buscar empresa do lote:", error);
        toast.error("Erro ao carregar informações do lote");
      }
    };
    loadEmpresaDoLote();
  }, [loteId]);
  const getCurrentLocation = () => {
    setGpsLoading(true);
    if (!navigator.geolocation) {
      toast.error("GPS não disponível neste dispositivo");
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setLocation({
        lat,
        lng
      });
      toast.success("Localização GPS capturada!");
      setGpsLoading(false);
    }, error => {
      toast.error("Erro ao obter GPS: " + error.message);
      setGpsLoading(false);
    }, {
      enableHighAccuracy: true,
      timeout: 10000
    });
  };

  // Resetar problema quando tipo_nc mudar
  useEffect(() => {
    if (formData.tipo_nc) {
      setFormData(prev => ({
        ...prev,
        problema_identificado: ""
      }));
    }
  }, [formData.tipo_nc]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) {
      toast.error("Capture a localização GPS antes de salvar");
      return;
    }
    if (!formData.tipo_nc || !formData.problema_identificado) {
      toast.error("Selecione o Tipo de NC e o Problema");
      return;
    }
    setLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      const {
        error
      } = await supabase.from("nao_conformidades").insert({
        user_id: user.id,
        lote_id: loteId,
        rodovia_id: rodoviaId,
        data_ocorrencia: formData.data_ocorrencia,
        numero_nc: formData.numero_nc,
        tipo_nc: formData.tipo_nc,
        problema_identificado: formData.problema_identificado,
        descricao_problema: formData.descricao_problema || null,
        empresa: empresaNome,
        prazo_atendimento: formData.prazo_atendimento ? parseInt(formData.prazo_atendimento) : null,
        situacao: formData.situacao,
        data_atendimento: formData.data_atendimento || null,
        data_notificacao: formData.data_notificacao || null,
        observacao: formData.observacao || null,
        latitude: location.lat,
        longitude: location.lng,
        km_referencia: formData.km_referencia ? parseFloat(formData.km_referencia) : null
      });
      if (error) throw error;

      // Enviar email para coordenadores/fiscais
      try {
        const {
          data: rodovia
        } = await supabase.from("rodovias").select("codigo, nome").eq("id", rodoviaId).single();
        await supabase.functions.invoke("send-nc-email", {
          body: {
            numero_nc: formData.numero_nc,
            empresa: empresaNome,
            tipo_nc: formData.tipo_nc,
            problema_identificado: formData.problema_identificado,
            data_ocorrencia: formData.data_ocorrencia,
            rodovia: rodovia ? `${rodovia.codigo} - ${rodovia.nome}` : "N/A",
            km_referencia: formData.km_referencia || "N/A",
            observacao: formData.observacao || ""
          }
        });
        toast.success("Não-conformidade registrada e emails enviados!");
      } catch (emailError: any) {
        console.error("Erro ao enviar email:", emailError);
        toast.warning("NC registrada, mas houve erro ao enviar emails");
      }

      // Reset form
      setFormData({
        data_ocorrencia: new Date().toISOString().split("T")[0],
        numero_nc: "",
        tipo_nc: "",
        problema_identificado: "",
        descricao_problema: "",
        prazo_atendimento: "",
        situacao: "Não Atendida",
        data_atendimento: "",
        data_notificacao: "",
        observacao: "",
        km_referencia: ""
      });

      // Limpar localização para o próximo registro
      setLocation(null);
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  const problemasDisponiveis = formData.tipo_nc ? PROBLEMAS_POR_TIPO[formData.tipo_nc as TipoNC] || [] : [];
  
  const handleNotificar = () => {
    if (!formData.data_notificacao) {
      toast.error("Preencha a Data da Notificação primeiro");
      return;
    }
    toast.info("Funcionalidade de notificação por e-mail será implementada em breve");
  };

  // Calcular diferença de dias entre Data de Atendimento e Data da Notificação
  const calcularDiferencaDias = () => {
    if (!formData.data_atendimento || !formData.data_notificacao) return null;
    const dataAtendimento = new Date(formData.data_atendimento);
    const dataNotificacao = new Date(formData.data_notificacao);
    const diferencaMs = dataAtendimento.getTime() - dataNotificacao.getTime();
    const diferencaDias = Math.floor(diferencaMs / (1000 * 60 * 60 * 24));
    return diferencaDias;
  };

  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="h-5 w-5" />
          Registro de Não-Conformidade
        </CardTitle>
        <CardDescription>
          Planilha 2.3 - Empresa: {empresaNome || "Carregando..."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* GPS Status */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Label>Coordenadas GPS *</Label>
            </div>
            <div className="flex gap-2 items-center">
              <Button type="button" variant="outline" onClick={getCurrentLocation} disabled={gpsLoading}>
                {gpsLoading ? <>
                    <MapPin className="mr-2 h-4 w-4 animate-pulse" />
                    Capturando...
                  </> : <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Capturar GPS
                  </>}
              </Button>
              {location ? <p className="text-sm text-muted-foreground">
                  Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                </p> : <p className="text-sm text-muted-foreground">Clique no botão para capturar a localização</p>}
            </div>
          </div>

          {/* Linha 1: Data e Número NC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_ocorrencia">Data da Ocorrência *</Label>
              <Input id="data_ocorrencia" type="date" value={formData.data_ocorrencia} onChange={e => setFormData({
              ...formData,
              data_ocorrencia: e.target.value
            })} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_nc">Número da Não Conformidade *</Label>
              <Input id="numero_nc" type="text" placeholder="Ex: NC-001" value={formData.numero_nc} onChange={e => setFormData({
              ...formData,
              numero_nc: e.target.value
            })} required />
            </div>
          </div>

          {/* Linha 2: Tipo de NC e Problema (Cascateado) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo_nc">Tipo de NC *</Label>
              <Select value={formData.tipo_nc} onValueChange={value => setFormData({
              ...formData,
              tipo_nc: value
            })} required>
                <SelectTrigger id="tipo_nc">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TIPOS_NC).map(tipo => <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="problema_identificado">Problema Identificado *</Label>
              <Select value={formData.problema_identificado} onValueChange={value => setFormData({
              ...formData,
              problema_identificado: value
            })} disabled={!formData.tipo_nc} required>
                <SelectTrigger id="problema_identificado">
                  <SelectValue placeholder={formData.tipo_nc ? "Selecione o problema" : "Primeiro selecione o tipo"} />
                </SelectTrigger>
                <SelectContent>
                  {problemasDisponiveis.map(problema => <SelectItem key={problema} value={problema}>
                      {problema}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descrição do Problema */}
          <div className="space-y-2">
            <Label htmlFor="descricao_problema">Descrição Detalhada (opcional)</Label>
            <Textarea id="descricao_problema" placeholder="Descreva detalhes adicionais do problema..." value={formData.descricao_problema} onChange={e => setFormData({
            ...formData,
            descricao_problema: e.target.value
          })} rows={3} />
          </div>

          {/* Linha 3: Prazo de Atendimento e Data da Notificação com Botão */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prazo_atendimento">Prazo de Atendimento (dias)</Label>
              <Input id="prazo_atendimento" type="number" min="1" placeholder="Ex: 15" value={formData.prazo_atendimento} onChange={e => setFormData({
              ...formData,
              prazo_atendimento: e.target.value
            })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_notificacao">Data da Notificação</Label>
              <div className="flex gap-2">
                <Input id="data_notificacao" type="date" value={formData.data_notificacao} onChange={e => setFormData({
                ...formData,
                data_notificacao: e.target.value
              })} />
                <Button type="button" variant="outline" onClick={handleNotificar}>
                  <Bell className="h-4 w-4 mr-1" />
                  NOTIFICAR
                </Button>
              </div>
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea id="observacao" placeholder="Observações adicionais..." value={formData.observacao} onChange={e => setFormData({
            ...formData,
            observacao: e.target.value
          })} rows={3} />
          </div>

          {/* Linha 4: Situação, Data de Atendimento e Diferença de Dias */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="situacao">Situação *</Label>
              <Select value={formData.situacao} onValueChange={value => setFormData({
              ...formData,
              situacao: value
            })} required>
                <SelectTrigger 
                  id="situacao" 
                  className={formData.situacao !== "Atendida" ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20" : ""}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SITUACOES_NC.map(situacao => <SelectItem key={situacao} value={situacao}>
                      {situacao}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_atendimento">Data de Atendimento</Label>
              <Input id="data_atendimento" type="date" value={formData.data_atendimento} onChange={e => setFormData({
              ...formData,
              data_atendimento: e.target.value
            })} />
            </div>

            <div className="space-y-2">
              <Label>Diferença (dias)</Label>
              <Input 
                type="text" 
                value={calcularDiferencaDias() !== null ? `${calcularDiferencaDias()} dias` : "—"} 
                disabled 
                className="bg-muted"
              />
            </div>
          </div>

          {/* km Referência */}
          <div className="space-y-2">
            <Label htmlFor="km_referencia">km Referência (opcional)</Label>
            <Input id="km_referencia" type="number" step="0.001" value={formData.km_referencia} onChange={e => setFormData({
            ...formData,
            km_referencia: e.target.value
          })} placeholder="Ex: 123.456" />
            <p className="text-xs text-muted-foreground">
              (apenas referência visual)
            </p>
            <p className="text-xs text-muted-foreground">
              GPS é obrigatório. km é opcional e apenas para referência.
            </p>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading || !location}>
            <Save className="mr-2 h-5 w-5" />
            {loading ? "Salvando..." : "Salvar Não-Conformidade"}
          </Button>
        </form>
      </CardContent>
    </Card>;
};
export default NaoConformidadeForm;