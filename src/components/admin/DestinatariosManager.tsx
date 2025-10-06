import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus, Mail } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export const DestinatariosManager = () => {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<"coordenador" | "fiscal">("coordenador");

  const { data: destinatarios, isLoading } = useQuery({
    queryKey: ["destinatarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinatarios_email")
        .select("*")
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("destinatarios_email").insert({
        nome,
        email,
        tipo,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destinatarios"] });
      setNome("");
      setEmail("");
      setTipo("coordenador");
      toast.success("Destinatário adicionado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar destinatário");
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("destinatarios_email")
        .update({ ativo })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destinatarios"] });
      toast.success("Status atualizado!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("destinatarios_email")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destinatarios"] });
      toast.success("Destinatário removido!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover destinatário");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    addMutation.mutate();
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Adicionar Destinatário
          </CardTitle>
          <CardDescription>
            Adicione coordenadores e fiscais que receberão notificações por email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coordenador">Coordenador</SelectItem>
                    <SelectItem value="fiscal">Fiscal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={addMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Destinatário
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Destinatários Cadastrados</CardTitle>
          <CardDescription>
            {destinatarios?.length || 0} destinatário(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {destinatarios?.map((dest) => (
              <div
                key={dest.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{dest.nome}</div>
                  <div className="text-sm text-muted-foreground">
                    {dest.email}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {dest.tipo}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`ativo-${dest.id}`} className="text-sm">
                      {dest.ativo ? "Ativo" : "Inativo"}
                    </Label>
                    <Switch
                      id={`ativo-${dest.id}`}
                      checked={dest.ativo}
                      onCheckedChange={(checked) =>
                        toggleAtivoMutation.mutate({ id: dest.id, ativo: checked })
                      }
                    />
                  </div>

                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      if (confirm("Deseja remover este destinatário?")) {
                        deleteMutation.mutate(dest.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {(!destinatarios || destinatarios.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum destinatário cadastrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
