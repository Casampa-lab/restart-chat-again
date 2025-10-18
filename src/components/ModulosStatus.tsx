import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Route, Radio, Scale, MonitorPlay, BarChart3, FileText, Check, Clock, FileSearch, History as HistoryIcon, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Modulo {
  codigo: string;
  nome: string;
  descricao: string;
  icone: string;
  status: "disponivel" | "desenvolvimento";
  rota?: string;
}

const MODULOS_INFO: Modulo[] = [
  {
    codigo: "sinalizacao",
    nome: "Sinalização e Segurança Viária",
    descricao: "Gestão de sinalização horizontal, vertical e dispositivos de segurança",
    icone: "Route",
    status: "disponivel"
  },
  {
    codigo: "vable-docs",
    nome: "Documentação VABLE",
    descricao: "Sistema de rastreabilidade e controle de intervenções (IN 3/2025)",
    icone: "FileSearch",
    status: "disponivel",
    rota: "/documentacao-vable"
  },
  {
    codigo: "auditoria-inventario",
    nome: "Auditoria de Inventário",
    descricao: "Rastreamento completo de alterações no inventário rodoviário",
    icone: "History",
    status: "disponivel",
    rota: "/auditoria-inventario"
  },
  {
    codigo: "inventario-dinamico",
    nome: "Inventário Dinâmico",
    descricao: "Comparação Baseline vs Estado Atual da rodovia",
    icone: "Activity",
    status: "disponivel",
    rota: "/baseline-evolucao"
  },
  {
    codigo: "radares",
    nome: "Radares",
    descricao: "Monitoramento e gestão de radares de velocidade",
    icone: "Radio",
    status: "desenvolvimento"
  },
  {
    codigo: "pesagem",
    nome: "Pesagem",
    descricao: "Controle de balanças e pesagem de veículos",
    icone: "Scale",
    status: "desenvolvimento"
  },
  {
    codigo: "paineis-mensagem",
    nome: "Painéis de Mensagem",
    descricao: "Gestão de painéis eletrônicos de mensagem",
    icone: "MonitorPlay",
    status: "desenvolvimento"
  },
  {
    codigo: "dashboards",
    nome: "Dashboards Avançados",
    descricao: "Análises e visualizações consolidadas",
    icone: "BarChart3",
    status: "desenvolvimento"
  },
  {
    codigo: "relatorios",
    nome: "Relatórios Customizados",
    descricao: "Geração de relatórios personalizados",
    icone: "FileText",
    status: "desenvolvimento"
  }
];

const ICON_MAP: Record<string, any> = {
  Route,
  Radio,
  Scale,
  MonitorPlay,
  BarChart3,
  FileText,
  FileSearch,
  History: HistoryIcon,
  Activity
};

export const ModulosStatus = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Módulos do Sistema</h2>
        <p className="text-muted-foreground">Funcionalidades disponíveis e em desenvolvimento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULOS_INFO.map((modulo) => {
          const IconComponent = ICON_MAP[modulo.icone];
          const isDisponivel = modulo.status === "disponivel";

          return (
            <Card 
              key={modulo.codigo} 
              className={`relative overflow-hidden transition-all ${
                isDisponivel 
                  ? "border-primary/50 shadow-md hover:shadow-lg cursor-pointer" 
                  : "opacity-60 border-dashed"
              }`}
              onClick={() => modulo.rota && isDisponivel && navigate(modulo.rota)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                  <Badge 
                    variant={isDisponivel ? "default" : "secondary"}
                    className="flex items-center gap-1"
                  >
                    {isDisponivel ? (
                      <>
                        <Check className="h-3 w-3" />
                        Disponível
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" />
                        Em Desenvolvimento
                      </>
                    )}
                  </Badge>
                </div>
                <CardTitle className="mt-4">{modulo.nome}</CardTitle>
                <CardDescription>{modulo.descricao}</CardDescription>
              </CardHeader>
              {isDisponivel && (
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-primary font-medium">
                    <Check className="h-4 w-4" />
                    <span>Acesso completo</span>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/50 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Próximos Lançamentos
          </CardTitle>
          <CardDescription>
            Estamos desenvolvendo novos módulos para ampliar as funcionalidades do sistema. 
            Você será notificado assim que novos módulos forem lançados.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};
