// src/pages/EscolherElemento.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ELEMENTOS = [
  { id: "cilindros", label: "Cilindros Delimitadores" },
  { id: "placas", label: "Placas de Sinalização" },
  { id: "defensas", label: "Defensas" },
  { id: "tachas", label: "Tachas/Olho-de-gato" },
  { id: "marcas_longitudinais", label: "Marcas Longitudinais" },
];

export default function EscolherElemento() {
  const irParaRegistro = (tipo: string) => {
    if (typeof window !== "undefined") {
      window.location.assign(`/modo-campo/registrar-intervencao?tipo=${encodeURIComponent(tipo)}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Escolha o tipo de elemento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ELEMENTOS.map(e => (
            <Button key={e.id} variant="secondary" className="justify-start" onClick={() => irParaRegistro(e.id)}>
              {e.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
