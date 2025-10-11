import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BUCKETS = [
  { name: "defensas", table: "defensas" },
  { name: "placa-photos", table: "ficha_placa" },
  { name: "marcas-longitudinais", table: "ficha_marcas_longitudinais" },
  { name: "cilindros", table: "ficha_cilindros" },
  { name: "inscricoes", table: "ficha_inscricoes" },
  { name: "tachas", table: "ficha_tachas" },
  { name: "porticos", table: "ficha_porticos" },
];

export function LimparFotosOrfas() {
  const [cleaning, setCleaning] = useState(false);
  const [progress, setProgress] = useState("");
  const [stats, setStats] = useState<{ bucket: string; total: number; orfas: number }[]>([]);

  const handleClean = async () => {
    if (!confirm(
      `Tem certeza que deseja analisar e deletar fotos órfãs?\n\n` +
      `Esta ação irá:\n` +
      `1. Verificar todas as fotos no storage\n` +
      `2. Identificar fotos sem registro associado\n` +
      `3. Deletar apenas as fotos órfãs\n\n` +
      `Esta ação não pode ser desfeita!`
    )) {
      return;
    }

    setCleaning(true);
    setProgress("Iniciando limpeza...");
    const newStats: { bucket: string; total: number; orfas: number }[] = [];

    try {
      for (const bucket of BUCKETS) {
        setProgress(`Analisando bucket: ${bucket.name}...`);

        // 1. Listar todas as fotos do bucket
        const { data: files, error: listError } = await supabase.storage
          .from(bucket.name)
          .list('', { limit: 10000 });

        if (listError) {
          console.error(`Erro ao listar ${bucket.name}:`, listError);
          continue;
        }

        if (!files || files.length === 0) {
          console.log(`Bucket ${bucket.name} está vazio`);
          newStats.push({ bucket: bucket.name, total: 0, orfas: 0 });
          continue;
        }

        setProgress(`${bucket.name}: ${files.length} fotos encontradas. Verificando registros...`);

        // 2. Buscar todos os registros com fotos deste bucket
        const { data: registros, error: dbError } = await supabase
          .from(bucket.table as any)
          .select('foto_url')
          .not('foto_url', 'is', null) as any;

        if (dbError) {
          console.error(`Erro ao buscar registros de ${bucket.table}:`, dbError);
          continue;
        }

        // 3. Criar um Set com os nomes de arquivos que estão em uso
        const fotosEmUso = new Set<string>();
        if (registros && Array.isArray(registros)) {
          registros.forEach((reg: any) => {
            if (reg.foto_url) {
              try {
                const url = new URL(reg.foto_url);
                const pathParts = url.pathname.split(`/storage/v1/object/public/${bucket.name}/`);
                if (pathParts[1]) {
                  // Decodificar URL para lidar com caracteres especiais
                  const fileName = decodeURIComponent(pathParts[1]);
                  fotosEmUso.add(fileName);
                }
              } catch (e) {
                console.error('Erro ao processar URL:', e);
              }
            }
          });
        }

        // 4. Identificar fotos órfãs (recursivamente em subpastas)
        const fotosOrfas: string[] = [];
        
        const processarArquivos = async (prefix: string = '') => {
          const { data: items, error } = await supabase.storage
            .from(bucket.name)
            .list(prefix, { limit: 10000 });

          if (error || !items) return;

          for (const item of items) {
            const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
            
            if (item.id) {
              // É um arquivo
              if (!fotosEmUso.has(fullPath)) {
                fotosOrfas.push(fullPath);
              }
            } else {
              // É uma pasta, processar recursivamente
              await processarArquivos(fullPath);
            }
          }
        };

        await processarArquivos();

        setProgress(`${bucket.name}: ${fotosOrfas.length} fotos órfãs identificadas`);
        newStats.push({ bucket: bucket.name, total: files.length, orfas: fotosOrfas.length });

        // 5. Deletar fotos órfãs em lotes de 100
        if (fotosOrfas.length > 0) {
          setProgress(`${bucket.name}: Deletando ${fotosOrfas.length} fotos órfãs...`);
          
          for (let i = 0; i < fotosOrfas.length; i += 100) {
            const lote = fotosOrfas.slice(i, i + 100);
            const { error: deleteError } = await supabase.storage
              .from(bucket.name)
              .remove(lote);

            if (deleteError) {
              console.error(`Erro ao deletar lote de fotos de ${bucket.name}:`, deleteError);
            }
            
            setProgress(`${bucket.name}: ${Math.min(i + 100, fotosOrfas.length)}/${fotosOrfas.length} fotos deletadas`);
          }
        }
      }

      setStats(newStats);
      const totalOrfas = newStats.reduce((sum, stat) => sum + stat.orfas, 0);
      
      if (totalOrfas > 0) {
        toast.success(`Limpeza concluída! ${totalOrfas} fotos órfãs foram deletadas.`);
      } else {
        toast.success("Limpeza concluída! Nenhuma foto órfã encontrada.");
      }
      
      setProgress("Limpeza concluída!");
    } catch (error: any) {
      console.error('Erro na limpeza:', error);
      toast.error('Erro durante a limpeza: ' + error.message);
      setProgress("Erro na limpeza");
    } finally {
      setCleaning(false);
    }
  };

  return (
    <Card className="border-warning">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <Trash2 className="h-5 w-5" />
          Limpar Fotos Órfãs
        </CardTitle>
        <CardDescription>
          Remove fotos do storage que não possuem registro associado no banco de dados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress && (
          <Alert>
            {cleaning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{progress}</AlertDescription>
          </Alert>
        )}

        {stats.length > 0 && (
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">Resultado da Limpeza:</h4>
            <div className="space-y-1 text-sm">
              {stats.map(stat => (
                <div key={stat.bucket} className="flex justify-between">
                  <span>{stat.bucket}:</span>
                  <span>
                    {stat.orfas} órfãs de {stat.total} fotos
                    {stat.orfas > 0 && " ✓ deletadas"}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t font-semibold flex justify-between">
                <span>Total:</span>
                <span>{stats.reduce((sum, s) => sum + s.orfas, 0)} fotos deletadas</span>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleClean}
          disabled={cleaning}
          variant="default"
          size="lg"
          className="w-full"
        >
          {cleaning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Limpando...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Analisar e Limpar Fotos Órfãs
            </>
          )}
        </Button>

        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>ℹ️ Como funciona:</strong>
          </p>
          <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
            <li>Analisa todos os buckets de fotos do sistema</li>
            <li>Identifica fotos que não têm registro no banco de dados</li>
            <li>Remove apenas as fotos órfãs, preservando as que estão em uso</li>
            <li>Exibe relatório detalhado por bucket</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
