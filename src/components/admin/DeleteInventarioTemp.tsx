import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function DeleteInventarioTemp() {
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja apagar TODOS os registros da BR-367 e BR-116 do Lote 04? Esta ação não pode ser desfeita!')) {
      return;
    }

    setDeleting(true);

    try {
      // IDs das rodovias e lote
      const br367Id = '37a1dbe7-0056-42d3-a92c-fe5bc73af52e';
      const br116Id = 'd91e026a-9d6f-4251-9d80-8923d1ed9b1e';
      const lote04Id = 'df776e07-d57d-4403-85eb-2d6e0916f5d8';

      // Deletar registros
      const { error, count } = await supabase
        .from('ficha_placa')
        .delete({ count: 'exact' })
        .eq('lote_id', lote04Id)
        .in('rodovia_id', [br367Id, br116Id]);

      if (error) {
        console.error('Erro ao deletar:', error);
        throw error;
      }

      toast.success(`${count} registros deletados com sucesso!`);
      
      // Invalidar cache para atualizar o semáforo
      await queryClient.invalidateQueries({ 
        queryKey: ["inventory-status", lote04Id, br367Id] 
      });
      await queryClient.invalidateQueries({ 
        queryKey: ["inventory-status", lote04Id, br116Id] 
      });
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error('Erro ao deletar registros: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Deletar Inventário - BR-367 e BR-116 (Lote 04)
        </CardTitle>
        <CardDescription>
          Esta ação irá deletar TODOS os registros de placas da BR-367 e BR-116 do Lote 04
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleDelete}
          disabled={deleting}
          variant="destructive"
          size="lg"
        >
          {deleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deletando...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Deletar Todos os Registros
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}