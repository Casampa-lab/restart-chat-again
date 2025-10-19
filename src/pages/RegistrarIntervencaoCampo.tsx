import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWorkSession } from '@/hooks/useWorkSession';
import { useGPSTracking } from '@/hooks/useGPSTracking';
import { CameraCapture } from '@/components/CameraCapture';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, MapPin, Camera, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { IntervencoesSVForm } from '@/components/IntervencoesSVForm';
import { IntervencoesSHForm } from '@/components/IntervencoesSHForm';
import { IntervencoesTachaForm } from '@/components/IntervencoesTachaForm';
import DefensasIntervencoesForm from '@/components/DefensasIntervencoesForm';
import { IntervencoesCilindrosForm } from '@/components/IntervencoesCilindrosForm';
import { IntervencoesPorticosForm } from '@/components/IntervencoesPorticosForm';
import { IntervencoesInscricoesForm } from '@/components/IntervencoesInscricoesForm';

const TIPOS_ELEMENTOS = [
  { value: 'cilindros', label: '🔵 Cilindro', component: IntervencoesCilindrosForm },
  { value: 'defensas', label: '🛡️ Defensa', component: DefensasIntervencoesForm },
  { value: 'inscricoes', label: '📝 Inscrição', component: IntervencoesInscricoesForm },
  { value: 'marcas_longitudinais', label: '➖ Marca SH', component: IntervencoesSHForm },
  { value: 'placas', label: '🚦 Placa', component: IntervencoesSVForm },
  { value: 'porticos', label: '🌉 Pórtico', component: IntervencoesPorticosForm },
  { value: 'tachas', label: '⚪ Tacha', component: IntervencoesTachaForm },
];

