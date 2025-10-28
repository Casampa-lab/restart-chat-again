import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { IntervencoesSHForm } from "./IntervencoesSHForm";
import { IntervencoesSVForm } from "./IntervencoesSVForm";
import { IntervencoesTachaForm } from "./IntervencoesTachaForm";
import IntervencoesInscricoesForm from "./IntervencoesInscricoesForm";
import { IntervencoesCilindrosForm } from "./IntervencoesCilindrosForm";
import { IntervencoesPorticosForm } from "./IntervencoesPorticosForm";
import DefensasIntervencoesForm from "./DefensasIntervencoesForm";

interface RegistrarItemNaoCadastradoProps {
  tipo_elemento: 'marcas_longitudinais' | 'tachas' | 'marcas_transversais' | 'cilindros' | 'placas' | 'porticos' | 'defensas';
  loteId: string;
  rodoviaId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RegistrarItemNaoCadastrado({
  tipo_elemento,
  loteId,
  rodoviaId,
  onSuccess,
  onCancel,
}: RegistrarItemNaoCadastradoProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [dadosIntervencao, setDadosIntervencao] = useState<any>(null);

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFotos([...fotos, ...newFiles]);
    }
  };

  const removeFoto = (index: number) => {
    setFotos(fotos.filter((_, i) => i !== index));
  };

  const handleDataChange = (data: any) => {
    setDadosIntervencao(data);
  };

  const getTipoLabel = () => {
    const labels: Record<string, string> = {
      marcas_longitudinais: 'Sinalização Horizontal - Marcas Longitudinais',
      tachas: 'Tachas',
      marcas_transversais: 'Sinalização Horizontal - Inscrições/Transversais',
      cilindros: 'Cilindros Delimitadores',
      placas: 'Sinalização Vertical - Placas',
      porticos: 'Pórticos',
      defensas: 'Defensas'
    };
    return labels[tipo_elemento] || tipo_elemento;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!justificativa.trim()) {
      toast.error("Preencha a justificativa");
      return;
    }

    if (fotos.length === 0) {
      toast.error("Adicione pelo menos uma foto");
      return;
    }

    if (!dadosIntervencao) {
      toast.error("Preencha os dados da intervenção");
      return;
    }

    // Validar campos obrigatórios específicos por tipo
    if (tipo_elemento === 'marcas_longitudinais' || tipo_elemento === 'marcas_transversais' || 
        tipo_elemento === 'tachas' || tipo_elemento === 'cilindros' || tipo_elemento === 'porticos' || 
        tipo_elemento === 'defensas') {
      if (!dadosIntervencao.data_intervencao || !dadosIntervencao.motivo) {
        toast.error("Preencha os campos obrigatórios (Data e Motivo) da intervenção");
        return;
      }
    }

    setIsLoading(true);

    try {
      // Upload das fotos
      const fotosUrls: string[] = [];
      for (const foto of fotos) {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${foto.name}`;
        const filePath = `${loteId}/${tipo_elemento}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('verificacao-photos')
          .upload(filePath, foto);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('verificacao-photos')
          .getPublicUrl(filePath);

        fotosUrls.push(publicUrl);
      }

      // Obter usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Capturar coordenadas GPS se disponível
      let latitude: number | null = null;
      let longitude: number | null = null;
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (err) {
          console.log("Não foi possível capturar localização");
        }
      }

      // Preparar dados_elemento com estrutura completa da intervenção
      const dados_elemento = {
        ...dadosIntervencao,
        lote_id: loteId,
        rodovia_id: rodoviaId,
        latitude,
        longitude,
      };

      // Inserir no banco
      const { error: insertError } = await supabase
        .from('elementos_pendentes_aprovacao')
        .insert({
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          tipo_elemento,
          justificativa,
          fotos_urls: fotosUrls,
          dados_elemento,
          status: 'pendente_aprovacao',
        });

      if (insertError) throw insertError;

      toast.success("Solicitação enviada para aprovação do coordenador!");
      
      // Invalidar cache para atualizar lista de pendentes
      queryClient.invalidateQueries({ queryKey: ['elementos-pendentes'] });
      
      if (onSuccess) {
        onSuccess();
      }

      // Limpar formulário
      setJustificativa("");
      setFotos([]);
      setDadosIntervencao(null);

    } catch (error: any) {
      console.error("Erro ao enviar solicitação:", error);
      toast.error("Erro ao enviar solicitação: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormulario = () => {
    const sharedProps = {
      modo: 'controlado' as const,
      onDataChange: handleDataChange,
      hideSubmitButton: true,
      loteId,
      rodoviaId,
    };

    switch (tipo_elemento) {
      case 'marcas_longitudinais':
        return <IntervencoesSHForm {...sharedProps} />;
      
      case 'tachas':
        return <IntervencoesTachaForm {...sharedProps} />;
      
      case 'marcas_transversais':
        return <IntervencoesInscricoesForm {...sharedProps} />;
      
      case 'cilindros':
        return <IntervencoesCilindrosForm {...sharedProps} />;
      
      case 'placas':
        return <IntervencoesSVForm {...sharedProps} />;
      
      case 'porticos':
        return <IntervencoesPorticosForm {...sharedProps} />;
      
      case 'defensas':
        return <DefensasIntervencoesForm {...sharedProps} />;
      
      default:
        return <div>Tipo de elemento não suportado</div>;
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Registrar Item Novo</CardTitle>
          <CardDescription>
            Tipo: {getTipoLabel()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Formulário de Intervenção */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <h3 className="font-semibold mb-4">Dados da Intervenção</h3>
            {renderFormulario()}
          </div>

          {/* Justificativa */}
          <div className="space-y-2">
            <Label htmlFor="justificativa">Justificativa/Problema *</Label>
            <Textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Justifique por que este item deve ser incluido no Inventário ou informe o problema ocorrido para sua rejeição e emissão de Não Conformidade à executora"
              rows={4}
              required
            />
          </div>

          {/* Upload de Fotos */}
          <div className="space-y-2">
            <Label>Fotos Comprobatórias *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('foto-upload')?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Adicionar Fotos
              </Button>
              <input
                id="foto-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFotoUpload}
                className="hidden"
              />
            </div>
            
            {fotos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {fotos.map((foto, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(foto)}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-24 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => removeFoto(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mensagem de Atenção */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Esta solicitação será enviada para análise do coordenador. 
              Após a aprovação, o elemento será incluído no inventário dinâmico e o técnico poderá 
              registrar intervenções normalmente.
            </p>
          </div>
        </CardContent>
      </Card>

      <DialogFooter className="mt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar para Aprovação
        </Button>
      </DialogFooter>
    </form>
  );
}
