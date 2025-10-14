import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function MeusElementosPendentes() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: elementos, isLoading } = useQuery({
    queryKey: ["meus-elementos-pendentes", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("elementos_pendentes_aprovacao")
        .select(`
          *,
          rodovias:rodovia_id (nome),
          lotes:lote_id (numero)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      marcas_longitudinais: 'Marcas Longitudinais',
      placas: 'Placas',
      tachas: 'Tachas',
      inscricoes: 'Inscrições',
      cilindros: 'Cilindros',
      porticos: 'Pórticos',
      defensas: 'Defensas'
    };
    return labels[tipo] || tipo;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pendente_aprovacao: { variant: "secondary", label: "Pendente" },
      aprovado: { variant: "default", label: "Aprovado" },
      rejeitado: { variant: "destructive", label: "Rejeitado" }
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">Meus Elementos Pendentes</h1>
        <p className="text-muted-foreground">
          Acompanhe o status dos elementos não cadastrados que você registrou
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Elementos Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Carregando...</p>
            </div>
          ) : elementos && elementos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Registro</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Rodovia/Lote</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {elementos.map((elemento: any) => (
                  <TableRow key={elemento.id}>
                    <TableCell>
                      {new Date(elemento.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTipoLabel(elemento.tipo_elemento)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{elemento.rodovias?.nome}</p>
                        <p className="text-muted-foreground">Lote {elemento.lotes?.numero}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(elemento.status)}</TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        {elemento.observacao_coordenador ? (
                          <p className="text-sm text-muted-foreground">
                            {elemento.observacao_coordenador}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Aguardando análise
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Você ainda não registrou nenhum elemento não cadastrado
            </div>
          )}

          {elementos && elementos.length > 0 && (
            <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Pendente</Badge>
                <span>{elementos.filter((e: any) => e.status === 'pendente_aprovacao').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">Aprovado</Badge>
                <span>{elementos.filter((e: any) => e.status === 'aprovado').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Rejeitado</Badge>
                <span>{elementos.filter((e: any) => e.status === 'rejeitado').length}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