export default function RegistrarIntervencaoCampo() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { activeSession } = useWorkSession(user?.id);
  const { position, getCurrentPosition } = useGPSTracking();

  const [tipoSelecionado, setTipoSelecionado] = useState<string>('');
  const [dadosIntervencao, setDadosIntervencao] = useState<any>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [isConforme, setIsConforme] = useState(true);
  const [justificativaNC, setJustificativaNC] = useState('');
  const [loading, setLoading] = useState(false);

  const necessidadeProp = location.state?.necessidade;

  useEffect(() => {
    if (necessidadeProp) {
      setTipoSelecionado(necessidadeProp.tipo_elemento);
    }
  }, [necessidadeProp]);

  const capturarGPS = async () => {
    try {
      await getCurrentPosition();
      toast.success('Localização capturada!');
    } catch (error) {
      toast.error('Erro ao capturar GPS');
    }
  };

  const handleEnviar = async () => {
    if (!activeSession || !dadosIntervencao || !tipoSelecionado) {
      toast.error('Dados incompletos');
      return;
    }

    if (!isConforme && !justificativaNC.trim()) {
      toast.error('Justificativa obrigatória para não conformidades');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...dadosIntervencao,
        fotos_urls: fotos,
        latitude: position?.latitude,
        longitude: position?.longitude,
        pendente_aprovacao_coordenador: isConforme,
      };

      // Se não conforme, criar NC
      if (!isConforme) {
        const { error: ncError } = await supabase
          .from('nao_conformidades')
          .insert({
            user_id: user!.id,
            lote_id: activeSession.lote_id,
            rodovia_id: activeSession.rodovia_id,
            data_ocorrencia: new Date().toISOString().split('T')[0],
            tipo_nc: 'Não Conformidade de Intervenção',
            descricao_problema: justificativaNC,
            empresa: activeSession.lote?.empresa?.nome || 'Não especificada',
            latitude: position?.latitude,
            longitude: position?.longitude,
            status_aprovacao: 'pendente',
            deleted: false
          } as any);

        if (ncError) throw ncError;
      }

      // Inserir em elementos_pendentes_aprovacao
      const { error } = await supabase
        .from('elementos_pendentes_aprovacao')
        .insert({
          user_id: user!.id,
          lote_id: activeSession.lote_id,
          rodovia_id: activeSession.rodovia_id,
          tipo_elemento: tipoSelecionado,
          dados_elemento: payload,
          justificativa: isConforme 
            ? 'Intervenção conforme registrada em campo' 
            : justificativaNC,
          fotos_urls: fotos,
          status: isConforme ? 'pendente_aprovacao' : 'rejeitado'
        });

      if (error) throw error;

      toast.success(isConforme 
        ? 'Intervenção enviada para aprovação!' 
        : 'Não conformidade registrada!'
      );
      
      navigate('/minhas-intervencoes');
    } catch (error) {
      console.error('Erro ao enviar:', error);
      toast.error('Erro ao registrar intervenção');
    } finally {
      setLoading(false);
    }
  };

  const FormularioAtual = TIPOS_ELEMENTOS.find(t => t.value === tipoSelecionado)?.component;

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/modo-campo')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Registrar Intervenção</h1>
          {activeSession && (
            <p className="text-sm text-muted-foreground">
              Lote {activeSession.lote?.numero || '-'} | {activeSession.rodovia?.codigo || '-'}
            </p>
          )}
        </div>
      </div>

      {/* Etapa 1: Selecionar Tipo */}
      {!tipoSelecionado && (
        <Card>
          <CardHeader>
            <CardTitle>1️⃣ Selecionar Tipo de Elemento</CardTitle>
            <CardDescription>Escolha o tipo de intervenção que deseja registrar</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {TIPOS_ELEMENTOS.map(tipo => (
              <Button
                key={tipo.value}
                variant="outline"
                className="h-20 text-lg"
                onClick={() => setTipoSelecionado(tipo.value)}
              >
                {tipo.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Etapas 2-6: Formulário e Captura */}
      {tipoSelecionado && (
        <div className="space-y-4">
          {/* Badge do tipo selecionado */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-base px-3 py-1">
              {TIPOS_ELEMENTOS.find(t => t.value === tipoSelecionado)?.label}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTipoSelecionado('');
                setDadosIntervencao(null);
              }}
              className="h-8"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Alterar
            </Button>
          </div>

          {/* 2. Formulário Específico */}
          <Card>
            <CardHeader>
              <CardTitle>2️⃣ Dados da Intervenção</CardTitle>
            </CardHeader>
            <CardContent>
              {FormularioAtual && (
                <FormularioAtual
                  modo="controlado"
                  hideSubmitButton
                  onDataChange={setDadosIntervencao}
                  loteId={activeSession?.lote_id}
                  rodoviaId={activeSession?.rodovia_id}
                />
              )}
            </CardContent>
          </Card>

          {/* 3. Capturar Fotos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                3️⃣ Capturar Fotos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CameraCapture
                onPhotosChange={setFotos}
                maxPhotos={5}
                bucketName="intervencoes-fotos"
              />
            </CardContent>
          </Card>

          {/* 4. GPS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                4️⃣ Localização GPS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {position ? (
                <div className="space-y-2">
                  <Badge variant="outline" className="text-sm">
                    ✓ Capturado: {position.latitude.toFixed(6)}°, {position.longitude.toFixed(6)}°
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={capturarGPS}
                    className="w-full"
                  >
                    Atualizar Localização
                  </Button>
                </div>
              ) : (
                <Button onClick={capturarGPS} className="w-full">
                  <MapPin className="mr-2 h-4 w-4" />
                  Capturar Localização
                </Button>
              )}
            </CardContent>
          </Card>

          {/* 5. Validação Manual */}
          <Card>
            <CardHeader>
              <CardTitle>5️⃣ Validação de Conformidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="conforme"
                  checked={isConforme}
                  onCheckedChange={(checked) => setIsConforme(checked === true)}
                />
                <Label htmlFor="conforme" className="flex items-center gap-2 cursor-pointer">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Conforme (projeto + IN 3/2025)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="nao-conforme"
                  checked={!isConforme}
                  onCheckedChange={(checked) => setIsConforme(checked !== true)}
                />
                <Label htmlFor="nao-conforme" className="flex items-center gap-2 cursor-pointer">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Não Conforme
                </Label>
              </div>

              {!isConforme && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="justificativa">Justificativa da NC *</Label>
                  <Textarea
                    id="justificativa"
                    value={justificativaNC}
                    onChange={(e) => setJustificativaNC(e.target.value)}
                    placeholder="Descreva a não conformidade encontrada..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 6. Enviar */}
          <Button
            onClick={handleEnviar}
            disabled={loading || !dadosIntervencao || !position}
            size="lg"
            className="w-full h-14 text-lg"
          >
            {loading ? 'Enviando...' : 'Enviar Intervenção'}
          </Button>
        </div>
      )}
    </div>
  );
}
