export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      business_profiles: {
        Row: {
          abn_acn: string | null
          address_line1: string | null
          address_line2: string | null
          business_name: string | null
          city: string | null
          client_id: string
          country: string | null
          created_at: string
          id: string
          pdf_notes_template: string | null
          postcode: string | null
          state: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          abn_acn?: string | null
          address_line1?: string | null
          address_line2?: string | null
          business_name?: string | null
          city?: string | null
          client_id?: string
          country?: string | null
          created_at?: string
          id?: string
          pdf_notes_template?: string | null
          postcode?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          abn_acn?: string | null
          address_line1?: string | null
          address_line2?: string | null
          business_name?: string | null
          city?: string | null
          client_id?: string
          country?: string | null
          created_at?: string
          id?: string
          pdf_notes_template?: string | null
          postcode?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          abn: string | null
          billing_address: string | null
          billing_contact_person: string | null
          billing_country: string | null
          billing_email: string | null
          billing_fax: string | null
          billing_phone: string | null
          billing_postcode: string | null
          billing_state: string | null
          billing_suburb: string | null
          billing_website: string | null
          business_id: string | null
          company_name: string | null
          contact_id: string | null
          contact_type: string
          created_at: string | null
          eu_vat_number: string | null
          first_name: string | null
          has_different_shipping: boolean | null
          id: string
          is_inactive: boolean | null
          notes: string | null
          opt_in_for_marketing: boolean | null
          organization_type: string
          shipping_address: string | null
          shipping_contact_person: string | null
          shipping_country: string | null
          shipping_email: string | null
          shipping_fax: string | null
          shipping_phone: string | null
          shipping_postcode: string | null
          shipping_state: string | null
          shipping_suburb: string | null
          shipping_website: string | null
          surname: string | null
          updated_at: string | null
        }
        Insert: {
          abn?: string | null
          billing_address?: string | null
          billing_contact_person?: string | null
          billing_country?: string | null
          billing_email?: string | null
          billing_fax?: string | null
          billing_phone?: string | null
          billing_postcode?: string | null
          billing_state?: string | null
          billing_suburb?: string | null
          billing_website?: string | null
          business_id?: string | null
          company_name?: string | null
          contact_id?: string | null
          contact_type: string
          created_at?: string | null
          eu_vat_number?: string | null
          first_name?: string | null
          has_different_shipping?: boolean | null
          id?: string
          is_inactive?: boolean | null
          notes?: string | null
          opt_in_for_marketing?: boolean | null
          organization_type: string
          shipping_address?: string | null
          shipping_contact_person?: string | null
          shipping_country?: string | null
          shipping_email?: string | null
          shipping_fax?: string | null
          shipping_phone?: string | null
          shipping_postcode?: string | null
          shipping_state?: string | null
          shipping_suburb?: string | null
          shipping_website?: string | null
          surname?: string | null
          updated_at?: string | null
        }
        Update: {
          abn?: string | null
          billing_address?: string | null
          billing_contact_person?: string | null
          billing_country?: string | null
          billing_email?: string | null
          billing_fax?: string | null
          billing_phone?: string | null
          billing_postcode?: string | null
          billing_state?: string | null
          billing_suburb?: string | null
          billing_website?: string | null
          business_id?: string | null
          company_name?: string | null
          contact_id?: string | null
          contact_type?: string
          created_at?: string | null
          eu_vat_number?: string | null
          first_name?: string | null
          has_different_shipping?: boolean | null
          id?: string
          is_inactive?: boolean | null
          notes?: string | null
          opt_in_for_marketing?: boolean | null
          organization_type?: string
          shipping_address?: string | null
          shipping_contact_person?: string | null
          shipping_country?: string | null
          shipping_email?: string | null
          shipping_fax?: string | null
          shipping_phone?: string | null
          shipping_postcode?: string | null
          shipping_state?: string | null
          shipping_suburb?: string | null
          shipping_website?: string | null
          surname?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          invoice_id: string
          performed_by: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          performed_by?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_activities_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          job: string | null
          quantity: number
          tax_code: string | null
          unit_amount: number
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invoice_id: string
          job?: string | null
          quantity?: number
          tax_code?: string | null
          unit_amount?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string
          job?: string | null
          quantity?: number
          tax_code?: string | null
          unit_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          balance_due: number
          business_id: string
          created_at: string
          customer_id: string
          customer_po_number: string | null
          due_date: string
          freight_amount: number | null
          id: string
          invoice_number: string
          is_tax_inclusive: boolean | null
          issue_date: string
          notes: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          balance_due?: number
          business_id: string
          created_at?: string
          customer_id: string
          customer_po_number?: string | null
          due_date: string
          freight_amount?: number | null
          id?: string
          invoice_number: string
          is_tax_inclusive?: boolean | null
          issue_date: string
          notes?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          balance_due?: number
          business_id?: string
          created_at?: string
          customer_id?: string
          customer_po_number?: string | null
          due_date?: string
          freight_amount?: number | null
          id?: string
          invoice_number?: string
          is_tax_inclusive?: boolean | null
          issue_date?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_client_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
