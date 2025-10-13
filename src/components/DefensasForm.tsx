import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, MapPin } from "lucide-react";

interface DefensasFormProps {
  loteId: string;
  rodoviaId: string;
}

const LADOS = ["Direito", "Esquerdo", "Ambos"];
const TIPOS_DEFENSA = [
  "Defensa Metálica Simples",
  "Defensa Metálica Dupla",
  "Defensa New Jersey",
  "Defensa Tipo F",
  "Outros"
];

const DefensasForm = ({ loteId, rodoviaId }: DefensasFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturingInicial, setIsCapturingInicial] = useState(false);
  const [isCapturingFinal, setIsCapturingFinal] = useState(false);
  const [formData, setFormData] = useState({
    data_inspecao: new Date().toISOString().split('T')[0],
    br: "",
    snv: "",
    tramo: "",
    km_inicial: "",
    km_final: "",
    latitude_inicial: "",
    longitude_inicial: "",
    latitude_final: "",
    longitude_final: "",
    lado: "",
    quantidade_laminas: "",
    comprimento_total_tramo_m: "",
    funcao: "",
    especificacao_obstaculo_fixo: "",
    id_defensa: "",
    distancia_pista_obstaculo_m: "",
    risco: "",
    velocidade_kmh: "",
    vmd_veic_dia: "",
    percentual_veiculos_pesados: "",
    geometria: "",
    classificacao_nivel_contencao: "",
    nivel_contencao_en1317: "",
    nivel_contencao_nchrp350: "",
    espaco_trabalho: "",
    terminal_entrada: "",
    terminal_saida: "",
    adequacao_funcionalidade_lamina: "",
    adequacao_funcionalidade_laminas_inadequadas: "",
    adequacao_funcionalidade_terminais: "",
    adequacao_funcionalidade_terminais_inadequados: "",
    distancia_face_defensa_obstaculo_m: "",
    distancia_bordo_pista_face_defensa_m: "",
    link_fotografia: "",
    tipo_defensa: "",
    extensao_metros: "",
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
    
    if (!formData.km_inicial || !formData.km_final || !formData.lado) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios (KM Inicial, KM Final, Lado)",
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
        .from("defensas")
        .insert({
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          data_inspecao: formData.data_inspecao,
          br: formData.br || null,
          snv: formData.snv || null,
          tramo: formData.tramo || null,
          km_inicial: parseFloat(formData.km_inicial),
          km_final: parseFloat(formData.km_final),
          latitude_inicial: formData.latitude_inicial ? parseFloat(formData.latitude_inicial) : null,
          longitude_inicial: formData.longitude_inicial ? parseFloat(formData.longitude_inicial) : null,
          latitude_final: formData.latitude_final ? parseFloat(formData.latitude_final) : null,
          longitude_final: formData.longitude_final ? parseFloat(formData.longitude_final) : null,
          lado: formData.lado,
          quantidade_laminas: formData.quantidade_laminas ? parseInt(formData.quantidade_laminas) : null,
          comprimento_total_tramo_m: formData.comprimento_total_tramo_m ? parseFloat(formData.comprimento_total_tramo_m) : null,
          funcao: formData.funcao || null,
          especificacao_obstaculo_fixo: formData.especificacao_obstaculo_fixo || null,
          id_defensa: formData.id_defensa || null,
          distancia_pista_obstaculo_m: formData.distancia_pista_obstaculo_m ? parseFloat(formData.distancia_pista_obstaculo_m) : null,
          risco: formData.risco || null,
          velocidade_kmh: formData.velocidade_kmh ? parseInt(formData.velocidade_kmh) : null,
          vmd_veic_dia: formData.vmd_veic_dia ? parseInt(formData.vmd_veic_dia) : null,
          percentual_veiculos_pesados: formData.percentual_veiculos_pesados ? parseFloat(formData.percentual_veiculos_pesados) : null,
          geometria: formData.geometria || null,
          classificacao_nivel_contencao: formData.classificacao_nivel_contencao || null,
          nivel_contencao_en1317: formData.nivel_contencao_en1317 || null,
          nivel_contencao_nchrp350: formData.nivel_contencao_nchrp350 || null,
          espaco_trabalho: formData.espaco_trabalho || null,
          terminal_entrada: formData.terminal_entrada || null,
          terminal_saida: formData.terminal_saida || null,
          adequacao_funcionalidade_lamina: formData.adequacao_funcionalidade_lamina || null,
          adequacao_funcionalidade_laminas_inadequadas: formData.adequacao_funcionalidade_laminas_inadequadas || null,
          adequacao_funcionalidade_terminais: formData.adequacao_funcionalidade_terminais || null,
          adequacao_funcionalidade_terminais_inadequados: formData.adequacao_funcionalidade_terminais_inadequados || null,
          distancia_face_defensa_obstaculo_m: formData.distancia_face_defensa_obstaculo_m ? parseFloat(formData.distancia_face_defensa_obstaculo_m) : null,
          distancia_bordo_pista_face_defensa_m: formData.distancia_bordo_pista_face_defensa_m ? parseFloat(formData.distancia_bordo_pista_face_defensa_m) : null,
          link_fotografia: formData.link_fotografia || null,
          tipo_defensa: formData.tipo_defensa || null,
          extensao_metros: formData.extensao_metros ? parseFloat(formData.extensao_metros) : null,
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Inspeção de defensa registrada com sucesso",
      });

      // Reset form
      setFormData({
        data_inspecao: new Date().toISOString().split('T')[0],
        br: "",
        snv: "",
        tramo: "",
        km_inicial: "",
        km_final: "",
        latitude_inicial: "",
        longitude_inicial: "",
        latitude_final: "",
        longitude_final: "",
        lado: "",
        quantidade_laminas: "",
        comprimento_total_tramo_m: "",
        funcao: "",
        especificacao_obstaculo_fixo: "",
        id_defensa: "",
        distancia_pista_obstaculo_m: "",
        risco: "",
        velocidade_kmh: "",
        vmd_veic_dia: "",
        percentual_veiculos_pesados: "",
        geometria: "",
        classificacao_nivel_contencao: "",
        nivel_contencao_en1317: "",
        nivel_contencao_nchrp350: "",
        espaco_trabalho: "",
        terminal_entrada: "",
        terminal_saida: "",
        adequacao_funcionalidade_lamina: "",
        adequacao_funcionalidade_laminas_inadequadas: "",
        adequacao_funcionalidade_terminais: "",
        adequacao_funcionalidade_terminais_inadequados: "",
        distancia_face_defensa_obstaculo_m: "",
        distancia_bordo_pista_face_defensa_m: "",
        link_fotografia: "",
        tipo_defensa: "",
        extensao_metros: "",
      });
    } catch (error) {
      console.error("Erro ao salvar inspeção:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar inspeção. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspeção de Defensas</CardTitle>
        <CardDescription>
          Registre inspeções e avaliações de estado das defensas metálicas e dispositivos de proteção
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_inspecao">Data da Inspeção *</Label>
              <Input
                id="data_inspecao"
                type="date"
                value={formData.data_inspecao}
                onChange={(e) =>
                  setFormData({ ...formData, data_inspecao: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="br">BR</Label>
              <Input
                id="br"
                value={formData.br}
                onChange={(e) => setFormData({ ...formData, br: e.target.value })}
                placeholder="Ex: BR-116"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="snv">SNV</Label>
              <Input
                id="snv"
                value={formData.snv}
                onChange={(e) => setFormData({ ...formData, snv: e.target.value })}
                placeholder="Ex: 116BMG1010"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tramo">Tramo</Label>
              <Input
                id="tramo"
                value={formData.tramo}
                onChange={(e) => setFormData({ ...formData, tramo: e.target.value })}
                placeholder="Ex: 1, 2, 3..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="id_defensa">ID Defensa</Label>
              <Input
                id="id_defensa"
                value={formData.id_defensa}
                onChange={(e) => setFormData({ ...formData, id_defensa: e.target.value })}
              />
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

            <div className="space-y-2 lg:col-span-3">
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

            <div className="space-y-2 lg:col-span-3">
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
              <Label htmlFor="quantidade_laminas">Quantidade de Lâminas</Label>
              <Input
                id="quantidade_laminas"
                type="number"
                value={formData.quantidade_laminas}
                onChange={(e) => setFormData({ ...formData, quantidade_laminas: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comprimento_total_tramo_m">Comprimento Total do Tramo (m)</Label>
              <Input
                id="comprimento_total_tramo_m"
                type="number"
                step="0.1"
                value={formData.comprimento_total_tramo_m}
                onChange={(e) => setFormData({ ...formData, comprimento_total_tramo_m: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="funcao">Função</Label>
              <Input
                id="funcao"
                value={formData.funcao}
                onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
                placeholder="Ex: Talude de aterro, Obstáculo fixo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="especificacao_obstaculo_fixo">Especificação do Obstáculo Fixo</Label>
              <Input
                id="especificacao_obstaculo_fixo"
                value={formData.especificacao_obstaculo_fixo}
                onChange={(e) => setFormData({ ...formData, especificacao_obstaculo_fixo: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="distancia_pista_obstaculo_m">Distância Pista ao Obstáculo (m)</Label>
              <Input
                id="distancia_pista_obstaculo_m"
                type="number"
                step="0.1"
                value={formData.distancia_pista_obstaculo_m}
                onChange={(e) => setFormData({ ...formData, distancia_pista_obstaculo_m: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="risco">Risco</Label>
              <Select
                value={formData.risco}
                onValueChange={(value) => setFormData({ ...formData, risco: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixo">Baixo</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Alto">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="velocidade_kmh">Velocidade (km/h)</Label>
              <Input
                id="velocidade_kmh"
                type="number"
                value={formData.velocidade_kmh}
                onChange={(e) => setFormData({ ...formData, velocidade_kmh: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vmd_veic_dia">VMD (veíc./dia)</Label>
              <Input
                id="vmd_veic_dia"
                type="number"
                value={formData.vmd_veic_dia}
                onChange={(e) => setFormData({ ...formData, vmd_veic_dia: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="percentual_veiculos_pesados">% Veículos Pesados</Label>
              <Input
                id="percentual_veiculos_pesados"
                type="number"
                step="0.01"
                value={formData.percentual_veiculos_pesados}
                onChange={(e) => setFormData({ ...formData, percentual_veiculos_pesados: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="geometria">Geometria</Label>
              <Select
                value={formData.geometria}
                onValueChange={(value) => setFormData({ ...formData, geometria: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Plano">Plano</SelectItem>
                  <SelectItem value="Ondulado">Ondulado</SelectItem>
                  <SelectItem value="Montanhoso">Montanhoso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="classificacao_nivel_contencao">Classificação do Nível de Contenção</Label>
              <Select
                value={formData.classificacao_nivel_contencao}
                onValueChange={(value) => setFormData({ ...formData, classificacao_nivel_contencao: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Alto">Alto</SelectItem>
                  <SelectItem value="Muito Alto">Muito Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nivel_contencao_en1317">Nível de Contenção EN 1317-2</Label>
              <Input
                id="nivel_contencao_en1317"
                value={formData.nivel_contencao_en1317}
                onChange={(e) => setFormData({ ...formData, nivel_contencao_en1317: e.target.value })}
                placeholder="Ex: H1, H2, H4b, N2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nivel_contencao_nchrp350">Nível de Contenção NCHRP 350</Label>
              <Input
                id="nivel_contencao_nchrp350"
                value={formData.nivel_contencao_nchrp350}
                onChange={(e) => setFormData({ ...formData, nivel_contencao_nchrp350: e.target.value })}
                placeholder="Ex: TL3, TL4, TL6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="espaco_trabalho">Espaço de Trabalho</Label>
              <Input
                id="espaco_trabalho"
                value={formData.espaco_trabalho}
                onChange={(e) => setFormData({ ...formData, espaco_trabalho: e.target.value })}
                placeholder="Ex: W2, W5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terminal_entrada">Terminal de Entrada</Label>
              <Input
                id="terminal_entrada"
                value={formData.terminal_entrada}
                onChange={(e) => setFormData({ ...formData, terminal_entrada: e.target.value })}
                placeholder="Ex: TAB, TAE, TABC"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terminal_saida">Terminal de Saída</Label>
              <Input
                id="terminal_saida"
                value={formData.terminal_saida}
                onChange={(e) => setFormData({ ...formData, terminal_saida: e.target.value })}
                placeholder="Ex: TAB, TAE, TABC"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adequacao_funcionalidade_lamina">Adequação - Lâmina</Label>
              <Select
                value={formData.adequacao_funcionalidade_lamina}
                onValueChange={(value) => setFormData({ ...formData, adequacao_funcionalidade_lamina: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Adequado">Adequado</SelectItem>
                  <SelectItem value="Inadequado">Inadequado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adequacao_funcionalidade_laminas_inadequadas">Lâminas Inadequadas</Label>
              <Input
                id="adequacao_funcionalidade_laminas_inadequadas"
                value={formData.adequacao_funcionalidade_laminas_inadequadas}
                onChange={(e) => setFormData({ ...formData, adequacao_funcionalidade_laminas_inadequadas: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adequacao_funcionalidade_terminais">Adequação - Terminais</Label>
              <Select
                value={formData.adequacao_funcionalidade_terminais}
                onValueChange={(value) => setFormData({ ...formData, adequacao_funcionalidade_terminais: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Adequado">Adequado</SelectItem>
                  <SelectItem value="Inadequado">Inadequado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adequacao_funcionalidade_terminais_inadequados">Terminais Inadequados</Label>
              <Input
                id="adequacao_funcionalidade_terminais_inadequados"
                value={formData.adequacao_funcionalidade_terminais_inadequados}
                onChange={(e) => setFormData({ ...formData, adequacao_funcionalidade_terminais_inadequados: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="distancia_face_defensa_obstaculo_m">Distância Face Defensa ao Obstáculo (m)</Label>
              <Input
                id="distancia_face_defensa_obstaculo_m"
                type="number"
                step="0.1"
                value={formData.distancia_face_defensa_obstaculo_m}
                onChange={(e) => setFormData({ ...formData, distancia_face_defensa_obstaculo_m: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="distancia_bordo_pista_face_defensa_m">Distância Bordo da Pista à Face da Defensa (m)</Label>
              <Input
                id="distancia_bordo_pista_face_defensa_m"
                type="number"
                step="0.1"
                value={formData.distancia_bordo_pista_face_defensa_m}
                onChange={(e) => setFormData({ ...formData, distancia_bordo_pista_face_defensa_m: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link_fotografia">Link da Fotografia</Label>
              <Input
                id="link_fotografia"
                value={formData.link_fotografia}
                onChange={(e) => setFormData({ ...formData, link_fotografia: e.target.value })}
                placeholder="URL da foto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="extensao_metros">Extensão (metros)</Label>
              <Input
                id="extensao_metros"
                type="number"
                step="0.1"
                value={formData.extensao_metros}
                onChange={(e) => setFormData({ ...formData, extensao_metros: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_defensa">Tipo de Defensa</Label>
              <Select
                value={formData.tipo_defensa}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_defensa: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DEFENSA.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Inspeção
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default DefensasForm;
