import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Edit, Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
}

interface Plano {
  id: string;
  tier: string;
  nome: string;
  preco_mensal: number;
}

interface Modulo {
  id: string;
  codigo: string;
  nome: string;
  icone: string;
}

type SubscriptionStatus = "ativa" | "suspensa" | "cancelada" | "trial";

interface Assinatura {
  id: string;
  empresa_id: string;
  plano_id: string;
  status: SubscriptionStatus;
  data_inicio: string;
  empresas: Empresa;
  planos: Plano;
}

interface AssinaturaModulo {
  modulo_id: string;
  ativo: boolean;
}

export const AssinaturasManager = () => {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [selectedEmpresa, setSelectedEmpresa] = useState("");
  const [selectedPlano, setSelectedPlano] = useState("");
  const [selectedModulos, setSelectedModulos] = useState<string[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus>("trial");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assinaturasRes, empresasRes, planosRes, modulosRes] = await Promise.all([
        supabase.from("assinaturas").select("*, empresas(id, nome, cnpj), planos(id, tier, nome, preco_mensal)").order("created_at", { ascending: false }),
        supabase.from("empresas").select("*").order("nome"),
        supabase.from("planos").select("*").eq("ativo", true).order("preco_mensal"),
        supabase.from("modulos").select("*").eq("ativo", true).order("ordem")
      ]);

      if (assinaturasRes.data) setAssinaturas(assinaturasRes.data);
      if (empresasRes.data) setEmpresas(empresasRes.data);
      if (planosRes.data) setPlanos(planosRes.data);
      if (modulosRes.data) setModulos(modulosRes.data);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = async (assinatura?: Assinatura) => {
    if (assinatura) {
      setEditingId(assinatura.id);
      setSelectedEmpresa(assinatura.empresa_id);
      setSelectedPlano(assinatura.plano_id);
      setStatus(assinatura.status);
      
      // Carregar módulos ativos
      const { data } = await supabase
        .from("assinatura_modulos")
        .select("modulo_id")
        .eq("assinatura_id", assinatura.id)
        .eq("ativo", true);
      
      setSelectedModulos(data?.map(m => m.modulo_id) || []);
    } else {
      setEditingId(null);
      setSelectedEmpresa("");
      setSelectedPlano("");
      setSelectedModulos([]);
      setStatus("trial");
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedEmpresa || !selectedPlano) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      let assinaturaId = editingId;

      if (editingId) {
        // Atualizar
        const { error } = await supabase
          .from("assinaturas")
          .update({ plano_id: selectedPlano, status: status as SubscriptionStatus })
          .eq("id", editingId);

        if (error) throw error;
      } else {
        // Criar nova
        const { data, error } = await supabase
          .from("assinaturas")
          .insert([{ empresa_id: selectedEmpresa, plano_id: selectedPlano, status: status as SubscriptionStatus }])
          .select()
          .single();

        if (error) throw error;
        assinaturaId = data.id;
      }

      // Atualizar módulos
      if (assinaturaId) {
        // Remover todos os módulos antigos
        await supabase.from("assinatura_modulos").delete().eq("assinatura_id", assinaturaId);

        // Adicionar novos módulos selecionados
        if (selectedModulos.length > 0) {
          const modulosData = selectedModulos.map(modulo_id => ({
            assinatura_id: assinaturaId,
            modulo_id,
            ativo: true
          }));

          const { error: modulosError } = await supabase
            .from("assinatura_modulos")
            .insert(modulosData);

          if (modulosError) throw modulosError;
        }
      }

      toast.success(editingId ? "Assinatura atualizada!" : "Assinatura criada!");
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  const toggleModulo = (moduloId: string) => {
    setSelectedModulos(prev => 
      prev.includes(moduloId) 
        ? prev.filter(id => id !== moduloId)
        : [...prev, moduloId]
    );
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    const variants: Record<SubscriptionStatus, { variant: "default" | "secondary" | "destructive", label: string }> = {
      ativa: { variant: "default", label: "Ativa" },
      trial: { variant: "secondary", label: "Trial" },
      suspensa: { variant: "destructive", label: "Suspensa" },
      cancelada: { variant: "destructive", label: "Cancelada" }
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Assinaturas</h2>
          <p className="text-muted-foreground">Gerencie planos e módulos das empresas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Assinatura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Nova"} Assinatura</DialogTitle>
              <DialogDescription>Configure o plano e módulos da empresa</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa} disabled={!!editingId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map(empresa => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nome} - {empresa.cnpj}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={selectedPlano} onValueChange={setSelectedPlano}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map(plano => (
                      <SelectItem key={plano.id} value={plano.id}>
                        {plano.nome} - R$ {plano.preco_mensal.toFixed(2)}/mês
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as SubscriptionStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="suspensa">Suspensa</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Módulos Ativos</Label>
                <div className="grid grid-cols-1 gap-3">
                  {modulos.map(modulo => (
                    <div key={modulo.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                      <Checkbox 
                        id={modulo.id}
                        checked={selectedModulos.includes(modulo.id)}
                        onCheckedChange={() => toggleModulo(modulo.id)}
                      />
                      <label htmlFor={modulo.id} className="flex-1 cursor-pointer">
                        <p className="font-medium">{modulo.nome}</p>
                        <p className="text-sm text-muted-foreground">{modulo.codigo}</p>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {assinaturas.map(assinatura => (
          <Card key={assinatura.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{assinatura.empresas.nome}</CardTitle>
                  <CardDescription>CNPJ: {assinatura.empresas.cnpj}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(assinatura.status)}
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(assinatura)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-semibold">{assinatura.planos.nome}</p>
                    <p className="text-sm text-muted-foreground">Plano {assinatura.planos.tier}</p>
                  </div>
                  <p className="text-lg font-bold text-primary">R$ {assinatura.planos.preco_mensal.toFixed(2)}/mês</p>
                </div>
                <AssinaturaModulos assinaturaId={assinatura.id} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const AssinaturaModulos = ({ assinaturaId }: { assinaturaId: string }) => {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModulos();
  }, [assinaturaId]);

  const loadModulos = async () => {
    try {
      const { data } = await supabase
        .from("assinatura_modulos")
        .select("modulos(id, codigo, nome, icone)")
        .eq("assinatura_id", assinaturaId)
        .eq("ativo", true);

      if (data) {
        setModulos(data.map(item => item.modulos).filter(Boolean) as Modulo[]);
      }
    } catch (error: any) {
      console.error("Erro ao carregar módulos:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {modulos.length > 0 ? (
        modulos.map(modulo => (
          <Badge key={modulo.id} variant="secondary" className="px-3 py-1">
            <Check className="mr-1 h-3 w-3" />
            {modulo.nome}
          </Badge>
        ))
      ) : (
        <p className="text-sm text-muted-foreground italic">Nenhum módulo ativo</p>
      )}
    </div>
  );
};
