-- Permitir coordenadores e admins atualizarem necessidades_placas
CREATE POLICY "Coordinators can update necessidades placas"
ON necessidades_placas
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'coordenador') OR 
  has_role(auth.uid(), 'admin')
);

-- Permitir coordenadores e admins atualizarem necessidades_defensas
CREATE POLICY "Coordinators can update necessidades defensas"
ON necessidades_defensas
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'coordenador') OR 
  has_role(auth.uid(), 'admin')
);

-- Permitir coordenadores e admins atualizarem necessidades_porticos
CREATE POLICY "Coordinators can update necessidades porticos"
ON necessidades_porticos
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'coordenador') OR 
  has_role(auth.uid(), 'admin')
);

-- Permitir coordenadores e admins atualizarem necessidades_marcas_longitudinais
CREATE POLICY "Coordinators can update necessidades ml"
ON necessidades_marcas_longitudinais
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'coordenador') OR 
  has_role(auth.uid(), 'admin')
);

-- Permitir coordenadores e admins atualizarem necessidades_marcas_transversais
CREATE POLICY "Coordinators can update necessidades mt"
ON necessidades_marcas_transversais
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'coordenador') OR 
  has_role(auth.uid(), 'admin')
);

-- Permitir coordenadores e admins atualizarem necessidades_cilindros
CREATE POLICY "Coordinators can update necessidades cil"
ON necessidades_cilindros
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'coordenador') OR 
  has_role(auth.uid(), 'admin')
);

-- Permitir coordenadores e admins atualizarem necessidades_tachas
CREATE POLICY "Coordinators can update necessidades tachas"
ON necessidades_tachas
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'coordenador') OR 
  has_role(auth.uid(), 'admin')
);