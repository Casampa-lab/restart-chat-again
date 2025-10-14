# Mapeamento Completo das Planilhas - Sistema de Supervisão

Este documento consolida a análise de todas as planilhas CADASTRO, NECESSIDADES e INTERVENÇÕES dos 7 grupos de elementos da rodovia.

## Resumo Executivo

| Grupo | Tipo Coordenadas | Campos CADASTRO | Campos NECESSIDADES | Status |
|-------|------------------|-----------------|---------------------|--------|
| Placas | Point | 25 campos | 15 campos | ✅ Completo |
| Marcas Longitudinais | Extension | 14 campos | 13 campos | ✅ Completo |
| Cilindros | Extension | 11 campos | 11 campos | ✅ Completo |
| Pórticos | Point | 9 campos | 9 campos | ✅ Completo |
| Defensas | Extension | 29 campos | 14 campos | ✅ Completo |
| Tachas | Extension | 16 campos | 16 campos | ✅ Completo |
| Zebrados/Inscrições | Point | 11 campos | 11 campos | ✅ Completo |

---

## 1. PLACAS (Point Coordinates)

### Características
- **Tipo de Coordenadas**: Point (Km, Latitude, Longitude)
- **Tabela**: `ficha_placa`
- **Campos Especiais**: Retrorefletância de fundo e orla/legenda separados

### Campos CADASTRO (25 campos)
1. BR
2. SNV
3. Tipo de Placa
4. Código da Placa
5. Velocidade (km/h)
6. Lado
7. Posição
8. Km
9. Latitude
10. Longitude
11. Tipo de Suporte
12. Quantidade de Suporte
13. Tipo de Substrato
14. Tipo (película fundo)
15. Cor (película fundo)
16. **Retrorrefletância (película fundo)** - cd.lux/m²
17. Tipo (película legenda/orla)
18. Cor (película/orla)
19. **Retrorrefletância (película legenda/orla)** - cd.lux/m²
20. Largura (m)
21. Altura (m)
22. Área (m²)
23. Data de Implantação
24. Número do Patrimônio
25. Fotografia (hiperlink)

### Campos NECESSIDADES (15 campos)
1. BR
2. UF
3. Código da Placa
4. Tipo
5. Altura (m)
6. Largura (m)
7. Área (m²)
8. Km
9. Lado
10. Latitude
11. Longitude
12. Velocidade
13. Substrato
14. Suporte
15. Distância (m)

**Observações**:
- NECESSIDADES não tem: Solução, Motivo, SNV, Serviço, Observação
- Correção: Retro do CADASTRO = Retro de orla/legenda (não de fundo como estava na V1)

---

## 2. MARCAS LONGITUDINAIS (Extension Coordinates)

### Características
- **Tipo de Coordenadas**: Extension (Km Inicial/Final, Lat/Long Inicial/Final)
- **Tabela**: `ficha_marcas_longitudinais`

### Campos CADASTRO (14 campos)
1. BR
2. SNV
3. Tipo de demarcação
4. Código
5. Cor
6. Posição
7. Largura da faixa (m)
8. Espessura (cm)
9. Trecho inicial - Km
10. Trecho final - Km
11. Extensão (km)
12. Material
13. Espaçamento (m)
14. Traço (m)

### Campos NECESSIDADES (13 campos)
1. BR
2. SNV
3. Tipo de demarcação
4. Código
5. Cor
6. Posição
7. Largura da faixa (m)
8. Espessura (cm)
9. Trecho inicial - Km
10. Trecho final - Km
11. Extensão (km)
12. Material
13. **Falta**: Solução, Motivo

**Observações**:
- NECESSIDADES não tem campos: Solução, Motivo

---

## 3. CILINDROS (Extension Coordinates)

### Características
- **Tipo de Coordenadas**: Extension (Km Inicial/Final, Lat/Long Inicial/Final)
- **Tabela**: `ficha_cilindros`
- **CORREÇÃO**: Usuário confirmou que são por extensão, não point

### Campos CADASTRO (11 campos)
1. BR
2. SNV
3. Km Inicial
4. Latitude Inicial
5. Longitude Inicial
6. Km Final
7. Latitude Final
8. Longitude Final
9. Extensão (km)
10. Espaçamento (m)
11. Quantidade (und)

