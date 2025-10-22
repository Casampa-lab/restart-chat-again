import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const TABELAS_INVENTARIO = [
  { value: "ficha_cilindros", label: "Cilindros Delimitadores" },
  { value: "defensas", label: "Defensas" },
  { value: "ficha_marcas_longitudinais", label: "Marcas Longitudinais" },
  { value: "ficha_placa", label: "Placas de Sinalização Vertical" },
  { value: "ficha_porticos", label: "Pórticos e Braços Projetados" },
  { value: "ficha_tachas", label: "Tachas Refletivas" },
  { value: "ficha_inscricoes", label: "Inscrições" },
];

interface DeleteInventarioSelecionadoProps {
  loteId?: string;
  rodoviaId?: string;
}

export function DeleteInventarioSelecionado({ loteId: propLoteId, rodoviaId: propRodoviaId }: DeleteInventarioSelecionadoProps = {}) {
  const queryClient = useQueryClient();
  const [selectedTabela, setSelectedTabela] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!propLoteId || !propRodoviaId || !selectedTabela) {
      toast.error("Selecione o lote, rodovia e tipo de serviço no topo da página");
      return;
    }

    // Buscar nomes do banco para confirmação
    const { data: loteData } = await supabase.from("lotes").select("numero").eq("id", propLoteId).single();
    const { data: rodoviaData } = await supabase.from("rodovias").select("codigo").eq("id", propRodoviaId).single();
    const tabelaNome = TABELAS_INVENTARIO.find(t => t.value === selectedTabela)?.label;

    if (!confirm(
      `Tem certeza que deseja apagar TODOS os registros de ${tabelaNome} da ${rodoviaData?.codigo} do Lote ${loteData?.numero}?\n\n` +
      `Esta ação não pode ser desfeita e incluirá as fotos associadas!`
    )) {
      return;
    }

    setDeleting(true);

    try {
      // Mapa de tabelas para buckets de storage
      const bucketMap: Record<string, string> = {
        "ficha_placa": "placa-photos",
        "ficha_marcas_longitudinais": "marcas-longitudinais",
        "ficha_cilindros": "cilindros",
        "ficha_inscricoes": "inscricoes",
        "ficha_tachas": "tachas",
        "ficha_porticos": "porticos",
        "defensas": "defensas",
      };

      // 1. Definir colunas de fotos por tabela (null = sem fotos)
      const fotoColumns: Record<string, string | null> = {
        "ficha_placa": "foto_frontal_url, foto_lateral_url, foto_posterior_url, foto_base_url, foto_identificacao_url",
        "ficha_porticos": "foto_url",
        "defensas": "link_fotografia",
        // Estas tabelas NÃO possuem colunas de foto no banco
        "ficha_marcas_longitudinais": null,
        "ficha_tachas": null,
        "ficha_inscricoes": null,
        "ficha_cilindros": null,
      };

      const temFotos = fotoColumns[selectedTabela] !== null;
      
      // 2. Buscar registros (com ou sem fotos)
      toast.info("Buscando registros...");
      
      const selectColumns = temFotos ? `id, ${fotoColumns[selectedTabela]}` : 'id';
      
      const { data: registros, error: fetchError } = await supabase
        .from(selectedTabela as any)
        .select(selectColumns)
        .eq('lote_id', propLoteId)
        .eq('rodovia_id', propRodoviaId) as any;

      if (fetchError) throw fetchError;

      // 3. Coletar os caminhos das fotos (só se a tabela tiver fotos)
      const fotosParaDeletar: string[] = [];
      if (temFotos && registros && Array.isArray(registros)) {
        registros.forEach((reg: any) => {
          const bucketName = bucketMap[selectedTabela];
          if (bucketName) {
            const fotoUrls: string[] = [];
            
            // Processar diferentes estruturas de fotos
            if (selectedTabela === 'ficha_placa') {
              if (reg.foto_frontal_url) fotoUrls.push(reg.foto_frontal_url);
              if (reg.foto_lateral_url) fotoUrls.push(reg.foto_lateral_url);
              if (reg.foto_posterior_url) fotoUrls.push(reg.foto_posterior_url);
              if (reg.foto_base_url) fotoUrls.push(reg.foto_base_url);
              if (reg.foto_identificacao_url) fotoUrls.push(reg.foto_identificacao_url);
            } else if (selectedTabela === 'defensas') {
              if (reg.link_fotografia) fotoUrls.push(reg.link_fotografia);
            } else {
              if (reg.foto_url) fotoUrls.push(reg.foto_url);
            }
            
            // Processar cada URL
            fotoUrls.forEach(fotoUrl => {
              try {
                const url = new URL(fotoUrl);
                const pathParts = url.pathname.split(`/storage/v1/object/public/${bucketName}/`);
                if (pathParts[1]) {
                  fotosParaDeletar.push(pathParts[1]);
                }
              } catch (e) {
                console.error('Erro ao processar URL da foto:', e);
              }
            });
          }
        });
      }

      // 3. Deletar os registros do banco
      toast.info(`Deletando ${registros?.length || 0} registros...`);
      const { error: deleteError, count } = await supabase
        .from(selectedTabela as any)
        .delete({ count: 'exact' })
        .eq('lote_id', propLoteId)
        .eq('rodovia_id', propRodoviaId);

      if (deleteError) {
        console.error('Erro ao deletar registros:', deleteError);
        throw deleteError;
      }

      // Limpar reconciliações relacionadas
      const tipoElementoMap: Record<string, string> = {
        'ficha_placa': 'placas',
        'defensas': 'defensas',
        'ficha_porticos': 'porticos',
        'ficha_marcas_longitudinais': 'marcas_longitudinais',
        'ficha_inscricoes': 'inscricoes',
        'ficha_cilindros': 'cilindros',
        'ficha_tachas': 'tachas'
      };

      const tipoElemento = tipoElementoMap[selectedTabela];

      if (tipoElemento) {
        toast.info("Limpando reconciliações relacionadas...");
        const tabelaNecessidade = `necessidades_${tipoElemento}`;
        
        // Buscar necessidades afetadas
        const { data: necessidadesAfetadas } = await supabase
          .from(tabelaNecessidade as any)
          .select('id')
          .eq('lote_id', propLoteId)
          .eq('rodovia_id', propRodoviaId)
          .not('cadastro_id', 'is', null);
        
        if (necessidadesAfetadas && necessidadesAfetadas.length > 0) {
          const necessidadeIds = necessidadesAfetadas.map((n: any) => n.id);
          
          // Deletar reconciliações
          const { error: reconciliacaoError } = await supabase
            .from('reconciliacoes')
            .delete()
            .in('necessidade_id', necessidadeIds)
            .eq('tipo_elemento', tipoElemento as any);
          
          if (reconciliacaoError) {
            console.error('Erro ao deletar reconciliações:', reconciliacaoError);
          }
          
          // Resetar cadastro_id nas necessidades
          const { error: cleanupError } = await supabase
            .from(tabelaNecessidade as any)
            .update({ cadastro_id: null })
            .in('id', necessidadeIds);
          
          if (cleanupError) {
            console.error('Erro ao limpar cadastro_id:', cleanupError);
            toast.warning("Inventário deletado, mas houve erro ao limpar matches relacionados");
          }
        }
      }

      // 4. Deletar as fotos do storage
      if (fotosParaDeletar.length > 0) {
        toast.info(`Deletando ${fotosParaDeletar.length} fotos do storage...`);
        const bucketName = bucketMap[selectedTabela];
        
        const { error: storageError } = await supabase.storage
          .from(bucketName)
          .remove(fotosParaDeletar);

        if (storageError) {
          console.error('Erro ao deletar fotos:', storageError);
          toast.warning(`Registros deletados, mas houve erro ao deletar algumas fotos: ${storageError.message}`);
        } else {
          toast.success(`${count} registros e ${fotosParaDeletar.length} fotos deletados com sucesso!`);
        }
      }
      
      // Invalidar cache para atualizar o semáforo
      await queryClient.invalidateQueries({ 
        queryKey: ["inventory-status", propLoteId, propRodoviaId] 
      });

      // Deletar o log de importação para este tipo
      const tipoInventarioMap: Record<string, string> = {
        "ficha_placa": "placas",
        "ficha_marcas_longitudinais": "marcas_longitudinais",
        "ficha_cilindros": "cilindros",
        "ficha_inscricoes": "inscricoes",
        "ficha_tachas": "tachas",
        "ficha_porticos": "porticos",
        "defensas": "defensas",
      };
      
      const tipoInventario = tipoInventarioMap[selectedTabela];
      if (tipoInventario) {
        await supabase
          .from('importacoes_log')
          .delete()
          .eq('lote_id', propLoteId)
          .eq('rodovia_id', propRodoviaId)
          .eq('tipo_inventario', tipoInventario);
      }
      
      // Limpar seleção
      setSelectedTabela("");
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error('Erro ao deletar: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Deletar Inventário por Lote e Rodovia
        </CardTitle>
        <CardDescription>
          Selecione o lote, rodovia e tipo de serviço para deletar todos os registros correspondentes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tabela">Tipo de Serviço *</Label>
          <Select value={selectedTabela} onValueChange={setSelectedTabela}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {TABELAS_INVENTARIO.map((tabela) => (
                <SelectItem key={tabela.value} value={tabela.value}>
                  {tabela.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleDelete}
          disabled={!propLoteId || !propRodoviaId || !selectedTabela || deleting}
          variant="destructive"
          size="lg"
          className="w-full"
        >
          {deleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deletando...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Deletar Registros Selecionados
            </>
          )}
        </Button>

        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>⚠️ Atenção:</strong> Esta ação deletará permanentemente todos os registros do tipo selecionado
            para o lote e rodovia escolhidos. Use com cuidado!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
