# 🚦 Como Adicionar Imagens de Placas de Trânsito

Este guia explica como adicionar imagens SVG de placas de trânsito ao sistema.

## 📋 Visão Geral

O sistema suporta três categorias de placas conforme o CTB (Código de Trânsito Brasileiro):

- **Regulamentação** (prefixo R-): R-1, R-2, R-19, etc.
- **Advertência** (prefixo A-): A-1a, A-7a, A-21a, etc.
- **Indicação** (prefixos ID-, OD-, ED-, SAU-, TNA-, THC-, TAD-, TAR-, TIT-): ID-1, SAU-01, etc.

## 🎯 Sistema Inteligente

O sistema detecta automaticamente qual placa está faltando e mostra um **helper de download** com:

- ✅ Links diretos para fontes confiáveis (GitHub e Wikimedia Commons)
- 📁 Caminho exato onde fazer o upload
- 💡 Instruções passo-a-passo

**Não é necessário configurar nada no código!** O sistema reconhece automaticamente qualquer placa que você adicionar na pasta correta.

## 📥 Passo a Passo para Adicionar Placas

### 1. Identificar a Placa Necessária

Quando você seleciona uma placa que não tem imagem, o sistema mostra automaticamente o **PlacaDownloadHelper** com botões para download.

### 2. Baixar o Arquivo SVG

Escolha uma das fontes abaixo:

