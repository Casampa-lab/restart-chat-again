import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Pencil, X } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Profile {
  id: string;
  nome: string;
  supervisora_id: string | null;
  supervisoras?: {
    nome_empresa: string;
  };
  user_roles?: Array<{ role: string }>;
}

interface Supervisora {
  id: string;
  nome_empresa: string;
}

const roles = [
  { value: "tecnico", label: "Técnico de Campo" },
  { value: "coordenador", label: "Coordenador" },
  { value: "admin", label: "Administrador" },
];

export const UsuariosManager = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [supervisoras, setSupervisoras] = useState<Supervisora[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [selectedSupervisora, setSelectedSupervisora] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

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
      
      // Buscar roles separadamente para cada profile
      const profilesWithRoles = await Promise.all(
        (data || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id)
            .limit(1);
          
          return {
            ...profile,
            user_roles: roleData || []
          };
        })
      );
      
      setProfiles(profilesWithRoles);
    } catch (error: any) {
      toast.error("Erro ao carregar usuários: " + error.message);
    }
  };

  const handleSalvar = async () => {
    if (!editingProfile) return;
    if (!selectedRole) {
      toast.error("Selecione um perfil");
      return;
    }

    setLoading(true);
    try {
      // Verificar limites por supervisora
      if (selectedSupervisora) {
        const { data: existingUsers } = await supabase
          .from("profiles")
          .select(`
            id,
            user_roles!inner(role)
          `)
          .eq("supervisora_id", selectedSupervisora);

        const currentRoleCounts = existingUsers?.reduce((acc: any, user: any) => {
          const userRole = user.user_roles?.[0]?.role;
          if (userRole) {
            acc[userRole] = (acc[userRole] || 0) + 1;
          }
          return acc;
        }, {});

        // Verificar se está mudando a supervisora ou o role
        const isChangingSupervisora = editingProfile.supervisora_id !== selectedSupervisora;
        const currentUserRole = editingProfile.user_roles?.[0]?.role;
        const isChangingRole = currentUserRole !== selectedRole;

        // Se estiver adicionando um novo usuário nessa supervisora OU mudando o role
        if (isChangingSupervisora || isChangingRole) {
          // Ajustar contagem: remover o role antigo se existir na mesma supervisora
          if (!isChangingSupervisora && currentUserRole) {
            currentRoleCounts[currentUserRole] = Math.max(0, (currentRoleCounts[currentUserRole] || 0) - 1);
          }

          // Limites: 5 técnicos, 1 coordenador
          if (selectedRole === "tecnico" && (currentRoleCounts?.tecnico || 0) >= 5) {
            toast.error("Esta supervisora já atingiu o limite de 5 técnicos de campo");
            setLoading(false);
            return;
          }

          if (selectedRole === "coordenador" && (currentRoleCounts?.coordenador || 0) >= 1) {
            toast.error("Esta supervisora já possui 1 coordenador. Apenas 1 coordenador é permitido por supervisora");
            setLoading(false);
            return;
          }
        }
      }

      // Atualizar supervisora
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ supervisora_id: selectedSupervisora || null })
        .eq("id", editingProfile.id);

      if (profileError) throw profileError;

      // Remover role existente
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", editingProfile.id);

      // Inserir novo role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert([{ user_id: editingProfile.id, role: selectedRole as any }]);

      if (roleError) throw roleError;

      toast.success("Usuário atualizado com sucesso!");
      handleCloseDialog();
      await loadProfiles();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setSelectedSupervisora(profile.supervisora_id || "");
    setSelectedRole(profile.user_roles?.[0]?.role || "");
    setIsDialogOpen(true);
  };

  const handleDesvincular = async (profileId: string) => {
    if (!confirm("Tem certeza que deseja desvincular este usuário da supervisora?")) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ supervisora_id: null })
        .eq("id", profileId);

      if (error) throw error;

      toast.success("Usuário desvinculado com sucesso!");
      await loadProfiles();
    } catch (error: any) {
      toast.error("Erro ao desvincular: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProfile(null);
    setSelectedSupervisora("");
    setSelectedRole("");
  };

  const getRoleName = (profile: Profile) => {
    const role = profile.user_roles?.[0]?.role;
    if (!role) return "Sem perfil";
    
    const roleNames: Record<string, string> = {
      admin: "Administrador",
      coordenador: "Coordenador",
      tecnico: "Técnico de Campo",
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
              Gerencie perfis e vincule usuários às supervisoras
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Supervisora</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell className="font-medium">{profile.nome}</TableCell>
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
                      title="Editar perfil e supervisora"
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
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {profiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Configure o perfil e supervisora do usuário
              </DialogDescription>
            </DialogHeader>
            
            {editingProfile && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <div className="text-sm font-medium">{editingProfile.nome}</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Perfil *</Label>
                  <Select
                    value={selectedRole}
                    onValueChange={setSelectedRole}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supervisora">Supervisora</Label>
                  <Select
                    value={selectedSupervisora}
                    onValueChange={setSelectedSupervisora}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a supervisora (opcional)" />
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
              <Button onClick={handleSalvar} disabled={loading || !selectedRole}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};