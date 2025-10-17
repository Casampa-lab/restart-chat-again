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
  snv_inicial?: string;
  snv_final?: string;
  km_inicial: string;
  km_final: string;
  extensao_km?: string;
  latitude_inicial: string;
  longitude_inicial: string;
  latitude_final: string;
  longitude_final: string;
}
interface Lote {
  id: string;
  numero: string;
  contrato: string;
  unidade_administrativa?: string;
  responsavel_executora?: string;
  email_executora?: string;
  nome_fiscal_execucao?: string;
  email_fiscal_execucao?: string;
  extensao_total_km?: number;
  empresas: {
    nome: string;
  };
}
interface LoteComRodovias extends Lote {
  lotes_rodovias: Array<{
    rodovias: {
      codigo: string;
    };
    snv_inicial?: string;
    snv_final?: string;
    km_inicial: number | null;
    km_final: number | null;
    extensao_km?: number;
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
    unidade_administrativa: "",
    responsavel_executora: "",
    email_executora: "",
    nome_fiscal_execucao: "",
    email_fiscal_execucao: ""
  });
  const [novaRodovia, setNovaRodovia] = useState({
    rodovia_id: "",
    snv_inicial: "",
    snv_final: "",
    km_inicial: "",
    km_final: "",
    extensao_km: "",
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
              snv_inicial,
              snv_final,
              km_inicial,
              km_final,
              extensao_km
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
      snv_inicial: novaRodovia.snv_inicial,
      snv_final: novaRodovia.snv_final,
      km_inicial: novaRodovia.km_inicial,
      km_final: novaRodovia.km_final,
      extensao_km: novaRodovia.extensao_km,
      latitude_inicial: novaRodovia.latitude_inicial,
      longitude_inicial: novaRodovia.longitude_inicial,
      latitude_final: novaRodovia.latitude_final,
      longitude_final: novaRodovia.longitude_final
    }]);
    setNovaRodovia({
      rodovia_id: "",
      snv_inicial: "",
      snv_final: "",
      km_inicial: "",
      km_final: "",
      extensao_km: "",
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
      // Calcular extensão total
      const extensao_total_km = rodoviasVinculadas.reduce((total, rodovia) => {
        return total + (rodovia.extensao_km ? parseFloat(rodovia.extensao_km) : 0);
      }, 0);

      // Inserir lote
      const {
        data: lote,
        error: loteError
      } = await supabase.from("lotes").insert({
        numero: formData.numero,
        empresa_id: formData.empresa_id,
        contrato: formData.contrato || null,
        unidade_administrativa: formData.unidade_administrativa || null,
        responsavel_executora: formData.responsavel_executora || null,
        email_executora: formData.email_executora || null,
        nome_fiscal_execucao: formData.nome_fiscal_execucao || null,
        email_fiscal_execucao: formData.email_fiscal_execucao || null,
        extensao_total_km
      }).select().single();
      if (loteError) throw loteError;

      // Vincular rodovias com KMs
      const lotesRodovias = rodoviasVinculadas.map(rodovia => ({
        lote_id: lote.id,
        rodovia_id: rodovia.rodovia_id,
        snv_inicial: rodovia.snv_inicial || null,
        snv_final: rodovia.snv_final || null,
        km_inicial: rodovia.km_inicial ? parseFloat(rodovia.km_inicial) : null,
        km_final: rodovia.km_final ? parseFloat(rodovia.km_final) : null,
        extensao_km: rodovia.extensao_km ? parseFloat(rodovia.extensao_km) : null,
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
        unidade_administrativa: "",
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
      unidade_administrativa: lote.unidade_administrativa || "",
      responsavel_executora: lote.responsavel_executora || "",
      email_executora: lote.email_executora || "",
      nome_fiscal_execucao: lote.nome_fiscal_execucao || "",
      email_fiscal_execucao: lote.email_fiscal_execucao || ""
    });

    // Carregar rodovias vinculadas ao lote
    const {
      data: lotesRodoviasData,
      error
    } = await supabase.from("lotes_rodovias").select("rodovia_id, snv_inicial, snv_final, km_inicial, km_final, extensao_km, latitude_inicial, longitude_inicial, latitude_final, longitude_final, rodovias(id, codigo)").eq("lote_id", lote.id);
    if (error) {
      toast.error("Erro ao carregar rodovias: " + error.message);
      return;
    }
    const rodoviasFormatted = lotesRodoviasData.map((lr: any) => ({
      rodovia_id: lr.rodovia_id,
      codigo: lr.rodovias.codigo,
      snv_inicial: lr.snv_inicial || "",
      snv_final: lr.snv_final || "",
      km_inicial: lr.km_inicial?.toString() || "",
      km_final: lr.km_final?.toString() || "",
      extensao_km: lr.extensao_km?.toString() || "",
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
      // Calcular extensão total
      const extensao_total_km = rodoviasVinculadas.reduce((total, rodovia) => {
        return total + (rodovia.extensao_km ? parseFloat(rodovia.extensao_km) : 0);
      }, 0);

      // Atualizar lote
      const {
        error: loteError
      } = await supabase.from("lotes").update({
        numero: formData.numero,
        empresa_id: formData.empresa_id,
        contrato: formData.contrato || null,
        unidade_administrativa: formData.unidade_administrativa || null,
        responsavel_executora: formData.responsavel_executora || null,
        email_executora: formData.email_executora || null,
        nome_fiscal_execucao: formData.nome_fiscal_execucao || null,
        email_fiscal_execucao: formData.email_fiscal_execucao || null,
        extensao_total_km
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
        snv_inicial: rodovia.snv_inicial || null,
        snv_final: rodovia.snv_final || null,
        km_inicial: rodovia.km_inicial ? parseFloat(rodovia.km_inicial) : null,
        km_final: rodovia.km_final ? parseFloat(rodovia.km_final) : null,
        extensao_km: rodovia.extensao_km ? parseFloat(rodovia.extensao_km) : null,
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
        unidade_administrativa: "",
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
            {/* Card 1: Informações Administrativas */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Administrativas</CardTitle>
                <CardDescription>Dados da Unidade Local e Fiscalização</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="numero">Número do Lote *</Label>
                    <Input
                      id="numero"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      placeholder="Ex: 01"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="unidade_administrativa">Unidade/Localidade *</Label>
                    <Input
                      id="unidade_administrativa"
                      placeholder="Ex: UL-BA, DNIT/CE, etc."
                      value={formData.unidade_administrativa}
                      onChange={(e) => setFormData({ ...formData, unidade_administrativa: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contrato">Número do Contrato</Label>
                    <Input
                      id="contrato"
                      value={formData.contrato}
                      onChange={(e) => setFormData({ ...formData, contrato: e.target.value })}
                      placeholder="Ex: 123/2024"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome_fiscal_execucao">Nome do Fiscal de Execução (UL)</Label>
                    <Input
                      id="nome_fiscal_execucao"
                      value={formData.nome_fiscal_execucao}
                      onChange={(e) => setFormData({ ...formData, nome_fiscal_execucao: e.target.value })}
                      placeholder="Nome do fiscal"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email_fiscal_execucao">E-mail do Fiscal de Execução</Label>
                    <Input
                      id="email_fiscal_execucao"
                      type="email"
                      value={formData.email_fiscal_execucao}
                      onChange={(e) => setFormData({ ...formData, email_fiscal_execucao: e.target.value })}
                      placeholder="email@fiscal.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Empresa Executora */}
            <Card>
              <CardHeader>
                <CardTitle>Empresa Executora</CardTitle>
                <CardDescription>Dados da empresa responsável pela execução</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="empresa_id">Empresa Executora *</Label>
                  <Select
                    value={formData.empresa_id}
                    onValueChange={(value) => setFormData({ ...formData, empresa_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {empresas.map((empresa) => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          {empresa.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="responsavel_executora">Nome do Responsável da Executora</Label>
                    <Input
                      id="responsavel_executora"
                      value={formData.responsavel_executora}
                      onChange={(e) => setFormData({ ...formData, responsavel_executora: e.target.value })}
                      placeholder="Nome do responsável"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email_executora">E-mail do Responsável</Label>
                    <Input
                      id="email_executora"
                      type="email"
                      value={formData.email_executora}
                      onChange={(e) => setFormData({ ...formData, email_executora: e.target.value })}
                      placeholder="email@executora.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Rodovias */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Rodovias do Lote
                </CardTitle>
                <CardDescription>Adicione as rodovias e seus trechos (km inicial e final)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="snv_inicial">SNV Inicial</Label>
                    <Input
                      id="snv_inicial"
                      value={novaRodovia.snv_inicial}
                      onChange={e => setNovaRodovia({ ...novaRodovia, snv_inicial: e.target.value })}
                      placeholder="Ex: 0010A"
                    />
                  </div>
                  <div>
                    <Label htmlFor="snv_final">SNV Final</Label>
                    <Input
                      id="snv_final"
                      value={novaRodovia.snv_final}
                      onChange={e => setNovaRodovia({ ...novaRodovia, snv_final: e.target.value })}
                      placeholder="Ex: 0015B"
                    />
                  </div>
                  <div>
                    <Label htmlFor="extensao_km">Extensão (km)</Label>
                    <Input
                      id="extensao_km"
                      type="number"
                      step="0.001"
                      value={novaRodovia.extensao_km}
                      onChange={e => setNovaRodovia({ ...novaRodovia, extensao_km: e.target.value })}
                      placeholder="0.000"
                    />
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
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{rodovia.codigo}</Badge>
                              {rodovia.snv_inicial && rodovia.snv_final && (
                                <span className="text-xs text-muted-foreground">
                                  SNV: {rodovia.snv_inicial} → {rodovia.snv_final}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>KM: {rodovia.km_inicial || "?"} - {rodovia.km_final || "?"}</span>
                              {rodovia.extensao_km && (
                                <span className="font-medium">• Ext: {rodovia.extensao_km} km</span>
                              )}
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removerRodovia(rodovia.rodovia_id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>)}
                    </div>
                  </div>}
              </CardContent>
            </Card>

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
                <TableHead>Unidade/Localidade</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Rodovias</TableHead>
                <TableHead>Extensão Total</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map(lote => <TableRow key={lote.id}>
                  <TableCell className="font-medium">{lote.numero}</TableCell>
                  <TableCell>{lote.empresas?.nome || "-"}</TableCell>
                  <TableCell>
                    {lote.unidade_administrativa ? (
                      <Badge variant="outline">{lote.unidade_administrativa}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{lote.contrato || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {lote.lotes_rodovias.map((lr, idx) => (
                        <div key={idx} className="text-xs">
                          <Badge variant="secondary" className="text-xs">
                            {lr.rodovias?.codigo || "-"}
                          </Badge>
                          {lr.snv_inicial && lr.snv_final && (
                            <span className="ml-2 text-muted-foreground">
                              SNV: {lr.snv_inicial}→{lr.snv_final}
                            </span>
                          )}
                          {(lr.km_inicial || lr.km_final) && (
                            <span className="ml-2 text-muted-foreground">
                              KM: {lr.km_inicial?.toFixed(0)}-{lr.km_final?.toFixed(0)}
                            </span>
                          )}
                          {lr.extensao_km && (
                            <span className="ml-2 font-medium">
                              • {lr.extensao_km.toFixed(2)} km
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {lote.extensao_total_km ? `${lote.extensao_total_km.toFixed(2)} km` : "—"}
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
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
            {/* Card 1: Informações Administrativas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Administrativas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Grid 3 colunas: Número | Unidade/Localidade | Contrato */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-numero">Número do Lote *</Label>
                    <Input
                      id="edit-numero"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      placeholder="Ex: 01"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-unidade_administrativa">Unidade/Localidade *</Label>
                    <Input
                      id="edit-unidade_administrativa"
                      value={formData.unidade_administrativa}
                      onChange={(e) => setFormData({ ...formData, unidade_administrativa: e.target.value })}
                      placeholder="Ex: UL Caxambu, SR Belo Horizonte"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-contrato">Número do Contrato</Label>
                    <Input
                      id="edit-contrato"
                      value={formData.contrato}
                      onChange={(e) => setFormData({ ...formData, contrato: e.target.value })}
                      placeholder="Ex: 123/2024"
                    />
                  </div>
                </div>

                {/* Grid 2 colunas: Fiscal | Email Fiscal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-nome_fiscal_execucao">Nome do Fiscal de Execução (UL)</Label>
                    <Input
                      id="edit-nome_fiscal_execucao"
                      value={formData.nome_fiscal_execucao}
                      onChange={(e) => setFormData({ ...formData, nome_fiscal_execucao: e.target.value })}
                      placeholder="Nome do fiscal responsável"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-email_fiscal_execucao">E-mail do Fiscal de Execução</Label>
                    <Input
                      id="edit-email_fiscal_execucao"
                      type="email"
                      value={formData.email_fiscal_execucao}
                      onChange={(e) => setFormData({ ...formData, email_fiscal_execucao: e.target.value })}
                      placeholder="fiscal@dnit.gov.br"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Empresa Executora */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Empresa Executora</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Empresa (linha inteira) */}
                <div className="space-y-2">
                  <Label htmlFor="edit-empresa">Empresa Executora *</Label>
                  <Select
                    value={formData.empresa_id}
                    onValueChange={(value) => setFormData({ ...formData, empresa_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa executora" />
                    </SelectTrigger>
                    <SelectContent>
                      {empresas.map((empresa) => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          {empresa.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Grid 2 colunas: Responsável | Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-responsavel_executora">Nome do Responsável da Executora</Label>
                    <Input
                      id="edit-responsavel_executora"
                      value={formData.responsavel_executora}
                      onChange={(e) => setFormData({ ...formData, responsavel_executora: e.target.value })}
                      placeholder="Nome do responsável técnico"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-email_executora">E-mail do Responsável</Label>
                    <Input
                      id="edit-email_executora"
                      type="email"
                      value={formData.email_executora}
                      onChange={(e) => setFormData({ ...formData, email_executora: e.target.value })}
                      placeholder="responsavel@empresa.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-snv_inicial">SNV Inicial</Label>
                    <Input
                      id="edit-snv_inicial"
                      value={novaRodovia.snv_inicial}
                      onChange={e => setNovaRodovia({ ...novaRodovia, snv_inicial: e.target.value })}
                      placeholder="Ex: 0010A"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-snv_final">SNV Final</Label>
                    <Input
                      id="edit-snv_final"
                      value={novaRodovia.snv_final}
                      onChange={e => setNovaRodovia({ ...novaRodovia, snv_final: e.target.value })}
                      placeholder="Ex: 0015B"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-extensao_km">Extensão (km)</Label>
                    <Input
                      id="edit-extensao_km"
                      type="number"
                      step="0.001"
                      value={novaRodovia.extensao_km}
                      onChange={e => setNovaRodovia({ ...novaRodovia, extensao_km: e.target.value })}
                      placeholder="0.000"
                    />
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
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{rodovia.codigo}</Badge>
                            {rodovia.snv_inicial && rodovia.snv_final && (
                              <span className="text-xs text-muted-foreground">
                                SNV: {rodovia.snv_inicial} → {rodovia.snv_final}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>KM: {rodovia.km_inicial || "?"} - {rodovia.km_final || "?"}</span>
                            {rodovia.extensao_km && (
                              <span className="font-medium">• Ext: {rodovia.extensao_km} km</span>
                            )}
                          </div>
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