### Campos NECESSIDADES (11 campos)
Idênticos ao CADASTRO

**Observações**:
- NECESSIDADES não tem: Solução, Motivo
- Campos de cores e tipo de refletivo estão na ficha mas não nas planilhas de necessidades

---

## 4. PÓRTICOS (Point Coordinates)

### Características
- **Tipo de Coordenadas**: Point (Km, Latitude, Longitude)
- **Tabela**: `ficha_porticos`

### Campos CADASTRO (9 campos)
1. BR
2. SNV
3. Tipo
4. Km
5. Latitude
6. Longitude
7. Vão horizontal (m)
8. Altura livre (m)
9. Fotografia

### Campos NECESSIDADES (9 campos)
Idênticos ao CADASTRO

**Observações**:
- NECESSIDADES não tem: Solução, Motivo
- Estrutura simples e completa

---

## 5. DEFENSAS (Extension Coordinates)

### Características
- **Tipo de Coordenadas**: Extension (Km Inicial/Final, Lat/Long Inicial/Final)
- **Tabela**: `defensas`
- **Complexidade**: Maior número de campos técnicos

### Campos CADASTRO (29 campos)
1. BR
2. SNV
3. Tramo
4. ID Defensa
5. Geometria
6. Km Inicial
7. Latitude Inicial
8. Longitude Inicial
9. Km Final
10. Latitude Final
11. Longitude Final
12. Extensão (m)
13. Classificação do nível de contenção
14. Nível de contenção (NCHRP350)
15. Nível de contenção (EN1317)
16. Funcionalidade
17. Lado
18. Tipo de defensa
19. Quantidade de lâminas
20. Comprimento total do tramo (m)
21. Adequação funcionalidade - Terminais
22. Adequação funcionalidade - Lâminas
23. Terminal de entrada
24. Terminal de saída
25. Distância bordo pista face defensa (m)
26. Distância face defensa obstáculo (m)
27. Distância pista obstáculo (m)
28. Especificação obstáculo fixo
29. Link fotografia

### Campos NECESSIDADES (14 campos)
1. BR
2. SNV
3. Tramo
4. km inicial
5. Latitude inicial
6. Longitude inicial
7. km final
8. Latitude final
9. Longitude final
10. Extensão (metros)
11. Tipo
12. Velocidade (km/h)
13. VMD (veíc/dia)
14. % veículos pesados

**Observações**:
- NECESSIDADES muito simplificado comparado ao CADASTRO
- Faltam: Solução, Motivo, e muitos campos técnicos do cadastro

---

## 6. TACHAS (Extension Coordinates)

### Características
- **Tipo de Coordenadas**: Extension (Km Inicial/Final, Lat/Long Inicial/Final)
- **Tabela**: `ficha_tachas`

### Campos CADASTRO (16 campos)
1. BR
2. SNV
3. Tipo de Marca
4. Código
5. Cor
6. Largura da faixa (m)
7. Espessura (cm)
8. Km Inicial
9. Latitude Inicial
10. Longitude Inicial
11. Km Final
12. Latitude Final
13. Longitude Final
14. Extensão (km)
15. Espaçamento/Cadência (m)
16. Quantidade (und)

### Campos NECESSIDADES (16 campos)
Idênticos ao CADASTRO

**Observações**:
- NECESSIDADES não tem: Solução, Motivo
- Estrutura bem definida e completa

---

## 7. ZEBRADOS/INSCRIÇÕES (Point Coordinates)

### Características
- **Tipo de Coordenadas**: Point (Km, Latitude, Longitude)
- **Tabela**: `ficha_inscricoes`
- **Campos Novos Adicionados**: `sigla`, `espessura_mm`

### Campos CADASTRO (11 campos)
1. BR
2. SNV
3. **Sigla** (ZPA, MOF, PEM, LEGENDA)
4. **Descrição** (texto longo)
5. Cor
6. Km
7. Latitude
8. Longitude
9. Material
10. **Outros materiais** (espessura em CADASTRO)
11. Área (m²)

