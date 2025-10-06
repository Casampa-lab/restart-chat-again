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
      defensas: {
        Row: {
          created_at: string
          data_inspecao: string
          estado_conservacao: string
          extensao_metros: number
          id: string
          km_final: number
          km_inicial: number
          lado: string
          lote_id: string
          necessita_intervencao: boolean
          nivel_risco: string | null
          observacao: string | null
          rodovia_id: string
          tipo_avaria: string | null
          tipo_defensa: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_inspecao: string
          estado_conservacao: string
          extensao_metros: number
          id?: string
          km_final: number
          km_inicial: number
          lado: string
          lote_id: string
          necessita_intervencao?: boolean
          nivel_risco?: string | null
          observacao?: string | null
          rodovia_id: string
          tipo_avaria?: string | null
          tipo_defensa: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_inspecao?: string
          estado_conservacao?: string
          extensao_metros?: number
          id?: string
          km_final?: number
          km_inicial?: number
          lado?: string
          lote_id?: string
          necessita_intervencao?: boolean
          nivel_risco?: string | null
          observacao?: string | null
          rodovia_id?: string
          tipo_avaria?: string | null
          tipo_defensa?: string
          updated_at?: string
          user_id?: string
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
      frentes_liberadas: {
        Row: {
          created_at: string
          data_liberacao: string
          id: string
          km_final: number
          km_inicial: number
          lote_id: string
          observacao: string | null
          responsavel: string
          rodovia_id: string
          tipo_servico: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_liberacao: string
          id?: string
          km_final: number
          km_inicial: number
          lote_id: string
          observacao?: string | null
          responsavel: string
          rodovia_id: string
          tipo_servico: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_liberacao?: string
          id?: string
          km_final?: number
          km_inicial?: number
          lote_id?: string
          observacao?: string | null
          responsavel?: string
          rodovia_id?: string
          tipo_servico?: string
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
          id: string
          km_final: number
          km_inicial: number
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
          id?: string
          km_final: number
          km_inicial: number
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
          id?: string
          km_final?: number
          km_inicial?: number
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
      intervencoes_sh: {
        Row: {
          area_m2: number
          cor: string
          created_at: string
          data_intervencao: string
          espessura_cm: number | null
          id: string
          km_final: number
          km_inicial: number
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
          espessura_cm?: number | null
          id?: string
          km_final: number
          km_inicial: number
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
          espessura_cm?: number | null
          id?: string
          km_final?: number
          km_inicial?: number
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
          estado_conservacao: string
          id: string
          km_referencia: number
          lado: string
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
          estado_conservacao: string
          id?: string
          km_referencia: number
          lado: string
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
          estado_conservacao?: string
          id?: string
          km_referencia?: number
          lado?: string
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
          cor: string
          created_at: string
          data_intervencao: string
          estado_conservacao: string | null
          id: string
          km_final: number
          km_inicial: number
          lado: string
          lote_id: string
          material: string | null
          observacao: string | null
          quantidade: number
          rodovia_id: string
          tipo_intervencao: string
          tipo_tacha: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cor: string
          created_at?: string
          data_intervencao: string
          estado_conservacao?: string | null
          id?: string
          km_final: number
          km_inicial: number
          lado: string
          lote_id: string
          material?: string | null
          observacao?: string | null
          quantidade?: number
          rodovia_id: string
          tipo_intervencao: string
          tipo_tacha: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cor?: string
          created_at?: string
          data_intervencao?: string
          estado_conservacao?: string | null
          id?: string
          km_final?: number
          km_inicial?: number
          lado?: string
          lote_id?: string
          material?: string | null
          observacao?: string | null
          quantidade?: number
          rodovia_id?: string
          tipo_intervencao?: string
          tipo_tacha?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lotes: {
        Row: {
          contrato: string | null
          created_at: string | null
          empresa_id: string
          id: string
          numero: string
        }
        Insert: {
          contrato?: string | null
          created_at?: string | null
          empresa_id: string
          id?: string
          numero: string
        }
        Update: {
          contrato?: string | null
          created_at?: string | null
          empresa_id?: string
          id?: string
          numero?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes_rodovias: {
        Row: {
          id: string
          km_final: number | null
          km_inicial: number | null
          lote_id: string
          rodovia_id: string
        }
        Insert: {
          id?: string
          km_final?: number | null
          km_inicial?: number | null
          lote_id: string
          rodovia_id: string
        }
        Update: {
          id?: string
          km_final?: number | null
          km_inicial?: number | null
          lote_id?: string
          rodovia_id?: string
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
      nao_conformidades: {
        Row: {
          created_at: string | null
          data_atendimento: string | null
          data_notificacao: string | null
          data_ocorrencia: string
          data_sincronizacao: string | null
          deleted: boolean
          descricao_problema: string | null
          empresa: string
          enviado_coordenador: boolean | null
          id: string
          km_referencia: number | null
          latitude: number
          longitude: number
          lote_id: string
          numero_nc: string
          observacao: string | null
          prazo_atendimento: number | null
          problema_identificado: string | null
          rodovia_id: string
          sincronizado_sharepoint: boolean | null
          situacao: string | null
          tipo_nc: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_atendimento?: string | null
          data_notificacao?: string | null
          data_ocorrencia: string
          data_sincronizacao?: string | null
          deleted?: boolean
          descricao_problema?: string | null
          empresa: string
          enviado_coordenador?: boolean | null
          id?: string
          km_referencia?: number | null
          latitude: number
          longitude: number
          lote_id: string
          numero_nc: string
          observacao?: string | null
          prazo_atendimento?: number | null
          problema_identificado?: string | null
          rodovia_id: string
          sincronizado_sharepoint?: boolean | null
          situacao?: string | null
          tipo_nc?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_atendimento?: string | null
          data_notificacao?: string | null
          data_ocorrencia?: string
          data_sincronizacao?: string | null
          deleted?: boolean
          descricao_problema?: string | null
          empresa?: string
          enviado_coordenador?: boolean | null
          id?: string
          km_referencia?: number | null
          latitude?: number
          longitude?: number
          lote_id?: string
          numero_nc?: string
          observacao?: string | null
          prazo_atendimento?: number | null
          problema_identificado?: string | null
          rodovia_id?: string
          sincronizado_sharepoint?: boolean | null
          situacao?: string | null
          tipo_nc?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
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
      profiles: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          nome: string
          telefone?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      retrorrefletividade_dinamica: {
        Row: {
          condicao_climatica: string | null
          cor: string
          created_at: string
          data_medicao: string
          faixa: string
          id: string
          km_final: number
          km_inicial: number
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
          faixa: string
          id?: string
          km_final: number
          km_inicial: number
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
          faixa?: string
          id?: string
          km_final?: number
          km_inicial?: number
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
          created_at: string
          data_medicao: string
          id: string
          km_referencia: number
          lado: string
          lote_id: string
          observacao: string | null
          rodovia_id: string
          situacao: string
          tipo_dispositivo: string
          updated_at: string
          user_id: string
          valor_medido: number
          valor_minimo: number
        }
        Insert: {
          codigo_dispositivo?: string | null
          created_at?: string
          data_medicao: string
          id?: string
          km_referencia: number
          lado: string
          lote_id: string
          observacao?: string | null
          rodovia_id: string
          situacao: string
          tipo_dispositivo: string
          updated_at?: string
          user_id: string
          valor_medido: number
          valor_minimo: number
        }
        Update: {
          codigo_dispositivo?: string | null
          created_at?: string
          data_medicao?: string
          id?: string
          km_referencia?: number
          lado?: string
          lote_id?: string
          observacao?: string | null
          rodovia_id?: string
          situacao?: string
          tipo_dispositivo?: string
          updated_at?: string
          user_id?: string
          valor_medido?: number
          valor_minimo?: number
        }
        Relationships: []
      }
      rodovias: {
        Row: {
          codigo: string
          created_at: string | null
          id: string
          nome: string
          uf: string | null
        }
        Insert: {
          codigo: string
          created_at?: string | null
          id?: string
          nome: string
          uf?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string | null
          id?: string
          nome?: string
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coordenador" | "tecnico"
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
    },
  },
} as const
