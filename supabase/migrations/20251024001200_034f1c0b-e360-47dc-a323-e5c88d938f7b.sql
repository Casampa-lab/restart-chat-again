-- ============================================
-- Versão 1.2.0 - Inventário Dinâmico Universal
-- ============================================
-- Criação de views dinâmicas para todos os tipos de elementos
-- Cada view calcula automaticamente o status de reconciliação

-- ============================================
-- View: inventario_dinamico_defensas
-- ============================================
CREATE OR REPLACE VIEW inventario_dinamico_defensas AS
SELECT 
  d.*,
  CASE 
    WHEN d.origem = 'necessidade' AND d.ativo = true THEN 'approved'
    WHEN d.ativo = false THEN 'inactive'
    ELSE 'original'
  END as status_reconciliacao
FROM defensas d
WHERE d.ativo = true
ORDER BY d.km_inicial, d.created_at DESC;

-- ============================================
-- View: inventario_dinamico_porticos
-- ============================================
CREATE OR REPLACE VIEW inventario_dinamico_porticos AS
SELECT 
  p.*,
  CASE 
    WHEN p.origem = 'necessidade' AND p.ativo = true THEN 'approved'
    WHEN p.ativo = false THEN 'inactive'
    ELSE 'original'
  END as status_reconciliacao
FROM ficha_porticos p
WHERE p.ativo = true
ORDER BY p.km_inicial, p.created_at DESC;

-- ============================================
-- View: inventario_dinamico_tachas
-- ============================================
CREATE OR REPLACE VIEW inventario_dinamico_tachas AS
SELECT 
  t.*,
  CASE 
    WHEN t.origem = 'necessidade' AND t.ativo = true THEN 'approved'
    WHEN t.ativo = false THEN 'inactive'
    ELSE 'original'
  END as status_reconciliacao
FROM ficha_tachas t
WHERE t.ativo = true
ORDER BY t.km_inicial, t.created_at DESC;

-- ============================================
-- View: inventario_dinamico_inscricoes
-- ============================================
CREATE OR REPLACE VIEW inventario_dinamico_inscricoes AS
SELECT 
  i.*,
  CASE 
    WHEN i.origem = 'necessidade' AND i.ativo = true THEN 'approved'
    WHEN i.ativo = false THEN 'inactive'
    ELSE 'original'
  END as status_reconciliacao
FROM ficha_inscricoes i
WHERE i.ativo = true
ORDER BY i.km_inicial, i.created_at DESC;

-- ============================================
-- View: inventario_dinamico_marcas_longitudinais
-- ============================================
CREATE OR REPLACE VIEW inventario_dinamico_marcas_longitudinais AS
SELECT 
  m.*,
  CASE 
    WHEN m.origem = 'necessidade' AND m.ativo = true THEN 'approved'
    WHEN m.ativo = false THEN 'inactive'
    ELSE 'original'
  END as status_reconciliacao
FROM ficha_marcas_longitudinais m
WHERE m.ativo = true
ORDER BY m.km_inicial, m.created_at DESC;

-- ============================================
-- Conceder permissões de leitura para usuários autenticados
-- ============================================
GRANT SELECT ON inventario_dinamico_defensas TO authenticated;
GRANT SELECT ON inventario_dinamico_porticos TO authenticated;
GRANT SELECT ON inventario_dinamico_tachas TO authenticated;
GRANT SELECT ON inventario_dinamico_inscricoes TO authenticated;
GRANT SELECT ON inventario_dinamico_marcas_longitudinais TO authenticated;