### Campos NECESSIDADES (11 campos)
1. BR
2. SNV
3. **Sigla** (ZPA, MOF, PEM, LEGENDA)
4. **Descrição** (texto longo)
5. Cor
6. Km
7. Latitude
8. Longitude
9. Material
10. **Espessura (mm)** (explícito em NECESSIDADES)
11. Área (m²)

**Dicionário - Definições Importantes**:
- **Sigla**: Código de identificação do tipo marca transversal (ZPA, MOF, PEM, LEGENDA)
- **Descrição**: Nomenclatura exata do Manual Brasileiro de Sinalização Volume IV
- **Material**: "Termoplástico" para termoplástico por extrusão
- **Espessura**: Em mm, duas casas decimais (ex: 3,00 mm para termoplástico por extrusão)
- **Área**: Em m², duas casas decimais

**Observações**:
- NECESSIDADES não tem: Solução, Motivo
- Diferença entre CADASTRO e NECESSIDADES: "Outros materiais" vs "Espessura (mm)"
- Ambos representam a mesma coisa: espessura da inscrição

---

## Padrões Identificados

### 1. Campos Ausentes em NECESSIDADES
Todos os grupos de NECESSIDADES **NÃO** contêm:
- **Solução** (presente no planejamento/necessidades originais)
- **Motivo** (razão da necessidade)
- **Serviço** (tipo de serviço a ser executado)
- **Observação** (notas adicionais)

### 2. Tipos de Coordenadas
- **Point** (4 grupos): Placas, Pórticos, Zebrados/Inscrições
  - Campos: Km, Latitude, Longitude
  
- **Extension** (3 grupos): Marcas Longitudinais, Cilindros, Tachas, Defensas
  - Campos: Km Inicial/Final, Latitude Inicial/Final, Longitude Inicial/Final, Extensão

### 3. Campos Comuns a Todos
- BR (Rodovia)
- SNV (Segmento)
- Km ou Km Inicial/Final
- Coordenadas GPS

### 4. Retrorefletância (Placas)
- **CADASTRO**: Campo único "Retrorrefletância"
- **Correção aplicada**: Igualar com retro de orla/legenda (não de fundo)
- **Mudança normativa**: Passou a exigir duas medições (fundo e orla/legenda) devido ao uso de película refletiva no fundo

---

## Próximos Passos

### Implementações Necessárias

1. **Importação em Massa**
   - ✅ PLACAS - implementado
   - ⏳ MARCAS LONGITUDINAIS - a fazer
   - ⏳ CILINDROS - a fazer
   - ⏳ PÓRTICOS - a fazer
   - ⏳ DEFENSAS - a fazer
   - ⏳ TACHAS - a fazer
   - ⏳ ZEBRADOS - a fazer

2. **Formulários de Intervenção**
   - ✅ PLACAS - implementado
   - ✅ MARCAS LONGITUDINAIS - implementado
   - ✅ CILINDROS - implementado
   - ✅ PÓRTICOS - implementado
   - ✅ DEFENSAS - implementado
   - ✅ TACHAS - implementado
   - ✅ ZEBRADOS - atualizado com sigla e espessura_mm

3. **Reconciliação Cadastro ↔ Necessidades**
   - Algoritmo de matching por coordenadas GPS
   - Tolerância configurável (padrão: 50 metros)
   - Comparação de atributos-chave

4. **Inventário Dinâmico**
   - Estado real = Cadastro Inicial + Intervenções Executadas
   - Rastreabilidade completa via histórico
   - Aplicação de intervenções ao inventário

---

## Glossário de Siglas

- **BR**: Rodovia Federal Brasileira
- **SNV**: Segmento de Rodovia
- **ZPA**: Zebrado de Preenchimento de Área
- **MOF**: Mudança Obrigatória de Faixa
- **PEM**: Posicionamento na Pista para Execução de Movimentos
- **VMD**: Volume Médio Diário
- **GPS**: Global Positioning System
- **RLS**: Row Level Security (Segurança em Nível de Linha)

---

**Última Atualização**: 2025-10-14  
**Status**: Análise Completa dos 7 Grupos ✅
