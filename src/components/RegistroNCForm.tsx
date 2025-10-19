import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Camera, X, MapPin } from "lucide-react";

interface RegistroNCFormProps {
  loteId: string;
  rodoviaId: string;
}

const formSchema = z.object({
  data_registro: z.string().min(1, "Data é obrigatória"),
  natureza: z.enum(["S.H.", "S.V.", "D.S.", "Outra"]),
  natureza_outra: z.string().optional(),
  grau: z.enum(["Leve", "Média", "Grave", "Gravíssima"]),
  problema_identificado: z.string().min(1, "Problema identificado é obrigatório"),
  tipo_obra: z.enum(["Execução", "Manutenção"]),
  km_inicial: z.string().min(1, "km inicial é obrigatório"),
  km_final: z.string().min(1, "km final é obrigatório"),
  snv: z.string().optional(),
  supervisora: z.string().min(1, "Supervisora é obrigatória"),
  contrato_supervisora: z.string().optional(),
  construtora: z.string().min(1, "Construtora é obrigatória"),
  contrato_construtora: z.string().optional(),
  comentarios_supervisora: z.string().optional(),
  comentarios_executora: z.string().optional(),
});

interface FotoData {
  file: File;
  preview: string;
  snv: string;
  km: string;
  sentido: string;
  latitude: string;
  longitude: string;
  descricao: string;
}

