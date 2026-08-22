// AUTO-GENERATED. Do not edit by hand.
// Regenerate with: bash supabase/local-dev/generate-types.sh
// Source: introspection of the local migrated schema (supabase/migrations),
// not the Supabase CLI (which requires Docker for --db-url on this
// version) — see supabase/local-dev/README.md.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      availability_blocks: {
        Row: {
          id: string;
          vehicle_id: string;
          starts_at: string;
          ends_at: string;
          reason: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          starts_at: string;
          ends_at: string;
          reason: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          starts_at?: string;
          ends_at?: string;
          reason?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'availability_blocks_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'availability_blocks_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      booking_events: {
        Row: {
          id: string;
          booking_id: string;
          actor_id: string | null;
          event_type: string;
          from_status: Database['public']['Enums']['booking_status'] | null;
          to_status: Database['public']['Enums']['booking_status'] | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          actor_id?: string | null;
          event_type: string;
          from_status?: Database['public']['Enums']['booking_status'] | null;
          to_status?: Database['public']['Enums']['booking_status'] | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          actor_id?: string | null;
          event_type?: string;
          from_status?: Database['public']['Enums']['booking_status'] | null;
          to_status?: Database['public']['Enums']['booking_status'] | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_events_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      booking_status_transitions: {
        Row: {
          from_status: Database['public']['Enums']['booking_status'];
          to_status: Database['public']['Enums']['booking_status'];
        };
        Insert: {
          from_status: Database['public']['Enums']['booking_status'];
          to_status: Database['public']['Enums']['booking_status'];
        };
        Update: {
          from_status?: Database['public']['Enums']['booking_status'];
          to_status?: Database['public']['Enums']['booking_status'];
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          organization_id: string;
          vehicle_id: string;
          customer_id: string;
          status: Database['public']['Enums']['booking_status'];
          starts_at: string;
          ends_at: string;
          quote_snapshot: Json | null;
          policy_snapshot: Json | null;
          currency: string;
          total_amount_laari: number | null;
          payment_status: Database['public']['Enums']['payment_status'];
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          vehicle_id: string;
          customer_id: string;
          status?: Database['public']['Enums']['booking_status'];
          starts_at: string;
          ends_at: string;
          quote_snapshot?: Json | null;
          policy_snapshot?: Json | null;
          currency?: string;
          total_amount_laari?: number | null;
          payment_status?: Database['public']['Enums']['payment_status'];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          vehicle_id?: string;
          customer_id?: string;
          status?: Database['public']['Enums']['booking_status'];
          starts_at?: string;
          ends_at?: string;
          quote_snapshot?: Json | null;
          policy_snapshot?: Json | null;
          currency?: string;
          total_amount_laari?: number | null;
          payment_status?: Database['public']['Enums']['payment_status'];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          organization_id: string | null;
          vehicle_id: string | null;
          booking_id: string | null;
          profile_id: string | null;
          expense_id: string | null;
          document_type: Database['public']['Enums']['document_type'];
          storage_path: string;
          status: Database['public']['Enums']['document_status'];
          expires_at: string | null;
          uploaded_by: string;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          vehicle_id?: string | null;
          booking_id?: string | null;
          profile_id?: string | null;
          expense_id?: string | null;
          document_type: Database['public']['Enums']['document_type'];
          storage_path: string;
          status?: Database['public']['Enums']['document_status'];
          expires_at?: string | null;
          uploaded_by: string;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          vehicle_id?: string | null;
          booking_id?: string | null;
          profile_id?: string | null;
          expense_id?: string | null;
          document_type?: Database['public']['Enums']['document_type'];
          storage_path?: string;
          status?: Database['public']['Enums']['document_status'];
          expires_at?: string | null;
          uploaded_by?: string;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_expense_id_fkey';
            columns: ['expense_id'];
            isOneToOne: false;
            referencedRelation: 'expenses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_verified_by_fkey';
            columns: ['verified_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          organization_id: string;
          vehicle_id: string | null;
          category: string;
          amount_laari: number;
          occurred_on: string;
          note: string | null;
          recorded_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          vehicle_id?: string | null;
          category: string;
          amount_laari: number;
          occurred_on: string;
          note?: string | null;
          recorded_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          vehicle_id?: string | null;
          category?: string;
          amount_laari?: number;
          occurred_on?: string;
          note?: string | null;
          recorded_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'expenses_recorded_by_fkey';
            columns: ['recorded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      inspections: {
        Row: {
          id: string;
          booking_id: string;
          inspection_type: Database['public']['Enums']['inspection_type'];
          odometer_km: number | null;
          fuel_battery_percent: number | null;
          condition_notes: string | null;
          accessories_checklist: Json;
          performed_by: string;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          inspection_type: Database['public']['Enums']['inspection_type'];
          odometer_km?: number | null;
          fuel_battery_percent?: number | null;
          condition_notes?: string | null;
          accessories_checklist?: Json;
          performed_by: string;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          inspection_type?: Database['public']['Enums']['inspection_type'];
          odometer_km?: number | null;
          fuel_battery_percent?: number | null;
          condition_notes?: string | null;
          accessories_checklist?: Json;
          performed_by?: string;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'inspections_performed_by_fkey';
            columns: ['performed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'inspections_acknowledged_by_fkey';
            columns: ['acknowledged_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          type: string;
          payload: Json;
          read_at: string | null;
          delivery_status: string;
          delivered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          type: string;
          payload?: Json;
          read_at?: string | null;
          delivery_status?: string;
          delivered_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          type?: string;
          payload?: Json;
          read_at?: string | null;
          delivery_status?: string;
          delivered_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: Database['public']['Enums']['org_role'];
          status: Database['public']['Enums']['member_status'];
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: Database['public']['Enums']['org_role'];
          status?: Database['public']['Enums']['member_status'];
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: Database['public']['Enums']['org_role'];
          status?: Database['public']['Enums']['member_status'];
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_members_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_members_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      organizations: {
        Row: {
          id: string;
          created_by: string;
          name: string;
          slug: string;
          status: string;
          currency: string;
          timezone: string;
          default_location: string | null;
          business_hours: Json;
          policies: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by?: string;
          name: string;
          slug: string;
          status?: string;
          currency?: string;
          timezone?: string;
          default_location?: string | null;
          business_hours?: Json;
          policies?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string;
          name?: string;
          slug?: string;
          status?: string;
          currency?: string;
          timezone?: string;
          default_location?: string | null;
          business_hours?: Json;
          policies?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organizations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          email: string | null;
          avatar_url: string | null;
          is_platform_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          is_platform_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          booking_id: string;
          organization_id: string;
          type: Database['public']['Enums']['transaction_type'];
          method: Database['public']['Enums']['payment_method'] | null;
          amount_laari: number;
          reference: string | null;
          note: string | null;
          recorded_by: string;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          organization_id: string;
          type: Database['public']['Enums']['transaction_type'];
          method?: Database['public']['Enums']['payment_method'] | null;
          amount_laari: number;
          reference?: string | null;
          note?: string | null;
          recorded_by: string;
          occurred_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          organization_id?: string;
          type?: Database['public']['Enums']['transaction_type'];
          method?: Database['public']['Enums']['payment_method'] | null;
          amount_laari?: number;
          reference?: string | null;
          note?: string | null;
          recorded_by?: string;
          occurred_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_recorded_by_fkey';
            columns: ['recorded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      vehicle_rates: {
        Row: {
          id: string;
          vehicle_id: string;
          rate_type: Database['public']['Enums']['rate_type'];
          amount_laari: number;
          effective_from: string;
          effective_to: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          rate_type: Database['public']['Enums']['rate_type'];
          amount_laari: number;
          effective_from?: string;
          effective_to?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          rate_type?: Database['public']['Enums']['rate_type'];
          amount_laari?: number;
          effective_from?: string;
          effective_to?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicle_rates_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['id'];
          },
        ];
      };
      vehicles: {
        Row: {
          id: string;
          organization_id: string;
          internal_code: string | null;
          registration_number: string;
          make: string | null;
          model: string | null;
          year: number | null;
          category: string | null;
          transmission: Database['public']['Enums']['transmission_type'] | null;
          engine_size_cc: number | null;
          color: string | null;
          status: Database['public']['Enums']['vehicle_status'];
          odometer_km: number;
          deposit_amount_laari: number;
          location: string | null;
          included_accessories: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          internal_code?: string | null;
          registration_number: string;
          make?: string | null;
          model?: string | null;
          year?: number | null;
          category?: string | null;
          transmission?: Database['public']['Enums']['transmission_type'] | null;
          engine_size_cc?: number | null;
          color?: string | null;
          status?: Database['public']['Enums']['vehicle_status'];
          odometer_km?: number;
          deposit_amount_laari?: number;
          location?: string | null;
          included_accessories?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          internal_code?: string | null;
          registration_number?: string;
          make?: string | null;
          model?: string | null;
          year?: number | null;
          category?: string | null;
          transmission?: Database['public']['Enums']['transmission_type'] | null;
          engine_size_cc?: number | null;
          color?: string | null;
          status?: Database['public']['Enums']['vehicle_status'];
          odometer_km?: number;
          deposit_amount_laari?: number;
          location?: string | null;
          included_accessories?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicles_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      vehicle_busy_ranges: {
        Row: {
          vehicle_id: string | null;
          starts_at: string | null;
          ends_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      transition_booking_status: {
        Args: {
          p_booking_id: string;
          p_new_status: Database['public']['Enums']['booking_status'];
          p_note?: string | null;
        };
        Returns: Database['public']['Tables']['bookings']['Row'];
      };
      compute_booking_quote: {
        Args: {
          p_vehicle_id: string;
          p_starts_at: string;
          p_ends_at: string;
        };
        Returns: Json;
      };
      compute_booking_policy_snapshot: {
        Args: {
          p_organization_id: string;
        };
        Returns: Json;
      };
      request_booking: {
        Args: {
          p_booking_id?: string | null;
          p_organization_id?: string | null;
          p_vehicle_id?: string | null;
          p_customer_id?: string | null;
          p_starts_at?: string | null;
          p_ends_at?: string | null;
          p_notes?: string | null;
        };
        Returns: Database['public']['Tables']['bookings']['Row'];
      };
      accept_booking: {
        Args: {
          p_booking_id: string;
        };
        Returns: Database['public']['Tables']['bookings']['Row'];
      };
      decline_booking: {
        Args: {
          p_booking_id: string;
          p_reason?: string | null;
        };
        Returns: Database['public']['Tables']['bookings']['Row'];
      };
      mark_booking_needs_info: {
        Args: {
          p_booking_id: string;
          p_note?: string | null;
        };
        Returns: Database['public']['Tables']['bookings']['Row'];
      };
      ready_booking: {
        Args: {
          p_booking_id: string;
        };
        Returns: Database['public']['Tables']['bookings']['Row'];
      };
      activate_booking: {
        Args: {
          p_booking_id: string;
        };
        Returns: Database['public']['Tables']['bookings']['Row'];
      };
      complete_booking: {
        Args: {
          p_booking_id: string;
        };
        Returns: Database['public']['Tables']['bookings']['Row'];
      };
      cancel_booking: {
        Args: {
          p_booking_id: string;
          p_reason?: string | null;
        };
        Returns: Database['public']['Tables']['bookings']['Row'];
      };
      search_available_vehicles: {
        Args: {
          p_starts_at: string;
          p_ends_at: string;
          p_location?: string | null;
          p_category?: string | null;
          p_transmission?: Database['public']['Enums']['transmission_type'] | null;
          p_max_daily_rate_laari?: number | null;
        };
        Returns: {
          vehicle_id: string;
          organization_id: string;
          organization_name: string;
          registration_number: string;
          make: string | null;
          model: string | null;
          year: number | null;
          category: string | null;
          transmission: Database['public']['Enums']['transmission_type'] | null;
          color: string | null;
          location: string | null;
          deposit_amount_laari: number;
          daily_rate_laari: number | null;
          hourly_rate_laari: number | null;
        }[];
      };
      get_vehicle_listing: {
        Args: {
          p_vehicle_id: string;
        };
        Returns: {
          vehicle_id: string;
          organization_id: string;
          organization_name: string;
          registration_number: string;
          make: string | null;
          model: string | null;
          year: number | null;
          category: string | null;
          transmission: Database['public']['Enums']['transmission_type'] | null;
          color: string | null;
          location: string | null;
          included_accessories: string[];
          deposit_amount_laari: number;
          daily_rate_laari: number | null;
          hourly_rate_laari: number | null;
        }[];
      };
      get_listing_quote: {
        Args: {
          p_vehicle_id: string;
          p_starts_at: string;
          p_ends_at: string;
        };
        Returns: Json;
      };
      is_vehicle_bookable: {
        Args: {
          p_vehicle_id: string;
          p_starts_at: string;
          p_ends_at: string;
        };
        Returns: boolean;
      };
      invite_org_member_by_email: {
        Args: {
          p_organization_id: string;
          p_email: string;
          p_role: Database['public']['Enums']['org_role'];
        };
        Returns: Database['public']['Tables']['organization_members']['Row'];
      };
      set_vehicle_rate: {
        Args: {
          p_vehicle_id: string;
          p_rate_type: Database['public']['Enums']['rate_type'];
          p_amount_laari: number | null;
        };
        Returns: Database['public']['Tables']['vehicle_rates']['Row'] | null;
      };
    };
    Enums: {
      org_role: 'owner' | 'manager' | 'staff';
      rate_type: 'hourly' | 'daily';
      document_type:
        | 'license'
        | 'id_card'
        | 'vehicle_photo'
        | 'inspection_photo_before'
        | 'inspection_photo_after'
        | 'receipt'
        | 'other';
      member_status: 'invited' | 'active' | 'revoked';
      booking_status:
        | 'draft'
        | 'requested'
        | 'accepted'
        | 'declined'
        | 'needs_info'
        | 'ready'
        | 'active'
        | 'completed'
        | 'cancelled'
        | 'overdue';
      payment_method: 'cash' | 'bank_transfer' | 'external_reference';
      payment_status: 'unpaid' | 'partially_paid' | 'paid' | 'partially_refunded' | 'refunded';
      vehicle_status: 'draft' | 'available' | 'reserved' | 'rented' | 'maintenance' | 'inactive';
      document_status: 'pending' | 'verified' | 'rejected';
      inspection_type: 'pickup' | 'return';
      transaction_type: 'payment' | 'refund' | 'adjustment';
      transmission_type: 'automatic' | 'manual';
    };
  };
};
