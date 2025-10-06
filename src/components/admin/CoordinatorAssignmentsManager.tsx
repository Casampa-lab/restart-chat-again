import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface Coordinator {
  id: string;
  nome: string;
}

interface Lote {
  id: string;
  numero: string;
  empresa_nome: string;
}

interface Assignment {
  id: string;
  user_id: string;
  lote_id: string;
  coordinator_nome: string;
  lote_numero: string;
}

export const CoordinatorAssignmentsManager = () => {
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoordinator, setSelectedCoordinator] = useState("");
  const [selectedLote, setSelectedLote] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load coordinators
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, profiles!inner(id, nome)")
        .eq("role", "coordenador");

      if (rolesError) throw rolesError;

      const coordinatorsData = rolesData.map((item: any) => ({
        id: item.user_id,
        nome: item.profiles.nome,
      }));
      setCoordinators(coordinatorsData);

      // Load lotes with company names
      const { data: lotesData, error: lotesError } = await supabase
        .from("lotes")
        .select("id, numero, empresas!inner(nome)")
        .order("numero");

      if (lotesError) throw lotesError;

      const lotesFormatted = lotesData.map((item: any) => ({
        id: item.id,
        numero: item.numero,
        empresa_nome: item.empresas.nome,
      }));
      setLotes(lotesFormatted);

      // Load assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("coordinator_assignments")
        .select(`
          id,
          user_id,
          lote_id,
          profiles!inner(nome),
          lotes!inner(numero)
        `)
        .order("created_at", { ascending: false });

      if (assignmentsError) throw assignmentsError;

      const assignmentsFormatted = assignmentsData.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        lote_id: item.lote_id,
        coordinator_nome: item.profiles.nome,
        lote_numero: item.lotes.numero,
      }));
      setAssignments(assignmentsFormatted);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error(error.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCoordinator || !selectedLote) {
      toast.error("Selecione um coordenador e um lote");
      return;
    }

    try {
      const { error } = await supabase
        .from("coordinator_assignments")
        .insert({
          user_id: selectedCoordinator,
          lote_id: selectedLote,
        });

      if (error) throw error;

      toast.success("Atribuição criada com sucesso!");
      setSelectedCoordinator("");
      setSelectedLote("");
      loadData();
    } catch (error: any) {
      console.error("Erro ao criar atribuição:", error);
      toast.error(error.message || "Erro ao criar atribuição");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente remover esta atribuição?")) return;

    try {
      const { error } = await supabase
        .from("coordinator_assignments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Atribuição removida com sucesso!");
      loadData();
    } catch (error: any) {
      console.error("Erro ao remover atribuição:", error);
      toast.error(error.message || "Erro ao remover atribuição");
    }
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Atribuir Coordenador a Lote</CardTitle>
          <CardDescription>
            Defina quais lotes cada coordenador pode acessar (controle de acesso geográfico)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="coordinator">Coordenador</Label>
              <Select value={selectedCoordinator} onValueChange={setSelectedCoordinator}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um coordenador" />
                </SelectTrigger>
                <SelectContent>
                  {coordinators.map((coord) => (
                    <SelectItem key={coord.id} value={coord.id}>
                      {coord.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lote">Lote</Label>
              <Select value={selectedLote} onValueChange={setSelectedLote}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um lote" />
                </SelectTrigger>
                <SelectContent>
                  {lotes.map((lote) => (
                    <SelectItem key={lote.id} value={lote.id}>
                      Lote {lote.numero} - {lote.empresa_nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full">
              Criar Atribuição
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Atribuições Cadastradas</CardTitle>
          <CardDescription>
            Lista de coordenadores e seus lotes atribuídos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma atribuição cadastrada
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coordenador</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>{assignment.coordinator_nome}</TableCell>
                    <TableCell>Lote {assignment.lote_numero}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
