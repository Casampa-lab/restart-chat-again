import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, MapPin, Pencil, Navigation } from "lucide-react";
interface Empresa {
  id: string;
  nome: string;
}
interface Rodovia {
  id: string;
  codigo: string;
}
interface RodoviaComKm {
  rodovia_id: string;
  codigo: string;
  km_inicial: string;
  km_final: string;
  latitude_inicial: string;
  longitude_inicial: string;
  latitude_final: string;
  longitude_final: string;
}
interface Lote {
  id: string;
  numero: string;
  contrato: string;
  responsavel_executora?: string;
  email_executora?: string;
  nome_fiscal_execucao?: string;
  email_fiscal_execucao?: string;
  empresas: {
    nome: string;
  };
}
interface LoteComRodovias extends Lote {
  lotes_rodovias: Array<{
    rodovias: {
      codigo: string;
    };
    km_inicial: number | null;
    km_final: number | null;
  }>;
}
const LotesManager = () => {
  const [lotes, setLotes] = useState<LoteComRodovias[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [rodovias, setRodovias] = useState<Rodovia[]>([]);
  const [rodoviasVinculadas, setRodoviasVinculadas] = useState<RodoviaComKm[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingLote, setEditingLote] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    numero: "",
    empresa_id: "",
    contrato: "",
    responsavel_executora: "",
    email_executora: "",
    nome_fiscal_execucao: "",
    email_fiscal_execucao: ""
  });
  const [novaRodovia, setNovaRodovia] = useState({
    rodovia_id: "",
    km_inicial: "",
    km_final: "",
    latitude_inicial: "",
    longitude_inicial: "",
    latitude_final: "",
    longitude_final: ""
  });
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    try {
      const [lotesRes, empresasRes, rodoviasRes] = await Promise.all([supabase.from("lotes").select(`
            *,
            empresas(nome),
            lotes_rodovias(
              rodovias(codigo),
              km_inicial,
              km_final
            )
          `).order("numero"), supabase.from("empresas").select("id, nome").order("nome"), supabase.from("rodovias").select("id, codigo").order("codigo")]);
      if (lotesRes.error) throw lotesRes.error;
      if (empresasRes.error) throw empresasRes.error;
      if (rodoviasRes.error) throw rodoviasRes.error;
      setLotes(lotesRes.data || []);
      setEmpresas(empresasRes.data || []);
      setRodovias(rodoviasRes.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    }
  };
  const adicionarRodovia = () => {
    if (!novaRodovia.rodovia_id) {
      toast.error("Selecione uma rodovia");
      return;
    }
    const rodoviaExistente = rodoviasVinculadas.find(r => r.rodovia_id === novaRodovia.rodovia_id);
    if (rodoviaExistente) {
      toast.error("Esta rodovia já foi adicionada");
      return;
    }
    const rodovia = rodovias.find(r => r.id === novaRodovia.rodovia_id);
    if (!rodovia) return;
    setRodoviasVinculadas([...rodoviasVinculadas, {
      rodovia_id: novaRodovia.rodovia_id,
      codigo: rodovia.codigo,
      km_inicial: novaRodovia.km_inicial,
      km_final: novaRodovia.km_final,
      latitude_inicial: novaRodovia.latitude_inicial,
      longitude_inicial: novaRodovia.longitude_inicial,
      latitude_final: novaRodovia.latitude_final,
      longitude_final: novaRodovia.longitude_final
    }]);
    setNovaRodovia({
      rodovia_id: "",
      km_inicial: "",
      km_final: "",
      latitude_inicial: "",
      longitude_inicial: "",
      latitude_final: "",
      longitude_final: ""
    });
  };
  const removerRodovia = (rodoviaId: string) => {
    setRodoviasVinculadas(rodoviasVinculadas.filter(r => r.rodovia_id !== rodoviaId));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rodoviasVinculadas.length === 0) {
      toast.error("Adicione pelo menos uma rodovia ao lote");
      return;
    }
    setLoading(true);
    try {
      // Inserir lote
      const {
        data: lote,
        error: loteError
      } = await supabase.from("lotes").insert({
        numero: formData.numero,
        empresa_id: formData.empresa_id,
        contrato: formData.contrato || null,
        responsavel_executora: formData.responsavel_executora || null,
        email_executora: formData.email_executora || null,
        nome_fiscal_execucao: formData.nome_fiscal_execucao || null,
        email_fiscal_execucao: formData.email_fiscal_execucao || null
      }).select().single();
      if (loteError) throw loteError;

      // Vincular rodovias com KMs
      const lotesRodovias = rodoviasVinculadas.map(rodovia => ({
        lote_id: lote.id,
        rodovia_id: rodovia.rodovia_id,
        km_inicial: rodovia.km_inicial ? parseFloat(rodovia.km_inicial) : null,
        km_final: rodovia.km_final ? parseFloat(rodovia.km_final) : null,
        latitude_inicial: rodovia.latitude_inicial ? parseFloat(rodovia.latitude_inicial) : null,
        longitude_inicial: rodovia.longitude_inicial ? parseFloat(rodovia.longitude_inicial) : null,
        latitude_final: rodovia.latitude_final ? parseFloat(rodovia.latitude_final) : null,
        longitude_final: rodovia.longitude_final ? parseFloat(rodovia.longitude_final) : null
      }));
      const {
        error: vinculoError
      } = await supabase.from("lotes_rodovias").insert(lotesRodovias);
      if (vinculoError) throw vinculoError;
      toast.success("Lote cadastrado com sucesso!");
      setFormData({
        numero: "",
        empresa_id: "",
        contrato: "",
        responsavel_executora: "",
        email_executora: "",
        nome_fiscal_execucao: "",
        email_fiscal_execucao: ""
      });
      setRodoviasVinculadas([]);
      loadData();
    } catch (error: any) {
      toast.error("Erro ao cadastrar lote: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  const handleEdit = async (lote: any) => {
    setEditingLote(lote.id);
    setFormData({
      numero: lote.numero,
      empresa_id: lote.empresa_id || "",
      contrato: lote.contrato || "",
      responsavel_executora: lote.responsavel_executora || "",
      email_executora: lote.email_executora || "",
      nome_fiscal_execucao: lote.nome_fiscal_execucao || "",
      email_fiscal_execucao: lote.email_fiscal_execucao || ""
    });

    // Carregar rodovias vinculadas ao lote
    const {
      data: lotesRodoviasData,
      error
    } = await supabase.from("lotes_rodovias").select("rodovia_id, km_inicial, km_final, latitude_inicial, longitude_inicial, latitude_final, longitude_final, rodovias(id, codigo)").eq("lote_id", lote.id);
    if (error) {
      toast.error("Erro ao carregar rodovias: " + error.message);
      return;
    }
    const rodoviasFormatted = lotesRodoviasData.map((lr: any) => ({
      rodovia_id: lr.rodovia_id,
      codigo: lr.rodovias.codigo,
      km_inicial: lr.km_inicial?.toString() || "",
      km_final: lr.km_final?.toString() || "",
      latitude_inicial: lr.latitude_inicial?.toString() || "",
      longitude_inicial: lr.longitude_inicial?.toString() || "",
      latitude_final: lr.latitude_final?.toString() || "",
      longitude_final: lr.longitude_final?.toString() || ""
    }));
    setRodoviasVinculadas(rodoviasFormatted);
  };
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLote) return;
    if (rodoviasVinculadas.length === 0) {
      toast.error("Adicione pelo menos uma rodovia ao lote");
      return;
    }
    setLoading(true);
    try {
      // Atualizar lote
      const {
        error: loteError
      } = await supabase.from("lotes").update({
        numero: formData.numero,
        empresa_id: formData.empresa_id,
        contrato: formData.contrato || null,
        responsavel_executora: formData.responsavel_executora || null,
        email_executora: formData.email_executora || null,
        nome_fiscal_execucao: formData.nome_fiscal_execucao || null,
        email_fiscal_execucao: formData.email_fiscal_execucao || null
      }).eq("id", editingLote);
      if (loteError) throw loteError;

      // Remover rodovias antigas
      const {
        error: deleteError
      } = await supabase.from("lotes_rodovias").delete().eq("lote_id", editingLote);
      if (deleteError) throw deleteError;

      // Inserir novas rodovias
      const lotesRodovias = rodoviasVinculadas.map(rodovia => ({
        lote_id: editingLote,
        rodovia_id: rodovia.rodovia_id,
        km_inicial: rodovia.km_inicial ? parseFloat(rodovia.km_inicial) : null,
        km_final: rodovia.km_final ? parseFloat(rodovia.km_final) : null,
        latitude_inicial: rodovia.latitude_inicial ? parseFloat(rodovia.latitude_inicial) : null,
        longitude_inicial: rodovia.longitude_inicial ? parseFloat(rodovia.longitude_inicial) : null,
        latitude_final: rodovia.latitude_final ? parseFloat(rodovia.latitude_final) : null,
        longitude_final: rodovia.longitude_final ? parseFloat(rodovia.longitude_final) : null
      }));
      const {
        error: vinculoError
      } = await supabase.from("lotes_rodovias").insert(lotesRodovias);
      if (vinculoError) throw vinculoError;
      toast.success("Lote atualizado com sucesso!");
      setEditingLote(null);
      setFormData({
        numero: "",
        empresa_id: "",
        contrato: "",
        responsavel_executora: "",
        email_executora: "",
        nome_fiscal_execucao: "",
        email_fiscal_execucao: ""
      });
      setRodoviasVinculadas([]);
      loadData();
    } catch (error: any) {
      toast.error("Erro ao atualizar lote: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lote?")) return;
    try {
      const {
        error
      } = await supabase.from("lotes").delete().eq("id", id);
      if (error) throw error;
      toast.success("Lote excluído!");
      loadData();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };
  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cadastrar Novo Lote</CardTitle>
          <CardDescription>
            Configure o lote com empresa e rodovias com seus KMs específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados básicos do lote */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero">Número do Lote *</Label>
                <Input id="numero" value={formData.numero} onChange={e => setFormData({
                ...formData,
                numero: e.target.value
              })} placeholder="Ex: 01" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa *</Label>
                <Select value={formData.empresa_id} onValueChange={value => setFormData({
                ...formData,
                empresa_id: value
              })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map(empresa => <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nome}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contrato">Número do Contrato</Label>
                <Input id="contrato" value={formData.contrato} onChange={e => setFormData({
                ...formData,
                contrato: e.target.value
              })} placeholder="Ex: 123/2024" />
              </div>
            </div>

            {/* Informações de Contatos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="responsavel_executora">Nome do Responsável da Executora</Label>
                <Input id="responsavel_executora" value={formData.responsavel_executora} onChange={e => setFormData({
                ...formData,
                responsavel_executora: e.target.value
              })} placeholder="Nome do responsável" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_executora">E-mail da Executora</Label>
                <Input id="email_executora" type="email" value={formData.email_executora} onChange={e => setFormData({
                ...formData,
                email_executora: e.target.value
              })} placeholder="email@executora.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome_fiscal_execucao">Nome do Fiscal de Execução (UL)</Label>
                <Input id="nome_fiscal_execucao" value={formData.nome_fiscal_execucao} onChange={e => setFormData({
                ...formData,
                nome_fiscal_execucao: e.target.value
              })} placeholder="Nome do fiscal" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_fiscal_execucao">E-mail do Fiscal de Execução</Label>
                <Input id="email_fiscal_execucao" type="email" value={formData.email_fiscal_execucao} onChange={e => setFormData({
                ...formData,
                email_fiscal_execucao: e.target.value
              })} placeholder="email@fiscal.com" />
              </div>
            </div>

            {/* Adicionar rodovias */}
            <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
              <Label className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Rodovias do Lote
              </Label>

              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="rodovia">Rodovia</Label>
                    <Select value={novaRodovia.rodovia_id} onValueChange={value => setNovaRodovia({
                    ...novaRodovia,
                    rodovia_id: value
                  })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {rodovias.filter(r => !rodoviasVinculadas.find(rv => rv.rodovia_id === r.id)).map(rodovia => <SelectItem key={rodovia.id} value={rodovia.id}>
                              {rodovia.codigo}
                            </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* KM Inicial e Coordenadas */}
                  <div className="space-y-3 p-3 border rounded-lg bg-background/50">
                    <Label className="text-sm font-semibold">KM Inicial</Label>
                    <div className="space-y-2">
                      <Input type="number" step="0.001" value={novaRodovia.km_inicial} onChange={e => setNovaRodovia({
                      ...novaRodovia,
                      km_inicial: e.target.value
                    })} placeholder="0.000" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" step="0.000001" value={novaRodovia.latitude_inicial} onChange={e => setNovaRodovia({
                        ...novaRodovia,
                        latitude_inicial: e.target.value
                      })} placeholder="Latitude" />
                        <Input type="number" step="0.000001" value={novaRodovia.longitude_inicial} onChange={e => setNovaRodovia({
                        ...novaRodovia,
                        longitude_inicial: e.target.value
                      })} placeholder="Longitude" />
                      </div>
                      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(position => {
                          setNovaRodovia({
                            ...novaRodovia,
                            latitude_inicial: position.coords.latitude.toString(),
                            longitude_inicial: position.coords.longitude.toString()
                          });
                          toast.success("Localização capturada!");
                        }, error => {
                          toast.error("Erro ao capturar localização: " + error.message);
                        });
                      } else {
                        toast.error("Geolocalização não suportada");
                      }
                    }}>
                        <Navigation className="mr-2 h-3 w-3" />
                        Capturar GPS
                      </Button>
                    </div>
                  </div>

                  {/* KM Final e Coordenadas */}
                  <div className="space-y-3 p-3 border rounded-lg bg-background/50">
                    <Label className="text-sm font-semibold">KM Final</Label>
                    <div className="space-y-2">
                      <Input type="number" step="0.001" value={novaRodovia.km_final} onChange={e => setNovaRodovia({
                      ...novaRodovia,
                      km_final: e.target.value
                    })} placeholder="200.000" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" step="0.000001" value={novaRodovia.latitude_final} onChange={e => setNovaRodovia({
                        ...novaRodovia,
                        latitude_final: e.target.value
                      })} placeholder="Latitude" />
                        <Input type="number" step="0.000001" value={novaRodovia.longitude_final} onChange={e => setNovaRodovia({
                        ...novaRodovia,
                        longitude_final: e.target.value
                      })} placeholder="Longitude" />
                      </div>
                      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(position => {
                          setNovaRodovia({
                            ...novaRodovia,
                            latitude_final: position.coords.latitude.toString(),
                            longitude_final: position.coords.longitude.toString()
                          });
                          toast.success("Localização capturada!");
                        }, error => {
                          toast.error("Erro ao capturar localização: " + error.message);
                        });
                      } else {
                        toast.error("Geolocalização não suportada");
                      }
                    }}>
                        <Navigation className="mr-2 h-3 w-3" />
                        Capturar GPS
                      </Button>
                    </div>
                  </div>
                </div>

                <Button type="button" onClick={adicionarRodovia} variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Rodovia ao Lote
                </Button>
              </div>

              {/* Lista de rodovias adicionadas */}
              {rodoviasVinculadas.length > 0 && <div className="space-y-2">
                  <Label className="text-sm">Rodovias Adicionadas:</Label>
                  <div className="space-y-2">
                    {rodoviasVinculadas.map(rodovia => <div key={rodovia.rodovia_id} className="flex items-center justify-between p-3 bg-background rounded border">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{rodovia.codigo}</Badge>
                          <span className="text-sm text-muted-foreground">
                            km {rodovia.km_inicial || "?"} - {rodovia.km_final || "?"}
                          </span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removerRodovia(rodovia.rodovia_id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>)}
                  </div>
                </div>}
            </div>

            <Button type="submit" disabled={loading} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Cadastrar Lote
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de lotes cadastrados */}
      <Card>
        <CardHeader>
          <CardTitle>Lotes Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Rodovias</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map(lote => <TableRow key={lote.id}>
                  <TableCell className="font-medium">{lote.numero}</TableCell>
                  <TableCell>{lote.empresas?.nome || "-"}</TableCell>
                  <TableCell>{lote.contrato || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {lote.lotes_rodovias.map((lr, idx) => <Badge key={idx} variant="secondary" className="text-xs">
                          {lr.rodovias?.codigo || "-"}
                          {(lr.km_inicial || lr.km_final) && <span className="ml-1 opacity-70">
                              ({lr.km_inicial?.toFixed(0)}-{lr.km_final?.toFixed(0)})
                            </span>}
                        </Badge>)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(lote)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(lote.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>)}
              {lotes.length === 0 && <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum lote cadastrado
                  </TableCell>
                </TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para editar lote */}
      <Dialog open={!!editingLote} onOpenChange={open => !open && setEditingLote(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Lote</DialogTitle>
            <DialogDescription>
              Atualize as informações do lote e suas rodovias
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6">
            {/* Dados básicos do lote */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-numero">Número do Lote *</Label>
                <Input id="edit-numero" value={formData.numero} onChange={e => setFormData({
                ...formData,
                numero: e.target.value
              })} placeholder="Ex: 01" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-contrato">Número do Contrato</Label>
                <Input id="edit-contrato" value={formData.contrato} onChange={e => setFormData({
                ...formData,
                contrato: e.target.value
              })} placeholder="Ex: 123/2024" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-empresa">Empresa Executora *</Label>
                <Select 
                  value={formData.empresa_id} 
                  onValueChange={value => setFormData({
                    ...formData,
                    empresa_id: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map(empresa => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Informações de Contatos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-responsavel_executora">Responsável da Executora</Label>
                <Input id="edit-responsavel_executora" value={formData.responsavel_executora} onChange={e => setFormData({
                ...formData,
                responsavel_executora: e.target.value
              })} placeholder="Nome do responsável" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email_executora">E-mail da Executora</Label>
                <Input id="edit-email_executora" type="email" value={formData.email_executora} onChange={e => setFormData({
                ...formData,
                email_executora: e.target.value
              })} placeholder="email@executora.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-nome_fiscal_execucao">Nome do Fiscal de Execução (UL)</Label>
                <Input id="edit-nome_fiscal_execucao" value={formData.nome_fiscal_execucao} onChange={e => setFormData({
                ...formData,
                nome_fiscal_execucao: e.target.value
              })} placeholder="Nome do fiscal" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email_fiscal_execucao">E-mail do Fiscal de Execução</Label>
                <Input id="edit-email_fiscal_execucao" type="email" value={formData.email_fiscal_execucao} onChange={e => setFormData({
                ...formData,
                email_fiscal_execucao: e.target.value
              })} placeholder="email@fiscal.com" />
              </div>
            </div>

            {/* Adicionar rodovias */}
            <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
              <Label className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Rodovias do Lote
              </Label>

              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-rodovia">Rodovia</Label>
                    <Select value={novaRodovia.rodovia_id} onValueChange={value => setNovaRodovia({
                    ...novaRodovia,
                    rodovia_id: value
                  })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {rodovias.filter(r => !rodoviasVinculadas.find(rv => rv.rodovia_id === r.id)).map(rodovia => <SelectItem key={rodovia.id} value={rodovia.id}>
                              {rodovia.codigo}
                            </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* KM Inicial e Coordenadas */}
                  <div className="space-y-3 p-3 border rounded-lg bg-background/50">
                    <Label className="text-sm font-semibold">KM Inicial</Label>
                    <div className="space-y-2">
                      <Input type="number" step="0.001" value={novaRodovia.km_inicial} onChange={e => setNovaRodovia({
                      ...novaRodovia,
                      km_inicial: e.target.value
                    })} placeholder="0.000" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" step="0.000001" value={novaRodovia.latitude_inicial} onChange={e => setNovaRodovia({
                        ...novaRodovia,
                        latitude_inicial: e.target.value
                      })} placeholder="Latitude" />
                        <Input type="number" step="0.000001" value={novaRodovia.longitude_inicial} onChange={e => setNovaRodovia({
                        ...novaRodovia,
                        longitude_inicial: e.target.value
                      })} placeholder="Longitude" />
                      </div>
                      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(position => {
                          setNovaRodovia({
                            ...novaRodovia,
                            latitude_inicial: position.coords.latitude.toString(),
                            longitude_inicial: position.coords.longitude.toString()
                          });
                          toast.success("Localização capturada!");
                        }, error => {
                          toast.error("Erro ao capturar localização: " + error.message);
                        });
                      } else {
                        toast.error("Geolocalização não suportada");
                      }
                    }}>
                        <Navigation className="mr-2 h-3 w-3" />
                        Capturar GPS
                      </Button>
                    </div>
                  </div>

                  {/* KM Final e Coordenadas */}
                  <div className="space-y-3 p-3 border rounded-lg bg-background/50">
                    <Label className="text-sm font-semibold">KM Final</Label>
                    <div className="space-y-2">
                      <Input type="number" step="0.001" value={novaRodovia.km_final} onChange={e => setNovaRodovia({
                      ...novaRodovia,
                      km_final: e.target.value
                    })} placeholder="200.000" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" step="0.000001" value={novaRodovia.latitude_final} onChange={e => setNovaRodovia({
                        ...novaRodovia,
                        latitude_final: e.target.value
                      })} placeholder="Latitude" />
                        <Input type="number" step="0.000001" value={novaRodovia.longitude_final} onChange={e => setNovaRodovia({
                        ...novaRodovia,
                        longitude_final: e.target.value
                      })} placeholder="Longitude" />
                      </div>
                      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(position => {
                          setNovaRodovia({
                            ...novaRodovia,
                            latitude_final: position.coords.latitude.toString(),
                            longitude_final: position.coords.longitude.toString()
                          });
                          toast.success("Localização capturada!");
                        }, error => {
                          toast.error("Erro ao capturar localização: " + error.message);
                        });
                      } else {
                        toast.error("Geolocalização não suportada");
                      }
                    }}>
                        <Navigation className="mr-2 h-3 w-3" />
                        Capturar GPS
                      </Button>
                    </div>
                  </div>
                </div>

                <Button type="button" onClick={adicionarRodovia} variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Rodovia ao Lote
                </Button>
              </div>

              {/* Lista de rodovias adicionadas */}
              {rodoviasVinculadas.length > 0 && <div className="space-y-2">
                  <Label className="text-sm">Rodovias Adicionadas:</Label>
                  <div className="space-y-2">
                    {rodoviasVinculadas.map(rodovia => <div key={rodovia.rodovia_id} className="flex items-center justify-between p-3 bg-background rounded border">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{rodovia.codigo}</Badge>
                          <span className="text-sm text-muted-foreground">
                            km {rodovia.km_inicial || "?"} - {rodovia.km_final || "?"}
                          </span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removerRodovia(rodovia.rodovia_id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>)}
                  </div>
                </div>}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditingLote(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>;
};
export default LotesManager;