#### Opção A: GitHub (Recomendado)
**Repositório:** [sergio-ishii-pinhais/Brazil-PlacasDeTransito-SVG](https://github.com/sergio-ishii-pinhais/Brazil-PlacasDeTransito-SVG)

**Como baixar:**
1. Clique no botão "Baixar do GitHub" no helper
2. Navegue até a pasta da categoria (regulamentacao, advertencia ou indicacao)
3. Clique no arquivo SVG desejado (ex: R-1.svg)
4. Clique no botão "Download" (ícone de download no canto superior direito)
5. Ou clique com botão direito em "Raw" e selecione "Salvar link como..."

#### Opção B: Wikimedia Commons
**Site:** [Wikimedia Commons](https://commons.wikimedia.org/)

**Como baixar:**
1. Clique no botão "Buscar no Wikimedia Commons" no helper
2. Procure pela placa desejada (ex: "Brasil R-1")
3. Clique na imagem
4. No lado direito, clique em "Download" e escolha o formato SVG
5. Ou clique com botão direito na imagem e "Salvar imagem como..."

**Importante:** Certifique-se de que o arquivo está no formato SVG (não PNG ou JPG).

### 3. Renomear o Arquivo

O arquivo deve ter **exatamente** o mesmo nome do código da placa:

- ✅ Correto: `R-1.svg`, `A-7a.svg`, `ID-1.svg`
- ❌ Errado: `Brasil_R-1.svg`, `r-1.svg`, `R-1.SVG`, `R-1.png`

**Regras:**
- Letras maiúsculas para o prefixo
- Hífen entre prefixo e número
- Letras minúsculas para sufixos (a, b, c)
- Extensão `.svg` em minúsculas

### 4. Fazer Upload no Projeto

Coloque o arquivo SVG na pasta correta de acordo com a categoria:

```
src/assets/placas/
├── regulamentacao/
│   ├── R-1.svg
│   ├── R-2.svg
│   ├── R-19.svg
│   └── ... (outras placas de regulamentação)
│
├── advertencia/
│   ├── A-1a.svg
│   ├── A-7a.svg
│   ├── A-21a.svg
│   └── ... (outras placas de advertência)
│
└── indicacao/
    ├── ID-1.svg
    ├── SAU-01.svg
    ├── TAD-01.svg
    └── ... (outras placas de indicação)
```

**Como fazer upload:**
1. No Lovable, ative o "Dev Mode" (canto superior esquerdo)
2. Navegue até a pasta correta no explorador de arquivos
3. Arraste e solte o arquivo SVG ou use o botão de upload
4. Aguarde a confirmação do upload

### 5. Verificar se Funcionou

1. **Recarregue a página** (F5 ou Ctrl+R)
2. Selecione a placa no formulário
3. A imagem deve aparecer no preview
4. O helper de download não deve mais ser exibido

## 🎨 Placas Mais Comuns (Starter Pack)

Aqui está uma lista das placas mais utilizadas em rodovias. Recomendamos começar por elas:

### Regulamentação (Top 15)
- **R-1**: Parada obrigatória
- **R-2**: Dê a preferência
- **R-3**: Sentido proibido
- **R-4a**: Proibido virar à esquerda
- **R-4b**: Proibido virar à direita
- **R-6a**: Proibido estacionar
- **R-6b**: Estacionamento regulamentado
- **R-10**: Proibido ultrapassar
- **R-19**: Velocidade máxima permitida
- **R-24a**: Sentido de circulação da via
- **R-24b**: Passagem obrigatória
- **R-25a**: Vire à esquerda
- **R-25b**: Vire à direita
- **R-25c**: Siga em frente ou à esquerda
- **R-26**: Siga em frente

### Advertência (Top 10)
- **A-1a**: Curva acentuada à esquerda
- **A-1b**: Curva acentuada à direita
- **A-2a**: Curva em S à esquerda
- **A-2b**: Curva em S à direita
- **A-7a**: Lombada
- **A-7b**: Depressão
- **A-13a**: Descida íngreme
- **A-13b**: Subida íngreme
- **A-14**: Ponte estreita
- **A-20a**: Entroncamento oblíquo à esquerda
- **A-20b**: Entroncamento oblíquo à direita
- **A-21a**: Cruzamento em T
- **A-21b**: Cruzamento de vias

### Indicação (Top 10)
- **ID-1** a **ID-10**: Indicações de destino
- **SAU-01**: Hospital
- **SAU-02**: Pronto-socorro
- **TAD-01**: Aeroporto
- **TAD-02**: Terminal rodoviário
- **TAD-03**: Terminal ferroviário

## 🔍 Dicas e Solução de Problemas

### A imagem não aparece após o upload

1. **Verifique o nome do arquivo**: Deve ser exatamente igual ao código da placa
2. **Verifique a pasta**: Arquivo deve estar na pasta correta da categoria
3. **Recarregue a página**: Pressione F5 ou Ctrl+R
4. **Limpe o cache**: Ctrl+Shift+R (Chrome) ou Ctrl+F5 (outros navegadores)
5. **Verifique o formato**: Deve ser SVG, não PNG ou JPG

### Como saber qual categoria uma placa pertence?

O sistema detecta automaticamente pela **primeira letra** do código:

- **R-** → Regulamentação
- **A-** → Advertência  
- **ID-, OD-, ED-, SAU-, TNA-, THC-, TAD-, TAR-, TIT-** → Indicação

### Posso usar PNG ao invés de SVG?

**Não recomendado.** SVG é um formato vetorial que:
- ✅ Mantém qualidade em qualquer tamanho
- ✅ Arquivos muito menores
- ✅ Carregamento mais rápido
- ✅ Editável e escalável

### Onde encontro mais placas?

**Fontes confiáveis:**

1. **GitHub**: [sergio-ishii-pinhais/Brazil-PlacasDeTransito-SVG](https://github.com/sergio-ishii-pinhais/Brazil-PlacasDeTransito-SVG)
   - Coleção organizada por categoria
   - Placas vetoriais de alta qualidade

2. **Wikimedia Commons**: [commons.wikimedia.org](https://commons.wikimedia.org/)
   - Busque por "Brasil [código da placa]"
   - Imagens de domínio público

3. **Manual de Sinalização do CONTRAN**: [gov.br/transportes](https://www.gov.br/transportes/pt-br/assuntos/transito/senatran/manuais-brasileiros-de-sinalizacao-de-transito)
   - Especificações oficiais
   - PDFs com todas as placas

## 📊 Status da Cobertura

Para saber quantas placas você já tem no sistema:

1. Acesse a página de **Administração**
2. (Futuro) Haverá um painel mostrando:
   - Total de placas cadastradas no sistema
   - Quantas têm imagem disponível
   - Lista de placas sem imagem

## 🤝 Contribuindo

Se você baixou um conjunto grande de placas e quer compartilhar:

1. Organize os arquivos nas pastas corretas
2. Verifique se os nomes estão padronizados
3. Compartilhe a pasta `src/assets/placas` com outros usuários do sistema

## 📚 Referências

- [Código de Trânsito Brasileiro - CTB](http://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm)
- [Manual Brasileiro de Sinalização de Trânsito](https://www.gov.br/transportes/pt-br/assuntos/transito/senatran/manuais-brasileiros-de-sinalizacao-de-transito)
- [Resoluções do CONTRAN](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes)

---

**💡 Dica Final:** O sistema foi projetado para ser **extensível e fácil de usar**. Você não precisa adicionar todas as placas de uma vez — adicione apenas as que você realmente usa no dia a dia. O helper de download vai te guiar sempre que precisar! 🚀
