import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Calendar, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FichaPlaca {
  id: string;
  data_vistoria: string;
  codigo: string | null;
  modelo: string | null;
  tipo: string | null;
  km: number | null;
  lado: string | null;
  foto_frontal_url: string | null;
  created_at: string;
  rodovias: { nome: string; codigo: string } | null;
  lotes: { numero: string } | null;
}

interface Dano {
  id: string;
  problema: string;
  data_ocorrencia: string;
  vandalismo: boolean;
  solucao: string | null;
  observacao: string | null;
}

interface Intervencao {
  id: string;
  motivo: string;
  data_intervencao: string;
  placa_recuperada: boolean;
  suporte: string | null;
  substrato: string | null;
}

export default function MinhasFichasPlaca() {
  const [fichas, setFichas] = useState<FichaPlaca[]>([]);
  const [selectedFicha, setSelectedFicha] = useState<FichaPlaca | null>(null);
  const [danos, setDanos] = useState<Dano[]>([]);
  const [intervencoes, setIntervencoes] = useState<Intervencao[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFichas();
  }, []);

  const fetchFichas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ficha_placa')
        .select(`
          *
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data separately
      const fichasWithRelations = await Promise.all(
        (data || []).map(async (ficha) => {
          const [rodoviasResult, lotesResult] = await Promise.all([
            supabase.from('rodovias').select('nome, codigo').eq('id', ficha.rodovia_id).single(),
            supabase.from('lotes').select('numero').eq('id', ficha.lote_id).single(),
          ]);

          return {
            ...ficha,
            rodovias: rodoviasResult.data,
            lotes: lotesResult.data,
          };
        })
      );

      setFichas(fichasWithRelations as FichaPlaca[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar fichas de placa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (fichaId: string) => {
    try {
      const [danosResult, intervencoesResult] = await Promise.all([
        supabase
          .from('ficha_placa_danos')
          .select('*')
          .eq('ficha_placa_id', fichaId)
          .order('data_ocorrencia', { ascending: false }),
        supabase
          .from('ficha_placa_intervencoes')
          .select('*')
          .eq('ficha_placa_id', fichaId)
          .order('data_intervencao', { ascending: false }),
      ]);

      if (danosResult.error) throw danosResult.error;
      if (intervencoesResult.error) throw intervencoesResult.error;

      setDanos(danosResult.data || []);
      setIntervencoes(intervencoesResult.data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar detalhes",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectFicha = (ficha: FichaPlaca) => {
    setSelectedFicha(ficha);
    fetchDetails(ficha.id);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Carregando...</p>
      </div>
    );
  }

  if (selectedFicha) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Button variant="outline" onClick={() => setSelectedFicha(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Ficha de Placa - {selectedFicha.codigo || 'Sem código'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Rodovia</p>
                <p className="font-semibold">{selectedFicha.rodovias?.codigo} - {selectedFicha.rodovias?.nome}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lote</p>
                <p className="font-semibold">{selectedFicha.lotes?.numero}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Vistoria</p>
                <p className="font-semibold">{new Date(selectedFicha.data_vistoria).toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Modelo</p>
                <p className="font-semibold">{selectedFicha.modelo || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-semibold">{selectedFicha.tipo || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">KM</p>
                <p className="font-semibold">{selectedFicha.km || '-'} {selectedFicha.lado && `(${selectedFicha.lado})`}</p>
              </div>
            </div>

            {selectedFicha.foto_frontal_url && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Foto Frontal</p>
                <img 
                  src={selectedFicha.foto_frontal_url} 
                  alt="Foto frontal da placa" 
                  className="max-w-md rounded-lg"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="danos" className="w-full">
          <TabsList>
            <TabsTrigger value="danos">Danos ({danos.length})</TabsTrigger>
            <TabsTrigger value="intervencoes">Intervenções ({intervencoes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="danos" className="space-y-4">
            {danos.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">Nenhum dano registrado</p>
                </CardContent>
              </Card>
            ) : (
              danos.map((dano) => (
                <Card key={dano.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="font-semibold">{dano.problema}</p>
                      <p className="text-sm text-muted-foreground">
                        Data: {new Date(dano.data_ocorrencia).toLocaleDateString('pt-BR')}
                      </p>
                      {dano.vandalismo && (
                        <p className="text-sm text-destructive">Vandalismo</p>
                      )}
                      {dano.solucao && (
                        <p className="text-sm">Solução: {dano.solucao}</p>
                      )}
                      {dano.observacao && (
                        <p className="text-sm">Observação: {dano.observacao}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="intervencoes" className="space-y-4">
            {intervencoes.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">Nenhuma intervenção registrada</p>
                </CardContent>
              </Card>
            ) : (
              intervencoes.map((intervencao) => (
                <Card key={intervencao.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="font-semibold">{intervencao.motivo}</p>
                      <p className="text-sm text-muted-foreground">
                        Data: {new Date(intervencao.data_intervencao).toLocaleDateString('pt-BR')}
                      </p>
                      {intervencao.placa_recuperada && (
                        <p className="text-sm text-green-600">Placa Recuperada</p>
                      )}
                      {intervencao.suporte && (
                        <p className="text-sm">Suporte: {intervencao.suporte}</p>
                      )}
                      {intervencao.substrato && (
                        <p className="text-sm">Substrato: {intervencao.substrato}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Minhas Fichas de Placa</h1>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      {fichas.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Nenhuma ficha de placa registrada ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {fichas.map((ficha) => (
            <Card
              key={ficha.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleSelectFicha(ficha)}
            >
              <CardHeader>
                <CardTitle className="text-lg">
                  {ficha.codigo || 'Sem código'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <FileText className="mr-2 h-4 w-4" />
                  {ficha.rodovias?.codigo} - {ficha.rodovias?.nome}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4" />
                  KM {ficha.km || '-'}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  {new Date(ficha.data_vistoria).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}