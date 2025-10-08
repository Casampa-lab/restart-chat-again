import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Users, Pencil, X, Trash2 } from "lucide-react";

interface Profile {
  id: string;
  nome: string;
  supervisora_id: string | null;
  supervisoras?: {
    nome_empresa: string;
  };
  user_roles?: Array<{ role: string }>;
  users?: {
    email: string;
  };
}

interface Supervisora {
  id: string;
  nome_empresa: string;
}

export const UsuariosManager = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [supervisoras, setSupervisoras] = useState<Supervisora[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [selectedSupervisora, setSelectedSupervisora] = useState("");

  useEffect(() => {
    loadSupervisoras();
    loadProfiles();
  }, []);

  const loadSupervisoras = async () => {
    try {
      const { data, error } = await supabase
        .from("supervisoras")
        .select("id, nome_empresa")
        .order("nome_empresa");

      if (error) throw error;
      setSupervisoras(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar supervisoras: " + error.message);
    }
  };

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          nome,
          supervisora_id,
          supervisoras(nome_empresa)
        `)
        .order("nome");

      if (error) throw error;
      
      // Buscar emails e roles dos usuários
      const profilesWithDetails = await Promise.all(
        (data || []).map(async (profile) => {
          // Buscar email
          const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
          
          // Buscar role
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id)
            .maybeSingle();
          
          return {
            ...profile,
            users: userData?.user ? { email: userData.user.email || "" } : undefined,
            user_roles: roleData ? [{ role: roleData.role }] : undefined,
          };
        })
      );
      
      setProfiles(profilesWithDetails);
    } catch (error: any) {
      toast.error("Erro ao carregar usuários: " + error.message);
      console.error("Erro detalhado:", error);
    }
  };

  const handleVincular = async () => {
    if (!editingProfile || !selectedSupervisora) {
      toast.error("Selecione uma supervisora");
      return;
    }

    setLoading(true);
    try {
      console.log("Vinculando usuário:", editingProfile.id, "à supervisora:", selectedSupervisora);
      
      const { error } = await supabase
        .from("profiles")
        .update({ supervisora_id: selectedSupervisora })
        .eq("id", editingProfile.id);

      if (error) {
        console.error("Erro ao vincular:", error);
        throw error;
      }

      console.log("Vinculação bem-sucedida, recarregando profiles...");
      toast.success("Usuário vinculado com sucesso!");
      handleCloseDialog();
      await loadProfiles();
    } catch (error: any) {
      toast.error("Erro ao vincular: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setSelectedSupervisora(profile.supervisora_id || "");
    setIsDialogOpen(true);
  };

  const handleDesvincular = async (profileId: string) => {
    if (!confirm("Tem certeza que deseja desvincular este usuário da supervisora?")) {
      return;
    }

    setLoading(true);
    try {
      console.log("Desvinculando usuário:", profileId);
      
      const { error } = await supabase
        .from("profiles")
        .update({ supervisora_id: null })
        .eq("id", profileId);

      if (error) {
        console.error("Erro ao desvincular:", error);
        throw error;
      }

      console.log("Desvinculação bem-sucedida, recarregando profiles...");
      toast.success("Usuário desvinculado com sucesso!");
      await loadProfiles();
    } catch (error: any) {
      toast.error("Erro ao desvincular: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (profileId: string, profileName: string) => {
    if (!confirm(`Tem certeza que deseja DELETAR o usuário "${profileName}"? Esta ação não pode ser desfeita!`)) {
      return;
    }

    setLoading(true);
    try {
      console.log("Deletando usuário:", profileId);
      
      const { error } = await supabase.auth.admin.deleteUser(profileId);

      if (error) {
        console.error("Erro ao deletar:", error);
        throw error;
      }

      console.log("Usuário deletado com sucesso, recarregando profiles...");
      toast.success("Usuário deletado com sucesso!");
      await loadProfiles();
    } catch (error: any) {
      toast.error("Erro ao deletar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProfile(null);
    setSelectedSupervisora("");
  };

  const getRoleName = (profile: Profile) => {
    const role = profile.user_roles?.[0]?.role;
    if (!role) return "Sem perfil";
    
    const roleNames: Record<string, string> = {
      admin: "Administrador",
      coordenador: "Coordenador",
      tecnico: "Técnico",
    };
    
    return roleNames[role] || role;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários do Sistema
            </CardTitle>
            <CardDescription>
              Vincule usuários às supervisoras para controle de acesso
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Supervisora</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell className="font-medium">{profile.nome}</TableCell>
                <TableCell>{profile.users?.email || "—"}</TableCell>
                <TableCell>{getRoleName(profile)}</TableCell>
                <TableCell>
                  {profile.supervisoras?.nome_empresa || (
                    <span className="text-destructive">Não vinculado</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(profile)}
                      title="Vincular/Editar supervisora"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {profile.supervisora_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDesvincular(profile.id)}
                        title="Desvincular supervisora"
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(profile.id, profile.nome)}
                      title="Deletar usuário"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {profiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vincular Usuário à Supervisora</DialogTitle>
              <DialogDescription>
                Selecione a supervisora que este usuário pertence
              </DialogDescription>
            </DialogHeader>
            
            {editingProfile && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <div className="text-sm font-medium">{editingProfile.nome}</div>
                  <div className="text-sm text-muted-foreground">
                    {editingProfile.users?.email}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supervisora">Supervisora *</Label>
                  <Select
                    value={selectedSupervisora}
                    onValueChange={setSelectedSupervisora}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a supervisora" />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisoras.map((sup) => (
                        <SelectItem key={sup.id} value={sup.id}>
                          {sup.nome_empresa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button onClick={handleVincular} disabled={loading}>
                {loading ? "Vinculando..." : "Vincular"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};