export function RegistroNCForm({ loteId, rodoviaId }: RegistroNCFormProps) {
  const [fotos, setFotos] = useState<FotoData[]>([]);
  const [uploading, setUploading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_registro: new Date().toISOString().split('T')[0],
      km_inicial: "",
      km_final: "",
      snv: "",
      supervisora: "",
      contrato_supervisora: "",
      construtora: "",
      contrato_construtora: "",
      tipo_obra: "Execução",
      natureza: "S.H.",
      natureza_outra: "",
      grau: "Leve",
      problema_identificado: "",
      comentarios_supervisora: "",
      comentarios_executora: "",
    },
  });

  const handleAddFoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (fotos.length >= 4) {
      toast.error("Máximo de 4 fotos permitidas");
      return;
    }

    const preview = URL.createObjectURL(file);
    setFotos([...fotos, {
      file,
      preview,
      snv: "",
      km: "",
      sentido: "",
      latitude: "",
      longitude: "",
      descricao: "",
    }]);
  };

  const handleRemoveFoto = (index: number) => {
    const newFotos = [...fotos];
    URL.revokeObjectURL(newFotos[index].preview);
    newFotos.splice(index, 1);
    setFotos(newFotos);
  };

  const handleUpdateFoto = (index: number, field: keyof FotoData, value: string) => {
    const newFotos = [...fotos];
    (newFotos[index][field] as string) = value;
    setFotos(newFotos);
  };

  const handleCaptureFotoLocation = (index: number) => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada pelo navegador");
      return;
    }

    toast.loading("Capturando localização...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newFotos = [...fotos];
        newFotos[index].latitude = position.coords.latitude.toFixed(6);
        newFotos[index].longitude = position.coords.longitude.toFixed(6);
        setFotos(newFotos);
        toast.dismiss();
        toast.success(`Localização capturada: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
      },
      (error) => {
        toast.dismiss();
        toast.error("Erro ao capturar localização: " + error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Insert main record (numero_nc será gerado automaticamente pelo trigger)
      const { data: registro, error: registroError } = await supabase
        .from("nao_conformidades")
        .insert([{
          numero_nc: '', // Será preenchido automaticamente pelo trigger
          user_id: user.id,
          lote_id: loteId,
          rodovia_id: rodoviaId,
          data_ocorrencia: values.data_registro,
          tipo_nc: 'Outro',
          km_inicial: parseFloat(values.km_inicial),
          km_final: parseFloat(values.km_final),
          snv: values.snv || null,
          empresa: values.construtora,
          tipo_obra: values.tipo_obra,
          natureza: values.natureza,
          grau: values.grau,
          problema_identificado: values.problema_identificado,
          comentarios_supervisora: values.comentarios_supervisora || null,
          situacao: 'Não Atendida',
        }])
        .select()
        .single();

      if (registroError) throw registroError;

      // Upload photos
      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];
        const fileExt = foto.file.name.split('.').pop();
        const fileName = `${user.id}/${registro.id}/${i + 1}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('nc-photos')
          .upload(fileName, foto.file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('nc-photos')
          .getPublicUrl(fileName);

        // Insert photo record
        const { error: fotoError } = await supabase
          .from("nao_conformidades_fotos")
          .insert({
            nc_id: registro.id,
            ordem: i + 1,
            foto_url: publicUrl,
            snv: foto.snv || null,
            km: foto.km ? parseFloat(foto.km) : null,
            latitude: foto.latitude ? parseFloat(foto.latitude) : null,
            longitude: foto.longitude ? parseFloat(foto.longitude) : null,
            descricao: foto.descricao || null,
          });

        if (fotoError) throw fotoError;
      }

      toast.success(`Registro NC ${registro.numero_nc} criado com sucesso!`);
      form.reset();
      fotos.forEach(f => URL.revokeObjectURL(f.preview));
      setFotos([]);
    } catch (error: any) {
      toast.error("Erro ao criar registro: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="data_registro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="km_inicial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>km Inicial</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="km_final"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>km Final</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="snv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SNV (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supervisora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supervisora</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contrato_supervisora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contrato Supervisora (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="construtora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Construtora</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contrato_construtora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contrato Construtora (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tipo_obra"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Obra</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Execução" id="execucao" />
                        <Label htmlFor="execucao">Execução</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Manutenção" id="manutencao" />
                        <Label htmlFor="manutencao">Manutenção</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="natureza"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Natureza</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4 flex-wrap"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="S.H." id="sh" />
                        <Label htmlFor="sh">S.H.</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="S.V." id="sv" />
                        <Label htmlFor="sv">S.V.</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="D.S." id="ds" />
                        <Label htmlFor="ds">D.S.</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Outra" id="outra" />
                        <Label htmlFor="outra">Outra</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("natureza") === "Outra" && (
              <FormField
                control={form.control}
                name="natureza_outra"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especifique a Natureza</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="grau"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grau</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4 flex-wrap"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Leve" id="leve" />
                        <Label htmlFor="leve">Leve</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Média" id="media" />
                        <Label htmlFor="media">Média</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Grave" id="grave" />
                        <Label htmlFor="grave">Grave</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Gravíssima" id="gravissima" />
                        <Label htmlFor="gravissima">Gravíssima</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Descrição da Ocorrência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="problema_identificado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Problema Identificado</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="comentarios_supervisora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comentários da Supervisora</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="comentarios_executora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comentários da Executora</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Documentação Fotográfica (Máx. 4 fotos)</span>
              {fotos.length < 4 && (
                <Label htmlFor="foto-upload" className="cursor-pointer">
                  <Button type="button" size="sm" asChild>
                    <span>
                      <Camera className="mr-2 h-4 w-4" />
                      Adicionar Foto
                    </span>
                  </Button>
                  <Input
                    id="foto-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAddFoto}
                  />
                </Label>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fotos.map((foto, index) => (
                <Card key={index}>
                  <CardHeader className="relative">
                    <img
                      src={foto.preview}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-48 object-cover rounded"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => handleRemoveFoto(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>SNV</Label>
                        <Input
                          value={foto.snv}
                          onChange={(e) => handleUpdateFoto(index, 'snv', e.target.value)}
                          placeholder="SNV"
                        />
                      </div>
                      <div>
                        <Label>km</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={foto.km}
                          onChange={(e) => handleUpdateFoto(index, 'km', e.target.value)}
                          placeholder="km"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Sentido</Label>
                      <Input
                        value={foto.sentido}
                        onChange={(e) => handleUpdateFoto(index, 'sentido', e.target.value)}
                        placeholder="Sentido"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Latitude</Label>
                        <Input
                          type="number"
                          step="0.000001"
                          value={foto.latitude}
                          onChange={(e) => handleUpdateFoto(index, 'latitude', e.target.value)}
                          placeholder="Lat"
                        />
                      </div>
                      <div>
                        <Label>Longitude</Label>
                        <Input
                          type="number"
                          step="0.000001"
                          value={foto.longitude}
                          onChange={(e) => handleUpdateFoto(index, 'longitude', e.target.value)}
                          placeholder="Long"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCaptureFotoLocation(index)}
                      className="w-full"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Capturar Localização
                    </Button>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={foto.descricao}
                        onChange={(e) => handleUpdateFoto(index, 'descricao', e.target.value)}
                        placeholder="Descrição da foto"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={uploading}>
          {uploading ? "Salvando..." : "Registrar NC"}
        </Button>
      </form>
    </Form>
  );
}
