import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Save, Bell, Camera, X } from "lucide-react";
import { TIPOS_NC, PROBLEMAS_POR_TIPO, SITUACOES_NC, type TipoNC } from "@/constants/naoConformidades";

interface FotoData {
  arquivo: File | null;
  url: string;
  latitude: number | null;
  longitude: number | null;
  sentido: string;
  descricao: string;
  uploading: boolean;
}
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
  const [gpsLoadingInicio, setGpsLoadingInicio] = useState(false);
  const [gpsLoadingFim, setGpsLoadingFim] = useState(false);
  
  // Localização para NC pontual (Sinalização Vertical)
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  
  // Localizações para NC de extensão (Sinalização Horizontal e Dispositivos de Segurança)
  const [locationInicio, setLocationInicio] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationFim, setLocationFim] = useState<{
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
    km_referencia: "",
    km_inicial: "",
    km_final: ""
  });

  // Estado para as 4 fotos
  const [fotos, setFotos] = useState<FotoData[]>([
    { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
    { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
    { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
    { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
  ]);

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

  const getCurrentLocationInicio = () => {
    setGpsLoadingInicio(true);
    if (!navigator.geolocation) {
      toast.error("GPS não disponível neste dispositivo");
      setGpsLoadingInicio(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setLocationInicio({
        lat,
        lng
      });
      toast.success("Localização inicial capturada!");
      setGpsLoadingInicio(false);
    }, error => {
      toast.error("Erro ao obter GPS inicial: " + error.message);
      setGpsLoadingInicio(false);
    }, {
      enableHighAccuracy: true,
      timeout: 10000
    });
  };

  const getCurrentLocationFim = () => {
    setGpsLoadingFim(true);
    if (!navigator.geolocation) {
      toast.error("GPS não disponível neste dispositivo");
      setGpsLoadingFim(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setLocationFim({
        lat,
        lng
      });
      toast.success("Localização final capturada!");
      setGpsLoadingFim(false);
    }, error => {
      toast.error("Erro ao obter GPS final: " + error.message);
      setGpsLoadingFim(false);
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

  // Função para capturar foto com GPS
  const handleFotoChange = async (index: number, file: File) => {
    if (!navigator.geolocation) {
      toast.error("GPS não disponível neste dispositivo");
      return;
    }

    // Capturar GPS
    setFotos(prev => {
      const newFotos = [...prev];
      newFotos[index] = { ...newFotos[index], uploading: true };
      return newFotos;
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const url = URL.createObjectURL(file);

        setFotos(prev => {
          const newFotos = [...prev];
          newFotos[index] = {
            ...newFotos[index],
            arquivo: file,
            url,
            latitude: lat,
            longitude: lng,
            uploading: false,
          };
          return newFotos;
        });

        toast.success(`Foto ${index + 1} anexada com GPS capturado!`);
      },
      (error) => {
        toast.error("Erro ao capturar GPS: " + error.message);
        setFotos(prev => {
          const newFotos = [...prev];
          newFotos[index] = { ...newFotos[index], uploading: false };
          return newFotos;
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Atualizar sentido da foto
  const handleSentidoChange = (index: number, sentido: string) => {
    setFotos(prev => {
      const newFotos = [...prev];
      newFotos[index] = { ...newFotos[index], sentido };
      return newFotos;
    });
  };

  // Atualizar descrição da foto
  const handleDescricaoChange = (index: number, descricao: string) => {
    setFotos(prev => {
      const newFotos = [...prev];
      newFotos[index] = { ...newFotos[index], descricao };
      return newFotos;
    });
  };

  // Remover foto
  const handleRemoverFoto = (index: number) => {
    setFotos(prev => {
      const newFotos = [...prev];
      if (newFotos[index].url) {
        URL.revokeObjectURL(newFotos[index].url);
      }
      newFotos[index] = {
        arquivo: null,
        url: "",
        latitude: null,
        longitude: null,
        sentido: "",
        descricao: "",
        uploading: false,
      };
      return newFotos;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tipo_nc || !formData.problema_identificado) {
      toast.error("Selecione o Tipo de NC e o Problema");
      return;
    }

    const isExtensao = formData.tipo_nc === TIPOS_NC.SINALIZACAO_HORIZONTAL || 
                       formData.tipo_nc === TIPOS_NC.DISPOSITIVOS_SEGURANCA;
    
    // Validar GPS conforme o tipo
    if (isExtensao) {
      if (!locationInicio || !locationFim) {
        toast.error("Capture as localizações GPS de início e fim antes de salvar");
        return;
      }
    } else {
      if (!location) {
        toast.error("Capture a localização GPS antes de salvar");
        return;
      }
    }

    setLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      
      const baseData = {
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
      };

      // Adicionar campos conforme o tipo de NC
      const insertData = isExtensao 
        ? {
            ...baseData,
            km_inicial: formData.km_inicial ? parseFloat(formData.km_inicial) : null,
            km_final: formData.km_final ? parseFloat(formData.km_final) : null,
            latitude_inicial: locationInicio!.lat,
            longitude_inicial: locationInicio!.lng,
            latitude_final: locationFim!.lat,
            longitude_final: locationFim!.lng,
            latitude: null,
            longitude: null,
            km_referencia: null
          }
        : {
            ...baseData,
            latitude: location!.lat,
            longitude: location!.lng,
            km_referencia: formData.km_referencia ? parseFloat(formData.km_referencia) : null,
            km_inicial: null,
            km_final: null,
            latitude_inicial: null,
            longitude_inicial: null,
            latitude_final: null,
            longitude_final: null
          };

      const {
        data: ncData,
        error
      } = await supabase.from("nao_conformidades").insert(insertData).select().single();
      if (error) throw error;

      // Upload das fotos
      const fotosParaSalvar = fotos.filter(f => f.arquivo !== null);
      if (fotosParaSalvar.length > 0) {
        toast.info(`Fazendo upload de ${fotosParaSalvar.length} foto(s)...`);
        
        for (let i = 0; i < fotosParaSalvar.length; i++) {
          const foto = fotosParaSalvar[i];
          const fotoIndex = fotos.indexOf(foto);
          
          try {
            // Upload da foto para o storage
            const fileExt = foto.arquivo!.name.split('.').pop();
            const fileName = `${ncData.id}_foto${fotoIndex + 1}_${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('nc-photos')
              .upload(filePath, foto.arquivo!);

            if (uploadError) throw uploadError;

            // Obter URL pública
            const { data: { publicUrl } } = supabase.storage
              .from('nc-photos')
              .getPublicUrl(filePath);

            // Salvar registro da foto no banco
            const { error: fotoError } = await supabase
              .from('nao_conformidades_fotos')
              .insert({
                nc_id: ncData.id,
                foto_url: publicUrl,
                latitude: foto.latitude,
                longitude: foto.longitude,
                sentido: foto.sentido || null,
                descricao: foto.descricao || null,
                ordem: fotoIndex + 1,
              });

            if (fotoError) throw fotoError;
          } catch (fotoErr: any) {
            console.error(`Erro ao salvar foto ${fotoIndex + 1}:`, fotoErr);
            toast.error(`Erro ao salvar foto ${fotoIndex + 1}`);
          }
        }
      }

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
        km_referencia: "",
        km_inicial: "",
        km_final: ""
      });

      // Limpar localizações e fotos para o próximo registro
      setLocation(null);
      setLocationInicio(null);
      setLocationFim(null);
      setFotos([
        { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
        { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
        { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
        { arquivo: null, url: "", latitude: null, longitude: null, sentido: "", descricao: "", uploading: false },
      ]);
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  const problemasDisponiveis = formData.tipo_nc ? PROBLEMAS_POR_TIPO[formData.tipo_nc as TipoNC] || [] : [];
  
  // Determinar se é NC de extensão ou pontual
  const isExtensao = formData.tipo_nc === TIPOS_NC.SINALIZACAO_HORIZONTAL || 
                     formData.tipo_nc === TIPOS_NC.DISPOSITIVOS_SEGURANCA;
  
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

          {/* km - Condicional baseado no tipo */}
          {formData.tipo_nc && !isExtensao && (
            <div className="space-y-2">
              <Label htmlFor="km_referencia">km Referência (opcional)</Label>
              <Input id="km_referencia" type="number" step="0.001" value={formData.km_referencia} onChange={e => setFormData({
              ...formData,
              km_referencia: e.target.value
            })} placeholder="Ex: 123.456" />
              <p className="text-xs text-muted-foreground">
                GPS é obrigatório. km é opcional e apenas para referência.
              </p>
            </div>
          )}

          {formData.tipo_nc && isExtensao && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="km_inicial">km Inicial (opcional)</Label>
                <Input id="km_inicial" type="number" step="0.001" value={formData.km_inicial} onChange={e => setFormData({
                ...formData,
                km_inicial: e.target.value
              })} placeholder="Ex: 123.000" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="km_final">km Final (opcional)</Label>
                <Input id="km_final" type="number" step="0.001" value={formData.km_final} onChange={e => setFormData({
                ...formData,
                km_final: e.target.value
              })} placeholder="Ex: 125.500" />
              </div>
            </div>
          )}

          {/* GPS Status - Condicional baseado no tipo */}
          {!formData.tipo_nc && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Selecione o Tipo de NC primeiro para capturar as coordenadas GPS
              </p>
            </div>
          )}
          
          {formData.tipo_nc && !isExtensao && (
            <div className="space-y-2">
              <Label>Coordenadas GPS *</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Button type="button" variant="outline" onClick={getCurrentLocation} disabled={gpsLoading} className="w-full">
                  {gpsLoading ? <>
                      <MapPin className="mr-2 h-4 w-4 animate-pulse" />
                      Capturando...
                    </> : <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Capturar Localização
                    </>}
                </Button>
                <Input 
                  type="text" 
                  placeholder="Latitude" 
                  value={location ? location.lat.toFixed(6) : ""} 
                  disabled 
                  className="bg-muted"
                />
                <Input 
                  type="text" 
                  placeholder="Longitude" 
                  value={location ? location.lng.toFixed(6) : ""} 
                  disabled 
                  className="bg-muted"
                />
              </div>
            </div>
          )}

          {formData.tipo_nc && isExtensao && (
            <div className="space-y-4">
              {/* GPS Início */}
              <div className="space-y-2">
                <Label>Coordenadas GPS Início *</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Button type="button" variant="outline" onClick={getCurrentLocationInicio} disabled={gpsLoadingInicio} className="w-full">
                    {gpsLoadingInicio ? <>
                        <MapPin className="mr-2 h-4 w-4 animate-pulse" />
                        Capturando...
                      </> : <>
                        <MapPin className="mr-2 h-4 w-4" />
                        Capturar Início
                      </>}
                  </Button>
                  <Input 
                    type="text" 
                    placeholder="Latitude Inicial" 
                    value={locationInicio ? locationInicio.lat.toFixed(6) : ""} 
                    disabled 
                    className="bg-muted"
                  />
                  <Input 
                    type="text" 
                    placeholder="Longitude Inicial" 
                    value={locationInicio ? locationInicio.lng.toFixed(6) : ""} 
                    disabled 
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* GPS Fim */}
              <div className="space-y-2">
                <Label>Coordenadas GPS Fim *</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Button type="button" variant="outline" onClick={getCurrentLocationFim} disabled={gpsLoadingFim} className="w-full">
                    {gpsLoadingFim ? <>
                        <MapPin className="mr-2 h-4 w-4 animate-pulse" />
                        Capturando...
                      </> : <>
                        <MapPin className="mr-2 h-4 w-4" />
                        Capturar Fim
                      </>}
                  </Button>
                  <Input 
                    type="text" 
                    placeholder="Latitude Final" 
                    value={locationFim ? locationFim.lat.toFixed(6) : ""} 
                    disabled 
                    className="bg-muted"
                  />
                  <Input 
                    type="text" 
                    placeholder="Longitude Final" 
                    value={locationFim ? locationFim.lng.toFixed(6) : ""} 
                    disabled 
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>
          )}

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

          {/* Seção de Fotos */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              <Label className="text-base font-semibold">Anexar Fotos (até 4 fotos)</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Cada foto captura automaticamente as coordenadas GPS. Você pode adicionar o sentido da via e uma descrição.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fotos.map((foto, index) => (
                <Card key={index} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Foto {index + 1}</Label>
                    {foto.arquivo && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoverFoto(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {!foto.arquivo ? (
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFotoChange(index, file);
                        }}
                        disabled={foto.uploading}
                        className="cursor-pointer"
                      />
                      {foto.uploading && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-4 w-4 animate-pulse" />
                          Capturando GPS...
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <img
                        src={foto.url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md"
                      />
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-semibold">Lat:</span>{" "}
                          {foto.latitude?.toFixed(6)}
                        </div>
                        <div>
                          <span className="font-semibold">Lng:</span>{" "}
                          {foto.longitude?.toFixed(6)}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`sentido-${index}`} className="text-sm">
                          Sentido
                        </Label>
                        <Select
                          value={foto.sentido}
                          onValueChange={(value) => handleSentidoChange(index, value)}
                        >
                          <SelectTrigger id={`sentido-${index}`}>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Norte">Norte</SelectItem>
                            <SelectItem value="Sul">Sul</SelectItem>
                            <SelectItem value="Leste">Leste</SelectItem>
                            <SelectItem value="Oeste">Oeste</SelectItem>
                            <SelectItem value="Crescente">Crescente</SelectItem>
                            <SelectItem value="Decrescente">Decrescente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`descricao-${index}`} className="text-sm">
                          Descrição
                        </Label>
                        <Textarea
                          id={`descricao-${index}`}
                          placeholder="Descrição da foto..."
                          value={foto.descricao}
                          onChange={(e) => handleDescricaoChange(index, e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Linha 4: Situação, Data de Atendimento e Diferença de Dias */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="situacao">Situação *</Label>
              <Select value={formData.situacao} onValueChange={value => setFormData({
              ...formData,
              situacao: value
            })} required>
                <SelectTrigger id="situacao" className={formData.situacao !== "Atendida" ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20" : ""}>
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
              <Label>Prazo de Execução (dias)</Label>
              <Input type="text" value={calcularDiferencaDias() !== null ? `${calcularDiferencaDias()} dias` : "—"} disabled className="bg-muted" />
            </div>
          </div>

          <Button
            type="submit" 
            className="w-full" 
            size="lg" 
            disabled={loading || (isExtensao ? (!locationInicio || !locationFim) : !location)}
          >
            <Save className="mr-2 h-5 w-5" />
            {loading ? "Salvando..." : "Salvar Não-Conformidade"}
          </Button>
        </form>
      </CardContent>
    </Card>;
};
export default NaoConformidadeForm;