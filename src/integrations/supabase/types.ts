export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assinatura_modulos: {
        Row: {
          assinatura_id: string
          ativo: boolean | null
          created_at: string | null
          id: string
          modulo_id: string
        }
        Insert: {
          assinatura_id: string
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          modulo_id: string
        }
        Update: {
          assinatura_id?: string
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          modulo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assinatura_modulos_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinatura_modulos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas: {
        Row: {
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          empresa_id: string
          id: string
          plano_id: string
          status: Database["public"]["Enums"]["subscription_status"] | null
          trial_ate: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id: string
          id?: string
          plano_id: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_ate?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string
          id?: string
          plano_id?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_ate?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_sinalizacoes: {
        Row: {
          created_at: string | null
          descricao: string | null
          elemento_id: string
          id: string
          observacao_resolucao: string | null
          origem: string
          resolvido_em: string | null
          resolvido_por: string | null
          sinalizado_em: string | null
          sinalizado_por: string
          status: string | null
          tipo_elemento: string
          tipo_problema: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          elemento_id: string
          id?: string
          observacao_resolucao?: string | null
          origem: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          sinalizado_em?: string | null
          sinalizado_por: string
          status?: string | null
          tipo_elemento: string
          tipo_problema: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          elemento_id?: string
          id?: string
          observacao_resolucao?: string | null
          origem?: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          sinalizado_em?: string | null
          sinalizado_por?: string
          status?: string | null
          tipo_elemento?: string
          tipo_problema?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_sinalizacoes_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_sinalizacoes_sinalizado_por_fkey"
            columns: ["sinalizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          chave: string
          created_at: string | null
          descricao: string | null
          updated_at: string | null
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string | null
          descricao?: string | null
          updated_at?: string | null
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string | null
          descricao?: string | null
          updated_at?: string | null
          valor?: string
        }
        Relationships: []
      }
      coordinator_assignments: {
        Row: {
          created_at: string
          id: string
          lote_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lote_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lote_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordinator_assignments_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      defensas: {
        Row: {
          adequacao_funcionalidade_lamina: string | null
          adequacao_funcionalidade_laminas_inadequadas: string | null
          adequacao_funcionalidade_terminais: string | null
          adequacao_funcionalidade_terminais_inadequados: string | null
          br: string | null
          classificacao_nivel_contencao: string | null
          comprimento_total_tramo_m: number | null
          created_at: string
          data_ultima_modificacao: string | null
          data_vistoria: string
          distancia_bordo_pista_face_defensa_m: number | null
          distancia_face_defensa_obstaculo_m: number | null
          distancia_pista_obstaculo_m: number | null
          enviado_coordenador: boolean | null
          espaco_trabalho: string | null
          especificacao_obstaculo_fixo: string | null
          extensao_metros: number
          fotos_urls: string[] | null
          funcao: string | null
          geometria: string | null
          id: string
          id_defensa: string | null
          km_final: number
          km_inicial: number
          lado: string
          latitude_final: number | null
          latitude_inicial: number | null
          link_fotografia: string | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          modificado_por_intervencao: boolean | null
          nivel_contencao_en1317: string | null
          nivel_contencao_nchrp350: string | null
          origem: string | null
          percentual_veiculos_pesados: number | null
          quantidade_laminas: number | null
          risco: string | null
          rodovia_id: string
          snv: string | null
          terminal_entrada: string | null
          terminal_saida: string | null
          tipo_defensa: string
          tramo: string | null
          ultima_intervencao_id: string | null
          updated_at: string
          user_id: string
          velocidade_kmh: number | null
          vmd_veic_dia: number | null
        }
        Insert: {
          adequacao_funcionalidade_lamina?: string | null
          adequacao_funcionalidade_laminas_inadequadas?: string | null
          adequacao_funcionalidade_terminais?: string | null
          adequacao_funcionalidade_terminais_inadequados?: string | null
          br?: string | null
          classificacao_nivel_contencao?: string | null
          comprimento_total_tramo_m?: number | null
          created_at?: string
          data_ultima_modificacao?: string | null
          data_vistoria: string
          distancia_bordo_pista_face_defensa_m?: number | null
          distancia_face_defensa_obstaculo_m?: number | null
          distancia_pista_obstaculo_m?: number | null
          enviado_coordenador?: boolean | null
          espaco_trabalho?: string | null
          especificacao_obstaculo_fixo?: string | null
          extensao_metros: number
          fotos_urls?: string[] | null
          funcao?: string | null
          geometria?: string | null
          id?: string
          id_defensa?: string | null
          km_final: number
          km_inicial: number
          lado: string
          latitude_final?: number | null
          latitude_inicial?: number | null
          link_fotografia?: string | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          modificado_por_intervencao?: boolean | null
          nivel_contencao_en1317?: string | null
          nivel_contencao_nchrp350?: string | null
          origem?: string | null
          percentual_veiculos_pesados?: number | null
          quantidade_laminas?: number | null
          risco?: string | null
          rodovia_id: string
          snv?: string | null
          terminal_entrada?: string | null
          terminal_saida?: string | null
          tipo_defensa: string
          tramo?: string | null
          ultima_intervencao_id?: string | null
          updated_at?: string
          user_id: string
          velocidade_kmh?: number | null
          vmd_veic_dia?: number | null
        }
        Update: {
          adequacao_funcionalidade_lamina?: string | null
          adequacao_funcionalidade_laminas_inadequadas?: string | null
          adequacao_funcionalidade_terminais?: string | null
          adequacao_funcionalidade_terminais_inadequados?: string | null
          br?: string | null
          classificacao_nivel_contencao?: string | null
          comprimento_total_tramo_m?: number | null
          created_at?: string
          data_ultima_modificacao?: string | null
          data_vistoria?: string
          distancia_bordo_pista_face_defensa_m?: number | null
          distancia_face_defensa_obstaculo_m?: number | null
          distancia_pista_obstaculo_m?: number | null
          enviado_coordenador?: boolean | null
          espaco_trabalho?: string | null
          especificacao_obstaculo_fixo?: string | null
          extensao_metros?: number
          fotos_urls?: string[] | null
          funcao?: string | null
          geometria?: string | null
          id?: string
          id_defensa?: string | null
          km_final?: number
          km_inicial?: number
          lado?: string
          latitude_final?: number | null
          latitude_inicial?: number | null
          link_fotografia?: string | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          modificado_por_intervencao?: boolean | null
          nivel_contencao_en1317?: string | null
          nivel_contencao_nchrp350?: string | null
          origem?: string | null
          percentual_veiculos_pesados?: number | null
          quantidade_laminas?: number | null
          risco?: string | null
          rodovia_id?: string
          snv?: string | null
          terminal_entrada?: string | null
          terminal_saida?: string | null
          tipo_defensa?: string
          tramo?: string | null
          ultima_intervencao_id?: string | null
          updated_at?: string
          user_id?: string
          velocidade_kmh?: number | null
          vmd_veic_dia?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "defensas_ultima_intervencao_id_fkey"
            columns: ["ultima_intervencao_id"]
            isOneToOne: false
            referencedRelation: "defensas_intervencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      defensas_historico: {
        Row: {
          aplicado_por: string | null
          cadastro_id: string
          created_at: string | null
          dados_antes: Json
          dados_depois: Json
          id: string
          intervencao_id: string
          tipo_origem: string | null
        }
        Insert: {
          aplicado_por?: string | null
          cadastro_id: string
          created_at?: string | null
          dados_antes: Json
          dados_depois: Json
          id?: string
          intervencao_id: string
          tipo_origem?: string | null
        }
        Update: {
          aplicado_por?: string | null
          cadastro_id?: string
          created_at?: string | null
          dados_antes?: Json
          dados_depois?: Json
          id?: string
          intervencao_id?: string
          tipo_origem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "defensas_historico_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "defensas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defensas_historico_intervencao_id_fkey"
            columns: ["intervencao_id"]
            isOneToOne: false
            referencedRelation: "defensas_intervencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      defensas_intervencoes: {
        Row: {
          aplicado_ao_inventario: boolean | null
          coordenador_id: string | null
          created_at: string
          data_aprovacao_coordenador: string | null
          data_intervencao: string
          defensa_id: string
          estado_conservacao: string | null
          extensao_metros: number | null
          fora_plano_manutencao: boolean | null
          fotos_urls: string[] | null
          id: string
          justificativa_fora_plano: string | null
          km_final: number | null
          km_inicial: number | null
          lado: string | null
          latitude: number | null
          longitude: number | null
          motivo: string
          necessita_intervencao: boolean | null
          nivel_risco: string | null
          observacao: string | null
          observacao_coordenador: string | null
          pendente_aprovacao_coordenador: boolean | null
          snv: string | null
          tipo_avaria: string | null
          tipo_defensa: string | null
          tipo_origem: string | null
        }
        Insert: {
          aplicado_ao_inventario?: boolean | null
          coordenador_id?: string | null
          created_at?: string
          data_aprovacao_coordenador?: string | null
          data_intervencao: string
          defensa_id: string
          estado_conservacao?: string | null
          extensao_metros?: number | null
          fora_plano_manutencao?: boolean | null
          fotos_urls?: string[] | null
          id?: string
          justificativa_fora_plano?: string | null
          km_final?: number | null
          km_inicial?: number | null
          lado?: string | null
          latitude?: number | null
          longitude?: number | null
          motivo: string
          necessita_intervencao?: boolean | null
          nivel_risco?: string | null
          observacao?: string | null
          observacao_coordenador?: string | null
          pendente_aprovacao_coordenador?: boolean | null
          snv?: string | null
          tipo_avaria?: string | null
          tipo_defensa?: string | null
          tipo_origem?: string | null
        }
        Update: {
          aplicado_ao_inventario?: boolean | null
          coordenador_id?: string | null
          created_at?: string
          data_aprovacao_coordenador?: string | null
          data_intervencao?: string
          defensa_id?: string
          estado_conservacao?: string | null
          extensao_metros?: number | null
          fora_plano_manutencao?: boolean | null
          fotos_urls?: string[] | null
          id?: string
          justificativa_fora_plano?: string | null
          km_final?: number | null
          km_inicial?: number | null
          lado?: string | null
          latitude?: number | null
          longitude?: number | null
          motivo?: string
          necessita_intervencao?: boolean | null
          nivel_risco?: string | null
          observacao?: string | null
          observacao_coordenador?: string | null
          pendente_aprovacao_coordenador?: boolean | null
          snv?: string | null
          tipo_avaria?: string | null
          tipo_defensa?: string | null
          tipo_origem?: string | null
        }
        Relationships: []
      }
      destinatarios_email: {
        Row: {
          ativo: boolean
          created_at: string | null
          email: string
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          email: string
          id?: string
          nome: string
          tipo: string
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      elementos_pendentes_aprovacao: {
        Row: {
          coordenador_id: string | null
          created_at: string | null
          dados_elemento: Json
          data_decisao: string | null
          fotos_urls: string[] | null
          id: string
          justificativa: string
          lote_id: string
          observacao_coordenador: string | null
          rodovia_id: string
          status: string
          tipo_elemento: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          coordenador_id?: string | null
          created_at?: string | null
          dados_elemento: Json
          data_decisao?: string | null
          fotos_urls?: string[] | null
          id?: string
          justificativa: string
          lote_id: string
          observacao_coordenador?: string | null
          rodovia_id: string
          status?: string
          tipo_elemento: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          coordenador_id?: string | null
          created_at?: string | null
          dados_elemento?: Json
          data_decisao?: string | null
          fotos_urls?: string[] | null
          id?: string
          justificativa?: string
          lote_id?: string
          observacao_coordenador?: string | null
          rodovia_id?: string
          status?: string
          tipo_elemento?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elementos_pendentes_aprovacao_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elementos_pendentes_aprovacao_rodovia_id_fkey"
            columns: ["rodovia_id"]
            isOneToOne: false
            referencedRelation: "rodovias"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cnpj: string
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          cnpj: string
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          cnpj?: string
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      ficha_cilindros: {
        Row: {
          cor_corpo: string
          cor_refletivo: string | null
          created_at: string
          data_ultima_modificacao: string | null
          data_vistoria: string
          enviado_coordenador: boolean | null
          espacamento_m: number | null
          extensao_km: number | null
          fotos_urls: string[] | null
          id: string
          km_final: number
          km_inicial: number
          latitude_final: number | null
          latitude_inicial: number | null
          local_implantacao: string | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          modificado_por_intervencao: boolean | null
          observacao: string | null
          origem: string | null
          quantidade: number | null
          rodovia_id: string
          snv: string | null
          tipo_refletivo: string | null
          ultima_intervencao_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cor_corpo: string
          cor_refletivo?: string | null
          created_at?: string
          data_ultima_modificacao?: string | null
          data_vistoria?: string
          enviado_coordenador?: boolean | null
          espacamento_m?: number | null
          extensao_km?: number | null
          fotos_urls?: string[] | null
          id?: string
          km_final?: number
          km_inicial?: number
          latitude_final?: number | null
          latitude_inicial?: number | null
          local_implantacao?: string | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          modificado_por_intervencao?: boolean | null
          observacao?: string | null
          origem?: string | null
          quantidade?: number | null
          rodovia_id: string
          snv?: string | null
          tipo_refletivo?: string | null
          ultima_intervencao_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cor_corpo?: string
          cor_refletivo?: string | null
          created_at?: string
          data_ultima_modificacao?: string | null
          data_vistoria?: string
          enviado_coordenador?: boolean | null
          espacamento_m?: number | null
          extensao_km?: number | null
          fotos_urls?: string[] | null
          id?: string
          km_final?: number
          km_inicial?: number
          latitude_final?: number | null
          latitude_inicial?: number | null
          local_implantacao?: string | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          modificado_por_intervencao?: boolean | null
          observacao?: string | null
          origem?: string | null
          quantidade?: number | null
          rodovia_id?: string
          snv?: string | null
          tipo_refletivo?: string | null
          ultima_intervencao_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ficha_cilindros_ultima_intervencao_id_fkey"
            columns: ["ultima_intervencao_id"]
            isOneToOne: false
            referencedRelation: "ficha_cilindros_intervencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_cilindros_historico: {
        Row: {
          aplicado_por: string | null
          cadastro_id: string
          created_at: string | null
          dados_antes: Json
          dados_depois: Json
          id: string
          intervencao_id: string
          tipo_origem: string | null
        }
        Insert: {
          aplicado_por?: string | null
          cadastro_id: string
          created_at?: string | null
          dados_antes: Json
          dados_depois: Json
          id?: string
          intervencao_id: string
          tipo_origem?: string | null
        }
        Update: {
          aplicado_por?: string | null
          cadastro_id?: string
          created_at?: string | null
          dados_antes?: Json
          dados_depois?: Json
          id?: string
          intervencao_id?: string
          tipo_origem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ficha_cilindros_historico_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "ficha_cilindros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_cilindros_historico_intervencao_id_fkey"
            columns: ["intervencao_id"]
            isOneToOne: false
            referencedRelation: "ficha_cilindros_intervencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_cilindros_intervencoes: {
        Row: {
          aplicado_ao_inventario: boolean | null
          coordenador_id: string | null
          cor_corpo: string | null
          cor_refletivo: string | null
          created_at: string
          data_aprovacao_coordenador: string | null
          data_intervencao: string
          espacamento_m: number | null
          extensao_km: number | null
          ficha_cilindros_id: string
          fora_plano_manutencao: boolean | null
          fotos_urls: string[] | null
          id: string
          justificativa_fora_plano: string | null
          km_final: number | null
          km_inicial: number | null
          latitude: number | null
          local_implantacao: string | null
          longitude: number | null
          motivo: string
          observacao_coordenador: string | null
          pendente_aprovacao_coordenador: boolean | null
          quantidade: number | null
          snv: string | null
          tipo_origem: string | null
          tipo_refletivo: string | null
        }
        Insert: {
          aplicado_ao_inventario?: boolean | null
          coordenador_id?: string | null
          cor_corpo?: string | null
          cor_refletivo?: string | null
          created_at?: string
          data_aprovacao_coordenador?: string | null
          data_intervencao: string
          espacamento_m?: number | null
          extensao_km?: number | null
          ficha_cilindros_id: string
          fora_plano_manutencao?: boolean | null
          fotos_urls?: string[] | null
          id?: string
          justificativa_fora_plano?: string | null
          km_final?: number | null
          km_inicial?: number | null
          latitude?: number | null
          local_implantacao?: string | null
          longitude?: number | null
          motivo: string
          observacao_coordenador?: string | null
          pendente_aprovacao_coordenador?: boolean | null
          quantidade?: number | null
          snv?: string | null
          tipo_origem?: string | null
          tipo_refletivo?: string | null
        }
        Update: {
          aplicado_ao_inventario?: boolean | null
          coordenador_id?: string | null
          cor_corpo?: string | null
          cor_refletivo?: string | null
          created_at?: string
          data_aprovacao_coordenador?: string | null
          data_intervencao?: string
          espacamento_m?: number | null
          extensao_km?: number | null
          ficha_cilindros_id?: string
          fora_plano_manutencao?: boolean | null
          fotos_urls?: string[] | null
          id?: string
          justificativa_fora_plano?: string | null
          km_final?: number | null
          km_inicial?: number | null
          latitude?: number | null
          local_implantacao?: string | null
          longitude?: number | null
          motivo?: string
          observacao_coordenador?: string | null
          pendente_aprovacao_coordenador?: boolean | null
          quantidade?: number | null
          snv?: string | null
          tipo_origem?: string | null
          tipo_refletivo?: string | null
        }
        Relationships: []
      }
      ficha_inscricoes: {
        Row: {
          area_m2: number | null
          cor: string
          created_at: string
          data_ultima_modificacao: string | null
          data_vistoria: string
          dimensoes: string | null
          enviado_coordenador: boolean | null
          espessura_mm: number | null
          fotos_urls: string[] | null
          id: string
          km_final: number | null
          km_inicial: number | null
          latitude_final: number | null
          latitude_inicial: number | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          material_utilizado: string | null
          modificado_por_intervencao: boolean | null
          observacao: string | null
          origem: string | null
          outros_materiais: string | null
          rodovia_id: string
          sigla: string | null
          snv: string | null
          tipo_inscricao: string
          ultima_intervencao_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_m2?: number | null
          cor: string
          created_at?: string
          data_ultima_modificacao?: string | null
          data_vistoria: string
          dimensoes?: string | null
          enviado_coordenador?: boolean | null
          espessura_mm?: number | null
          fotos_urls?: string[] | null
          id?: string
          km_final?: number | null
          km_inicial?: number | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          material_utilizado?: string | null
          modificado_por_intervencao?: boolean | null
          observacao?: string | null
          origem?: string | null
          outros_materiais?: string | null
          rodovia_id: string
          sigla?: string | null
          snv?: string | null
          tipo_inscricao: string
          ultima_intervencao_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_m2?: number | null
          cor?: string
          created_at?: string
          data_ultima_modificacao?: string | null
          data_vistoria?: string
          dimensoes?: string | null
          enviado_coordenador?: boolean | null
          espessura_mm?: number | null
          fotos_urls?: string[] | null
          id?: string
          km_final?: number | null
          km_inicial?: number | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          material_utilizado?: string | null
          modificado_por_intervencao?: boolean | null
          observacao?: string | null
          origem?: string | null
          outros_materiais?: string | null
          rodovia_id?: string
          sigla?: string | null
          snv?: string | null
          tipo_inscricao?: string
          ultima_intervencao_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ficha_inscricoes_ultima_intervencao_id_fkey"
            columns: ["ultima_intervencao_id"]
            isOneToOne: false
            referencedRelation: "ficha_inscricoes_intervencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_inscricoes_historico: {
        Row: {
          aplicado_por: string | null
          cadastro_id: string
          created_at: string | null
          dados_antes: Json
          dados_depois: Json
          id: string
          intervencao_id: string
          tipo_origem: string | null
        }
        Insert: {
          aplicado_por?: string | null
          cadastro_id: string
          created_at?: string | null
          dados_antes: Json
          dados_depois: Json
          id?: string
          intervencao_id: string
          tipo_origem?: string | null
        }
        Update: {
          aplicado_por?: string | null
          cadastro_id?: string
          created_at?: string | null
          dados_antes?: Json
          dados_depois?: Json
          id?: string
          intervencao_id?: string
          tipo_origem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ficha_inscricoes_historico_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "ficha_inscricoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_inscricoes_historico_intervencao_id_fkey"
            columns: ["intervencao_id"]
            isOneToOne: false
            referencedRelation: "ficha_inscricoes_intervencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_inscricoes_intervencoes: {
        Row: {
          aplicado_ao_inventario: boolean | null
          area_m2: number | null
          coordenador_id: string | null
          cor: string | null
          created_at: string
          data_aprovacao_coordenador: string | null
          data_intervencao: string
          dimensoes: string | null
          espessura_mm: number | null
          estado_conservacao: string | null
          ficha_inscricoes_id: string
          fora_plano_manutencao: boolean | null
          fotos_urls: string[] | null
          id: string
          justificativa_fora_plano: string | null
          km_final: number | null
          km_inicial: number | null
          latitude: number | null
          longitude: number | null
          material_utilizado: string | null
          motivo: string
          observacao: string | null
          observacao_coordenador: string | null
          pendente_aprovacao_coordenador: boolean | null
          sigla: string | null
          snv: string | null
          tipo_inscricao: string | null
          tipo_origem: string | null
        }
        Insert: {
          aplicado_ao_inventario?: boolean | null
          area_m2?: number | null
          coordenador_id?: string | null
          cor?: string | null
          created_at?: string
          data_aprovacao_coordenador?: string | null
          data_intervencao: string
          dimensoes?: string | null
          espessura_mm?: number | null
          estado_conservacao?: string | null
          ficha_inscricoes_id: string
          fora_plano_manutencao?: boolean | null
          fotos_urls?: string[] | null
          id?: string
          justificativa_fora_plano?: string | null
          km_final?: number | null
          km_inicial?: number | null
          latitude?: number | null
          longitude?: number | null
          material_utilizado?: string | null
          motivo: string
          observacao?: string | null
          observacao_coordenador?: string | null
          pendente_aprovacao_coordenador?: boolean | null
          sigla?: string | null
          snv?: string | null
          tipo_inscricao?: string | null
          tipo_origem?: string | null
        }
        Update: {
          aplicado_ao_inventario?: boolean | null
          area_m2?: number | null
          coordenador_id?: string | null
          cor?: string | null
          created_at?: string
          data_aprovacao_coordenador?: string | null
          data_intervencao?: string
          dimensoes?: string | null
          espessura_mm?: number | null
          estado_conservacao?: string | null
          ficha_inscricoes_id?: string
          fora_plano_manutencao?: boolean | null
          fotos_urls?: string[] | null
          id?: string
          justificativa_fora_plano?: string | null
          km_final?: number | null
          km_inicial?: number | null
          latitude?: number | null
          longitude?: number | null
          material_utilizado?: string | null
          motivo?: string
          observacao?: string | null
          observacao_coordenador?: string | null
          pendente_aprovacao_coordenador?: boolean | null
          sigla?: string | null
          snv?: string | null
          tipo_inscricao?: string | null
          tipo_origem?: string | null
        }
        Relationships: []
      }
      ficha_marcas_longitudinais: {
        Row: {
          area_m2: number | null
          codigo: string | null
          cor: string | null
          created_at: string
          data_ultima_modificacao: string | null
          data_vistoria: string
          enviado_coordenador: boolean | null
          espacamento_m: number | null
          espessura_cm: number | null
          extensao_metros: number | null
          fotos_urls: string[] | null
          id: string
          km_final: number | null
          km_inicial: number | null
          largura_cm: number | null
          latitude_final: number | null
          latitude_inicial: number | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          material: string | null
          modificado_por_intervencao: boolean | null
          origem: string | null
          posicao: string | null
          rodovia_id: string
          snv: string | null
          tipo_demarcacao: string | null
          traco_m: number | null
          ultima_intervencao_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_m2?: number | null
          codigo?: string | null
          cor?: string | null
          created_at?: string
          data_ultima_modificacao?: string | null
          data_vistoria: string
          enviado_coordenador?: boolean | null
          espacamento_m?: number | null
          espessura_cm?: number | null
          extensao_metros?: number | null
          fotos_urls?: string[] | null
          id?: string
          km_final?: number | null
          km_inicial?: number | null
          largura_cm?: number | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          material?: string | null
          modificado_por_intervencao?: boolean | null
          origem?: string | null
          posicao?: string | null
          rodovia_id: string
          snv?: string | null
          tipo_demarcacao?: string | null
          traco_m?: number | null
          ultima_intervencao_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_m2?: number | null
          codigo?: string | null
          cor?: string | null
          created_at?: string
          data_ultima_modificacao?: string | null
          data_vistoria?: string
          enviado_coordenador?: boolean | null
          espacamento_m?: number | null
          espessura_cm?: number | null
          extensao_metros?: number | null
          fotos_urls?: string[] | null
          id?: string
          km_final?: number | null
          km_inicial?: number | null
          largura_cm?: number | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          material?: string | null
          modificado_por_intervencao?: boolean | null
          origem?: string | null
          posicao?: string | null
          rodovia_id?: string
          snv?: string | null
          tipo_demarcacao?: string | null
          traco_m?: number | null
          ultima_intervencao_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ficha_marcas_longitudinais_ultima_intervencao_id_fkey"
            columns: ["ultima_intervencao_id"]
            isOneToOne: false
            referencedRelation: "ficha_marcas_longitudinais_intervencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_marcas_longitudinais_historico: {
        Row: {
          aplicado_por: string | null
          cadastro_id: string
          created_at: string | null
          dados_antes: Json
          dados_depois: Json
          id: string
          intervencao_id: string
          tipo_origem: string | null
        }
        Insert: {
          aplicado_por?: string | null
          cadastro_id: string
          created_at?: string | null
          dados_antes: Json
          dados_depois: Json
          id?: string
          intervencao_id: string
          tipo_origem?: string | null
        }
        Update: {
          aplicado_por?: string | null
          cadastro_id?: string
          created_at?: string | null
          dados_antes?: Json
          dados_depois?: Json
          id?: string
          intervencao_id?: string
          tipo_origem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ficha_marcas_longitudinais_historico_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "ficha_marcas_longitudinais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_marcas_longitudinais_historico_intervencao_id_fkey"
            columns: ["intervencao_id"]
            isOneToOne: false
            referencedRelation: "ficha_marcas_longitudinais_intervencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_marcas_longitudinais_intervencoes: {
        Row: {
          aplicado_ao_inventario: boolean | null
          coordenador_id: string | null
          cor: string | null
          created_at: string
          data_aprovacao_coordenador: string | null
          data_intervencao: string
          espessura_cm: number | null
          estado_conservacao: string | null
          ficha_marcas_longitudinais_id: string
          fora_plano_manutencao: boolean | null
          fotos_urls: string[] | null
          id: string
          justificativa_fora_plano: string | null
          km_final: number | null
          km_inicial: number | null
          largura_cm: number | null
          latitude: number | null
          longitude: number | null
          material: string | null
          motivo: string
          observacao: string | null
          observacao_coordenador: string | null
          pendente_aprovacao_coordenador: boolean | null
          snv: string | null
          tipo_demarcacao: string | null
          tipo_origem: string | null
        }
        Insert: {
          aplicado_ao_inventario?: boolean | null
          coordenador_id?: string | null
          cor?: string | null
          created_at?: string
          data_aprovacao_coordenador?: string | null
          data_intervencao: string
          espessura_cm?: number | null
          estado_conservacao?: string | null
          ficha_marcas_longitudinais_id: string
          fora_plano_manutencao?: boolean | null
          fotos_urls?: string[] | null
          id?: string
          justificativa_fora_plano?: string | null
          km_final?: number | null
          km_inicial?: number | null
          largura_cm?: number | null
          latitude?: number | null
          longitude?: number | null
          material?: string | null
          motivo: string
          observacao?: string | null
          observacao_coordenador?: string | null
          pendente_aprovacao_coordenador?: boolean | null
          snv?: string | null
          tipo_demarcacao?: string | null
          tipo_origem?: string | null
        }
        Update: {
          aplicado_ao_inventario?: boolean | null
          coordenador_id?: string | null
          cor?: string | null
          created_at?: string
          data_aprovacao_coordenador?: string | null
          data_intervencao?: string
          espessura_cm?: number | null
          estado_conservacao?: string | null
          ficha_marcas_longitudinais_id?: string
          fora_plano_manutencao?: boolean | null
          fotos_urls?: string[] | null
          id?: string
          justificativa_fora_plano?: string | null
          km_final?: number | null
          km_inicial?: number | null
          largura_cm?: number | null
          latitude?: number | null
          longitude?: number | null
          material?: string | null
          motivo?: string
          observacao?: string | null
          observacao_coordenador?: string | null
          pendente_aprovacao_coordenador?: boolean | null
          snv?: string | null
          tipo_demarcacao?: string | null
          tipo_origem?: string | null
        }
        Relationships: []
      }
      ficha_placa: {
        Row: {
          altura_m: number | null
          area_m2: number | null
          br: string | null
          codigo: string | null
          contrato: string | null
          cor_pelicula_fundo: string | null
          cor_pelicula_legenda_orla: string | null
          created_at: string
          data_implantacao: string | null
          data_ultima_modificacao: string | null
          data_vistoria: string
          descricao: string | null
          detalhamento_pagina: number | null
          dimensoes_mm: string | null
          empresa: string | null
          enviado_coordenador: boolean | null
          foto_base_url: string | null
          foto_frontal_url: string | null
          foto_identificacao_url: string | null
          foto_lateral_url: string | null
          foto_posterior_url: string | null
          foto_url: string | null
          fotos_urls: string[] | null
          id: string
          km: number | null
          lado: string | null
          largura_m: number | null
          latitude_inicial: number | null
          link_fotografia: string | null
          longitude_inicial: number | null
          lote_id: string
          modelo: string | null
          modificado_por_intervencao: boolean | null
          numero_patrimonio: string | null
          origem: string | null
          posicao: string | null
          qtde_suporte: number | null
          retro_pelicula_fundo: number | null
          retro_pelicula_legenda_orla: number | null
          rodovia_id: string
          secao_suporte_mm: string | null
          si_sinal_impresso: string | null
          snv: string | null
          substrato: string | null
          suporte: string | null
          tipo: string | null
          tipo_pelicula_fundo: string | null
          tipo_pelicula_legenda_orla: string | null
          tipo_secao_suporte: string | null
          uf: string | null
          ultima_intervencao_id: string | null
          updated_at: string
          user_id: string
          velocidade: string | null
        }
        Insert: {
          altura_m?: number | null
          area_m2?: number | null
          br?: string | null
          codigo?: string | null
          contrato?: string | null
          cor_pelicula_fundo?: string | null
          cor_pelicula_legenda_orla?: string | null
          created_at?: string
          data_implantacao?: string | null
          data_ultima_modificacao?: string | null
          data_vistoria: string
          descricao?: string | null
          detalhamento_pagina?: number | null
          dimensoes_mm?: string | null
          empresa?: string | null
          enviado_coordenador?: boolean | null
          foto_base_url?: string | null
          foto_frontal_url?: string | null
          foto_identificacao_url?: string | null
          foto_lateral_url?: string | null
          foto_posterior_url?: string | null
          foto_url?: string | null
          fotos_urls?: string[] | null
          id?: string
          km?: number | null
          lado?: string | null
          largura_m?: number | null
          latitude_inicial?: number | null
          link_fotografia?: string | null
          longitude_inicial?: number | null
          lote_id: string
          modelo?: string | null
          modificado_por_intervencao?: boolean | null
          numero_patrimonio?: string | null
          origem?: string | null
          posicao?: string | null
          qtde_suporte?: number | null
          retro_pelicula_fundo?: number | null
          retro_pelicula_legenda_orla?: number | null
          rodovia_id: string
          secao_suporte_mm?: string | null
          si_sinal_impresso?: string | null
          snv?: string | null
          substrato?: string | null
          suporte?: string | null
          tipo?: string | null
          tipo_pelicula_fundo?: string | null
          tipo_pelicula_legenda_orla?: string | null
          tipo_secao_suporte?: string | null
          uf?: string | null
          ultima_intervencao_id?: string | null
          updated_at?: string
          user_id: string
          velocidade?: string | null
        }
        Update: {
          altura_m?: number | null
          area_m2?: number | null
          br?: string | null
          codigo?: string | null
          contrato?: string | null
          cor_pelicula_fundo?: string | null
          cor_pelicula_legenda_orla?: string | null
          created_at?: string
          data_implantacao?: string | null
          data_ultima_modificacao?: string | null
          data_vistoria?: string
          descricao?: string | null
          detalhamento_pagina?: number | null
          dimensoes_mm?: string | null
          empresa?: string | null
          enviado_coordenador?: boolean | null
          foto_base_url?: string | null
          foto_frontal_url?: string | null
          foto_identificacao_url?: string | null
          foto_lateral_url?: string | null
          foto_posterior_url?: string | null
          foto_url?: string | null
          fotos_urls?: string[] | null
          id?: string
          km?: number | null
          lado?: string | null
          largura_m?: number | null
          latitude_inicial?: number | null
          link_fotografia?: string | null
          longitude_inicial?: number | null
          lote_id?: string
          modelo?: string | null
          modificado_por_intervencao?: boolean | null
          numero_patrimonio?: string | null
          origem?: string | null
          posicao?: string | null
          qtde_suporte?: number | null
          retro_pelicula_fundo?: number | null
          retro_pelicula_legenda_orla?: number | null
          rodovia_id?: string
          secao_suporte_mm?: string | null
          si_sinal_impresso?: string | null
          snv?: string | null
          substrato?: string | null
          suporte?: string | null
          tipo?: string | null
          tipo_pelicula_fundo?: string | null
          tipo_pelicula_legenda_orla?: string | null
          tipo_secao_suporte?: string | null
          uf?: string | null
          ultima_intervencao_id?: string | null
          updated_at?: string
          user_id?: string
          velocidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ficha_placa_ultima_intervencao_id_fkey"
            columns: ["ultima_intervencao_id"]
            isOneToOne: false
            referencedRelation: "ficha_placa_intervencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_placa_danos: {
        Row: {
          created_at: string
          data_ocorrencia: string
          ficha_placa_id: string
          id: string
          observacao: string | null
          problema: string
          solucao: string | null
          vandalismo: boolean | null
        }
        Insert: {
          created_at?: string
          data_ocorrencia: string
          ficha_placa_id: string
          id?: string
          observacao?: string | null
          problema: string
          solucao?: string | null
          vandalismo?: boolean | null
        }
        Update: {
          created_at?: string
          data_ocorrencia?: string
          ficha_placa_id?: string
          id?: string
          observacao?: string | null
          problema?: string
          solucao?: string | null
          vandalismo?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ficha_placa_danos_ficha_placa_id_fkey"
            columns: ["ficha_placa_id"]
            isOneToOne: false
            referencedRelation: "ficha_placa"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_placa_historico: {
        Row: {
          aplicado_por: string | null
          cadastro_id: string
          created_at: string | null
          dados_antes: Json
          dados_depois: Json
          id: string
          intervencao_id: string
          tipo_origem: string | null
        }
        Insert: {
          aplicado_por?: string | null
          cadastro_id: string
          created_at?: string | null
          dados_antes: Json
          dados_depois: Json
          id?: string
          intervencao_id: string
          tipo_origem?: string | null
        }
        Update: {
          aplicado_por?: string | null
          cadastro_id?: string
          created_at?: string | null
          dados_antes?: Json
          dados_depois?: Json
          id?: string
          intervencao_id?: string
          tipo_origem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ficha_placa_historico_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "ficha_placa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_placa_historico_intervencao_id_fkey"
            columns: ["intervencao_id"]
            isOneToOne: false
            referencedRelation: "ficha_placa_intervencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_placa_intervencoes: {
        Row: {
          aplicado_ao_inventario: boolean | null
          coordenador_id: string | null
          created_at: string
          data_aprovacao_coordenador: string | null
          data_intervencao: string
          ficha_placa_id: string
          fora_plano_manutencao: boolean | null
          fotos_urls: string[] | null
          id: string
          justificativa_fora_plano: string | null
          latitude: number | null
          longitude: number | null
          motivo: string
          observacao_coordenador: string | null
          pendente_aprovacao_coordenador: boolean | null
          placa_recuperada: boolean | null
          retro_fundo: number | null
          retro_orla_legenda: number | null
          substrato: string | null
          suporte: string | null
          tipo_origem: string | null
          tipo_pelicula_fundo_novo: string | null
        }
        Insert: {
          aplicado_ao_inventario?: boolean | null
          coordenador_id?: string | null
          created_at?: string
          data_aprovacao_coordenador?: string | null
          data_intervencao: string
          ficha_placa_id: string
          fora_plano_manutencao?: boolean | null
          fotos_urls?: string[] | null
          id?: string
          justificativa_fora_plano?: string | null
          latitude?: number | null
          longitude?: number | null
          motivo: string
          observacao_coordenador?: string | null
          pendente_aprovacao_coordenador?: boolean | null
          placa_recuperada?: boolean | null
          retro_fundo?: number | null
          retro_orla_legenda?: number | null
          substrato?: string | null
          suporte?: string | null
          tipo_origem?: string | null
          tipo_pelicula_fundo_novo?: string | null
        }
        Update: {
          aplicado_ao_inventario?: boolean | null
          coordenador_id?: string | null
          created_at?: string
          data_aprovacao_coordenador?: string | null
          data_intervencao?: string
          ficha_placa_id?: string
          fora_plano_manutencao?: boolean | null
          fotos_urls?: string[] | null
          id?: string
          justificativa_fora_plano?: string | null
          latitude?: number | null
          longitude?: number | null
          motivo?: string
          observacao_coordenador?: string | null
          pendente_aprovacao_coordenador?: boolean | null
          placa_recuperada?: boolean | null
          retro_fundo?: number | null
          retro_orla_legenda?: number | null
          substrato?: string | null
          suporte?: string | null
          tipo_origem?: string | null
          tipo_pelicula_fundo_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ficha_placa_intervencoes_ficha_placa_id_fkey"
            columns: ["ficha_placa_id"]
            isOneToOne: false
            referencedRelation: "ficha_placa"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_porticos: {
        Row: {
          altura_livre_m: number | null
          created_at: string
          data_ultima_modificacao: string | null
          data_vistoria: string
          enviado_coordenador: boolean | null
          foto_url: string | null
          fotos_urls: string[] | null
          id: string
          km: number | null
          lado: string | null
          latitude_inicial: number | null
          longitude_inicial: number | null
          lote_id: string
          modificado_por_intervencao: boolean | null
          origem: string | null
          rodovia_id: string
          snv: string | null
          tipo: string
          ultima_intervencao_id: string | null
          updated_at: string
          user_id: string
          vao_horizontal_m: number | null
        }
        Insert: {
          altura_livre_m?: number | null
          created_at?: string
          data_ultima_modificacao?: string | null
          data_vistoria: string
          enviado_coordenador?: boolean | null
          foto_url?: string | null
          fotos_urls?: string[] | null
          id?: string
          km?: number | null
          lado?: string | null
          latitude_inicial?: number | null
          longitude_inicial?: number | null
          lote_id: string
          modificado_por_intervencao?: boolean | null
          origem?: string | null
          rodovia_id: string
          snv?: string | null
          tipo: string
          ultima_intervencao_id?: string | null
          updated_at?: string
          user_id: string
          vao_horizontal_m?: number | null
        }
        Update: {
          altura_livre_m?: number | null
          created_at?: string
          data_ultima_modificacao?: string | null
          data_vistoria?: string
          enviado_coordenador?: boolean | null
          foto_url?: string | null
          fotos_urls?: string[] | null
          id?: string
          km?: number | null
          lado?: string | null
          latitude_inicial?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          modificado_por_intervencao?: boolean | null
          origem?: string | null
          rodovia_id?: string
          snv?: string | null
          tipo?: string
          ultima_intervencao_id?: string | null
          updated_at?: string
          user_id?: string
          vao_horizontal_m?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ficha_porticos_ultima_intervencao_id_fkey"
            columns: ["ultima_intervencao_id"]
            isOneToOne: false
            referencedRelation: "ficha_porticos_intervencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_porticos_historico: {
        Row: {
          aplicado_por: string | null
          cadastro_id: string
          created_at: string | null
          dados_antes: Json
          dados_depois: Json
          id: string
          intervencao_id: string
          tipo_origem: string | null
        }
        Insert: {
          aplicado_por?: string | null
          cadastro_id: string
          created_at?: string | null
          dados_antes: Json
          dados_depois: Json
          id?: string
          intervencao_id: string
          tipo_origem?: string | null
        }
        Update: {
          aplicado_por?: string | null
          cadastro_id?: string
          created_at?: string | null
          dados_antes?: Json
          dados_depois?: Json
          id?: string
          intervencao_id?: string
          tipo_origem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ficha_porticos_historico_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "ficha_porticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_porticos_historico_intervencao_id_fkey"
            columns: ["intervencao_id"]
            isOneToOne: false
            referencedRelation: "ficha_porticos_intervencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_porticos_intervencoes: {
        Row: {
          altura_livre_m: number | null
          aplicado_ao_inventario: boolean | null
          coordenador_id: string | null
          created_at: string
          data_aprovacao_coordenador: string | null
          data_intervencao: string
          descricao: string | null
          ficha_porticos_id: string
          fora_plano_manutencao: boolean | null
          fotos_urls: string[] | null
          id: string
          justificativa_fora_plano: string | null
          km: number | null
          latitude: number | null
          longitude: number | null
          motivo: string
          observacao: string | null
          observacao_coordenador: string | null
          pendente_aprovacao_coordenador: boolean | null
          snv: string | null
          tipo: string | null
          tipo_origem: string | null
          vao_horizontal_m: number | null
        }
        Insert: {
          altura_livre_m?: number | null
          aplicado_ao_inventario?: boolean | null
          coordenador_id?: string | null
          created_at?: string
          data_aprovacao_coordenador?: string | null
          data_intervencao: string
          descricao?: string | null
          ficha_porticos_id: string
          fora_plano_manutencao?: boolean | null
          fotos_urls?: string[] | null
          id?: string
          justificativa_fora_plano?: string | null
          km?: number | null
          latitude?: number | null
          longitude?: number | null
          motivo: string
          observacao?: string | null
          observacao_coordenador?: string | null
          pendente_aprovacao_coordenador?: boolean | null
          snv?: string | null
          tipo?: string | null
          tipo_origem?: string | null
          vao_horizontal_m?: number | null
        }
        Update: {
          altura_livre_m?: number | null
          aplicado_ao_inventario?: boolean | null
          coordenador_id?: string | null
          created_at?: string
          data_aprovacao_coordenador?: string | null
          data_intervencao?: string
          descricao?: string | null
          ficha_porticos_id?: string
          fora_plano_manutencao?: boolean | null
          fotos_urls?: string[] | null
          id?: string
          justificativa_fora_plano?: string | null
          km?: number | null
          latitude?: number | null
          longitude?: number | null
          motivo?: string
          observacao?: string | null
          observacao_coordenador?: string | null
          pendente_aprovacao_coordenador?: boolean | null
          snv?: string | null
          tipo?: string | null
          tipo_origem?: string | null
          vao_horizontal_m?: number | null
        }
        Relationships: []
      }
      ficha_tachas: {
        Row: {
          cor_refletivo: string | null
          corpo: string | null
          created_at: string
          data_ultima_modificacao: string | null
          data_vistoria: string
          descricao: string | null
          enviado_coordenador: boolean | null
          espacamento_m: number | null
          extensao_km: number | null
          fotos_urls: string[] | null
          id: string
          km_final: number
          km_inicial: number
          latitude_final: number | null
          latitude_inicial: number | null
          local_implantacao: string | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          modificado_por_intervencao: boolean | null
          origem: string | null
          quantidade: number
          refletivo: string | null
          rodovia_id: string
          snv: string | null
          tipo_refletivo: string | null
          ultima_intervencao_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cor_refletivo?: string | null
          corpo?: string | null
          created_at?: string
          data_ultima_modificacao?: string | null
          data_vistoria: string
          descricao?: string | null
          enviado_coordenador?: boolean | null
          espacamento_m?: number | null
          extensao_km?: number | null
          fotos_urls?: string[] | null
          id?: string
          km_final: number
          km_inicial: number
          latitude_final?: number | null
          latitude_inicial?: number | null
          local_implantacao?: string | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          modificado_por_intervencao?: boolean | null
          origem?: string | null
          quantidade?: number
          refletivo?: string | null
          rodovia_id: string
          snv?: string | null
          tipo_refletivo?: string | null
          ultima_intervencao_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cor_refletivo?: string | null
          corpo?: string | null
          created_at?: string
          data_ultima_modificacao?: string | null
          data_vistoria?: string
          descricao?: string | null
          enviado_coordenador?: boolean | null
          espacamento_m?: number | null
          extensao_km?: number | null
          fotos_urls?: string[] | null
          id?: string
          km_final?: number
          km_inicial?: number
          latitude_final?: number | null
          latitude_inicial?: number | null
          local_implantacao?: string | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          modificado_por_intervencao?: boolean | null
          origem?: string | null
          quantidade?: number
          refletivo?: string | null
          rodovia_id?: string
          snv?: string | null
          tipo_refletivo?: string | null
          ultima_intervencao_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ficha_tachas_ultima_intervencao_id_fkey"
            columns: ["ultima_intervencao_id"]
            isOneToOne: false
            referencedRelation: "ficha_tachas_intervencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_tachas_historico: {
        Row: {
          aplicado_por: string | null
          cadastro_id: string
          created_at: string | null
          dados_antes: Json
          dados_depois: Json
          id: string
          intervencao_id: string
          tipo_origem: string | null
        }
        Insert: {
          aplicado_por?: string | null
          cadastro_id: string
          created_at?: string | null
          dados_antes: Json
          dados_depois: Json
          id?: string
          intervencao_id: string
          tipo_origem?: string | null
        }
        Update: {
          aplicado_por?: string | null
          cadastro_id?: string
          created_at?: string | null
          dados_antes?: Json
          dados_depois?: Json
          id?: string
          intervencao_id?: string
          tipo_origem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ficha_tachas_historico_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "ficha_tachas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_tachas_historico_intervencao_id_fkey"
            columns: ["intervencao_id"]
            isOneToOne: false
            referencedRelation: "ficha_tachas_intervencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_tachas_intervencoes: {
        Row: {
          aplicado_ao_inventario: boolean | null
          coordenador_id: string | null
          cor: string | null
          created_at: string
          data_aprovacao_coordenador: string | null
          data_intervencao: string
          descricao: string | null
          espacamento_m: number | null
          ficha_tachas_id: string
          fora_plano_manutencao: boolean | null
          fotos_urls: string[] | null
          id: string
          justificativa_fora_plano: string | null
          km_final: number | null
          km_inicial: number | null
          lado: string | null
          latitude: number | null
          longitude: number | null
          material: string | null
          motivo: string
          observacao: string | null
          observacao_coordenador: string | null
          pendente_aprovacao_coordenador: boolean | null
          quantidade: number | null
          snv: string | null
          tipo_origem: string | null
          tipo_refletivo: string | null
          tipo_tacha: string | null
        }
        Insert: {
          aplicado_ao_inventario?: boolean | null
          coordenador_id?: string | null
          cor?: string | null
          created_at?: string
          data_aprovacao_coordenador?: string | null
          data_intervencao: string
          descricao?: string | null
          espacamento_m?: number | null
          ficha_tachas_id: string
          fora_plano_manutencao?: boolean | null
          fotos_urls?: string[] | null
          id?: string
          justificativa_fora_plano?: string | null
          km_final?: number | null
          km_inicial?: number | null
          lado?: string | null
          latitude?: number | null
          longitude?: number | null
          material?: string | null
          motivo: string
          observacao?: string | null
          observacao_coordenador?: string | null
          pendente_aprovacao_coordenador?: boolean | null
          quantidade?: number | null
          snv?: string | null
          tipo_origem?: string | null
          tipo_refletivo?: string | null
          tipo_tacha?: string | null
        }
        Update: {
          aplicado_ao_inventario?: boolean | null
          coordenador_id?: string | null
          cor?: string | null
          created_at?: string
          data_aprovacao_coordenador?: string | null
          data_intervencao?: string
          descricao?: string | null
          espacamento_m?: number | null
          ficha_tachas_id?: string
          fora_plano_manutencao?: boolean | null
          fotos_urls?: string[] | null
          id?: string
          justificativa_fora_plano?: string | null
          km_final?: number | null
          km_inicial?: number | null
          lado?: string | null
          latitude?: number | null
          longitude?: number | null
          material?: string | null
          motivo?: string
          observacao?: string | null
          observacao_coordenador?: string | null
          pendente_aprovacao_coordenador?: boolean | null
          quantidade?: number | null
          snv?: string | null
          tipo_origem?: string | null
          tipo_refletivo?: string | null
          tipo_tacha?: string | null
        }
        Relationships: []
      }
      ficha_verificacao: {
        Row: {
          aprovado_coordenador_em: string | null
          contrato: string | null
          coordenador_id: string | null
          created_at: string
          data_verificacao: string
          empresa: string | null
          enviado_coordenador: boolean | null
          enviado_coordenador_em: string | null
          id: string
          lote_id: string
          observacao_coordenador: string | null
          rejeitado_coordenador_em: string | null
          rodovia_id: string
          snv: string | null
          status: string | null
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aprovado_coordenador_em?: string | null
          contrato?: string | null
          coordenador_id?: string | null
          created_at?: string
          data_verificacao: string
          empresa?: string | null
          enviado_coordenador?: boolean | null
          enviado_coordenador_em?: string | null
          id?: string
          lote_id: string
          observacao_coordenador?: string | null
          rejeitado_coordenador_em?: string | null
          rodovia_id: string
          snv?: string | null
          status?: string | null
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aprovado_coordenador_em?: string | null
          contrato?: string | null
          coordenador_id?: string | null
          created_at?: string
          data_verificacao?: string
          empresa?: string | null
          enviado_coordenador?: boolean | null
          enviado_coordenador_em?: string | null
          id?: string
          lote_id?: string
          observacao_coordenador?: string | null
          rejeitado_coordenador_em?: string | null
          rodovia_id?: string
          snv?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ficha_verificacao_coordenador_id_fkey"
            columns: ["coordenador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_verificacao_itens: {
        Row: {
          afastamento_conforme: boolean | null
          afastamento_m: number | null
          afastamento_obs: string | null
          altura_conforme: boolean | null
          altura_m: number | null
          altura_obs: string | null
          created_at: string
          data_imp_verso: boolean | null
          data_imp_verso_conforme: boolean | null
          data_imp_verso_obs: string | null
          data_implantacao: string | null
          data_implantacao_conforme: boolean | null
          data_implantacao_obs: string | null
          dimensoes_conforme: boolean | null
          dimensoes_m: string | null
          dimensoes_obs: string | null
          ficha_id: string
          foto_url: string
          id: string
          km: number | null
          largura_cm: number | null
          largura_conforme: boolean | null
          largura_obs: string | null
          latitude: number | null
          letra_conforme: boolean | null
          letra_mm: number | null
          letra_obs: string | null
          longitude: number | null
          marcas: string | null
          marcas_conforme: boolean | null
          marcas_obs: string | null
          material: string | null
          material_conforme: boolean | null
          material_obs: string | null
          ordem: number
          pelicula: string | null
          pelicula_conforme: boolean | null
          pelicula_obs: string | null
          qtde_suporte: number | null
          qtde_suporte_conforme: boolean | null
          qtde_suporte_obs: string | null
          retro_bd: number | null
          retro_bd_conforme: boolean | null
          retro_bd_medicoes: Json | null
          retro_bd_obs: string | null
          retro_be: number | null
          retro_be_conforme: boolean | null
          retro_be_medicoes: Json | null
          retro_be_obs: string | null
          retro_e: number | null
          retro_e_conforme: boolean | null
          retro_e_medicoes: Json | null
          retro_e_obs: string | null
          retro_sv: number | null
          retro_sv_conforme: boolean | null
          retro_sv_obs: string | null
          sentido: string | null
          substrato: string | null
          substrato_conforme: boolean | null
          substrato_obs: string | null
          suporte: string | null
          suporte_conforme: boolean | null
          suporte_obs: string | null
          tachas: string | null
          tachas_conforme: boolean | null
          tachas_obs: string | null
          tipo_placa: string | null
          tipo_placa_conforme: boolean | null
          tipo_placa_obs: string | null
          velocidade: string | null
          velocidade_conforme: boolean | null
          velocidade_obs: string | null
        }
        Insert: {
          afastamento_conforme?: boolean | null
          afastamento_m?: number | null
          afastamento_obs?: string | null
          altura_conforme?: boolean | null
          altura_m?: number | null
          altura_obs?: string | null
          created_at?: string
          data_imp_verso?: boolean | null
          data_imp_verso_conforme?: boolean | null
          data_imp_verso_obs?: string | null
          data_implantacao?: string | null
          data_implantacao_conforme?: boolean | null
          data_implantacao_obs?: string | null
          dimensoes_conforme?: boolean | null
          dimensoes_m?: string | null
          dimensoes_obs?: string | null
          ficha_id: string
          foto_url: string
          id?: string
          km?: number | null
          largura_cm?: number | null
          largura_conforme?: boolean | null
          largura_obs?: string | null
          latitude?: number | null
          letra_conforme?: boolean | null
          letra_mm?: number | null
          letra_obs?: string | null
          longitude?: number | null
          marcas?: string | null
          marcas_conforme?: boolean | null
          marcas_obs?: string | null
          material?: string | null
          material_conforme?: boolean | null
          material_obs?: string | null
          ordem: number
          pelicula?: string | null
          pelicula_conforme?: boolean | null
          pelicula_obs?: string | null
          qtde_suporte?: number | null
          qtde_suporte_conforme?: boolean | null
          qtde_suporte_obs?: string | null
          retro_bd?: number | null
          retro_bd_conforme?: boolean | null
          retro_bd_medicoes?: Json | null
          retro_bd_obs?: string | null
          retro_be?: number | null
          retro_be_conforme?: boolean | null
          retro_be_medicoes?: Json | null
          retro_be_obs?: string | null
          retro_e?: number | null
          retro_e_conforme?: boolean | null
          retro_e_medicoes?: Json | null
          retro_e_obs?: string | null
          retro_sv?: number | null
          retro_sv_conforme?: boolean | null
          retro_sv_obs?: string | null
          sentido?: string | null
          substrato?: string | null
          substrato_conforme?: boolean | null
          substrato_obs?: string | null
          suporte?: string | null
          suporte_conforme?: boolean | null
          suporte_obs?: string | null
          tachas?: string | null
          tachas_conforme?: boolean | null
          tachas_obs?: string | null
          tipo_placa?: string | null
          tipo_placa_conforme?: boolean | null
          tipo_placa_obs?: string | null
          velocidade?: string | null
          velocidade_conforme?: boolean | null
          velocidade_obs?: string | null
        }
        Update: {
          afastamento_conforme?: boolean | null
          afastamento_m?: number | null
          afastamento_obs?: string | null
          altura_conforme?: boolean | null
          altura_m?: number | null
          altura_obs?: string | null
          created_at?: string
          data_imp_verso?: boolean | null
          data_imp_verso_conforme?: boolean | null
          data_imp_verso_obs?: string | null
          data_implantacao?: string | null
          data_implantacao_conforme?: boolean | null
          data_implantacao_obs?: string | null
          dimensoes_conforme?: boolean | null
          dimensoes_m?: string | null
          dimensoes_obs?: string | null
          ficha_id?: string
          foto_url?: string
          id?: string
          km?: number | null
          largura_cm?: number | null
          largura_conforme?: boolean | null
          largura_obs?: string | null
          latitude?: number | null
          letra_conforme?: boolean | null
          letra_mm?: number | null
          letra_obs?: string | null
          longitude?: number | null
          marcas?: string | null
          marcas_conforme?: boolean | null
          marcas_obs?: string | null
          material?: string | null
          material_conforme?: boolean | null
          material_obs?: string | null
          ordem?: number
          pelicula?: string | null
          pelicula_conforme?: boolean | null
          pelicula_obs?: string | null
          qtde_suporte?: number | null
          qtde_suporte_conforme?: boolean | null
          qtde_suporte_obs?: string | null
          retro_bd?: number | null
          retro_bd_conforme?: boolean | null
          retro_bd_medicoes?: Json | null
          retro_bd_obs?: string | null
          retro_be?: number | null
          retro_be_conforme?: boolean | null
          retro_be_medicoes?: Json | null
          retro_be_obs?: string | null
          retro_e?: number | null
          retro_e_conforme?: boolean | null
          retro_e_medicoes?: Json | null
          retro_e_obs?: string | null
          retro_sv?: number | null
          retro_sv_conforme?: boolean | null
          retro_sv_obs?: string | null
          sentido?: string | null
          substrato?: string | null
          substrato_conforme?: boolean | null
          substrato_obs?: string | null
          suporte?: string | null
          suporte_conforme?: boolean | null
          suporte_obs?: string | null
          tachas?: string | null
          tachas_conforme?: boolean | null
          tachas_obs?: string | null
          tipo_placa?: string | null
          tipo_placa_conforme?: boolean | null
          tipo_placa_obs?: string | null
          velocidade?: string | null
          velocidade_conforme?: boolean | null
          velocidade_obs?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ficha_verificacao_itens_ficha_id_fkey"
            columns: ["ficha_id"]
            isOneToOne: false
            referencedRelation: "ficha_verificacao"
            referencedColumns: ["id"]
          },
        ]
      }
      frentes_liberadas: {
        Row: {
          created_at: string
          data_liberacao: string
          enviado_coordenador: boolean | null
          extensao_contratada: number | null
          id: string
          km_final: number
          km_inicial: number
          latitude_final: number | null
          latitude_inicial: number | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          observacao: string | null
          portaria_aprovacao_projeto: string
          rodovia_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_liberacao: string
          enviado_coordenador?: boolean | null
          extensao_contratada?: number | null
          id?: string
          km_final: number
          km_inicial: number
          latitude_final?: number | null
          latitude_inicial?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          observacao?: string | null
          portaria_aprovacao_projeto: string
          rodovia_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_liberacao?: string
          enviado_coordenador?: boolean | null
          extensao_contratada?: number | null
          id?: string
          km_final?: number
          km_inicial?: number
          latitude_final?: number | null
          latitude_inicial?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          observacao?: string | null
          portaria_aprovacao_projeto?: string
          rodovia_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      importacoes_log: {
        Row: {
          created_at: string
          id: string
          lote_id: string
          rodovia_id: string
          tipo_inventario: string
          total_registros: number
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lote_id: string
          rodovia_id: string
          tipo_inventario: string
          total_registros?: number
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lote_id?: string
          rodovia_id?: string
          tipo_inventario?: string
          total_registros?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "importacoes_log_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importacoes_log_rodovia_id_fkey"
            columns: ["rodovia_id"]
            isOneToOne: false
            referencedRelation: "rodovias"
            referencedColumns: ["id"]
          },
        ]
      }
      intervencoes_cilindros: {
        Row: {
          cor_corpo: string
          cor_refletivo: string | null
          created_at: string
          data_intervencao: string
          enviado_coordenador: boolean | null
          espacamento_m: number | null
          extensao_km: number | null
          id: string
          km_final: number
          km_inicial: number
          latitude_final: number | null
          latitude_inicial: number | null
          local_implantacao: string | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          observacao: string | null
          quantidade: number | null
          rodovia_id: string
          snv: string | null
          tipo_refletivo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cor_corpo: string
          cor_refletivo?: string | null
          created_at?: string
          data_intervencao: string
          enviado_coordenador?: boolean | null
          espacamento_m?: number | null
          extensao_km?: number | null
          id?: string
          km_final: number
          km_inicial: number
          latitude_final?: number | null
          latitude_inicial?: number | null
          local_implantacao?: string | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          observacao?: string | null
          quantidade?: number | null
          rodovia_id: string
          snv?: string | null
          tipo_refletivo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cor_corpo?: string
          cor_refletivo?: string | null
          created_at?: string
          data_intervencao?: string
          enviado_coordenador?: boolean | null
          espacamento_m?: number | null
          extensao_km?: number | null
          id?: string
          km_final?: number
          km_inicial?: number
          latitude_final?: number | null
          latitude_inicial?: number | null
          local_implantacao?: string | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          observacao?: string | null
          quantidade?: number | null
          rodovia_id?: string
          snv?: string | null
          tipo_refletivo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      intervencoes_inscricoes: {
        Row: {
          area_m2: number
          cor: string
          created_at: string
          data_intervencao: string
          dimensoes: string | null
          enviado_coordenador: boolean | null
          fora_plano_manutencao: boolean | null
          id: string
          justificativa_fora_plano: string | null
          km_final: number
          km_inicial: number
          latitude_final: number | null
          latitude_inicial: number | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          material_utilizado: string | null
          observacao: string | null
          rodovia_id: string
          tipo_inscricao: string
          tipo_intervencao: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_m2: number
          cor: string
          created_at?: string
          data_intervencao: string
          dimensoes?: string | null
          enviado_coordenador?: boolean | null
          fora_plano_manutencao?: boolean | null
          id?: string
          justificativa_fora_plano?: string | null
          km_final: number
          km_inicial: number
          latitude_final?: number | null
          latitude_inicial?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          material_utilizado?: string | null
          observacao?: string | null
          rodovia_id: string
          tipo_inscricao: string
          tipo_intervencao: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_m2?: number
          cor?: string
          created_at?: string
          data_intervencao?: string
          dimensoes?: string | null
          enviado_coordenador?: boolean | null
          fora_plano_manutencao?: boolean | null
          id?: string
          justificativa_fora_plano?: string | null
          km_final?: number
          km_inicial?: number
          latitude_final?: number | null
          latitude_inicial?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          material_utilizado?: string | null
          observacao?: string | null
          rodovia_id?: string
          tipo_inscricao?: string
          tipo_intervencao?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      intervencoes_porticos: {
        Row: {
          altura_livre_m: number | null
          created_at: string
          data_intervencao: string
          enviado_coordenador: boolean | null
          estado_conservacao: string
          id: string
          km: number
          lado: string | null
          latitude: number | null
          longitude: number | null
          lote_id: string
          observacao: string | null
          rodovia_id: string
          snv: string | null
          tipo: string
          tipo_intervencao: string
          updated_at: string
          user_id: string
          vao_horizontal_m: number | null
        }
        Insert: {
          altura_livre_m?: number | null
          created_at?: string
          data_intervencao: string
          enviado_coordenador?: boolean | null
          estado_conservacao: string
          id?: string
          km: number
          lado?: string | null
          latitude?: number | null
          longitude?: number | null
          lote_id: string
          observacao?: string | null
          rodovia_id: string
          snv?: string | null
          tipo: string
          tipo_intervencao: string
          updated_at?: string
          user_id: string
          vao_horizontal_m?: number | null
        }
        Update: {
          altura_livre_m?: number | null
          created_at?: string
          data_intervencao?: string
          enviado_coordenador?: boolean | null
          estado_conservacao?: string
          id?: string
          km?: number
          lado?: string | null
          latitude?: number | null
          longitude?: number | null
          lote_id?: string
          observacao?: string | null
          rodovia_id?: string
          snv?: string | null
          tipo?: string
          tipo_intervencao?: string
          updated_at?: string
          user_id?: string
          vao_horizontal_m?: number | null
        }
        Relationships: []
      }
      intervencoes_sh: {
        Row: {
          area_m2: number
          cor: string
          created_at: string
          data_intervencao: string
          enviado_coordenador: boolean | null
          espessura_cm: number | null
          fora_plano_manutencao: boolean | null
          id: string
          justificativa_fora_plano: string | null
          km_final: number
          km_inicial: number
          latitude_final: number | null
          latitude_inicial: number | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          material_utilizado: string | null
          observacao: string | null
          rodovia_id: string
          tipo_demarcacao: string
          tipo_intervencao: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_m2: number
          cor: string
          created_at?: string
          data_intervencao: string
          enviado_coordenador?: boolean | null
          espessura_cm?: number | null
          fora_plano_manutencao?: boolean | null
          id?: string
          justificativa_fora_plano?: string | null
          km_final: number
          km_inicial: number
          latitude_final?: number | null
          latitude_inicial?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          material_utilizado?: string | null
          observacao?: string | null
          rodovia_id: string
          tipo_demarcacao: string
          tipo_intervencao: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_m2?: number
          cor?: string
          created_at?: string
          data_intervencao?: string
          enviado_coordenador?: boolean | null
          espessura_cm?: number | null
          fora_plano_manutencao?: boolean | null
          id?: string
          justificativa_fora_plano?: string | null
          km_final?: number
          km_inicial?: number
          latitude_final?: number | null
          latitude_inicial?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          material_utilizado?: string | null
          observacao?: string | null
          rodovia_id?: string
          tipo_demarcacao?: string
          tipo_intervencao?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      intervencoes_sv: {
        Row: {
          codigo_placa: string | null
          created_at: string
          data_intervencao: string
          dimensoes: string | null
          enviado_coordenador: boolean | null
          estado_conservacao: string
          fora_plano_manutencao: boolean | null
          id: string
          justificativa_fora_plano: string | null
          km_referencia: number
          lado: string
          latitude: number | null
          longitude: number | null
          lote_id: string
          material: string | null
          observacao: string | null
          quantidade: number
          rodovia_id: string
          tipo_intervencao: string
          tipo_placa: string
          tipo_suporte: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          codigo_placa?: string | null
          created_at?: string
          data_intervencao: string
          dimensoes?: string | null
          enviado_coordenador?: boolean | null
          estado_conservacao: string
          fora_plano_manutencao?: boolean | null
          id?: string
          justificativa_fora_plano?: string | null
          km_referencia: number
          lado: string
          latitude?: number | null
          longitude?: number | null
          lote_id: string
          material?: string | null
          observacao?: string | null
          quantidade?: number
          rodovia_id: string
          tipo_intervencao: string
          tipo_placa: string
          tipo_suporte?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          codigo_placa?: string | null
          created_at?: string
          data_intervencao?: string
          dimensoes?: string | null
          enviado_coordenador?: boolean | null
          estado_conservacao?: string
          fora_plano_manutencao?: boolean | null
          id?: string
          justificativa_fora_plano?: string | null
          km_referencia?: number
          lado?: string
          latitude?: number | null
          longitude?: number | null
          lote_id?: string
          material?: string | null
          observacao?: string | null
          quantidade?: number
          rodovia_id?: string
          tipo_intervencao?: string
          tipo_placa?: string
          tipo_suporte?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      intervencoes_tacha: {
        Row: {
          cor_refletivo: string | null
          corpo: string | null
          created_at: string
          data_intervencao: string
          descricao: string | null
          enviado_coordenador: boolean | null
          espacamento_m: number | null
          fora_plano_manutencao: boolean | null
          id: string
          justificativa_fora_plano: string | null
          km_final: number
          km_inicial: number
          latitude_final: number | null
          latitude_inicial: number | null
          local_implantacao: string | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          observacao: string | null
          quantidade: number
          refletivo: string | null
          rodovia_id: string
          snv: string | null
          tipo_intervencao: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cor_refletivo?: string | null
          corpo?: string | null
          created_at?: string
          data_intervencao: string
          descricao?: string | null
          enviado_coordenador?: boolean | null
          espacamento_m?: number | null
          fora_plano_manutencao?: boolean | null
          id?: string
          justificativa_fora_plano?: string | null
          km_final: number
          km_inicial: number
          latitude_final?: number | null
          latitude_inicial?: number | null
          local_implantacao?: string | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          observacao?: string | null
          quantidade?: number
          refletivo?: string | null
          rodovia_id: string
          snv?: string | null
          tipo_intervencao: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cor_refletivo?: string | null
          corpo?: string | null
          created_at?: string
          data_intervencao?: string
          descricao?: string | null
          enviado_coordenador?: boolean | null
          espacamento_m?: number | null
          fora_plano_manutencao?: boolean | null
          id?: string
          justificativa_fora_plano?: string | null
          km_final?: number
          km_inicial?: number
          latitude_final?: number | null
          latitude_inicial?: number | null
          local_implantacao?: string | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          observacao?: string | null
          quantidade?: number
          refletivo?: string | null
          rodovia_id?: string
          snv?: string | null
          tipo_intervencao?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lotes: {
        Row: {
          contrato: string | null
          created_at: string | null
          email_executora: string | null
          email_fiscal_execucao: string | null
          empresa_id: string
          extensao_total_km: number | null
          id: string
          nome_fiscal_execucao: string | null
          numero: string
          responsavel_executora: string | null
          supervisora_id: string
          tolerancia_match_metros: number | null
          unidade_administrativa: string | null
        }
        Insert: {
          contrato?: string | null
          created_at?: string | null
          email_executora?: string | null
          email_fiscal_execucao?: string | null
          empresa_id: string
          extensao_total_km?: number | null
          id?: string
          nome_fiscal_execucao?: string | null
          numero: string
          responsavel_executora?: string | null
          supervisora_id: string
          tolerancia_match_metros?: number | null
          unidade_administrativa?: string | null
        }
        Update: {
          contrato?: string | null
          created_at?: string | null
          email_executora?: string | null
          email_fiscal_execucao?: string | null
          empresa_id?: string
          extensao_total_km?: number | null
          id?: string
          nome_fiscal_execucao?: string | null
          numero?: string
          responsavel_executora?: string | null
          supervisora_id?: string
          tolerancia_match_metros?: number | null
          unidade_administrativa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lotes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_supervisora_id_fkey"
            columns: ["supervisora_id"]
            isOneToOne: false
            referencedRelation: "supervisoras"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes_rodovias: {
        Row: {
          extensao_km: number | null
          id: string
          km_final: number | null
          km_inicial: number | null
          latitude_final: number | null
          latitude_inicial: number | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          rodovia_id: string
          snv_final: string | null
          snv_inicial: string | null
        }
        Insert: {
          extensao_km?: number | null
          id?: string
          km_final?: number | null
          km_inicial?: number | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          rodovia_id: string
          snv_final?: string | null
          snv_inicial?: string | null
        }
        Update: {
          extensao_km?: number | null
          id?: string
          km_final?: number | null
          km_inicial?: number | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          rodovia_id?: string
          snv_final?: string | null
          snv_inicial?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lotes_rodovias_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_rodovias_rodovia_id_fkey"
            columns: ["rodovia_id"]
            isOneToOne: false
            referencedRelation: "rodovias"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      nao_conformidades: {
        Row: {
          aprovado_por: string | null
          comentarios_executora: string | null
          comentarios_supervisora: string | null
          contrato_supervisora: string | null
          created_at: string | null
          data_aprovacao: string | null
          data_atendimento: string | null
          data_notificacao: string | null
          data_ocorrencia: string
          data_sincronizacao: string | null
          deleted: boolean
          descricao_problema: string | null
          empresa: string
          enviado_coordenador: boolean | null
          grau: string | null
          id: string
          km_final: number | null
          km_inicial: number | null
          km_referencia: number | null
          latitude: number | null
          latitude_final: number | null
          latitude_inicial: number | null
          longitude: number | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          natureza: string | null
          numero_nc: string
          observacao: string | null
          observacao_coordenador: string | null
          prazo_atendimento: number | null
          problema_identificado: string | null
          rodovia_id: string
          sincronizado_sharepoint: boolean | null
          situacao: string | null
          snv: string | null
          status_aprovacao: string | null
          tipo_nc: string | null
          tipo_obra: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aprovado_por?: string | null
          comentarios_executora?: string | null
          comentarios_supervisora?: string | null
          contrato_supervisora?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_atendimento?: string | null
          data_notificacao?: string | null
          data_ocorrencia: string
          data_sincronizacao?: string | null
          deleted?: boolean
          descricao_problema?: string | null
          empresa: string
          enviado_coordenador?: boolean | null
          grau?: string | null
          id?: string
          km_final?: number | null
          km_inicial?: number | null
          km_referencia?: number | null
          latitude?: number | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          longitude?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          natureza?: string | null
          numero_nc: string
          observacao?: string | null
          observacao_coordenador?: string | null
          prazo_atendimento?: number | null
          problema_identificado?: string | null
          rodovia_id: string
          sincronizado_sharepoint?: boolean | null
          situacao?: string | null
          snv?: string | null
          status_aprovacao?: string | null
          tipo_nc?: string | null
          tipo_obra?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aprovado_por?: string | null
          comentarios_executora?: string | null
          comentarios_supervisora?: string | null
          contrato_supervisora?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_atendimento?: string | null
          data_notificacao?: string | null
          data_ocorrencia?: string
          data_sincronizacao?: string | null
          deleted?: boolean
          descricao_problema?: string | null
          empresa?: string
          enviado_coordenador?: boolean | null
          grau?: string | null
          id?: string
          km_final?: number | null
          km_inicial?: number | null
          km_referencia?: number | null
          latitude?: number | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          longitude?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          natureza?: string | null
          numero_nc?: string
          observacao?: string | null
          observacao_coordenador?: string | null
          prazo_atendimento?: number | null
          problema_identificado?: string | null
          rodovia_id?: string
          sincronizado_sharepoint?: boolean | null
          situacao?: string | null
          snv?: string | null
          status_aprovacao?: string | null
          tipo_nc?: string | null
          tipo_obra?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nao_conformidades_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nao_conformidades_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nao_conformidades_rodovia_id_fkey"
            columns: ["rodovia_id"]
            isOneToOne: false
            referencedRelation: "rodovias"
            referencedColumns: ["id"]
          },
        ]
      }
      nao_conformidades_fotos: {
        Row: {
          created_at: string
          descricao: string | null
          foto_url: string
          id: string
          latitude: number | null
          longitude: number | null
          nc_id: string
          ordem: number
          sentido: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          foto_url: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nc_id: string
          ordem: number
          sentido?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          foto_url?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nc_id?: string
          ordem?: number
          sentido?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nao_conformidades_fotos_nc_id_fkey"
            columns: ["nc_id"]
            isOneToOne: false
            referencedRelation: "nao_conformidades"
            referencedColumns: ["id"]
          },
        ]
      }
      necessidades_cilindros: {
        Row: {
          arquivo_origem: string | null
          cadastro_id: string | null
          cor_corpo: string | null
          cor_refletivo: string | null
          created_at: string | null
          data_importacao: string | null
          data_reconciliacao: string | null
          divergencia: boolean | null
          espacamento_m: number | null
          extensao_km: number | null
          id: string
          justificativa_reconciliacao: string | null
          km_final: number | null
          km_inicial: number | null
          latitude_final: number | null
          latitude_inicial: number | null
          linha_planilha: number | null
          local_implantacao: string | null
          localizado_em_campo: boolean | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          motivo: string | null
          observacao: string | null
          observacao_usuario: string | null
          quantidade: number | null
          reconciliado: boolean | null
          reconciliado_por: string | null
          rodovia_id: string
          servico: string
          servico_final: string | null
          servico_inferido: string | null
          snv: string | null
          solicitado_em: string | null
          solicitado_por: string | null
          solucao_planilha: string | null
          tipo_refletivo: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          arquivo_origem?: string | null
          cadastro_id?: string | null
          cor_corpo?: string | null
          cor_refletivo?: string | null
          created_at?: string | null
          data_importacao?: string | null
          data_reconciliacao?: string | null
          divergencia?: boolean | null
          espacamento_m?: number | null
          extensao_km?: number | null
          id?: string
          justificativa_reconciliacao?: string | null
          km_final?: number | null
          km_inicial?: number | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          linha_planilha?: number | null
          local_implantacao?: string | null
          localizado_em_campo?: boolean | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          motivo?: string | null
          observacao?: string | null
          observacao_usuario?: string | null
          quantidade?: number | null
          reconciliado?: boolean | null
          reconciliado_por?: string | null
          rodovia_id: string
          servico: string
          servico_final?: string | null
          servico_inferido?: string | null
          snv?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          solucao_planilha?: string | null
          tipo_refletivo?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          arquivo_origem?: string | null
          cadastro_id?: string | null
          cor_corpo?: string | null
          cor_refletivo?: string | null
          created_at?: string | null
          data_importacao?: string | null
          data_reconciliacao?: string | null
          divergencia?: boolean | null
          espacamento_m?: number | null
          extensao_km?: number | null
          id?: string
          justificativa_reconciliacao?: string | null
          km_final?: number | null
          km_inicial?: number | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          linha_planilha?: number | null
          local_implantacao?: string | null
          localizado_em_campo?: boolean | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          motivo?: string | null
          observacao?: string | null
          observacao_usuario?: string | null
          quantidade?: number | null
          reconciliado?: boolean | null
          reconciliado_por?: string | null
          rodovia_id?: string
          servico?: string
          servico_final?: string | null
          servico_inferido?: string | null
          snv?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          solucao_planilha?: string | null
          tipo_refletivo?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "necessidades_cilindros_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "ficha_cilindros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "necessidades_cilindros_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "necessidades_cilindros_rodovia_id_fkey"
            columns: ["rodovia_id"]
            isOneToOne: false
            referencedRelation: "rodovias"
            referencedColumns: ["id"]
          },
        ]
      }
      necessidades_defensas: {
        Row: {
          adequacao_funcionalidade_lamina: string | null
          adequacao_funcionalidade_laminas_inadequadas: string | null
          adequacao_funcionalidade_terminais: string | null
          adequacao_funcionalidade_terminais_inadequados: string | null
          arquivo_origem: string | null
          br: string | null
          cadastro_id: string | null
          classificacao_nivel_contencao: string | null
          comprimento_total_tramo_m: number | null
          created_at: string | null
          data_importacao: string | null
          data_reconciliacao: string | null
          distancia_bordo_pista_face_defensa_m: number | null
          distancia_face_defensa_obstaculo_m: number | null
          distancia_pista_obstaculo_m: number | null
          divergencia: boolean | null
          espaco_trabalho: string | null
          especificacao_obstaculo_fixo: string | null
          estado_conservacao: string | null
          extensao_metros: number | null
          funcao: string | null
          geometria: string | null
          id: string
          id_defensa: string | null
          justificativa_reconciliacao: string | null
          km_final: number | null
          km_inicial: number | null
          lado: string | null
          latitude_final: number | null
          latitude_inicial: number | null
          linha_planilha: number | null
          localizado_em_campo: boolean | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          motivo: string | null
          nivel_contencao_en1317: string | null
          nivel_contencao_nchrp350: string | null
          nivel_risco: string | null
          observacao: string | null
          observacao_usuario: string | null
          percentual_veiculos_pesados: number | null
          quantidade_laminas: number | null
          reconciliado: boolean | null
          reconciliado_por: string | null
          risco: string | null
          rodovia_id: string
          servico: string
          servico_final: string | null
          servico_inferido: string | null
          snv: string | null
          solicitado_em: string | null
          solicitado_por: string | null
          solucao_planilha: string | null
          status_revisao: string | null
          terminal_entrada: string | null
          terminal_saida: string | null
          tipo_avaria: string | null
          tipo_defensa: string | null
          tramo: string | null
          updated_at: string | null
          user_id: string
          velocidade_kmh: number | null
          vmd_veic_dia: number | null
        }
        Insert: {
          adequacao_funcionalidade_lamina?: string | null
          adequacao_funcionalidade_laminas_inadequadas?: string | null
          adequacao_funcionalidade_terminais?: string | null
          adequacao_funcionalidade_terminais_inadequados?: string | null
          arquivo_origem?: string | null
          br?: string | null
          cadastro_id?: string | null
          classificacao_nivel_contencao?: string | null
          comprimento_total_tramo_m?: number | null
          created_at?: string | null
          data_importacao?: string | null
          data_reconciliacao?: string | null
          distancia_bordo_pista_face_defensa_m?: number | null
          distancia_face_defensa_obstaculo_m?: number | null
          distancia_pista_obstaculo_m?: number | null
          divergencia?: boolean | null
          espaco_trabalho?: string | null
          especificacao_obstaculo_fixo?: string | null
          estado_conservacao?: string | null
          extensao_metros?: number | null
          funcao?: string | null
          geometria?: string | null
          id?: string
          id_defensa?: string | null
          justificativa_reconciliacao?: string | null
          km_final?: number | null
          km_inicial?: number | null
          lado?: string | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          linha_planilha?: number | null
          localizado_em_campo?: boolean | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          motivo?: string | null
          nivel_contencao_en1317?: string | null
          nivel_contencao_nchrp350?: string | null
          nivel_risco?: string | null
          observacao?: string | null
          observacao_usuario?: string | null
          percentual_veiculos_pesados?: number | null
          quantidade_laminas?: number | null
          reconciliado?: boolean | null
          reconciliado_por?: string | null
          risco?: string | null
          rodovia_id: string
          servico: string
          servico_final?: string | null
          servico_inferido?: string | null
          snv?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          solucao_planilha?: string | null
          status_revisao?: string | null
          terminal_entrada?: string | null
          terminal_saida?: string | null
          tipo_avaria?: string | null
          tipo_defensa?: string | null
          tramo?: string | null
          updated_at?: string | null
          user_id: string
          velocidade_kmh?: number | null
          vmd_veic_dia?: number | null
        }
        Update: {
          adequacao_funcionalidade_lamina?: string | null
          adequacao_funcionalidade_laminas_inadequadas?: string | null
          adequacao_funcionalidade_terminais?: string | null
          adequacao_funcionalidade_terminais_inadequados?: string | null
          arquivo_origem?: string | null
          br?: string | null
          cadastro_id?: string | null
          classificacao_nivel_contencao?: string | null
          comprimento_total_tramo_m?: number | null
          created_at?: string | null
          data_importacao?: string | null
          data_reconciliacao?: string | null
          distancia_bordo_pista_face_defensa_m?: number | null
          distancia_face_defensa_obstaculo_m?: number | null
          distancia_pista_obstaculo_m?: number | null
          divergencia?: boolean | null
          espaco_trabalho?: string | null
          especificacao_obstaculo_fixo?: string | null
          estado_conservacao?: string | null
          extensao_metros?: number | null
          funcao?: string | null
          geometria?: string | null
          id?: string
          id_defensa?: string | null
          justificativa_reconciliacao?: string | null
          km_final?: number | null
          km_inicial?: number | null
          lado?: string | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          linha_planilha?: number | null
          localizado_em_campo?: boolean | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          motivo?: string | null
          nivel_contencao_en1317?: string | null
          nivel_contencao_nchrp350?: string | null
          nivel_risco?: string | null
          observacao?: string | null
          observacao_usuario?: string | null
          percentual_veiculos_pesados?: number | null
          quantidade_laminas?: number | null
          reconciliado?: boolean | null
          reconciliado_por?: string | null
          risco?: string | null
          rodovia_id?: string
          servico?: string
          servico_final?: string | null
          servico_inferido?: string | null
          snv?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          solucao_planilha?: string | null
          status_revisao?: string | null
          terminal_entrada?: string | null
          terminal_saida?: string | null
          tipo_avaria?: string | null
          tipo_defensa?: string | null
          tramo?: string | null
          updated_at?: string | null
          user_id?: string
          velocidade_kmh?: number | null
          vmd_veic_dia?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "necessidades_defensas_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "defensas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "necessidades_defensas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "necessidades_defensas_rodovia_id_fkey"
            columns: ["rodovia_id"]
            isOneToOne: false
            referencedRelation: "rodovias"
            referencedColumns: ["id"]
          },
        ]
      }
      necessidades_marcas_longitudinais: {
        Row: {
          area_m2: number | null
          arquivo_origem: string | null
          cadastro_id: string | null
          codigo: string | null
          cor: string | null
          created_at: string | null
          data_importacao: string | null
          data_reconciliacao: string | null
          divergencia: boolean | null
          espacamento_m: number | null
          espessura_cm: number | null
          estado_conservacao: string | null
          extensao_metros: number | null
          id: string
          justificativa_reconciliacao: string | null
          km_final: number | null
          km_inicial: number | null
          largura_cm: number | null
          latitude_final: number | null
          latitude_inicial: number | null
          linha_planilha: number | null
          localizado_em_campo: boolean | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          material: string | null
          observacao: string | null
          observacao_usuario: string | null
          posicao: string | null
          reconciliado: boolean | null
          reconciliado_por: string | null
          rodovia_id: string
          servico: string
          servico_final: string | null
          servico_inferido: string | null
          snv: string | null
          solicitado_em: string | null
          solicitado_por: string | null
          solucao_planilha: string | null
          status_revisao: string | null
          tipo_demarcacao: string | null
          traco_m: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          area_m2?: number | null
          arquivo_origem?: string | null
          cadastro_id?: string | null
          codigo?: string | null
          cor?: string | null
          created_at?: string | null
          data_importacao?: string | null
          data_reconciliacao?: string | null
          divergencia?: boolean | null
          espacamento_m?: number | null
          espessura_cm?: number | null
          estado_conservacao?: string | null
          extensao_metros?: number | null
          id?: string
          justificativa_reconciliacao?: string | null
          km_final?: number | null
          km_inicial?: number | null
          largura_cm?: number | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          linha_planilha?: number | null
          localizado_em_campo?: boolean | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          material?: string | null
          observacao?: string | null
          observacao_usuario?: string | null
          posicao?: string | null
          reconciliado?: boolean | null
          reconciliado_por?: string | null
          rodovia_id: string
          servico: string
          servico_final?: string | null
          servico_inferido?: string | null
          snv?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          solucao_planilha?: string | null
          status_revisao?: string | null
          tipo_demarcacao?: string | null
          traco_m?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          area_m2?: number | null
          arquivo_origem?: string | null
          cadastro_id?: string | null
          codigo?: string | null
          cor?: string | null
          created_at?: string | null
          data_importacao?: string | null
          data_reconciliacao?: string | null
          divergencia?: boolean | null
          espacamento_m?: number | null
          espessura_cm?: number | null
          estado_conservacao?: string | null
          extensao_metros?: number | null
          id?: string
          justificativa_reconciliacao?: string | null
          km_final?: number | null
          km_inicial?: number | null
          largura_cm?: number | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          linha_planilha?: number | null
          localizado_em_campo?: boolean | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          material?: string | null
          observacao?: string | null
          observacao_usuario?: string | null
          posicao?: string | null
          reconciliado?: boolean | null
          reconciliado_por?: string | null
          rodovia_id?: string
          servico?: string
          servico_final?: string | null
          servico_inferido?: string | null
          snv?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          solucao_planilha?: string | null
          status_revisao?: string | null
          tipo_demarcacao?: string | null
          traco_m?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "necessidades_marcas_longitudinais_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "ficha_marcas_longitudinais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "necessidades_marcas_longitudinais_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "necessidades_marcas_longitudinais_rodovia_id_fkey"
            columns: ["rodovia_id"]
            isOneToOne: false
            referencedRelation: "rodovias"
            referencedColumns: ["id"]
          },
        ]
      }
      necessidades_marcas_transversais: {
        Row: {
          area_m2: number | null
          arquivo_origem: string | null
          cadastro_id: string | null
          cor: string | null
          created_at: string | null
          data_importacao: string | null
          data_reconciliacao: string | null
          descricao: string | null
          dimensoes: string | null
          divergencia: boolean | null
          espessura_mm: number | null
          estado_conservacao: string | null
          id: string
          justificativa_reconciliacao: string | null
          km: number | null
          km_final: number | null
          km_inicial: number | null
          latitude: number | null
          latitude_final: number | null
          latitude_inicial: number | null
          linha_planilha: number | null
          localizado_em_campo: boolean | null
          longitude: number | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          material_utilizado: string | null
          observacao: string | null
          observacao_usuario: string | null
          reconciliado: boolean | null
          reconciliado_por: string | null
          rodovia_id: string
          servico: string
          servico_final: string | null
          servico_inferido: string | null
          sigla: string | null
          snv: string | null
          solicitado_em: string | null
          solicitado_por: string | null
          solucao_planilha: string | null
          tipo_inscricao: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          area_m2?: number | null
          arquivo_origem?: string | null
          cadastro_id?: string | null
          cor?: string | null
          created_at?: string | null
          data_importacao?: string | null
          data_reconciliacao?: string | null
          descricao?: string | null
          dimensoes?: string | null
          divergencia?: boolean | null
          espessura_mm?: number | null
          estado_conservacao?: string | null
          id?: string
          justificativa_reconciliacao?: string | null
          km?: number | null
          km_final?: number | null
          km_inicial?: number | null
          latitude?: number | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          linha_planilha?: number | null
          localizado_em_campo?: boolean | null
          longitude?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          material_utilizado?: string | null
          observacao?: string | null
          observacao_usuario?: string | null
          reconciliado?: boolean | null
          reconciliado_por?: string | null
          rodovia_id: string
          servico: string
          servico_final?: string | null
          servico_inferido?: string | null
          sigla?: string | null
          snv?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          solucao_planilha?: string | null
          tipo_inscricao?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          area_m2?: number | null
          arquivo_origem?: string | null
          cadastro_id?: string | null
          cor?: string | null
          created_at?: string | null
          data_importacao?: string | null
          data_reconciliacao?: string | null
          descricao?: string | null
          dimensoes?: string | null
          divergencia?: boolean | null
          espessura_mm?: number | null
          estado_conservacao?: string | null
          id?: string
          justificativa_reconciliacao?: string | null
          km?: number | null
          km_final?: number | null
          km_inicial?: number | null
          latitude?: number | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          linha_planilha?: number | null
          localizado_em_campo?: boolean | null
          longitude?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          material_utilizado?: string | null
          observacao?: string | null
          observacao_usuario?: string | null
          reconciliado?: boolean | null
          reconciliado_por?: string | null
          rodovia_id?: string
          servico?: string
          servico_final?: string | null
          servico_inferido?: string | null
          sigla?: string | null
          snv?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          solucao_planilha?: string | null
          tipo_inscricao?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "necessidades_marcas_transversais_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "ficha_inscricoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "necessidades_marcas_transversais_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "necessidades_marcas_transversais_rodovia_id_fkey"
            columns: ["rodovia_id"]
            isOneToOne: false
            referencedRelation: "rodovias"
            referencedColumns: ["id"]
          },
        ]
      }
      necessidades_placas: {
        Row: {
          altura_m: number | null
          area_m2: number | null
          arquivo_origem: string | null
          br: string | null
          cadastro_id: string | null
          codigo: string | null
          created_at: string | null
          data_importacao: string | null
          data_reconciliacao: string | null
          dimensoes_mm: string | null
          distancia_m: number | null
          divergencia: boolean | null
          id: string
          justificativa_reconciliacao: string | null
          km: number | null
          lado: string | null
          latitude: number | null
          linha_planilha: number | null
          localizado_em_campo: boolean | null
          longitude: number | null
          lote_id: string
          observacao: string | null
          observacao_reconciliacao: string | null
          observacao_usuario: string | null
          reconciliado: boolean | null
          reconciliado_em: string | null
          reconciliado_por: string | null
          rejeitado_em: string | null
          rejeitado_por: string | null
          revisao_observacao: string | null
          revisao_solicitada: boolean | null
          revisao_solicitada_por: string | null
          rodovia_id: string
          servico: string
          servico_final: string | null
          servico_inferido: string | null
          snv: string | null
          solicitado_em: string | null
          solicitado_por: string | null
          solucao_planilha: string | null
          substrato: string | null
          suporte: string | null
          tipo: string | null
          uf: string | null
          updated_at: string | null
          user_id: string
          velocidade: string | null
        }
        Insert: {
          altura_m?: number | null
          area_m2?: number | null
          arquivo_origem?: string | null
          br?: string | null
          cadastro_id?: string | null
          codigo?: string | null
          created_at?: string | null
          data_importacao?: string | null
          data_reconciliacao?: string | null
          dimensoes_mm?: string | null
          distancia_m?: number | null
          divergencia?: boolean | null
          id?: string
          justificativa_reconciliacao?: string | null
          km?: number | null
          lado?: string | null
          latitude?: number | null
          linha_planilha?: number | null
          localizado_em_campo?: boolean | null
          longitude?: number | null
          lote_id: string
          observacao?: string | null
          observacao_reconciliacao?: string | null
          observacao_usuario?: string | null
          reconciliado?: boolean | null
          reconciliado_em?: string | null
          reconciliado_por?: string | null
          rejeitado_em?: string | null
          rejeitado_por?: string | null
          revisao_observacao?: string | null
          revisao_solicitada?: boolean | null
          revisao_solicitada_por?: string | null
          rodovia_id: string
          servico: string
          servico_final?: string | null
          servico_inferido?: string | null
          snv?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          solucao_planilha?: string | null
          substrato?: string | null
          suporte?: string | null
          tipo?: string | null
          uf?: string | null
          updated_at?: string | null
          user_id: string
          velocidade?: string | null
        }
        Update: {
          altura_m?: number | null
          area_m2?: number | null
          arquivo_origem?: string | null
          br?: string | null
          cadastro_id?: string | null
          codigo?: string | null
          created_at?: string | null
          data_importacao?: string | null
          data_reconciliacao?: string | null
          dimensoes_mm?: string | null
          distancia_m?: number | null
          divergencia?: boolean | null
          id?: string
          justificativa_reconciliacao?: string | null
          km?: number | null
          lado?: string | null
          latitude?: number | null
          linha_planilha?: number | null
          localizado_em_campo?: boolean | null
          longitude?: number | null
          lote_id?: string
          observacao?: string | null
          observacao_reconciliacao?: string | null
          observacao_usuario?: string | null
          reconciliado?: boolean | null
          reconciliado_em?: string | null
          reconciliado_por?: string | null
          rejeitado_em?: string | null
          rejeitado_por?: string | null
          revisao_observacao?: string | null
          revisao_solicitada?: boolean | null
          revisao_solicitada_por?: string | null
          rodovia_id?: string
          servico?: string
          servico_final?: string | null
          servico_inferido?: string | null
          snv?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          solucao_planilha?: string | null
          substrato?: string | null
          suporte?: string | null
          tipo?: string | null
          uf?: string | null
          updated_at?: string | null
          user_id?: string
          velocidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "necessidades_placas_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "ficha_placa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "necessidades_placas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "necessidades_placas_rodovia_id_fkey"
            columns: ["rodovia_id"]
            isOneToOne: false
            referencedRelation: "rodovias"
            referencedColumns: ["id"]
          },
        ]
      }
      necessidades_porticos: {
        Row: {
          altura_livre_m: number | null
          arquivo_origem: string | null
          cadastro_id: string | null
          created_at: string | null
          data_importacao: string | null
          data_reconciliacao: string | null
          divergencia: boolean | null
          id: string
          justificativa_reconciliacao: string | null
          km: number | null
          lado: string | null
          latitude: number | null
          linha_planilha: number | null
          localizado_em_campo: boolean | null
          longitude: number | null
          lote_id: string
          motivo: string | null
          observacao_usuario: string | null
          reconciliado: boolean | null
          reconciliado_por: string | null
          revisao_solicitada: boolean | null
          rodovia_id: string
          servico: string
          servico_final: string | null
          servico_inferido: string | null
          snv: string | null
          solicitado_em: string | null
          solicitado_por: string | null
          solucao_planilha: string | null
          tipo: string | null
          updated_at: string | null
          user_id: string
          vao_horizontal_m: number | null
        }
        Insert: {
          altura_livre_m?: number | null
          arquivo_origem?: string | null
          cadastro_id?: string | null
          created_at?: string | null
          data_importacao?: string | null
          data_reconciliacao?: string | null
          divergencia?: boolean | null
          id?: string
          justificativa_reconciliacao?: string | null
          km?: number | null
          lado?: string | null
          latitude?: number | null
          linha_planilha?: number | null
          localizado_em_campo?: boolean | null
          longitude?: number | null
          lote_id: string
          motivo?: string | null
          observacao_usuario?: string | null
          reconciliado?: boolean | null
          reconciliado_por?: string | null
          revisao_solicitada?: boolean | null
          rodovia_id: string
          servico: string
          servico_final?: string | null
          servico_inferido?: string | null
          snv?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          solucao_planilha?: string | null
          tipo?: string | null
          updated_at?: string | null
          user_id: string
          vao_horizontal_m?: number | null
        }
        Update: {
          altura_livre_m?: number | null
          arquivo_origem?: string | null
          cadastro_id?: string | null
          created_at?: string | null
          data_importacao?: string | null
          data_reconciliacao?: string | null
          divergencia?: boolean | null
          id?: string
          justificativa_reconciliacao?: string | null
          km?: number | null
          lado?: string | null
          latitude?: number | null
          linha_planilha?: number | null
          localizado_em_campo?: boolean | null
          longitude?: number | null
          lote_id?: string
          motivo?: string | null
          observacao_usuario?: string | null
          reconciliado?: boolean | null
          reconciliado_por?: string | null
          revisao_solicitada?: boolean | null
          rodovia_id?: string
          servico?: string
          servico_final?: string | null
          servico_inferido?: string | null
          snv?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          solucao_planilha?: string | null
          tipo?: string | null
          updated_at?: string | null
          user_id?: string
          vao_horizontal_m?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "necessidades_porticos_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "ficha_porticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "necessidades_porticos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "necessidades_porticos_rodovia_id_fkey"
            columns: ["rodovia_id"]
            isOneToOne: false
            referencedRelation: "rodovias"
            referencedColumns: ["id"]
          },
        ]
      }
      necessidades_tachas: {
        Row: {
          arquivo_origem: string | null
          cadastro_id: string | null
          cor_refletivo: string | null
          corpo: string | null
          created_at: string | null
          data_importacao: string | null
          data_reconciliacao: string | null
          descricao: string | null
          divergencia: boolean | null
          espacamento_m: number | null
          extensao_km: number | null
          id: string
          justificativa_reconciliacao: string | null
          km_final: number | null
          km_inicial: number | null
          latitude_final: number | null
          latitude_inicial: number | null
          linha_planilha: number | null
          local_implantacao: string | null
          localizado_em_campo: boolean | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          observacao: string | null
          observacao_usuario: string | null
          quantidade: number | null
          reconciliado: boolean | null
          reconciliado_por: string | null
          refletivo: string | null
          rodovia_id: string
          servico: string
          servico_final: string | null
          servico_inferido: string | null
          snv: string | null
          solicitado_em: string | null
          solicitado_por: string | null
          solucao_planilha: string | null
          status_revisao: string | null
          tipo_refletivo: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          arquivo_origem?: string | null
          cadastro_id?: string | null
          cor_refletivo?: string | null
          corpo?: string | null
          created_at?: string | null
          data_importacao?: string | null
          data_reconciliacao?: string | null
          descricao?: string | null
          divergencia?: boolean | null
          espacamento_m?: number | null
          extensao_km?: number | null
          id?: string
          justificativa_reconciliacao?: string | null
          km_final?: number | null
          km_inicial?: number | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          linha_planilha?: number | null
          local_implantacao?: string | null
          localizado_em_campo?: boolean | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          observacao?: string | null
          observacao_usuario?: string | null
          quantidade?: number | null
          reconciliado?: boolean | null
          reconciliado_por?: string | null
          refletivo?: string | null
          rodovia_id: string
          servico: string
          servico_final?: string | null
          servico_inferido?: string | null
          snv?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          solucao_planilha?: string | null
          status_revisao?: string | null
          tipo_refletivo?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          arquivo_origem?: string | null
          cadastro_id?: string | null
          cor_refletivo?: string | null
          corpo?: string | null
          created_at?: string | null
          data_importacao?: string | null
          data_reconciliacao?: string | null
          descricao?: string | null
          divergencia?: boolean | null
          espacamento_m?: number | null
          extensao_km?: number | null
          id?: string
          justificativa_reconciliacao?: string | null
          km_final?: number | null
          km_inicial?: number | null
          latitude_final?: number | null
          latitude_inicial?: number | null
          linha_planilha?: number | null
          local_implantacao?: string | null
          localizado_em_campo?: boolean | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          observacao?: string | null
          observacao_usuario?: string | null
          quantidade?: number | null
          reconciliado?: boolean | null
          reconciliado_por?: string | null
          refletivo?: string | null
          rodovia_id?: string
          servico?: string
          servico_final?: string | null
          servico_inferido?: string | null
          snv?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          solucao_planilha?: string | null
          status_revisao?: string | null
          tipo_refletivo?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "necessidades_tachas_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "ficha_tachas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "necessidades_tachas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "necessidades_tachas_rodovia_id_fkey"
            columns: ["rodovia_id"]
            isOneToOne: false
            referencedRelation: "rodovias"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string | null
          elemento_pendente_id: string | null
          id: string
          lida: boolean | null
          mensagem: string
          nc_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          elemento_pendente_id?: string | null
          id?: string
          lida?: boolean | null
          mensagem: string
          nc_id?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          elemento_pendente_id?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string
          nc_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_elemento_pendente_id_fkey"
            columns: ["elemento_pendente_id"]
            isOneToOne: false
            referencedRelation: "elementos_pendentes_aprovacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_nc_id_fkey"
            columns: ["nc_id"]
            isOneToOne: false
            referencedRelation: "nao_conformidades"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          max_modulos: number | null
          max_usuarios: number | null
          nome: string
          preco_mensal: number | null
          recursos: Json | null
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          max_modulos?: number | null
          max_usuarios?: number | null
          nome: string
          preco_mensal?: number | null
          recursos?: Json | null
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          max_modulos?: number | null
          max_usuarios?: number | null
          nome?: string
          preco_mensal?: number | null
          recursos?: Json | null
          tier?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          empresa_id: string | null
          id: string
          nome: string
          supervisora_id: string | null
          telefone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          empresa_id?: string | null
          id: string
          nome: string
          supervisora_id?: string | null
          telefone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          supervisora_id?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_supervisora_id_fkey"
            columns: ["supervisora_id"]
            isOneToOne: false
            referencedRelation: "supervisoras"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliacoes: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          cadastro_id: string | null
          created_at: string | null
          distancia_match_metros: number | null
          id: string
          motivo_rejeicao: string | null
          motivo_revisao: string | null
          necessidade_id: string
          observacao_coordenador: string | null
          observacao_usuario: string | null
          overlap_porcentagem: number | null
          reconciliado: boolean | null
          rejeitado_em: string | null
          rejeitado_por: string | null
          solicitado_em: string | null
          solicitado_por: string | null
          status: Database["public"]["Enums"]["status_reconciliacao_enum"]
          tipo_elemento: Database["public"]["Enums"]["tipo_elemento_reconciliacao"]
          tipo_match: string | null
          updated_at: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cadastro_id?: string | null
          created_at?: string | null
          distancia_match_metros?: number | null
          id?: string
          motivo_rejeicao?: string | null
          motivo_revisao?: string | null
          necessidade_id: string
          observacao_coordenador?: string | null
          observacao_usuario?: string | null
          overlap_porcentagem?: number | null
          reconciliado?: boolean | null
          rejeitado_em?: string | null
          rejeitado_por?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          status?: Database["public"]["Enums"]["status_reconciliacao_enum"]
          tipo_elemento: Database["public"]["Enums"]["tipo_elemento_reconciliacao"]
          tipo_match?: string | null
          updated_at?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cadastro_id?: string | null
          created_at?: string | null
          distancia_match_metros?: number | null
          id?: string
          motivo_rejeicao?: string | null
          motivo_revisao?: string | null
          necessidade_id?: string
          observacao_coordenador?: string | null
          observacao_usuario?: string | null
          overlap_porcentagem?: number | null
          reconciliado?: boolean | null
          rejeitado_em?: string | null
          rejeitado_por?: string | null
          solicitado_em?: string | null
          solicitado_por?: string | null
          status?: Database["public"]["Enums"]["status_reconciliacao_enum"]
          tipo_elemento?: Database["public"]["Enums"]["tipo_elemento_reconciliacao"]
          tipo_match?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      registro_nc: {
        Row: {
          comentarios_executora: string | null
          comentarios_supervisora: string | null
          construtora: string
          contrato_construtora: string | null
          contrato_supervisora: string | null
          created_at: string
          data_registro: string
          enviado_coordenador: boolean | null
          grau: string
          id: string
          km_final: number
          km_inicial: number
          lote_id: string
          natureza: string
          natureza_outra: string | null
          numero_registro: string
          problema_identificado: string
          rodovia_id: string
          snv: string | null
          supervisora: string
          tipo_obra: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comentarios_executora?: string | null
          comentarios_supervisora?: string | null
          construtora: string
          contrato_construtora?: string | null
          contrato_supervisora?: string | null
          created_at?: string
          data_registro: string
          enviado_coordenador?: boolean | null
          grau: string
          id?: string
          km_final: number
          km_inicial: number
          lote_id: string
          natureza: string
          natureza_outra?: string | null
          numero_registro: string
          problema_identificado: string
          rodovia_id: string
          snv?: string | null
          supervisora: string
          tipo_obra: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comentarios_executora?: string | null
          comentarios_supervisora?: string | null
          construtora?: string
          contrato_construtora?: string | null
          contrato_supervisora?: string | null
          created_at?: string
          data_registro?: string
          enviado_coordenador?: boolean | null
          grau?: string
          id?: string
          km_final?: number
          km_inicial?: number
          lote_id?: string
          natureza?: string
          natureza_outra?: string | null
          numero_registro?: string
          problema_identificado?: string
          rodovia_id?: string
          snv?: string | null
          supervisora?: string
          tipo_obra?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registro_nc_fotos: {
        Row: {
          created_at: string
          descricao: string | null
          foto_url: string
          id: string
          km: number | null
          latitude: number | null
          longitude: number | null
          ordem: number
          registro_nc_id: string
          sentido: string | null
          snv: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          foto_url: string
          id?: string
          km?: number | null
          latitude?: number | null
          longitude?: number | null
          ordem: number
          registro_nc_id: string
          sentido?: string | null
          snv?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          foto_url?: string
          id?: string
          km?: number | null
          latitude?: number | null
          longitude?: number | null
          ordem?: number
          registro_nc_id?: string
          sentido?: string | null
          snv?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_nc_fotos_registro_nc_id_fkey"
            columns: ["registro_nc_id"]
            isOneToOne: false
            referencedRelation: "registro_nc"
            referencedColumns: ["id"]
          },
        ]
      }
      retrorrefletividade_dinamica: {
        Row: {
          condicao_climatica: string | null
          cor: string
          created_at: string
          data_medicao: string
          enviado_coordenador: boolean | null
          faixa: string
          id: string
          km_final: number
          km_inicial: number
          latitude_final: number | null
          latitude_inicial: number | null
          longitude_final: number | null
          longitude_inicial: number | null
          lote_id: string
          observacao: string | null
          rodovia_id: string
          situacao: string
          tipo_demarcacao: string
          updated_at: string
          user_id: string
          valor_medido: number
          valor_minimo: number
          velocidade_medicao: number | null
        }
        Insert: {
          condicao_climatica?: string | null
          cor: string
          created_at?: string
          data_medicao: string
          enviado_coordenador?: boolean | null
          faixa: string
          id?: string
          km_final: number
          km_inicial: number
          latitude_final?: number | null
          latitude_inicial?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id: string
          observacao?: string | null
          rodovia_id: string
          situacao: string
          tipo_demarcacao: string
          updated_at?: string
          user_id: string
          valor_medido: number
          valor_minimo: number
          velocidade_medicao?: number | null
        }
        Update: {
          condicao_climatica?: string | null
          cor?: string
          created_at?: string
          data_medicao?: string
          enviado_coordenador?: boolean | null
          faixa?: string
          id?: string
          km_final?: number
          km_inicial?: number
          latitude_final?: number | null
          latitude_inicial?: number | null
          longitude_final?: number | null
          longitude_inicial?: number | null
          lote_id?: string
          observacao?: string | null
          rodovia_id?: string
          situacao?: string
          tipo_demarcacao?: string
          updated_at?: string
          user_id?: string
          valor_medido?: number
          valor_minimo?: number
          velocidade_medicao?: number | null
        }
        Relationships: []
      }
      retrorrefletividade_estatica: {
        Row: {
          codigo_dispositivo: string | null
          cor_fundo: string | null
          cor_horizontal: string | null
          cor_legenda: string | null
          created_at: string
          data_medicao: string
          enviado_coordenador: boolean | null
          id: string
          km_referencia: number
          lado: string | null
          latitude: number | null
          leitura_horizontal_1: number | null
          leitura_horizontal_10: number | null
          leitura_horizontal_2: number | null
          leitura_horizontal_3: number | null
          leitura_horizontal_4: number | null
          leitura_horizontal_5: number | null
          leitura_horizontal_6: number | null
          leitura_horizontal_7: number | null
          leitura_horizontal_8: number | null
          leitura_horizontal_9: number | null
          longitude: number | null
          lote_id: string
          observacao: string | null
          posicao_horizontal: string | null
          rodovia_id: string
          situacao: string
          situacao_fundo: string | null
          situacao_horizontal: string | null
          situacao_legenda: string | null
          tipo_dispositivo: string | null
          tipo_sinalizacao: string | null
          updated_at: string
          user_id: string
          valor_medido: number | null
          valor_medido_fundo: number | null
          valor_medido_horizontal: number | null
          valor_medido_legenda: number | null
          valor_minimo: number | null
          valor_minimo_fundo: number | null
          valor_minimo_horizontal: number | null
          valor_minimo_legenda: number | null
        }
        Insert: {
          codigo_dispositivo?: string | null
          cor_fundo?: string | null
          cor_horizontal?: string | null
          cor_legenda?: string | null
          created_at?: string
          data_medicao: string
          enviado_coordenador?: boolean | null
          id?: string
          km_referencia: number
          lado?: string | null
          latitude?: number | null
          leitura_horizontal_1?: number | null
          leitura_horizontal_10?: number | null
          leitura_horizontal_2?: number | null
          leitura_horizontal_3?: number | null
          leitura_horizontal_4?: number | null
          leitura_horizontal_5?: number | null
          leitura_horizontal_6?: number | null
          leitura_horizontal_7?: number | null
          leitura_horizontal_8?: number | null
          leitura_horizontal_9?: number | null
          longitude?: number | null
          lote_id: string
          observacao?: string | null
          posicao_horizontal?: string | null
          rodovia_id: string
          situacao: string
          situacao_fundo?: string | null
          situacao_horizontal?: string | null
          situacao_legenda?: string | null
          tipo_dispositivo?: string | null
          tipo_sinalizacao?: string | null
          updated_at?: string
          user_id: string
          valor_medido?: number | null
          valor_medido_fundo?: number | null
          valor_medido_horizontal?: number | null
          valor_medido_legenda?: number | null
          valor_minimo?: number | null
          valor_minimo_fundo?: number | null
          valor_minimo_horizontal?: number | null
          valor_minimo_legenda?: number | null
        }
        Update: {
          codigo_dispositivo?: string | null
          cor_fundo?: string | null
          cor_horizontal?: string | null
          cor_legenda?: string | null
          created_at?: string
          data_medicao?: string
          enviado_coordenador?: boolean | null
          id?: string
          km_referencia?: number
          lado?: string | null
          latitude?: number | null
          leitura_horizontal_1?: number | null
          leitura_horizontal_10?: number | null
          leitura_horizontal_2?: number | null
          leitura_horizontal_3?: number | null
          leitura_horizontal_4?: number | null
          leitura_horizontal_5?: number | null
          leitura_horizontal_6?: number | null
          leitura_horizontal_7?: number | null
          leitura_horizontal_8?: number | null
          leitura_horizontal_9?: number | null
          longitude?: number | null
          lote_id?: string
          observacao?: string | null
          posicao_horizontal?: string | null
          rodovia_id?: string
          situacao?: string
          situacao_fundo?: string | null
          situacao_horizontal?: string | null
          situacao_legenda?: string | null
          tipo_dispositivo?: string | null
          tipo_sinalizacao?: string | null
          updated_at?: string
          user_id?: string
          valor_medido?: number | null
          valor_medido_fundo?: number | null
          valor_medido_horizontal?: number | null
          valor_medido_legenda?: number | null
          valor_minimo?: number | null
          valor_minimo_fundo?: number | null
          valor_minimo_horizontal?: number | null
          valor_minimo_legenda?: number | null
        }
        Relationships: []
      }
      rodovias: {
        Row: {
          codigo: string
          created_at: string | null
          id: string
          tolerancia_cilindros_metros: number | null
          tolerancia_defensas_metros: number | null
          tolerancia_inscricoes_metros: number | null
          tolerancia_marcas_metros: number | null
          tolerancia_match_metros: number | null
          tolerancia_placas_metros: number | null
          tolerancia_porticos_metros: number | null
          tolerancia_tachas_metros: number | null
          uf: string | null
        }
        Insert: {
          codigo: string
          created_at?: string | null
          id?: string
          tolerancia_cilindros_metros?: number | null
          tolerancia_defensas_metros?: number | null
          tolerancia_inscricoes_metros?: number | null
          tolerancia_marcas_metros?: number | null
          tolerancia_match_metros?: number | null
          tolerancia_placas_metros?: number | null
          tolerancia_porticos_metros?: number | null
          tolerancia_tachas_metros?: number | null
          uf?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string | null
          id?: string
          tolerancia_cilindros_metros?: number | null
          tolerancia_defensas_metros?: number | null
          tolerancia_inscricoes_metros?: number | null
          tolerancia_marcas_metros?: number | null
          tolerancia_match_metros?: number | null
          tolerancia_placas_metros?: number | null
          tolerancia_porticos_metros?: number | null
          tolerancia_tachas_metros?: number | null
          uf?: string | null
        }
        Relationships: []
      }
      sessoes_trabalho: {
        Row: {
          ativa: boolean | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          lote_id: string
          rodovia_id: string
          user_id: string
        }
        Insert: {
          ativa?: boolean | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          lote_id: string
          rodovia_id: string
          user_id: string
        }
        Update: {
          ativa?: boolean | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          lote_id?: string
          rodovia_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_trabalho_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_trabalho_rodovia_id_fkey"
            columns: ["rodovia_id"]
            isOneToOne: false
            referencedRelation: "rodovias"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisora: {
        Row: {
          contrato: string
          created_at: string | null
          id: string
          logo_url: string | null
          nome_empresa: string
          updated_at: string | null
          usar_logo_customizado: boolean | null
        }
        Insert: {
          contrato: string
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nome_empresa: string
          updated_at?: string | null
          usar_logo_customizado?: boolean | null
        }
        Update: {
          contrato?: string
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nome_empresa?: string
          updated_at?: string | null
          usar_logo_customizado?: boolean | null
        }
        Relationships: []
      }
      supervisoras: {
        Row: {
          codigo_convite: string | null
          contrato: string | null
          created_at: string | null
          email_envio: string | null
          email_prefixo: string | null
          id: string
          logo_orgao_fiscalizador_url: string | null
          logo_url: string | null
          nome_empresa: string
          updated_at: string | null
          usar_logo_customizado: boolean | null
          usar_logo_orgao_relatorios: boolean | null
        }
        Insert: {
          codigo_convite?: string | null
          contrato?: string | null
          created_at?: string | null
          email_envio?: string | null
          email_prefixo?: string | null
          id?: string
          logo_orgao_fiscalizador_url?: string | null
          logo_url?: string | null
          nome_empresa: string
          updated_at?: string | null
          usar_logo_customizado?: boolean | null
          usar_logo_orgao_relatorios?: boolean | null
        }
        Update: {
          codigo_convite?: string | null
          contrato?: string | null
          created_at?: string | null
          email_envio?: string | null
          email_prefixo?: string | null
          id?: string
          logo_orgao_fiscalizador_url?: string | null
          logo_url?: string | null
          nome_empresa?: string
          updated_at?: string | null
          usar_logo_customizado?: boolean | null
          usar_logo_orgao_relatorios?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_auditoria_inventario: {
        Row: {
          aprovado_por: string | null
          aprovado_por_nome: string | null
          cadastrado_por: string | null
          data_aprovacao_coordenador: string | null
          data_cadastro: string | null
          data_intervencao: string | null
          data_ultima_modificacao: string | null
          elemento_id: string | null
          identificador: string | null
          localizacao_km: number | null
          lote_id: string | null
          modificado_por_intervencao: boolean | null
          motivo_intervencao: string | null
          rodovia_id: string | null
          tipo_elemento: string | null
          tipo_origem_cadastro: string | null
          tipo_ultima_intervencao: string | null
          ultima_intervencao_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      aplicar_intervencao_cilindros: {
        Args: { p_coordenador_id: string; p_intervencao_id: string }
        Returns: undefined
      }
      aplicar_intervencao_defensas: {
        Args: { p_coordenador_id: string; p_intervencao_id: string }
        Returns: undefined
      }
      aplicar_intervencao_inscricoes: {
        Args: { p_coordenador_id: string; p_intervencao_id: string }
        Returns: undefined
      }
      aplicar_intervencao_marcas_longitudinais: {
        Args: { p_coordenador_id: string; p_intervencao_id: string }
        Returns: undefined
      }
      aplicar_intervencao_placa: {
        Args: { p_coordenador_id: string; p_intervencao_id: string }
        Returns: undefined
      }
      aplicar_intervencao_portico: {
        Args: { p_coordenador_id: string; p_intervencao_id: string }
        Returns: undefined
      }
      aplicar_intervencao_tachas: {
        Args: { p_coordenador_id: string; p_intervencao_id: string }
        Returns: undefined
      }
      coordinator_has_lot_access: {
        Args: { _lote_id: string; _user_id: string }
        Returns: boolean
      }
      find_orphaned_reconciliacoes: {
        Args: Record<PropertyKey, never>
        Returns: {
          cadastro_id: string
          id: string
          necessidade_id: string
          tipo_elemento: Database["public"]["Enums"]["tipo_elemento_reconciliacao"]
        }[]
      }
      generate_codigo_convite: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_rodovias_by_lote: {
        Args: { p_lote_id: string }
        Returns: {
          codigo: string
          id: string
        }[]
      }
      get_tipo_origem_badge: {
        Args: { p_tipo_origem: string }
        Returns: string
      }
      get_user_supervisora_id: {
        Args: { _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_cadastro_por_coordenadas: {
        Args: {
          p_lat: number
          p_long: number
          p_rodovia_id: string
          p_tipo: string
          p_tolerancia_metros?: number
        }
        Returns: {
          cadastro_id: string
          distancia_metros: number
        }[]
      }
      user_has_module_access: {
        Args: { _modulo_codigo: string; _user_id: string }
        Returns: boolean
      }
      validar_campos_manutencao_pre_projeto: {
        Args: {
          p_dados_novos: Json
          p_tipo_elemento: string
          p_tipo_origem: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coordenador" | "tecnico"
      plan_tier: "basico" | "profissional" | "enterprise"
      status_reconciliacao_enum: "pendente_aprovacao" | "aprovado" | "rejeitado"
      subscription_status: "ativa" | "suspensa" | "cancelada" | "trial"
      tipo_elemento_reconciliacao:
        | "placas"
        | "defensas"
        | "porticos"
        | "marcas_longitudinais"
        | "inscricoes"
        | "cilindros"
        | "tachas"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "coordenador", "tecnico"],
      plan_tier: ["basico", "profissional", "enterprise"],
      status_reconciliacao_enum: [
        "pendente_aprovacao",
        "aprovado",
        "rejeitado",
      ],
      subscription_status: ["ativa", "suspensa", "cancelada", "trial"],
      tipo_elemento_reconciliacao: [
        "placas",
        "defensas",
        "porticos",
        "marcas_longitudinais",
        "inscricoes",
        "cilindros",
        "tachas",
      ],
    },
  },
} as const
