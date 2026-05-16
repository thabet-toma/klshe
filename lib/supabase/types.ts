export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          emoji: string | null;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          emoji?: string | null;
          color?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      addresses: {
        Row: {
          id: string;
          profile_id: string;
          label: string | null;
          line1: string;
          city: string | null;
          lat: number | null;
          lng: number | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          label?: string | null;
          line1: string;
          city?: string | null;
          lat?: number | null;
          lng?: number | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["addresses"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "addresses_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_drivers: {
        Row: {
          id: string;
          name: string;
          phone: string;
          avatar_url: string;
          vehicle: string;
          rating: number;
          status: "online" | "busy" | "offline";
          today_orders: number;
          earnings_today: number;
          user_id: string | null;
          vendor_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          phone: string;
          avatar_url: string;
          vehicle: string;
          rating?: number;
          status?: "online" | "busy" | "offline";
          today_orders?: number;
          earnings_today?: number;
          user_id?: string | null;
          vendor_id?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["delivery_drivers"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "delivery_drivers_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_drivers_vendor_id_fkey";
            columns: ["vendor_id"];
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          vendor_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          vendor_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["favorites"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_vendor_id_fkey";
            columns: ["vendor_id"];
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: "customer" | "platform_admin" | "vendor_staff" | "driver";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          role?: "customer" | "platform_admin" | "vendor_staff" | "driver";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          brand: string | null;
          price: number;
          old_price: number | null;
          unit: string;
          image: string;
          badge: "خصم" | "جديد" | "الأكثر مبيعاً" | null;
          category_id: string | null;
          vendor_category_id: string;
          is_offer: boolean;
          is_trending: boolean;
          is_active: boolean;
          created_at: string;
          vendor_id: string | null;
          menu_category_id: string | null;
        };
        Insert: {
          id: string;
          name: string;
          brand?: string | null;
          price: number;
          old_price?: number | null;
          unit: string;
          image: string;
          badge?: "خصم" | "جديد" | "الأكثر مبيعاً" | null;
          category_id?: string | null;
          vendor_category_id: string;
          is_offer?: boolean;
          is_trending?: boolean;
          is_active?: boolean;
          created_at?: string;
          vendor_id?: string | null;
          menu_category_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_vendor_category_id_fkey";
            columns: ["vendor_category_id"];
            referencedRelation: "vendor_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          short_code: string;
          customer_name: string;
          customer_phone: string;
          customer_address: string;
          location_lat: number | null;
          location_lng: number | null;
          subtotal: number;
          delivery_fee: number;
          total: number;
          status: string;
          payment_method: "cash" | "card";
          notes: string | null;
          created_at: string;
          vendor_id: string | null;
          driver_id: string | null;
          customer_id: string | null;
          address_id: string | null;
          coupon_code: string | null;
          discount_amount: number;
          eta_minutes: number | null;
          accepted_at: string | null;
          ready_at: string | null;
          picked_at: string | null;
          delivered_at: string | null;
          cancellation_reason: string | null;
          broadcast_at: string | null;
          claimed_at: string | null;
          claimed_by: string | null;
          prep_status: string;
        };
        Insert: {
          id?: string;
          short_code: string;
          customer_name: string;
          customer_phone: string;
          customer_address: string;
          location_lat?: number | null;
          location_lng?: number | null;
          subtotal: number;
          delivery_fee: number;
          total: number;
          status?: string;
          payment_method: "cash" | "card";
          notes?: string | null;
          created_at?: string;
          vendor_id?: string | null;
          driver_id?: string | null;
          customer_id?: string | null;
          address_id?: string | null;
          coupon_code?: string | null;
          discount_amount?: number;
          eta_minutes?: number | null;
          accepted_at?: string | null;
          ready_at?: string | null;
          picked_at?: string | null;
          delivered_at?: string | null;
          cancellation_reason?: string | null;
          broadcast_at?: string | null;
          claimed_at?: string | null;
          claimed_by?: string | null;
          prep_status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey";
            columns: ["address_id"];
            referencedRelation: "addresses";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: number;
          order_id: string;
          product_id: string;
          product_name: string;
          unit_price: number;
          quantity: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          order_id: string;
          product_id: string;
          product_name: string;
          unit_price: number;
          quantity: number;
          line_total: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: number;
          order_id: string;
          type: "sale";
          amount: number;
          payment_method: "cash" | "card";
          note: string | null;
          vendor_id: string | null;
          stripe_session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          order_id: string;
          type?: "sale";
          amount: number;
          payment_method: "cash" | "card";
          note?: string | null;
          vendor_id?: string | null;
          stripe_session_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_vendor_id_fkey";
            columns: ["vendor_id"];
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          emoji: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          slug: string;
          name: string;
          emoji?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_categories"]["Insert"]>;
        Relationships: [];
      };
      vendor_balances: {
        Row: {
          vendor_id: string;
          available_amount: number;
          pending_amount: number;
          updated_at: string;
        };
        Insert: {
          vendor_id: string;
          available_amount?: number;
          pending_amount?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_balances"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "vendor_balances_vendor_id_fkey";
            columns: ["vendor_id"];
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      payouts: {
        Row: {
          id: string;
          vendor_id: string;
          amount: number;
          status: "requested" | "approved" | "paid" | "rejected" | "cancelled";
          requested_at: string;
          approved_at: string | null;
          paid_at: string | null;
          requested_by: string | null;
          note: string | null;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          amount: number;
          status?: "requested" | "approved" | "paid" | "rejected" | "cancelled";
          requested_at?: string;
          approved_at?: string | null;
          paid_at?: string | null;
          requested_by?: string | null;
          note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["payouts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "payouts_vendor_id_fkey";
            columns: ["vendor_id"];
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_invoices: {
        Row: {
          id: string;
          order_id: string;
          vendor_id: string;
          subtotal: number;
          delivery_fee: number;
          gross_total: number;
          platform_commission: number;
          net_vendor_amount: number;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          vendor_id: string;
          subtotal: number;
          delivery_fee: number;
          gross_total: number;
          platform_commission?: number;
          net_vendor_amount: number;
          currency?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sales_invoices"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "sales_invoices_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_invoices_vendor_id_fkey";
            columns: ["vendor_id"];
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      onboarding_requests: {
        Row: {
          id: string;
          user_id: string;
          requested_role: "customer" | "vendor_staff" | "driver";
          status: "pending" | "approved" | "rejected";
          full_name: string | null;
          phone: string | null;
          vendor_name: string | null;
          note: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          requested_role: "customer" | "vendor_staff" | "driver";
          status?: "pending" | "approved" | "rejected";
          full_name?: string | null;
          phone?: string | null;
          vendor_name?: string | null;
          note?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["onboarding_requests"]["Insert"]>;
        Relationships: [];
      };
      ratings: {
        Row: {
          id: string;
          order_id: string;
          customer_id: string;
          vendor_id: string;
          driver_id: string | null;
          vendor_rating: number;
          driver_rating: number | null;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          customer_id: string;
          vendor_id: string;
          driver_id?: string | null;
          vendor_rating: number;
          driver_rating?: number | null;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ratings"]["Insert"]>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          role: string | null;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: string | null;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          full_name: string;
          role: "customer" | "admin" | "driver";
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role: "customer" | "admin" | "driver";
          phone?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      vendors: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          logo_url: string | null;
          banner_url: string | null;
          category_id: string;
          vendor_category_id: string;
          opening_hours: Json;
          is_active: boolean;
          default_prep_minutes: number;
          min_order_amount: number;
          delivery_fee_base: number;
          delivery_fee_per_km: number;
          location_lat: number | null;
          location_lng: number | null;
          commission_rate: number;
          is_open: boolean;
          address_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          category_id: string;
          vendor_category_id: string;
          opening_hours?: Json;
          is_active?: boolean;
          default_prep_minutes?: number;
          min_order_amount?: number;
          delivery_fee_base?: number;
          delivery_fee_per_km?: number;
          location_lat?: number | null;
          location_lng?: number | null;
          commission_rate?: number;
          is_open?: boolean;
          address_text?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendors"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "vendors_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendors_vendor_category_id_fkey";
            columns: ["vendor_category_id"];
            referencedRelation: "vendor_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_categories: {
        Row: {
          id: string;
          vendor_id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["menu_categories"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "menu_categories_vendor_id_fkey";
            columns: ["vendor_id"];
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_staff: {
        Row: {
          id: string;
          vendor_id: string;
          profile_id: string;
          staff_role: "owner" | "manager" | "staff";
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          profile_id: string;
          staff_role?: "owner" | "manager" | "staff";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_staff"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "vendor_staff_vendor_id_fkey";
            columns: ["vendor_id"];
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendor_staff_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_inventory: {
        Row: {
          id: string;
          vendor_id: string;
          product_id: string;
          stock: number;
          min_stock: number;
          cost_price: number;
          unit: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          product_id: string;
          stock?: number;
          min_stock?: number;
          cost_price?: number;
          unit?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_inventory"]["Insert"]>;
        Relationships: [];
      };
      vendor_suppliers: {
        Row: {
          id: string;
          vendor_id: string;
          name: string;
          phone: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          name: string;
          phone?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_suppliers"]["Insert"]>;
        Relationships: [];
      };
      vendor_customers: {
        Row: {
          id: string;
          vendor_id: string;
          name: string;
          phone: string | null;
          note: string | null;
          balance: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          name: string;
          phone?: string | null;
          note?: string | null;
          balance?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_customers"]["Insert"]>;
        Relationships: [];
      };
      vendor_customer_transactions: {
        Row: {
          id: string;
          customer_id: string;
          type: "debt" | "payment";
          amount: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          type: "debt" | "payment";
          amount: number;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_customer_transactions"]["Insert"]>;
        Relationships: [];
      };
      vendor_sales_invoices: {
        Row: {
          id: string;
          vendor_id: string;
          customer_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          payment_method: "cash" | "card" | "credit";
          subtotal: number;
          discount: number;
          total: number;
          note: string | null;
          issued_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          payment_method?: "cash" | "card" | "credit";
          subtotal?: number;
          discount?: number;
          total?: number;
          note?: string | null;
          issued_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_sales_invoices"]["Insert"]>;
        Relationships: [];
      };
      vendor_sales_invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          product_id: string | null;
          name_snapshot: string;
          qty: number;
          unit_price: number;
          total: number;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          product_id?: string | null;
          name_snapshot: string;
          qty: number;
          unit_price: number;
          total: number;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_sales_invoice_items"]["Insert"]>;
        Relationships: [];
      };
      vendor_purchase_invoices: {
        Row: {
          id: string;
          vendor_id: string;
          supplier_id: string | null;
          total: number;
          paid: number;
          status: "paid" | "partial" | "unpaid";
          note: string | null;
          issued_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          supplier_id?: string | null;
          total?: number;
          paid?: number;
          status?: "paid" | "partial" | "unpaid";
          note?: string | null;
          issued_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_purchase_invoices"]["Insert"]>;
        Relationships: [];
      };
      vendor_purchase_invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          product_id: string | null;
          name_snapshot: string;
          qty: number;
          unit_cost: number;
          total: number;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          product_id?: string | null;
          name_snapshot: string;
          qty: number;
          unit_cost: number;
          total: number;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_purchase_invoice_items"]["Insert"]>;
        Relationships: [];
      };
      platform_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["platform_settings"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_storefront: {
        Args: {
          search_query: string;
          vendor_limit?: number;
          product_limit?: number;
        };
        Returns: Json;
      };
      search_storefront_suggest: {
        Args: {
          search_query: string;
          vendor_limit?: number;
          product_limit?: number;
        };
        Returns: Json;
      };
      apply_coupon: {
        Args: {
          p_code: string;
          p_subtotal: number;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
