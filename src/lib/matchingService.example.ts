/**
 * Exemplos de uso do matchingService.ts
 * Card 2: Branch por KM quando GPS faltar
 */

import { matchPontual } from './matchingService';

// ============================================
// CENÁRIO 1: COM GPS (Comportamento Normal)
// ============================================

export async function exemploComGPS() {
  const result = await matchPontual(
    'PLACA',
    -15.7801,    // latitude
    -47.9292,    // longitude
    'rodovia-uuid-123',
    {
      codigo: 'R-19',
      lado: 'Direita',
      tipo: 'Regulamentação'
      // km_inicial é opcional quando GPS está disponível
    },
    'Substituição'
  );
  
  console.log('Match com GPS:', result);
  // Possíveis decisões:
  // - MATCH_DIRECT: Placa idêntica no local (distância ≤ tol_dist_m)
  // - SUBSTITUICAO: Placa diferente no local (distância ≤ tol_dist_m, atributos divergentes)
  // - MULTIPLE_CANDIDATES: Múltiplas placas próximas (ambiguidade real)
  // - GRAY_ZONE: Candidato único na faixa cinza (tol_dist_m < dist ≤ tol_dist_substituicao_m)
  // - NO_MATCH: Nenhuma placa próxima
}

// ============================================
// CENÁRIO 2: SEM GPS - Fallback por KM
// ============================================

export async function exemploSemGPS() {
  const result = await matchPontual(
    'PLACA',
    null,        // ⚠️ GPS não disponível
    null,        // ⚠️ GPS não disponível
    'rodovia-uuid-123',
    {
      codigo: 'R-19',
      lado: 'Direita',
      tipo: 'Regulamentação',
      km_inicial: 42.350  // ✅ OBRIGATÓRIO quando GPS = null
    },
    'Substituição'
  );
  
  console.log('Match por KM:', result);
  // SQL internamente usa: abs(km_inv - km_nec) * 1000 ≤ tol_dist_substituicao_m
  // Exemplo: km_inv=42.352, km_nec=42.350 → dist = 2 metros
}

// ============================================
// CENÁRIO 3: Normalização de Atributos
// ============================================

export async function exemploNormalizacao() {
  const result1 = await matchPontual(
    'PLACA',
    null,
    null,
    'rodovia-uuid-123',
    {
      codigo: 'R 19',       // ← Será normalizado para 'R19' (remove espaços)
      lado: 'Direita',      // ← Será normalizado para 'BD'
      km_inicial: 10.5
    },
    'Substituição'
  );
  
  const result2 = await matchPontual(
    'PORTICO',
    -15.7801,
    -47.9292,
    'rodovia-uuid-123',
    {
      codigo: 'PMS-001',    // ← Será normalizado para 'PMS001'
      lado: 'Esquerda',     // ← Será normalizado para 'BE'
      tipo: 'Semipórtico'
    },
    'Manter'
  );
  
  // Normalização aplicada ANTES de comparar:
  // - lado: Direita/D → BD, Esquerda/E → BE, Eixo/Centro → EIXO
  // - codigo: UPPER + remove espaços (R 19 → R19, pms-001 → PMS001)
  
  console.log('Match normalizado 1:', result1);
  console.log('Match normalizado 2:', result2);
}

// ============================================
// CENÁRIO 4: Detecção de Múltiplos Candidatos
// ============================================

export async function exemploMultiplosCandidatos() {
  // Se existirem 2 placas R-19 a 5 metros da necessidade:
  const result = await matchPontual(
    'PLACA',
    -15.7801,
    -47.9292,
    'rodovia-uuid-123',
    {
      codigo: 'R-19',
      lado: 'Direita',
      km_inicial: 42.350
    },
    'Substituição'
  );
  
  // result.decision = 'AMBIGUOUS'
  // result.reason_code = 'MULTIPLE_CANDIDATES'
  // Significa: há 2+ placas dentro de tol_dist_m, não é possível decidir automaticamente
  
  console.log('Múltiplos candidatos detectados:', result);
  
  // ⚠️ Este caso precisa de triagem manual!
  // O coordenador deve decidir qual é a placa correta
}

// ============================================
// CENÁRIO 5: Faixa Cinza (Gray Zone)
// ============================================

export async function exemploFaixaCinza() {
  // Se a placa mais próxima estiver entre tol_dist_m e tol_dist_substituicao_m:
  // Exemplo: tol_dist_m=20m, tol_dist_substituicao_m=50m
  // Placa encontrada a 35 metros
  
  const result = await matchPontual(
    'PLACA',
    -15.7801,
    -47.9292,
    'rodovia-uuid-123',
    {
      codigo: 'R-19',
      lado: 'Direita'
    },
    'Substituição'
  );
  
  // result.decision = 'AMBIGUOUS'
  // result.reason_code = 'GRAY_ZONE' ou 'GRAY_ZONE_MULTIPLE'
  // Significa: candidato muito longe para ter certeza
  
  console.log('Candidato na faixa cinza:', result);
  
  // ⚠️ Triagem manual recomendada
  // Pode ser a placa correta deslocada, ou placa errada
}

// ============================================
// CENÁRIO 6: Validação de Entrada
// ============================================

export async function exemploValidacao() {
  try {
    // ❌ ERRO: Sem GPS e sem km_inicial
    await matchPontual(
      'PLACA',
      null,
      null,
      'rodovia-uuid-123',
      {
        codigo: 'R-19',
        lado: 'Direita'
        // km_inicial ausente!
      },
      'Substituição'
    );
  } catch (error) {
    console.error('Erro esperado:', error);
    // Error: "Necessário fornecer coordenadas GPS (lat/lon) ou km_inicial para matching"
  }
  
  try {
    // ❌ ERRO: km_inicial inválido
    await matchPontual(
      'PLACA',
      null,
      null,
      'rodovia-uuid-123',
      {
        codigo: 'R-19',
        km_inicial: 'quarenta e dois' // string não numérica
      },
      'Substituição'
    );
  } catch (error) {
    console.error('Erro esperado:', error);
    // Error: "km_inicial inválido: não é um número válido"
  }
}

// ============================================
// CENÁRIO 7: Conversão Automática de km_inicial
// ============================================

export async function exemploConversaoKM() {
  // km_inicial pode vir como string da planilha
  const result = await matchPontual(
    'PLACA',
    null,
    null,
    'rodovia-uuid-123',
    {
      codigo: 'R-19',
      lado: 'BD',
      km_inicial: '42.350' // ← String será convertida para Number(42.350)
    },
    'Substituição'
  );
  
  console.log('KM convertido automaticamente:', result);
  // ✅ Conversão automática de string para number
}
