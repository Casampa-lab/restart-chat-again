import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, Pencil, X, Trash2, KeyRound, UserPlus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { deleteUser } from "@/lib/deleteUser";

interface Profile {
  id: string;
  nome: string;
  email: string | null;
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
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);

  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const [selectedSupervisora, setSelectedSupervisora] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("");
  const [newUserSupervisora, setNewUserSupervisora] = useState("");

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
          email,
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
    
    if (!selectedEmail || !selectedEmail.includes('@')) {
      toast.error("Digite um email válido");
      return;
    }

    setLoading(true);
    try {
      //
      // 1. Verificar limites por supervisora (5 técnicos, 1 coordenador)
      //
      if (selectedSupervisora) {
        // Buscar todos os profiles desta supervisora
        const { data: existingProfiles, error: existingProfilesError } = await supabase
          .from("profiles")
          .select("id, supervisora_id")
          .eq("supervisora_id", selectedSupervisora);

        if (existingProfilesError) {
          throw new Error("Falha ao validar limites de equipe: " + existingProfilesError.message);
        }

        if (existingProfiles && existingProfiles.length > 0) {
          // Buscar os roles de todos esses usuários
          const userIds = existingProfiles.map(p => p.id);
          const { data: existingRoles, error: existingRolesError } = await supabase
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", userIds);

          if (existingRolesError) {
            throw new Error("Falha ao validar perfis existentes: " + existingRolesError.message);
          }

          const currentRoleCounts = existingRoles?.reduce((acc: any, userRole: any) => {
            const role = userRole.role;
            if (role) {
              acc[role] = (acc[role] || 0) + 1;
            }
            return acc;
          }, {}) || {};

          const currentUserRole = editingProfile.user_roles?.[0]?.role;
          const isChangingSupervisora = editingProfile.supervisora_id !== selectedSupervisora;
          const isChangingRole = currentUserRole !== selectedRole;

          if (isChangingSupervisora || isChangingRole) {
            // se ele já tinha uma role nessa mesma supervisora, desconta da contagem
            if (!isChangingSupervisora && currentUserRole) {
              currentRoleCounts[currentUserRole] = Math.max(
                0,
                (currentRoleCounts[currentUserRole] || 0) - 1
              );
            }

            // Limite: até 5 técnicos por supervisora
            if (selectedRole === "tecnico" && (currentRoleCounts?.tecnico || 0) >= 5) {
              toast.error("Esta supervisora já atingiu o limite de 5 técnicos de campo");
              setLoading(false);
              return;
            }

            // Limite: exatamente 1 coordenador por supervisora
            if (selectedRole === "coordenador" && (currentRoleCounts?.coordenador || 0) >= 1) {
              toast.error("Esta supervisora já possui 1 coordenador. Apenas 1 coordenador é permitido por supervisora");
              setLoading(false);
              return;
            }
          }
        }
      }

      //
      // 2. Atualizar supervisora e email diretamente no profiles
      //
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          supervisora_id: selectedSupervisora || null,
          email: selectedEmail
        })
        .eq("id", editingProfile.id);

      if (profileError) {
        throw new Error("Falha ao atualizar dados do usuário: " + profileError.message);
      }

      //
      // 3. Atualizar role do usuário (tabela user_roles)
      //
      const currentUserRole = editingProfile.user_roles?.[0]?.role;
      if (currentUserRole !== selectedRole) {
        // Remove role anterior
        const { error: deleteRoleError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", editingProfile.id);

        if (deleteRoleError) {
          throw new Error("Falha ao remover perfil antigo: " + deleteRoleError.message);
        }

        // Insere a role nova
        const { error: insertRoleError } = await supabase
          .from("user_roles")
          .insert([{ user_id: editingProfile.id, role: selectedRole as any }]);

        if (insertRoleError) {
          throw new Error("Falha ao definir novo perfil: " + insertRoleError.message);
        }
      }

      //
      // 4. Se for coordenador e tiver supervisora, sincronizar assignments com os lotes
      //
      if (selectedRole === 'coordenador' && selectedSupervisora) {
        const { data: lotesData, error: lotesError } = await supabase
          .from('lotes')
          .select('id')
          .eq('supervisora_id', selectedSupervisora);

        if (!lotesError && lotesData && lotesData.length > 0) {
          // Limpar assignments antigos
          await supabase
            .from('coordinator_assignments')
            .delete()
            .eq('user_id', editingProfile.id);

          // Criar os novos assignments
          const assignments = lotesData.map(lote => ({
            user_id: editingProfile.id,
            lote_id: lote.id
          }));

          const { error: assignError } = await supabase
            .from('coordinator_assignments')
            .insert(assignments);

          if (assignError) {
            console.warn("Falha ao atualizar assignments do coordenador:", assignError.message);
          }
        }
      }

      //
      // 5. Feedback, fechar diálogo e recarregar lista
      //
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
    setSelectedEmail(profile.email || "");
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

  const handleDelete = async (profileId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja DELETAR PERMANENTEMENTE o usuário ${userName}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setLoading(true);
    try {
      await deleteUser(profileId);
      toast.success("Usuário deletado com sucesso!");
      await loadProfiles();
    } catch (error: any) {
      toast.error("Erro ao deletar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = (profile: Profile) => {
    setEditingProfile(profile);
    setNewPassword("");
    setIsResetPasswordOpen(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!editingProfile || !newPassword) return;

    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: editingProfile.id, newPassword }
      });

      if (error) throw error;

      toast.success("Senha alterada com sucesso!");
      setIsResetPasswordOpen(false);
      setEditingProfile(null);
      setNewPassword("");
    } catch (error: any) {
      toast.error("Erro ao resetar senha: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProfile(null);
    setSelectedSupervisora("");
    setSelectedRole("");
    setSelectedEmail("");
  };

  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword || !newUserRole) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (newUserPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          nome: newUserName,
          role: newUserRole,
          supervisoraId: newUserSupervisora || null
        }
      });

      if (error) throw error;

      toast.success("Usuário criado com sucesso!");
      setIsAddUserOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("");
      setNewUserSupervisora("");
      await loadProfiles();
    } catch (error: any) {
      toast.error("Erro ao criar usuário: " + error.message);
    } finally {
      setLoading(false);
    }
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
          <Button onClick={() => setIsAddUserOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar Usuário
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Supervisora</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell className="font-medium">{profile.nome}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">
                  {profile.email || "—"}
                </TableCell>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResetPassword(profile)}
                      title="Resetar senha"
                      className="text-warning hover:text-warning"
                    >
                      <KeyRound className="h-4 w-4" />
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
                      title="Deletar usuário permanentemente"
                      className="text-destructive hover:text-destructive"
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
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={selectedEmail}
                    onChange={(e) => setSelectedEmail(e.target.value)}
                    placeholder="Digite o email"
                  />
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
              <Button onClick={handleSalvar} disabled={loading || !selectedRole || !selectedEmail}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resetar Senha</DialogTitle>
              <DialogDescription>
                Digite a nova senha para {editingProfile?.nome}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  A senha deve ter pelo menos 6 caracteres
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmResetPassword} disabled={loading || !newPassword || newPassword.length < 6}>
                {loading ? "Resetando..." : "Resetar Senha"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Usuário</DialogTitle>
              <DialogDescription>
                Crie um novo usuário no sistema
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newUserName">Nome *</Label>
                <Input
                  id="newUserName"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Digite o nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newUserEmail">Email *</Label>
                <Input
                  id="newUserEmail"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="Digite o email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newUserPassword">Senha *</Label>
                <Input
                  id="newUserPassword"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  A senha deve ter pelo menos 6 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newUserRole">Perfil *</Label>
                <Select
                  value={newUserRole}
                  onValueChange={setNewUserRole}
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
                <Label htmlFor="newUserSupervisora">Supervisora</Label>
                <Select
                  value={newUserSupervisora}
                  onValueChange={setNewUserSupervisora}
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

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddUser} 
                disabled={loading || !newUserName || !newUserEmail || !newUserPassword || !newUserRole}
              >
                {loading ? "Criando..." : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  );
};
