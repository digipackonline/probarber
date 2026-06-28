export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'admin' | 'barber' | 'client';
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      branches: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          city: string | null;
          phone: string | null;
          email: string | null;
          description: string | null;
          logo_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['branches']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['branches']['Insert']>;
      };
      branch_schedules: {
        Row: {
          id: string;
          branch_id: string;
          day_of_week: number;
          open_time: string;
          close_time: string;
          is_open: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['branch_schedules']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['branch_schedules']['Insert']>;
      };
      services: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: 'corte' | 'barba' | 'tratamiento' | 'combo' | 'otro';
          duration_minutes: number;
          price: number;
          is_active: boolean;
          branch_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['services']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
      };
      clients: {
        Row: {
          id: string;
          user_id: string | null;
          full_name: string;
          phone: string | null;
          email: string | null;
          birthdate: string | null;
          notes: string | null;
          preferences: string | null;
          branch_id: string | null;
          total_visits: number;
          total_spent: number;
          loyalty_points: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at' | 'total_visits' | 'total_spent' | 'loyalty_points'>;
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
      };
      barbers: {
        Row: {
          id: string;
          user_id: string | null;
          branch_id: string | null;
          full_name: string;
          photo_url: string | null;
          specialty: string | null;
          bio: string | null;
          commission_percent: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['barbers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['barbers']['Insert']>;
      };
      barber_services: {
        Row: { id: string; barber_id: string; service_id: string };
        Insert: Omit<Database['public']['Tables']['barber_services']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['barber_services']['Insert']>;
      };
      barber_schedules: {
        Row: {
          id: string;
          barber_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_working: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['barber_schedules']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['barber_schedules']['Insert']>;
      };
      barber_absences: {
        Row: {
          id: string;
          barber_id: string;
          start_date: string;
          end_date: string;
          reason: string | null;
          type: 'vacation' | 'absence' | 'sick' | 'other';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['barber_absences']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['barber_absences']['Insert']>;
      };
      appointments: {
        Row: {
          id: string;
          branch_id: string;
          barber_id: string;
          client_id: string;
          service_id: string;
          appointment_date: string;
          start_time: string;
          end_time: string;
          status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
          notes: string | null;
          price: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['appointments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
      };
      payments: {
        Row: {
          id: string;
          appointment_id: string | null;
          branch_id: string;
          barber_id: string | null;
          client_id: string | null;
          amount: number;
          method: 'cash' | 'card' | 'transfer' | 'mercadopago' | 'other';
          status: 'pending' | 'completed' | 'refunded' | 'failed';
          notes: string | null;
          paid_at: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };
      promotions: {
        Row: {
          id: string;
          branch_id: string | null;
          name: string;
          description: string | null;
          discount_type: 'percent' | 'fixed';
          discount_value: number;
          coupon_code: string | null;
          min_purchase: number | null;
          max_uses: number | null;
          current_uses: number;
          valid_from: string | null;
          valid_until: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['promotions']['Row'], 'id' | 'created_at' | 'current_uses'>;
        Update: Partial<Database['public']['Tables']['promotions']['Insert']>;
      };
      loyalty_transactions: {
        Row: {
          id: string;
          client_id: string;
          appointment_id: string | null;
          points: number;
          type: 'earn' | 'redeem' | 'bonus' | 'expire';
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['loyalty_transactions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['loyalty_transactions']['Insert']>;
      };
      notifications_log: {
        Row: {
          id: string;
          appointment_id: string | null;
          client_id: string | null;
          type: string;
          channel: string;
          recipient: string | null;
          subject: string | null;
          body: string | null;
          status: 'pending' | 'sent' | 'failed';
          sent_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications_log']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications_log']['Insert']>;
      };
      marketing_campaigns: {
        Row: {
          id: string;
          branch_id: string | null;
          name: string;
          description: string | null;
          channel: string;
          message: string;
          target_segment: string | null;
          status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
          scheduled_at: string | null;
          sent_at: string | null;
          recipients_count: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['marketing_campaigns']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['marketing_campaigns']['Insert']>;
      };
      ai_insights: {
        Row: {
          id: string;
          branch_id: string | null;
          type: string;
          title: string;
          content: string;
          data: Json | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ai_insights']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['ai_insights']['Insert']>;
      };
    };
  };
}
