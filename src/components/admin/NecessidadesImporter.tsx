import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle2, XCircle, AlertCircle, Loader2, StopCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";

const TIPOS_NECESSIDADES = [
  { value: "marcas_longitudinais", label: "Marcas Longitudinais" },
  { value: "tachas", label: "Tachas" },
  { value: "marcas_transversais", label: "Zebrados (Marcas Transversais)" },
  { value: "cilindros", label: "Cilindros Delimitadores" },
  { value: "placas", label: "Placas" },
  { value: "porticos", label: "Pórticos" },
  { value: "defensas", label: "Defensas" },
];

interface LogEntry {
  tipo: "success" | "warning" | "error";
  linha: number;
  mensagem: string;
}

export function NecessidadesImporter() {
  const [tipo, setTipo] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loteId, setLoteId] = useState<string>("");
  const [rodoviaId, setRodoviaId] = useState<string>("");
  const { toast } = useToast();
  const cancelImportRef = useRef(false);

  // Buscar lotes
  const { data: lotes } = useQuery({
    queryKey: ["lotes"],
    queryFn: async () => {
      const { data } = await supabase.from("lotes").select("*").order("numero");
      return data || [];
    },
  });

  // Buscar rodovias do lote selecionado
  const { data: rodovias } = useQuery({
    queryKey: ["rodovias", loteId],
    queryFn: async () => {
      if (!loteId) return [];
      const { data } = await supabase
        .from("lotes_rodovias")
        .select("rodovia:rodovias(*)")
        .eq("lote_id", loteId);
      return data?.map(lr => lr.rodovia) || [];
    },
    enabled: !!loteId,
  });

  // Função para converter coordenadas com vírgula para ponto
  const converterCoordenada = (valor: any): number | null => {
    if (!valor) return null;
    
    // Se já é número, retorna
    if (typeof valor === "number") return valor;
    
    // Se é string, substitui vírgula por ponto e converte
    if (typeof valor === "string") {
      const valorLimpo = valor.trim().replace(",", ".");
      const numero = parseFloat(valorLimpo);
      return isNaN(numero) ? null : numero;
    }
    
    return null;
  };

  const identificarServico = (row: any, match: any): string => {
    // SEM match = nova instalação
    if (!match) {
      return "Implantar";
    }

    // COM match - verificar sinais de remoção
    const sinaisRemocao = [
      row.quantidade === 0 || row.quantidade === "0",
      row.extensao_metros === 0 || row.extensao_metros === "0",
      row.acao?.toLowerCase().includes("remov"),
      row.acao?.toLowerCase().includes("desativ"),
    ];

    if (sinaisRemocao.some(Boolean)) {
      return "Remover";
    }

    // Caso contrário = substituição
    return "Substituir";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setLogs([]);
      setProgress(0);
    }
  };

  const mapearColunas = (row: any, tipo: string) => {
    // Para placas, não usar campos do baseMap (não tem inicial/final)
    if (tipo === "placas") {
      return {
        km: row["Km"] || row["KM"] || row["km"],
        latitude: converterCoordenada(row["Latitude"] || row["latitude"]),
        longitude: converterCoordenada(row["Longitude"] || row["longitude"]),
        codigo: row["Código da placa"] || row["Código"] || row["codigo"],
        modelo: row["Modelo"] || row["modelo"],
        tipo: row["Tipo de placa"] || row["Tipo"] || row["tipo"],
        velocidade: row["Velocidade"] || row["velocidade"],
        descricao: row["Descrição"] || row["descricao"],
        lado: row["Lado"] || row["lado"],
        dimensoes_mm: row["Dimensões (mm)"] || row["dimensoes_mm"],
        substrato: row["Tipo de Substrato"] || row["Substrato"] || row["substrato"],
        suporte: row["Tipo de Suporte"] || row["Suporte"] || row["suporte"],
        pelicula: row["Película"] || row["pelicula"],
        snv: row["SNV"] || row["snv"],
        observacao: row["Observação"] || row["Observacao"] || row["observacao"],
        solucao_planilha: row["Solução"] || row["Solucao"] || row["solucao"],
      };
    }

    // Mapeamento básico para outros tipos (com inicial/final)
    const baseMap: any = {
      km_inicial: row["Km Inicial"] || row["KM Inicial"] || row["km_inicial"],
      km_final: row["Km Final"] || row["KM Final"] || row["km_final"],
      latitude_inicial: converterCoordenada(row["Latitude Inicial"] || row["Lat Inicial"] || row["latitude_inicial"]),
      longitude_inicial: converterCoordenada(row["Longitude Inicial"] || row["Long Inicial"] || row["longitude_inicial"]),
      latitude_final: converterCoordenada(row["Latitude Final"] || row["Lat Final"] || row["latitude_final"]),
      longitude_final: converterCoordenada(row["Longitude Final"] || row["Long Final"] || row["longitude_final"]),
      observacao: row["Observação"] || row["Observacao"] || row["observacao"],
      snv: row["SNV"] || row["snv"],
      solucao_planilha: row["Solução"] || row["Solucao"] || row["solucao"],
    };

    // Campos específicos por tipo
    switch (tipo) {
      case "marcas_longitudinais":
        return {
          ...baseMap,
          codigo: row["Código"] || row["codigo"],
          posicao: row["Posição"] || row["Posicao"] || row["posicao"] || row["Código"] || row["codigo"], // Posição vem da coluna Posição (ou do Código se não existir)
          tipo_demarcacao: row["Código"] || row["codigo"],
          largura_cm: (row["Largura da Faixa (m)"] || row["largura_cm"]) ? 
            parseFloat(String(row["Largura da Faixa (m)"] || row["largura_cm"]).replace(',', '.')) * 100 : null,
          material: row["Material"] || row["material"],
          espessura_cm: (row["Espessura (mm)"] || row["espessura_cm"]) ?
            parseFloat(String(row["Espessura (mm)"] || row["espessura_cm"]).replace(',', '.')) / 10 : null,
          extensao_metros: (row["Extensão (km)"] || row["extensao_metros"]) ?
            parseFloat(String(row["Extensão (km)"] || row["extensao_metros"]).replace(',', '.')) * 1000 : null,
          traco_m: row["Traço (m)"] && row["Traço (m)"] !== "-" ? parseFloat(String(row["Traço (m)"]).replace(',', '.')) : null,
          espacamento_m: row["Espaçamento (m)"] && row["Espaçamento (m)"] !== "-" ? parseFloat(String(row["Espaçamento (m)"]).replace(',', '.')) : null,
          area_m2: row["Área (m²)"] ? parseFloat(String(row["Área (m²)"]).replace(',', '.')) : null,
        };

      case "tachas":
        return {
          ...baseMap,
          quantidade: parseInt(row["Quantidade"] || row["quantidade"]) || null,
          corpo: row["Corpo"] || row["corpo"],
          refletivo: row["Refletivo"] || row["refletivo"],
          cor_refletivo: row["Cor do refletivo"] || row["Cor Refletivo"] || row["cor_refletivo"],
          espacamento_m: row["Espaçamento"] || row["espacamento_m"] ? parseFloat(String(row["Espaçamento"] || row["espacamento_m"]).replace(',', '.')) : null,
          extensao_km: row["Extensão (km)"] || row["extensao_km"] ? parseFloat(String(row["Extensão (km)"] || row["extensao_km"]).replace(',', '.')) : null,
          local_implantacao: row["Local de implantação"] || row["Local Implantação"] || row["local_implantacao"],
          descricao: row["Descrição"] || row["descricao"],
        };

      default:
        return baseMap;
    }
  };

  const handleImport = async () => {
    if (!file || !tipo || !loteId || !rodoviaId) {
      toast({
        title: "Erro",
        description: "Selecione o tipo, lote, rodovia e arquivo antes de importar",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setLogs([]);
    setProgress(0);
    cancelImportRef.current = false;

    try {
      // 1. Ler arquivo Excel - usar linha 2 como cabeçalho (onde está o dicionário)
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Ler com cabeçalho na linha 2 (índice 1)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,  // Ler como array de arrays primeiro
        defval: null 
      });

      if (jsonData.length < 2) {
        throw new Error("Planilha vazia ou sem dados");
      }

      // Pegar os cabeçalhos da linha 2 (índice 1)
      const headers = jsonData[1] as any[];
      
      // Converter os dados (a partir da linha 3) em objetos usando os cabeçalhos da linha 2
      const dadosComHeader = jsonData.slice(2).map((row: any) => {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });

      // Filtrar linhas vazias (que não têm KM)
      const dadosFiltrados = dadosComHeader.filter((row: any) => {
        const kmValue = tipo === "placas" 
          ? (row["Km"] || row["KM"] || row["km"])
          : (row["Km Inicial"] || row["KM Inicial"] || row["km_inicial"]);
        return kmValue !== undefined && kmValue !== null && kmValue !== "";
      });

      // 2. Buscar user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 3. Buscar todos os cadastros da rodovia de uma vez para match em lote
      const tabelaCadastro = tipo === "placas" ? "ficha_placa" : 
                             tipo === "marcas_transversais" ? "ficha_inscricoes" :
                             tipo === "marcas_longitudinais" ? "ficha_marcas_longitudinais" :
                             tipo === "cilindros" ? "ficha_cilindros" :
                             tipo === "tachas" ? "ficha_tachas" :
                             tipo === "porticos" ? "ficha_porticos" :
                             "defensas";

      console.log(`📊 Buscando cadastros da rodovia para match em lote...`);
      const { data: cadastros } = await supabase
        .from(tabelaCadastro as any)
        .select("*")
        .eq("rodovia_id", rodoviaId);

      const usaLatLongInicial = tipo !== "placas" && tipo !== "porticos";
      const cadastroLatField = usaLatLongInicial ? "latitude_inicial" : "latitude";
      const cadastroLongField = usaLatLongInicial ? "longitude_inicial" : "longitude";

      console.log(`✅ VERSÃO OTIMIZADA: ${cadastros?.length || 0} cadastros carregados. Match será local (sem RPC).`);
      
      setLogs(prev => [...prev, {
        tipo: "success",
        linha: 0,
        mensagem: `🚀 Modo otimizado: ${cadastros?.length || 0} cadastros carregados. Match local ativado.`
      }]);

      // Função para calcular distância (Haversine)
      const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371000; // Raio da Terra em metros
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      // 4. Processar cada linha
      const total = dadosFiltrados.length;
      let sucessos = 0;
      let falhas = 0;

      for (let i = 0; i < dadosFiltrados.length; i++) {
        // Verificar se foi cancelado
        if (cancelImportRef.current) {
          setLogs(prev => [...prev, {
            tipo: "warning",
            linha: 0,
            mensagem: "Importação cancelada pelo usuário"
          }]);
          toast({
            title: "Importação Cancelada",
            description: `Processadas ${i} de ${total} linhas antes do cancelamento`,
            variant: "default",
          });
          break;
        }

        const row: any = dadosFiltrados[i];
        const linhaExcel = i + 3; // +3 pois Excel começa em 1, tem header, e pulamos a linha de cabeçalho duplicada

        try {
          // Mapear colunas
          const dados = mapearColunas(row, tipo);

          // Buscar match no cadastro localmente (sem chamar RPC)
          const lat = tipo === "placas" ? converterCoordenada(dados.latitude) : converterCoordenada(dados.latitude_inicial);
          const long = tipo === "placas" ? converterCoordenada(dados.longitude) : converterCoordenada(dados.longitude_inicial);

          let match = null;
          let distancia = null;

          if (lat && long && cadastros && cadastros.length > 0) {
            // Buscar o cadastro mais próximo localmente
            let menorDistancia = Infinity;
            let cadastroMaisProximo = null;

            for (const cad of (cadastros as any[])) {
              const cadLat = converterCoordenada(cad[cadastroLatField]);
              const cadLong = converterCoordenada(cad[cadastroLongField]);
              
              if (cadLat !== null && cadLong !== null) {
                const dist = calcularDistancia(lat, long, cadLat, cadLong);
                
                if (dist < menorDistancia && dist <= 50) { // Tolerância de 50m
                  menorDistancia = dist;
                  cadastroMaisProximo = cad;
                }
              }
            }

            if (cadastroMaisProximo) {
              match = cadastroMaisProximo.id;
              distancia = Math.round(menorDistancia);
              if (i % 50 === 0) { // Log a cada 50 linhas para não sobrecarregar
                console.log(`✅ Processando linha ${linhaExcel}: Match encontrado! distancia=${distancia}m [${i+1}/${total}]`);
              }
            } else if (i % 50 === 0) {
              console.log(`⚠️ Processando linha ${linhaExcel}: Sem match dentro de 50m [${i+1}/${total}]`);
            }
          } else if (!lat || !long) {
            if (i % 50 === 0) {
              console.log(`⚠️ Processando linha ${linhaExcel}: Sem coordenadas válidas [${i+1}/${total}]`);
            }
          }

          // Usar o serviço da planilha (coluna "Solução")
          let servico: string;
          const solucaoPlanilha = dados.solucao_planilha?.toLowerCase();
          
          if (solucaoPlanilha) {
            // Mapear valores da planilha
            if (solucaoPlanilha.includes("substitu")) {
              servico = "Substituir";
            } else if (solucaoPlanilha.includes("implant")) {
              servico = "Implantar";
            } else if (solucaoPlanilha.includes("remov")) {
              servico = "Remover";
            } else if (solucaoPlanilha.includes("manter")) {
              servico = "Manter";
            } else {
              servico = "Implantar"; // Padrão
            }
          } else {
            // Se não tem solução na planilha, usar lógica de inferência
            servico = identificarServico(dados, match);
          }

          // Inserir necessidade
          const tabelaNecessidade = `necessidades_${tipo}` as 
            | "necessidades_marcas_longitudinais"
            | "necessidades_tachas"
            | "necessidades_marcas_transversais"
            | "necessidades_cilindros"
            | "necessidades_placas"
            | "necessidades_porticos"
            | "necessidades_defensas";

          const { error } = await supabase
            .from(tabelaNecessidade)
            .insert({
              user_id: user.id,
              lote_id: loteId,
              rodovia_id: rodoviaId,
              cadastro_id: match,
              servico,
              ...dados,
              arquivo_origem: file.name,
              linha_planilha: linhaExcel,
              distancia_match_metros: distancia,
            });

          if (error) throw error;

          // Log de sucesso (simples e direto)
          const icon = servico === "Implantar" ? "🟢" : servico === "Substituir" ? "🟡" : servico === "Remover" ? "🔴" : "🔵";
          const matchInfo = match ? ` (${distancia?.toFixed(0)}m)` : "";
          
          setLogs(prev => [...prev, {
            tipo: "success",
            linha: linhaExcel,
            mensagem: `${icon} ${servico}${matchInfo}`
          }]);
          sucessos++;

        } catch (error: any) {
          setLogs(prev => [...prev, {
            tipo: "error",
            linha: linhaExcel,
            mensagem: `Erro: ${error.message}`
          }]);
          falhas++;
        }

        // Atualizar progresso
        setProgress(Math.round(((i + 1) / total) * 100));
      }

      // Resultado final
      toast({
        title: "Importação concluída",
        description: `${sucessos} registros importados, ${falhas} falhas`,
        variant: falhas > 0 ? "destructive" : "default",
      });

    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Necessidades</CardTitle>
        <CardDescription>
          Importar planilhas de necessidades com match automático ao cadastro
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seleção de tipo */}
        <div className="space-y-2">
          <Label>Tipo de Necessidade</Label>
          <Select value={tipo} onValueChange={setTipo} disabled={isImporting}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_NECESSIDADES.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seleção de Lote */}
        <div className="space-y-2">
          <Label>Lote</Label>
          <Select value={loteId} onValueChange={(value) => {
            setLoteId(value);
            setRodoviaId(""); // Limpar rodovia ao mudar lote
          }} disabled={isImporting}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o lote" />
            </SelectTrigger>
            <SelectContent>
              {lotes?.map(lote => (
                <SelectItem key={lote.id} value={lote.id}>
                  {lote.numero}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seleção de Rodovia */}
        <div className="space-y-2">
          <Label>Rodovia</Label>
          <Select value={rodoviaId} onValueChange={setRodoviaId} disabled={isImporting || !loteId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a rodovia" />
            </SelectTrigger>
            <SelectContent>
              {rodovias?.map((rodovia: any) => (
                <SelectItem key={rodovia.id} value={rodovia.id}>
                  {rodovia.codigo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Upload de arquivo */}
        <div className="space-y-2">
          <Label>Arquivo Excel (.xlsx, .xlsm)</Label>
          <Input
            type="file"
            accept=".xlsx,.xlsm"
            onChange={handleFileChange}
            disabled={isImporting || !tipo}
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              Arquivo selecionado: {file.name}
            </p>
          )}
        </div>

        {/* Botões importar/cancelar */}
        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={!file || !tipo || !loteId || !rodoviaId || isImporting}
            className="flex-1"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </>
            )}
          </Button>

          {isImporting && (
            <Button
              onClick={() => {
                cancelImportRef.current = true;
                toast({
                  title: "Cancelando...",
                  description: "A importação será interrompida após a linha atual",
                });
              }}
              variant="destructive"
              className="flex-shrink-0"
            >
              <StopCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          )}
        </div>

        {/* Barra de progresso */}
        {isImporting && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              {progress}% concluído
            </p>
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <Label>Log de Importação</Label>
            <div className="space-y-1">
              {logs.map((log, idx) => (
                <Alert
                  key={idx}
                  variant={log.tipo === "error" ? "destructive" : "default"}
                  className="py-2"
                >
                  {log.tipo === "success" && <CheckCircle2 className="h-4 w-4" />}
                  {log.tipo === "warning" && <AlertCircle className="h-4 w-4" />}
                  {log.tipo === "error" && <XCircle className="h-4 w-4" />}
                  <AlertDescription className="text-xs">
                    Linha {log.linha}: {log.mensagem}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
