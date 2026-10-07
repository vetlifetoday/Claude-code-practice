
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"actor_email": string | null,"actor_id": string | null,"changes": Json | null,"contact_id": string | null,"entity_id": string | null,"entity_type": string,"id": number,"occurred_at": string,"summary": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_email"?: string | null,"actor_id"?: string | null,"changes"?: Json | null,"contact_id"?: string | null,"entity_id"?: string | null,"entity_type": string,"id"?: never,"occurred_at"?: string,"summary"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_email"?: string | null,"actor_id"?: string | null,"changes"?: Json | null,"contact_id"?: string | null,"entity_id"?: string | null,"entity_type"?: string,"id"?: never,"occurred_at"?: string,"summary"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"id": string,"is_active": boolean,"name": string,"sort_order": number,"system_key": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"sort_order"?: number,"system_key"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"sort_order"?: number,"system_key"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "categories_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contact_categories": {
                  Row: {
                    "category_id": string,"contact_id": string,"created_at": string,"created_by": string | null,"id": string,"subcategory_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"contact_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"subcategory_id"?: string | null
                  }
                  Update: {
                    "category_id"?: string,"contact_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"subcategory_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contact_categories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contact_categories_contact_id_fkey"
      columns: ["contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contact_categories_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contact_categories_subcategory_id_category_id_fkey"
      columns: ["subcategory_id","category_id"]
isOneToOne: false
      referencedRelation: "subcategories"
      referencedColumns: ["id","category_id"]
    }
                  ]
                },"contact_documents": {
                  Row: {
                    "archived_at": string | null,"archived_by": string | null,"contact_id": string,"created_at": string,"created_by": string | null,"file_name": string,"id": string,"mime_type": string | null,"size_bytes": number | null,"storage_path": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"archived_by"?: string | null,"contact_id": string,"created_at"?: string,"created_by"?: string | null,"file_name": string,"id"?: string,"mime_type"?: string | null,"size_bytes"?: number | null,"storage_path": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "archived_at"?: string | null,"archived_by"?: string | null,"contact_id"?: string,"created_at"?: string,"created_by"?: string | null,"file_name"?: string,"id"?: string,"mime_type"?: string | null,"size_bytes"?: number | null,"storage_path"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contact_documents_archived_by_fkey"
      columns: ["archived_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contact_documents_contact_id_fkey"
      columns: ["contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contact_documents_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contact_documents_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contacts": {
                  Row: {
                    "address": string | null,"archived_at": string | null,"archived_by": string | null,"city": string | null,"company": string | null,"created_at": string,"created_by": string | null,"display_name": string | null,"email": string | null,"first_name": string | null,"id": string,"kind": Database["public"]['Enums']["contact_kind"],"last_name": string | null,"notes": string | null,"organization_id": string | null,"phone": string | null,"photo_path": string | null,"search_text": string | null,"state": string | null,"title": string | null,"updated_at": string,"updated_by": string | null,"veteran_id": string | null,"years_of_service": number | null,"zip": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"archived_at"?: string | null,"archived_by"?: string | null,"city"?: string | null,"company"?: string | null,"created_at"?: string,"created_by"?: string | null,"display_name"?: never,"email"?: string | null,"first_name"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["contact_kind"],"last_name"?: string | null,"notes"?: string | null,"organization_id"?: string | null,"phone"?: string | null,"photo_path"?: string | null,"search_text"?: never,"state"?: string | null,"title"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"veteran_id"?: string | null,"years_of_service"?: number | null,"zip"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"archived_at"?: string | null,"archived_by"?: string | null,"city"?: string | null,"company"?: string | null,"created_at"?: string,"created_by"?: string | null,"display_name"?: never,"email"?: string | null,"first_name"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["contact_kind"],"last_name"?: string | null,"notes"?: string | null,"organization_id"?: string | null,"phone"?: string | null,"photo_path"?: string | null,"search_text"?: never,"state"?: string | null,"title"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"veteran_id"?: string | null,"years_of_service"?: number | null,"zip"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contacts_archived_by_fkey"
      columns: ["archived_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contacts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contacts_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contacts_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contacts_veteran_id_fkey"
      columns: ["veteran_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["id"]
    }
                  ]
                },"interactions": {
                  Row: {
                    "archived_at": string | null,"archived_by": string | null,"contact_id": string,"created_at": string,"created_by": string | null,"id": string,"occurred_on": string,"summary": string,"type": Database["public"]['Enums']["interaction_type"],"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"archived_by"?: string | null,"contact_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"occurred_on"?: string,"summary": string,"type"?: Database["public"]['Enums']["interaction_type"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "archived_at"?: string | null,"archived_by"?: string | null,"contact_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"occurred_on"?: string,"summary"?: string,"type"?: Database["public"]['Enums']["interaction_type"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "interactions_archived_by_fkey"
      columns: ["archived_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "interactions_contact_id_fkey"
      columns: ["contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "interactions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "interactions_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string,"full_name": string | null,"id": string,"is_active": boolean,"role": Database["public"]['Enums']["app_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"full_name"?: string | null,"id": string,"is_active"?: boolean,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"full_name"?: string | null,"id"?: string,"is_active"?: boolean,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"subcategories": {
                  Row: {
                    "category_id": string,"created_at": string,"created_by": string | null,"id": string,"is_active": boolean,"name": string,"sort_order": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"sort_order"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "category_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"sort_order"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "subcategories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subcategories_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subcategories_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "can_edit":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"category_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "category_id": string,"contact_count": number,"subcategory_id": string
            }[]
                           },
"contact_locations":
{ Args: Record<PropertyKey, never>; Returns: {
              "city": string,"state": string
            }[]
                           },
"current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"find_possible_duplicates":
{ Args: { "p_email": string,"p_exclude_id"?: string,"p_first_name": string,"p_last_name": string,"p_zip": string }; Returns: {
              "city": string,"display_name": string,"email": string,"id": string,"is_archived": boolean,"reason": string,"state": string,"zip": string
            }[]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_member":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"log_event":
{ Args: { "p_action": string,"p_details"?: Json,"p_entity_type": string,"p_summary": string }; Returns: undefined
                           },
"mfa_satisfied":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"search_contacts":
{ Args: { "p_archived"?: boolean,"p_category_id"?: string,"p_city"?: string,"p_query"?: string,"p_state"?: string,"p_subcategory_id"?: string }; Returns: {
              "address": string | null,
"archived_at": string | null,
"archived_by": string | null,
"city": string | null,
"company": string | null,
"created_at": string,
"created_by": string | null,
"display_name": string | null,
"email": string | null,
"first_name": string | null,
"id": string,
"kind": Database["public"]['Enums']["contact_kind"],
"last_name": string | null,
"notes": string | null,
"organization_id": string | null,
"phone": string | null,
"photo_path": string | null,
"search_text": string | null,
"state": string | null,
"title": string | null,
"updated_at": string,
"updated_by": string | null,
"veteran_id": string | null,
"years_of_service": number | null,
"zip": string | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "contacts"
        isOneToOne: false
        isSetofReturn: true
      } },
"set_archived":
{ Args: { "p_archive": boolean,"p_entity": string,"p_id": string }; Returns: undefined
                           },
"update_my_name":
{ Args: { "p_full_name": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "admin"|"staff"|"viewer","contact_kind": "person"|"organization","interaction_type": "note"|"call"|"email"|"meeting"|"event"|"other"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["admin", "staff", "viewer"],"contact_kind": ["person", "organization"],"interaction_type": ["note", "call", "email", "meeting", "event", "other"]
          }
        }
} as const
