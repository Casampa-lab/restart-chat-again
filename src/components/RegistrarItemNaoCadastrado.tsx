import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, Loader2, Upload } from "lucide-react";

interface RegistrarItemNaoCadastradoProps {
  tipo_elemento: string;
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
  onCancel
}: RegistrarItemNaoCadastradoProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [dadosElemento, setDadosElemento] = useState<any>({});

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const novosArquivos = Array.from(e.target.files);
      setFotos(prev => [...prev, ...novosArquivos]);
    }
  };

  const removeFoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!justificativa.trim()) {
      toast.error("Justificativa é obrigatória");
      return;
    }

    if (fotos.length === 0) {
      toast.error("É necessário anexar pelo menos uma foto");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Upload das fotos
      const fotosUrls: string[] = [];
      for (const foto of fotos) {
        const fileName = `${Date.now()}_${foto.name}`;
        const { error: uploadError, data } = await supabase.storage
          .from('verificacao-photos')
          .upload(fileName, foto);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('verificacao-photos')
          .getPublicUrl(fileName);

        fotosUrls.push(urlData.publicUrl);
      }

      // 2. Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 3. Capturar coordenadas GPS
      let coordenadas: { latitude: number; longitude: number } | null = null;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000
          });
        });
        coordenadas = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
      } catch (error) {
        console.warn("Não foi possível obter coordenadas GPS:", error);
      }

      // 4. Montar dados do elemento com coordenadas se disponíveis
      const dadosCompletos = {
        ...dadosElemento,
        data_vistoria: new Date().toISOString().split('T')[0],
        ...(coordenadas && {
          latitude: coordenadas.latitude,
          longitude: coordenadas.longitude,
          latitude_inicial: coordenadas.latitude,
          longitude_inicial: coordenadas.longitude
        })
      };

      // 5. Criar registro pendente de aprovação
      const { error } = await supabase
        .from('elementos_pendentes_aprovacao')
        .insert({
          user_id: user.id,
          tipo_elemento,
          rodovia_id: rodoviaId,
          lote_id: loteId,
          dados_elemento: dadosCompletos,
          justificativa,
          fotos_urls: fotosUrls,
          status: 'pendente_aprovacao'
        });

      if (error) throw error;

      toast.success("Registro enviado para aprovação do coordenador");
      onSuccess?.();
    } catch (error: any) {
      console.error("Erro ao registrar elemento:", error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getTipoLabel = () => {
    const labels: Record<string, string> = {
      marcas_longitudinais: 'Marca Longitudinal',
      placas: 'Placa',
      tachas: 'Tachas',
      inscricoes: 'Inscrição/Marca Transversal',
      cilindros: 'Cilindro',
      porticos: 'Pórtico',
      defensas: 'Defensa'
    };
    return labels[tipo_elemento] || 'Elemento';
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Registrar {getTipoLabel()} Não Cadastrado
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Este elemento não está no cadastro inicial. Preencha os dados e aguarde aprovação do coordenador.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Justificativa */}
          <div className="space-y-2">
            <Label htmlFor="justificativa" className="text-sm font-medium">
              Justificativa para inclusão *
              <span className="text-xs text-muted-foreground ml-1">
                (Explique por que este elemento foi implantado fora do projeto)
              </span>
            </Label>
            <Textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva detalhadamente a situação e necessidade de implantação deste elemento..."
              rows={4}
              required
            />
          </div>

          {/* Upload de Fotos */}
          <div className="space-y-2">
            <Label htmlFor="fotos" className="text-sm font-medium">
              Fotos do Elemento *
              <span className="text-xs text-muted-foreground ml-1">
                (Mínimo 1 foto obrigatória)
              </span>
            </Label>
            <div className="border-2 border-dashed rounded-lg p-4">
              <input
                id="fotos"
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handleFotoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('fotos')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Adicionar Fotos
              </Button>
              
              {fotos.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
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
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {fotos.length} {fotos.length === 1 ? 'foto anexada' : 'fotos anexadas'}
            </p>
          </div>

          {/* Observações */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm font-medium text-amber-900">⚠️ Atenção</p>
            <ul className="text-xs text-amber-800 mt-2 space-y-1 list-disc list-inside">
              <li>Este registro ficará pendente até aprovação do coordenador</li>
              <li>Se aprovado, será incluído no inventário dinâmico automaticamente</li>
              <li>Se rejeitado, será criada uma NC (Não Conformidade) automaticamente</li>
              <li>As coordenadas GPS serão capturadas automaticamente se disponíveis</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <DialogFooter className="mt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar para Aprovação"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
