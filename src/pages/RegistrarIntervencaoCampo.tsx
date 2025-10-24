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
import { ArrowLeft, MapPin, Camera, CheckCircle2, AlertCircle, RefreshCw, Wrench, HardHat, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { IntervencoesSVForm } from '@/components/IntervencoesSVForm';
import { IntervencoesSHForm } from '@/components/IntervencoesSHForm';
import { IntervencoesTachaForm } from '@/components/IntervencoesTachaForm';
import DefensasIntervencoesForm from '@/components/DefensasIntervencoesForm';
import { IntervencoesCilindrosForm } from '@/components/IntervencoesCilindrosForm';
import { IntervencoesPorticosForm } from '@/components/IntervencoesPorticosForm';
import { IntervencoesInscricoesForm } from '@/components/IntervencoesInscricoesForm';

// Mapeamento de tipos de elementos para suas tabelas de intervenção
const TABELAS_INTERVENCAO: Record<string, string> = {
  'marcas_longitudinais': 'ficha_marcas_longitudinais_intervencoes',
  'inscricoes': 'ficha_inscricoes_intervencoes',
  'tachas': 'ficha_tachas_intervencoes',
  'cilindros': 'ficha_cilindros_intervencoes',
  'porticos': 'ficha_porticos_intervencoes',
  'defensas': 'defensas_intervencoes',
  'placas': 'ficha_placa_intervencoes'
};

// Mapeamento de tipos de elementos para o campo de FK na tabela de intervenção
const CAMPOS_FK: Record<string, string> = {
  'marcas_longitudinais': 'ficha_marcas_longitudinais_id',
  'inscricoes': 'ficha_inscricoes_id',
  'tachas': 'ficha_tachas_id',
  'cilindros': 'ficha_cilindros_id',
  'porticos': 'ficha_porticos_id',
  'defensas': 'defensa_id',
  'placas': 'ficha_placa_id'
};

// Mapeamento de tipos para abas na página de Minhas Intervenções
const TABS_MAP: Record<string, string> = {
  'cilindros': 'cilindros',
  'defensas': 'defensas',
  'marcas_longitudinais': 'sh',
  'placas': 'sv',
  'inscricoes': 'inscricoes',
  'tachas': 'tacha',
  'porticos': 'porticos'
};

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

  const [modoOperacao, setModoOperacao] = useState<'manutencao' | 'execucao' | null>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>('');
  const [dadosIntervencao, setDadosIntervencao] = useState<any>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [isConforme, setIsConforme] = useState(true);
  const [justificativaNC, setJustificativaNC] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualPosition, setManualPosition] = useState<{ latitude: string; longitude: string }>({
    latitude: '',
    longitude: ''
  });

  const necessidadeProp = location.state?.necessidade;

  const handleVoltar = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        navigate('/modo-campo');
      } catch (error) {
        console.error('Erro ao voltar:', error);
      }
    } else {
      navigate('/modo-campo');
    }
  };

  useEffect(() => {
    if (necessidadeProp) {
      setTipoSelecionado(necessidadeProp.tipo_elemento);
    }
  }, [necessidadeProp]);

  const handlePhotosChange = (urls: string[]) => {
    console.log('📸 [RegistrarIntervencaoCampo] Fotos atualizadas', {
      antes: fotos.length,
      depois: urls.length,
      urls,
    });
    setFotos(urls);
  };

  const capturarGPS = async () => {
    try {
      const pos = await getCurrentPosition();
      if (pos) {
        setManualPosition({
          latitude: pos.latitude.toString(),
          longitude: pos.longitude.toString()
        });
        toast.success('Localização capturada!');
      }
    } catch (error) {
      toast.error('Erro ao capturar GPS');
    }
  };

  // Sincronizar posição manual com position do hook
  useEffect(() => {
    if (position) {
      setManualPosition({
        latitude: position.latitude.toString(),
        longitude: position.longitude.toString()
      });
    }
  }, [position]);

  const handleEnviar = async () => {
    if (!activeSession || !dadosIntervencao || !tipoSelecionado || !modoOperacao) {
      toast.error('Dados incompletos');
      return;
    }

    if (!isConforme && !justificativaNC.trim()) {
      toast.error('Justificativa obrigatória para não conformidades');
      return;
    }

    try {
      setLoading(true);

      // Manutenção e Execução usam o mesmo fluxo unificado
      const payload = {
        ...dadosIntervencao,
        fotos_urls: fotos,
        latitude: parseFloat(manualPosition.latitude) || null,
        longitude: parseFloat(manualPosition.longitude) || null,
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
            latitude: parseFloat(manualPosition.latitude) || null,
            longitude: parseFloat(manualPosition.longitude) || null,
            status_aprovacao: 'pendente',
            deleted: false
          } as any);

        if (ncError) throw ncError;
      }

      // Salvar diretamente na tabela de intervenções correta
      const tabelaIntervencao = TABELAS_INTERVENCAO[tipoSelecionado];
      const campoFK = CAMPOS_FK[tipoSelecionado];
      
      if (!tabelaIntervencao) {
        throw new Error(`Tipo de elemento não mapeado: ${tipoSelecionado}`);
      }

      // Montar payload base com campos comuns
      const payloadIntervencao: any = {
        ...payload,
        user_id: user!.id,
        fotos_urls: fotos,
        latitude: parseFloat(manualPosition.latitude) || null,
        longitude: parseFloat(manualPosition.longitude) || null,
        pendente_aprovacao_coordenador: isConforme,
        aplicado_ao_inventario: false,
        tipo_origem: modoOperacao === 'manutencao' ? 'manutencao_pre_projeto' : 'execucao'
      };

      // Converter strings vazias para null em campos numéricos
      Object.keys(payloadIntervencao).forEach(key => {
        if (payloadIntervencao[key] === "" && 
            (key.includes("km") || key.includes("_m") || key.includes("quantidade") || 
             key.includes("area") || key.includes("extensao") || key.includes("espacamento"))) {
          payloadIntervencao[key] = null;
        }
      });

      // Se houver um elemento selecionado (necessidade vinculada), adicionar FK
      if (necessidadeProp?.elemento_id) {
        payloadIntervencao[campoFK] = necessidadeProp.elemento_id;
      }

      // Inserir na tabela de intervenções específica
      const { error } = await supabase
        .from(tabelaIntervencao as any)
        .insert(payloadIntervencao);

      if (error) throw error;

      toast.success(isConforme 
        ? 'Intervenção enviada para aprovação!' 
        : 'Não conformidade registrada!'
      );
      
      const tabDestino = TABS_MAP[tipoSelecionado] || 'sh';
      navigate(`/minhas-intervencoes?tab=${tabDestino}`);
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
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="outline"
            size="default"
            onClick={handleVoltar}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Registrar Intervenção</h1>
          {activeSession && (
            <p className="text-sm text-muted-foreground">
              Lote {activeSession.lote?.numero || '-'} | {activeSession.rodovia?.codigo || '-'}
            </p>
          )}
        </div>
      </div>

      {/* Etapa 1: Escolher Modo de Operação */}
      {!modoOperacao && (
        <Card>
          <CardHeader>
            <CardTitle>1️⃣ Escolher Tipo de Operação</CardTitle>
            <CardDescription>
              Selecione conforme o tipo de trabalho que está executando
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-24 text-left flex-col items-start justify-center space-y-1 border-orange-300 hover:bg-orange-50"
              onClick={() => setModoOperacao('manutencao')}
            >
              <div className="flex items-center gap-2 text-lg font-semibold text-orange-600">
                <Wrench className="h-5 w-5" />
                🟠 Manutenção Pré-Projeto (IN-3)
              </div>
              <p className="text-xs text-muted-foreground">
                Reparo, limpeza, pintura - NÃO altera inventário
              </p>
            </Button>

            <Button
              variant="outline"
              className="w-full h-24 text-left flex-col items-start justify-center space-y-1 border-green-300 hover:bg-green-50"
              onClick={() => setModoOperacao('execucao')}
            >
              <div className="flex items-center gap-2 text-lg font-semibold text-green-600">
                <HardHat className="h-5 w-5" />
                🟢 Execução de Projeto
              </div>
              <p className="text-xs text-muted-foreground">
                Implantação, substituição - ALTERA inventário
              </p>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Etapa 2: Selecionar Tipo (só aparece após escolher modo) */}
      {modoOperacao && !tipoSelecionado && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>2️⃣ Selecionar Tipo de Elemento</CardTitle>
                <CardDescription>
                  {modoOperacao === 'manutencao' 
                    ? '🟠 Modo: Manutenção IN-3'
                    : '🟢 Modo: Execução de Projeto'
                  }
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModoOperacao(null)}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Alterar Modo
              </Button>
            </div>
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

      {/* Etapas 3-7: Formulário e Captura */}
      {tipoSelecionado && (
        <div className="space-y-4">
          {/* Badge do tipo selecionado */}
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`text-base px-3 py-1 ${
                modoOperacao === 'manutencao' 
                  ? 'border-orange-500 text-orange-700 bg-orange-50' 
                  : 'border-green-500 text-green-700 bg-green-50'
              }`}
            >
              {modoOperacao === 'manutencao' ? '🟠' : '🟢'} {TIPOS_ELEMENTOS.find(t => t.value === tipoSelecionado)?.label}
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

          {/* 3. Formulário Específico */}
          <Card>
            <CardHeader>
              <CardTitle>3️⃣ Dados da {modoOperacao === 'manutencao' ? 'Manutenção' : 'Intervenção'}</CardTitle>
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

          {/* 4. Capturar Fotos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    4️⃣ Capturar Fotos
                  </div>
                  {fotos.length > 0 && (
                    <Badge variant="outline" className="text-sm">
                      ✓ {fotos.length} foto{fotos.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fotos.length === 0 && (
                  <Alert className="mb-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      📸 Nenhuma foto capturada ainda. As fotos são importantes para documentação da intervenção.
                    </AlertDescription>
                  </Alert>
                )}
                
                <CameraCapture
                  photos={fotos}
                  onPhotosChange={handlePhotosChange}
                  maxPhotos={5}
                  bucketName="intervencoes-fotos"
                />
              </CardContent>
            </Card>

          {/* 5. GPS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                5️⃣ Localização GPS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Botão de captura */}
              <Button 
                onClick={capturarGPS} 
                variant={manualPosition.latitude && manualPosition.longitude ? "outline" : "default"}
                className="w-full"
              >
                <MapPin className="mr-2 h-4 w-4" />
                {manualPosition.latitude && manualPosition.longitude ? 'Atualizar GPS' : 'Capturar GPS Automaticamente'}
              </Button>

              {/* Inputs manuais sempre visíveis */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude *</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="0.000001"
                    placeholder="-15.123456"
                    value={manualPosition.latitude}
                    onChange={(e) => setManualPosition(prev => ({
                      ...prev,
                      latitude: e.target.value
                    }))}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude *</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="0.000001"
                    placeholder="-47.123456"
                    value={manualPosition.longitude}
                    onChange={(e) => setManualPosition(prev => ({
                      ...prev,
                      longitude: e.target.value
                    }))}
                    className="font-mono"
                  />
                </div>
              </div>

              {/* Feedback visual */}
              {(!manualPosition.latitude || !manualPosition.longitude) && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    📍 Coordenadas GPS são <strong>obrigatórias</strong> para o relatório. 
                    Capture automaticamente ou digite manualmente.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* 6. Validação Manual */}
          <Card>
            <CardHeader>
              <CardTitle>6️⃣ Validação de Conformidade</CardTitle>
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

          {/* 7. Enviar */}
          <Button
            onClick={handleEnviar}
            disabled={loading || !dadosIntervencao || !manualPosition.latitude || !manualPosition.longitude}
            size="lg"
            className={`w-full h-14 text-lg ${
              modoOperacao === 'manutencao' 
                ? 'bg-orange-600 hover:bg-orange-700' 
                : ''
            }`}
          >
            {loading ? 'Enviando...' : (modoOperacao === 'manutencao' ? '🟠 Registrar Manutenção' : '🟢 Enviar Intervenção')}
          </Button>
        </div>
      )}
    </div>
  );
}
