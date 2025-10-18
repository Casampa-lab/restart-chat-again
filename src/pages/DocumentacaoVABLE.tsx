import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, FileText, Info, ArrowLeft, Home } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function DocumentacaoVABLE() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <Home className="h-4 w-4" />
                Início
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/modulos">VABLE</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Documentação</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">VABLE - Vigilância e Atualização Baseada em Levantamentos e Evidências</h1>
        <p className="text-muted-foreground">
          Sistema de Inventário Dinâmico com controle de intervenções pré-projeto e executivas
        </p>
      </div>

      {/* Conceito */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Conceito VABLE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            O <strong>VABLE</strong> é o núcleo lógico do OperaVia, responsável por transformar o inventário rodoviário 
            em uma estrutura <strong>viva e auditável</strong>. Cada elemento cadastrado evolui ao longo do tempo conforme 
            intervenções são registradas e aprovadas.
          </p>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Princípio Fundamental</AlertTitle>
            <AlertDescription>
              O Inventário Dinâmico reflete o <strong>estado físico real da rodovia</strong>, 
              incluindo alterações de estado realizadas durante a <strong>manutenção pré-projeto</strong>, 
              sem permitir mudanças em características estruturais.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Tipos de Intervenção */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tipos de Intervenção
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="border-l-4 border-yellow-500 pl-4 py-2">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-yellow-500">🟡 Manutenção Pré-Projeto</Badge>
              </div>
              <p className="text-sm mb-2">
                <strong>Base Normativa:</strong> IN 3/2025, Art. 17-19
              </p>
              <p className="text-sm mb-2">
                Intervenções de conservação realizadas <strong>antes da aprovação do projeto executivo</strong>, 
                com o objetivo de preservar a segurança e evitar o agravamento de não conformidades.
              </p>
              <div className="bg-muted p-3 rounded-md mt-2">
                <p className="text-sm font-semibold mb-1">Características:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>✅ Permite alteração de campos de <strong>estado/condição</strong></li>
                  <li>❌ Bloqueia alteração de campos <strong>estruturais</strong></li>
                  <li>✅ Atualiza o inventário dinâmico</li>
                  <li>✅ Mantém histórico completo (antes/depois)</li>
                  <li>❌ Não permite criação de novos elementos</li>
                </ul>
              </div>
            </div>

            <div className="border-l-4 border-green-500 pl-4 py-2">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default">🟢 Execução de Projeto</Badge>
              </div>
              <p className="text-sm mb-2">
                Intervenções realizadas <strong>após a aprovação do projeto executivo</strong>, 
                podendo incluir alterações estruturais, implantações e remoções.
              </p>
              <div className="bg-muted p-3 rounded-md mt-2">
                <p className="text-sm font-semibold mb-1">Características:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>✅ Permite alteração de <strong>qualquer campo</strong></li>
                  <li>✅ Permite implantação de novos elementos</li>
                  <li>✅ Permite remoção de elementos</li>
                  <li>✅ Atualiza o inventário dinâmico</li>
                  <li>✅ Mantém histórico completo (antes/depois)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campos por Elemento */}
      <Card>
        <CardHeader>
          <CardTitle>Campos Permitidos por Tipo de Elemento</CardTitle>
          <CardDescription>
            Em manutenções pré-projeto, apenas campos de estado/condição podem ser alterados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Placas */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Placas de Sinalização
              </h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-green-600">✅ Campos Permitidos (Estado)</p>
                  <ul className="ml-4 space-y-1 text-muted-foreground">
                    <li>• retro_pelicula_fundo</li>
                    <li>• retro_pelicula_legenda_orla</li>
                    <li>• data_implantacao</li>
                    <li>• velocidade</li>
                    <li>• fotos_urls</li>
                    <li>• latitude/longitude</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-red-600">❌ Campos Bloqueados (Estruturais)</p>
                  <ul className="ml-4 space-y-1 text-muted-foreground">
                    <li>• codigo</li>
                    <li>• tipo</li>
                    <li>• modelo</li>
                    <li>• dimensoes_mm</li>
                    <li>• substrato</li>
                    <li>• suporte</li>
                    <li>• posicao</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Marcas Longitudinais */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Marcas Longitudinais
              </h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-green-600">✅ Campos Permitidos (Estado)</p>
                  <ul className="ml-4 space-y-1 text-muted-foreground">
                    <li>• largura_cm</li>
                    <li>• espessura_cm</li>
                    <li>• extensao_metros</li>
                    <li>• material</li>
                    <li>• area_m2</li>
                    <li>• fotos_urls</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-red-600">❌ Campos Bloqueados (Estruturais)</p>
                  <ul className="ml-4 space-y-1 text-muted-foreground">
                    <li>• tipo_demarcacao</li>
                    <li>• cor</li>
                    <li>• posicao</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Inscrições */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Inscrições/Zebrados
              </h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-green-600">✅ Campos Permitidos (Estado)</p>
                  <ul className="ml-4 space-y-1 text-muted-foreground">
                    <li>• area_m2</li>
                    <li>• espessura_mm</li>
                    <li>• material_utilizado</li>
                    <li>• fotos_urls</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-red-600">❌ Campos Bloqueados (Estruturais)</p>
                  <ul className="ml-4 space-y-1 text-muted-foreground">
                    <li>• sigla</li>
                    <li>• tipo_inscricao</li>
                    <li>• cor</li>
                    <li>• dimensoes</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Tachas */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Tachas Refletivas
              </h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-green-600">✅ Campos Permitidos (Estado)</p>
                  <ul className="ml-4 space-y-1 text-muted-foreground">
                    <li>• quantidade</li>
                    <li>• extensao_km</li>
                    <li>• espacamento_m</li>
                    <li>• fotos_urls</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-red-600">❌ Campos Bloqueados (Estruturais)</p>
                  <ul className="ml-4 space-y-1 text-muted-foreground">
                    <li>• tipo_tacha</li>
                    <li>• cor</li>
                    <li>• material</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Cilindros */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Cilindros Delimitadores
              </h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-green-600">✅ Campos Permitidos (Estado)</p>
                  <ul className="ml-4 space-y-1 text-muted-foreground">
                    <li>• quantidade</li>
                    <li>• extensao_km</li>
                    <li>• espacamento_m</li>
                    <li>• local_implantacao</li>
                    <li>• fotos_urls</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-red-600">❌ Campos Bloqueados (Estruturais)</p>
                  <ul className="ml-4 space-y-1 text-muted-foreground">
                    <li>• cor_corpo</li>
                    <li>• cor_refletivo</li>
                    <li>• tipo_refletivo</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Pórticos */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Pórticos
              </h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-green-600">✅ Campos Permitidos (Estado)</p>
                  <ul className="ml-4 space-y-1 text-muted-foreground">
                    <li>• fotos_urls</li>
                    <li>• observacao</li>
                    <li>• latitude/longitude</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-red-600">❌ Campos Bloqueados (Estruturais)</p>
                  <ul className="ml-4 space-y-1 text-muted-foreground">
                    <li>• tipo</li>
                    <li>• altura_livre_m</li>
                    <li>• vao_horizontal_m</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Defensas */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Defensas Metálicas
              </h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-green-600">✅ Campos Permitidos (Estado)</p>
                  <ul className="ml-4 space-y-1 text-muted-foreground">
                    <li>• extensao_metros</li>
                    <li>• quantidade_laminas</li>
                    <li>• adequacao_funcionalidade_*</li>
                    <li>• fotos_urls</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-red-600">❌ Campos Bloqueados (Estruturais)</p>
                  <ul className="ml-4 space-y-1 text-muted-foreground">
                    <li>• tipo_defensa</li>
                    <li>• classificacao_nivel_contencao</li>
                    <li>• nivel_contencao_en1317</li>
                    <li>• funcao</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fluxo de Aprovação */}
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Aprovação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium">Registro pelo Fiscal Técnico</p>
                <p className="text-sm text-muted-foreground">
                  O fiscal registra a intervenção e marca se é "Manutenção Pré-Projeto"
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium">Validação Automática</p>
                <p className="text-sm text-muted-foreground">
                  O sistema valida se campos estruturais foram alterados (se for manutenção pré-projeto)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium">Aprovação do Coordenador</p>
                <p className="text-sm text-muted-foreground">
                  Coordenador da supervisora revisa e aprova a intervenção
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300 font-bold">
                4
              </div>
              <div className="flex-1">
                <p className="font-medium">Atualização do Inventário</p>
                <p className="text-sm text-muted-foreground">
                  O inventário dinâmico é atualizado e o histórico completo é registrado
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefícios */}
      <Card>
        <CardHeader>
          <CardTitle>Benefícios do Sistema VABLE</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Precisão Temporal</p>
                  <p className="text-sm text-muted-foreground">
                    Cada elemento reflete o estado físico real, mesmo antes da aprovação do projeto
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Rastreabilidade</p>
                  <p className="text-sm text-muted-foreground">
                    Todas as intervenções são documentadas com origem, autor e data
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Automação de Histórico</p>
                  <p className="text-sm text-muted-foreground">
                    JSON "antes/depois" garantido automaticamente
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Transparência</p>
                  <p className="text-sm text-muted-foreground">
                    Relatórios identificam claramente manutenções pré-projeto
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Conformidade Normativa</p>
                  <p className="text-sm text-muted-foreground">
                    Alinhamento total com IN 3/2025
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Flexibilidade</p>
                  <p className="text-sm text-muted-foreground">
                    Sistema suporta ambos os fluxos (pré-projeto e executivo)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
