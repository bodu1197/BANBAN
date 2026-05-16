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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ad_duration_options: {
        Row: {
          created_at: string
          discount_percent: number
          id: string
          is_active: boolean
          label: string
          months: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          label: string
          months: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          label?: string
          months?: number
          sort_order?: number
        }
        Relationships: []
      }
      ad_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          page_path: string | null
          placement: string | null
          subscription_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          page_path?: string | null
          placement?: string | null
          subscription_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          page_path?: string | null
          placement?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "ad_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_plans: {
        Row: {
          artist_type: string
          created_at: string
          duration_days: number
          id: string
          is_active: boolean
          max_portfolios: number
          name: string
          price: number
        }
        Insert: {
          artist_type?: string
          created_at?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          max_portfolios?: number
          name: string
          price: number
        }
        Update: {
          artist_type?: string
          created_at?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          max_portfolios?: number
          name?: string
          price?: number
        }
        Relationships: []
      }
      ad_portfolio_slots: {
        Row: {
          created_at: string
          id: string
          portfolio_id: string
          subscription_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          portfolio_id: string
          subscription_id: string
        }
        Update: {
          created_at?: string
          id?: string
          portfolio_id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_portfolio_slots_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_portfolio_slots_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "ad_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_subscriptions: {
        Row: {
          artist_id: string
          click_count: number
          created_at: string
          duration_months: number
          expires_at: string | null
          id: string
          imp_uid: string | null
          impression_count: number
          merchant_uid: string | null
          paid_by_cash: number
          paid_by_points: number
          plan_id: string
          price_paid: number
          started_at: string | null
          status: string
        }
        Insert: {
          artist_id: string
          click_count?: number
          created_at?: string
          duration_months?: number
          expires_at?: string | null
          id?: string
          imp_uid?: string | null
          impression_count?: number
          merchant_uid?: string | null
          paid_by_cash?: number
          paid_by_points?: number
          plan_id: string
          price_paid?: number
          started_at?: string | null
          status?: string
        }
        Update: {
          artist_id?: string
          click_count?: number
          created_at?: string
          duration_months?: number
          expires_at?: string | null
          id?: string
          imp_uid?: string | null
          impression_count?: number
          merchant_uid?: string | null
          paid_by_cash?: number
          paid_by_points?: number
          plan_id?: string
          price_paid?: number
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_subscriptions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "ad_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_hidden_items: {
        Row: {
          hidden_at: string | null
          id: string
          item_id: string
          table_name: string
        }
        Insert: {
          hidden_at?: string | null
          id?: string
          item_id: string
          table_name: string
        }
        Update: {
          hidden_at?: string | null
          id?: string
          item_id?: string
          table_name?: string
        }
        Relationships: []
      }
      ai_generated_tattoos: {
        Row: {
          body_part: string | null
          created_at: string
          flux_prompt: string | null
          generation_type: string
          id: string
          is_public: boolean
          likes_count: number
          prompt: string
          storage_path: string
          style: string
          updated_at: string
          user_id: string | null
          views_count: number
        }
        Insert: {
          body_part?: string | null
          created_at?: string
          flux_prompt?: string | null
          generation_type?: string
          id?: string
          is_public?: boolean
          likes_count?: number
          prompt: string
          storage_path: string
          style?: string
          updated_at?: string
          user_id?: string | null
          views_count?: number
        }
        Update: {
          body_part?: string | null
          created_at?: string
          flux_prompt?: string | null
          generation_type?: string
          id?: string
          is_public?: boolean
          likes_count?: number
          prompt?: string
          storage_path?: string
          style?: string
          updated_at?: string
          user_id?: string | null
          views_count?: number
        }
        Relationships: []
      }
      announcements: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      artist_media: {
        Row: {
          artist_id: string | null
          created_at: string | null
          id: string
          order_index: number | null
          storage_path: string
          type: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          id?: string
          order_index?: number | null
          storage_path: string
          type?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          id?: string
          order_index?: number | null
          storage_path?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_media_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          address: string
          address_detail: string | null
          approved_at: string | null
          bank_account: string | null
          bank_holder: string | null
          bank_name: string | null
          contact: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          description_cn: string | null
          description_jp: string | null
          id: string
          instagram_url: string | null
          introduce: string
          introduce_cn: string | null
          introduce_jp: string | null
          is_hide: boolean | null
          kakao_url: string | null
          lat: number | null
          legacy_id: number | null
          likes_count: number | null
          lon: number | null
          portfolio_media_count: number
          profile_image_path: string | null
          region_id: string | null
          status: string
          title: string
          title_cn: string | null
          title_jp: string | null
          type_artist: string
          type_sex: string
          updated_at: string | null
          user_id: string
          views_count: number | null
          zipcode: string | null
        }
        Insert: {
          address: string
          address_detail?: string | null
          approved_at?: string | null
          bank_account?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          contact: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          description_cn?: string | null
          description_jp?: string | null
          id?: string
          instagram_url?: string | null
          introduce: string
          introduce_cn?: string | null
          introduce_jp?: string | null
          is_hide?: boolean | null
          kakao_url?: string | null
          lat?: number | null
          legacy_id?: number | null
          likes_count?: number | null
          lon?: number | null
          portfolio_media_count?: number
          profile_image_path?: string | null
          region_id?: string | null
          status?: string
          title: string
          title_cn?: string | null
          title_jp?: string | null
          type_artist: string
          type_sex: string
          updated_at?: string | null
          user_id: string
          views_count?: number | null
          zipcode?: string | null
        }
        Update: {
          address?: string
          address_detail?: string | null
          approved_at?: string | null
          bank_account?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          contact?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          description_cn?: string | null
          description_jp?: string | null
          id?: string
          instagram_url?: string | null
          introduce?: string
          introduce_cn?: string | null
          introduce_jp?: string | null
          is_hide?: boolean | null
          kakao_url?: string | null
          lat?: number | null
          legacy_id?: number | null
          likes_count?: number | null
          lon?: number | null
          portfolio_media_count?: number
          profile_image_path?: string | null
          region_id?: string | null
          status?: string
          title?: string
          title_cn?: string | null
          title_jp?: string | null
          type_artist?: string
          type_sex?: string
          updated_at?: string | null
          user_id?: string
          views_count?: number | null
          zipcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artists_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          checked_date: string
          created_at: string
          id: string
          streak: number
          user_id: string
        }
        Insert: {
          checked_date?: string
          created_at?: string
          id?: string
          streak?: number
          user_id: string
        }
        Update: {
          checked_date?: string
          created_at?: string
          id?: string
          streak?: number
          user_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string | null
          end_at: string | null
          id: string
          image_path: string
          is_active: boolean | null
          link_url: string | null
          order_index: number | null
          start_at: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          end_at?: string | null
          id?: string
          image_path: string
          is_active?: boolean | null
          link_url?: string | null
          order_index?: number | null
          start_at?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          end_at?: string | null
          id?: string
          image_path?: string
          is_active?: boolean | null
          link_url?: string | null
          order_index?: number | null
          start_at?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      before_after_photos: {
        Row: {
          after_image_path: string
          artist_id: string
          before_image_path: string
          created_at: string
          id: string
          order_index: number
          title: string | null
        }
        Insert: {
          after_image_path: string
          artist_id: string
          before_image_path: string
          created_at?: string
          id?: string
          order_index?: number
          title?: string | null
        }
        Update: {
          after_image_path?: string
          artist_id?: string
          before_image_path?: string
          created_at?: string
          id?: string
          order_index?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "before_after_photos_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      blacklists: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blacklists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_user_id: string
          created_at: string | null
          id: string
          legacy_id: number | null
          user_id: string
        }
        Insert: {
          blocked_user_id: string
          created_at?: string | null
          id?: string
          legacy_id?: number | null
          user_id: string
        }
        Update: {
          blocked_user_id?: string
          created_at?: string | null
          id?: string
          legacy_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_user_id_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          artist_type: string | null
          category_type: string | null
          created_at: string | null
          id: string
          name: string
          order_index: number | null
          parent_id: string | null
          target_gender: string | null
        }
        Insert: {
          artist_type?: string | null
          category_type?: string | null
          created_at?: string | null
          id?: string
          name: string
          order_index?: number | null
          parent_id?: string | null
          target_gender?: string | null
        }
        Update: {
          artist_type?: string | null
          category_type?: string | null
          created_at?: string | null
          id?: string
          name?: string
          order_index?: number | null
          parent_id?: string | null
          target_gender?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categorizables: {
        Row: {
          categorizable_id: string
          categorizable_type: string
          category_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          categorizable_id: string
          categorizable_type: string
          category_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          categorizable_id?: string
          categorizable_type?: string
          category_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorizables_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_path: string | null
          attachment_type: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          legacy_id: number | null
          message: string | null
          read_at: string | null
          room_id: string
          sender_id: string | null
        }
        Insert: {
          attachment_path?: string | null
          attachment_type?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          legacy_id?: number | null
          message?: string | null
          read_at?: string | null
          room_id: string
          sender_id?: string | null
        }
        Update: {
          attachment_path?: string | null
          attachment_type?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          legacy_id?: number | null
          message?: string | null
          read_at?: string | null
          room_id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          artist_id: string
          created_at: string | null
          estimate_id: string | null
          id: string
          last_message_at: string | null
          legacy_id: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          estimate_id?: string | null
          id?: string
          last_message_at?: string | null
          legacy_id?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          estimate_id?: string | null
          id?: string
          last_message_at?: string | null
          legacy_id?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          deleted_at: string | null
          id: string
          legacy_id: number | null
          likes_count: number | null
          parent_id: string | null
          post_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          legacy_id?: number | null
          likes_count?: number | null
          parent_id?: string | null
          post_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          legacy_id?: number | null
          likes_count?: number | null
          parent_id?: string | null
          post_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_clicks: {
        Row: {
          artist_id: string
          click_type: string
          created_at: string
          id: string
          source_id: string | null
          source_page: string
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          artist_id: string
          click_type: string
          created_at?: string
          id?: string
          source_id?: string | null
          source_page: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          artist_id?: string
          click_type?: string
          created_at?: string
          id?: string
          source_id?: string | null
          source_page?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_clicks_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_curriculum: {
        Row: {
          chapter_number: number
          course_id: string
          created_at: string | null
          id: string
          title: string
        }
        Insert: {
          chapter_number: number
          course_id: string
          created_at?: string | null
          id?: string
          title: string
        }
        Update: {
          chapter_number?: number
          course_id?: string
          created_at?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_curriculum_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_highlights: {
        Row: {
          course_id: string
          created_at: string | null
          description: string
          id: string
          image_url: string | null
          order_index: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description: string
          id?: string
          image_url?: string | null
          order_index?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string
          id?: string
          image_url?: string | null
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_highlights_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_images: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          image_url: string
          order_index: number
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          image_url: string
          order_index?: number
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          image_url?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_images_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          cleanliness: number
          content: string | null
          course_id: string
          created_at: string | null
          id: string
          kindness: number
          satisfaction: number
          user_id: string
        }
        Insert: {
          cleanliness?: number
          content?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          kindness?: number
          satisfaction?: number
          user_id: string
        }
        Update: {
          cleanliness?: number
          content?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          kindness?: number
          satisfaction?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          artist_id: string
          category: string
          class_type: string
          created_at: string | null
          description: string | null
          discount_rate: number | null
          duration: string
          id: string
          is_active: boolean | null
          location: string
          original_price: number | null
          price: number
          title: string
          updated_at: string | null
        }
        Insert: {
          artist_id: string
          category: string
          class_type: string
          created_at?: string | null
          description?: string | null
          discount_rate?: number | null
          duration: string
          id?: string
          is_active?: boolean | null
          location: string
          original_price?: number | null
          price: number
          title: string
          updated_at?: string | null
        }
        Update: {
          artist_id?: string
          category?: string
          class_type?: string
          created_at?: string | null
          description?: string | null
          discount_rate?: number | null
          duration?: string
          id?: string
          is_active?: boolean | null
          location?: string
          original_price?: number | null
          price?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      encyclopedia_articles: {
        Row: {
          category: string
          content: string
          cover_image_alt: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string
          faq: Json
          id: string
          inline_images: Json
          keywords: string[]
          meta_description: string
          meta_title: string
          published: boolean
          published_at: string
          reading_time_minutes: number
          slug: string
          tags: string[]
          title: string
          topic_id: number
          updated_at: string
          view_count: number
        }
        Insert: {
          category: string
          content: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt: string
          faq?: Json
          id?: string
          inline_images?: Json
          keywords?: string[]
          meta_description: string
          meta_title: string
          published?: boolean
          published_at?: string
          reading_time_minutes?: number
          slug: string
          tags?: string[]
          title: string
          topic_id: number
          updated_at?: string
          view_count?: number
        }
        Update: {
          category?: string
          content?: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          faq?: Json
          id?: string
          inline_images?: Json
          keywords?: string[]
          meta_description?: string
          meta_title?: string
          published?: boolean
          published_at?: string
          reading_time_minutes?: number
          slug?: string
          tags?: string[]
          title?: string
          topic_id?: number
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      estimate_inquiries: {
        Row: {
          artist_id: string
          budget_max: number | null
          budget_min: number | null
          created_at: string | null
          description: string
          id: string
          legacy_id: number | null
          preferred_date: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          artist_id: string
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          description: string
          id?: string
          legacy_id?: number | null
          preferred_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          artist_id?: string
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          description?: string
          id?: string
          legacy_id?: number | null
          preferred_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_inquiries_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_inquiries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          artist_id: string
          created_at: string | null
          description: string | null
          id: string
          inquiry_id: string | null
          legacy_id: number | null
          price: number
          status: string | null
          title: string
          updated_at: string | null
          user_id: string | null
          valid_until: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          inquiry_id?: string | null
          legacy_id?: number | null
          price: number
          status?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          valid_until?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          inquiry_id?: string | null
          legacy_id?: number | null
          price?: number
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "estimate_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibition_entries: {
        Row: {
          admin_note: string | null
          artist_id: string
          created_at: string
          exhibition_id: string
          id: string
          portfolio_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          artist_id: string
          created_at?: string
          exhibition_id: string
          id?: string
          portfolio_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          artist_id?: string
          created_at?: string
          exhibition_id?: string
          id?: string
          portfolio_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exhibition_entries_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibition_entries_exhibition_id_fkey"
            columns: ["exhibition_id"]
            isOneToOne: false
            referencedRelation: "exhibitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibition_entries_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitions: {
        Row: {
          category: string
          created_at: string
          end_at: string | null
          id: string
          image_path: string
          is_active: boolean
          link_url: string | null
          order_index: number
          start_at: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          end_at?: string | null
          id?: string
          image_path: string
          is_active?: boolean
          link_url?: string | null
          order_index?: number
          start_at?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          end_at?: string | null
          id?: string
          image_path?: string
          is_active?: boolean
          link_url?: string | null
          order_index?: number
          start_at?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          admin_replied_at: string | null
          admin_reply: string | null
          admin_reply_image_urls: string[] | null
          body: string
          created_at: string | null
          id: string
          image_urls: string[] | null
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_replied_at?: string | null
          admin_reply?: string | null
          admin_reply_image_urls?: string[] | null
          body: string
          created_at?: string | null
          id?: string
          image_urls?: string[] | null
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_replied_at?: string | null
          admin_reply?: string | null
          admin_reply_image_urls?: string[] | null
          body?: string
          created_at?: string | null
          id?: string
          image_urls?: string[] | null
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          legacy_id: number | null
          likeable_id: string
          likeable_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          legacy_id?: number | null
          likeable_id: string
          likeable_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          legacy_id?: number | null
          likeable_id?: string
          likeable_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          media_url: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          media_url?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          media_url?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          legacy_id: number | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          legacy_id?: number | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          legacy_id?: number | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_visits: {
        Row: {
          country: string | null
          created_at: string
          id: number
          ip: string | null
          path: string
          referer: string | null
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id: number
          ip?: string | null
          path: string
          referer?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: number
          ip?: string | null
          path?: string
          referer?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      point_policies: {
        Row: {
          amount: number
          created_at: string
          daily_limit: number | null
          id: string
          is_active: boolean
          label: string
          reason: string
          semi_amount: number | null
          target: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          daily_limit?: number | null
          id?: string
          is_active?: boolean
          label: string
          reason: string
          semi_amount?: number | null
          target?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          daily_limit?: number | null
          id?: string
          is_active?: boolean
          label?: string
          reason?: string
          semi_amount?: number | null
          target?: string
          updated_at?: string
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          expired: boolean
          expires_at: string | null
          id: string
          reason: string
          reference_id: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          expired?: boolean
          expires_at?: string | null
          id?: string
          reason: string
          reference_id?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          expired?: boolean
          expires_at?: string | null
          id?: string
          reason?: string
          reference_id?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "point_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      point_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      points: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          imp_uid: string | null
          legacy_id: number | null
          merchant_uid: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          imp_uid?: string | null
          legacy_id?: number | null
          merchant_uid?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          imp_uid?: string | null
          legacy_id?: number | null
          merchant_uid?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_embeddings: {
        Row: {
          created_at: string | null
          embedding: string
          id: string
          portfolio_media_id: string
        }
        Insert: {
          created_at?: string | null
          embedding: string
          id?: string
          portfolio_media_id: string
        }
        Update: {
          created_at?: string | null
          embedding?: string
          id?: string
          portfolio_media_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_embeddings_portfolio_media_id_fkey"
            columns: ["portfolio_media_id"]
            isOneToOne: true
            referencedRelation: "portfolio_media"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_media: {
        Row: {
          created_at: string | null
          id: string
          legacy_media_id: number | null
          order_index: number | null
          portfolio_id: string
          storage_path: string
          thumbnail_path: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          legacy_media_id?: number | null
          order_index?: number | null
          portfolio_id: string
          storage_path: string
          thumbnail_path?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          legacy_media_id?: number | null
          order_index?: number | null
          portfolio_id?: string
          storage_path?: string
          thumbnail_path?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_media_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          artist_id: string
          created_at: string | null
          deleted_at: string | null
          description: string
          description_cn: string | null
          description_jp: string | null
          discount_rate: number | null
          id: string
          legacy_id: number | null
          likes_count: number | null
          price: number
          price_origin: number
          sale_ended_at: string | null
          title: string
          title_cn: string | null
          title_jp: string | null
          updated_at: string | null
          views_count: number | null
          youtube_url: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          deleted_at?: string | null
          description: string
          description_cn?: string | null
          description_jp?: string | null
          discount_rate?: number | null
          id?: string
          legacy_id?: number | null
          likes_count?: number | null
          price: number
          price_origin: number
          sale_ended_at?: string | null
          title: string
          title_cn?: string | null
          title_jp?: string | null
          updated_at?: string | null
          views_count?: number | null
          youtube_url?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string
          description_cn?: string | null
          description_jp?: string | null
          discount_rate?: number | null
          id?: string
          legacy_id?: number | null
          likes_count?: number | null
          price?: number
          price_origin?: number
          sale_ended_at?: string | null
          title?: string
          title_cn?: string | null
          title_jp?: string | null
          updated_at?: string | null
          views_count?: number | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string | null
          id: string
          order_index: number | null
          post_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_index?: number | null
          post_id: string
          storage_path: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_index?: number | null
          post_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          post_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          post_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          post_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          deleted_at: string | null
          id: string
          image_url: string | null
          legacy_id: number | null
          likes_count: number | null
          reports_count: number
          title: string
          type_artist: string
          type_board: string
          type_post: string
          updated_at: string | null
          user_id: string | null
          views_count: number | null
          youtube_url: string | null
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          legacy_id?: number | null
          likes_count?: number | null
          reports_count?: number
          title: string
          type_artist?: string
          type_board?: string
          type_post?: string
          updated_at?: string | null
          user_id?: string | null
          views_count?: number | null
          youtube_url?: string | null
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          legacy_id?: number | null
          likes_count?: number | null
          reports_count?: number
          title?: string
          type_artist?: string
          type_board?: string
          type_post?: string
          updated_at?: string | null
          user_id?: string | null
          views_count?: number | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contact: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          id: string
          is_admin: boolean | null
          language: string | null
          last_login_at: string | null
          legacy_id: number | null
          message_push_enabled: boolean | null
          nickname: string
          password: string | null
          profile_image_path: string | null
          social_id: string | null
          type_social: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          contact?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          language?: string | null
          last_login_at?: string | null
          legacy_id?: number | null
          message_push_enabled?: boolean | null
          nickname: string
          password?: string | null
          profile_image_path?: string | null
          social_id?: string | null
          type_social?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          contact?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          language?: string | null
          last_login_at?: string | null
          legacy_id?: number | null
          message_push_enabled?: boolean | null
          nickname?: string
          password?: string | null
          profile_image_path?: string | null
          social_id?: string | null
          type_social?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      promo_banners: {
        Row: {
          created_at: string
          id: string
          image_path: string
          is_active: boolean
          link_url: string | null
          order_index: number
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_path: string
          is_active?: boolean
          link_url?: string | null
          order_index?: number
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string
          is_active?: boolean
          link_url?: string | null
          order_index?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string | null
          device_type: string | null
          id: string
          is_active: boolean | null
          legacy_id: number | null
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          legacy_id?: number | null
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          legacy_id?: number | null
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_bids: {
        Row: {
          artist_id: string
          created_at: string
          description: string | null
          estimated_duration: string | null
          id: string
          portfolio_id: string | null
          price: number
          quote_request_id: string
          status: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          description?: string | null
          estimated_duration?: string | null
          id?: string
          portfolio_id?: string | null
          price: number
          quote_request_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          description?: string | null
          estimated_duration?: string | null
          id?: string
          portfolio_id?: string | null
          price?: number
          quote_request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_bids_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_bids_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_bids_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          body_part: string
          budget_max: number | null
          budget_min: number | null
          closed_at: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          reference_images: string[] | null
          size: string | null
          status: string
          style: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_part: string
          budget_max?: number | null
          budget_min?: number | null
          closed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          reference_images?: string[] | null
          size?: string | null
          status?: string
          style?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body_part?: string
          budget_max?: number | null
          budget_min?: number | null
          closed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          reference_images?: string[] | null
          size?: string | null
          status?: string
          style?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recruitments: {
        Row: {
          artist_id: string | null
          closed_at: string | null
          condition: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          expense: number | null
          id: string
          legacy_id: number | null
          parts: string | null
          title: string
          type_artist: string | null
          updated_at: string | null
        }
        Insert: {
          artist_id?: string | null
          closed_at?: string | null
          condition?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          expense?: number | null
          id?: string
          legacy_id?: number | null
          parts?: string | null
          title: string
          type_artist?: string | null
          updated_at?: string | null
        }
        Update: {
          artist_id?: string | null
          closed_at?: string | null
          condition?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          expense?: number | null
          id?: string
          legacy_id?: number | null
          parts?: string | null
          title?: string
          type_artist?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitments_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          created_at: string | null
          id: string
          name: string
          order_index: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          order_index?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          order_index?: number | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          legacy_id: number | null
          reason: string
          reportable_id: string
          reportable_type: string
          reporter_id: string | null
          reviewed_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          legacy_id?: number | null
          reason: string
          reportable_id: string
          reportable_type: string
          reporter_id?: string | null
          reviewed_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          legacy_id?: number | null
          reason?: string
          reportable_id?: string
          reportable_type?: string
          reporter_id?: string | null
          reviewed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_media: {
        Row: {
          created_at: string | null
          id: string
          order_index: number | null
          review_id: string | null
          storage_path: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_index?: number | null
          review_id?: string | null
          storage_path: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_index?: number | null
          review_id?: string | null
          storage_path?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_media_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          artist_id: string
          content: string
          created_at: string | null
          deleted_at: string | null
          id: string
          legacy_id: number | null
          rating: number
          reservation_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          artist_id: string
          content: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          legacy_id?: number | null
          rating: number
          reservation_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          artist_id?: string
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          legacy_id?: number | null
          rating?: number
          reservation_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      similarity_top_results: {
        Row: {
          created_at: string | null
          id: string
          portfolio_id: string
          portfolio_media_id: string
          search_count: number | null
          similarity: number
          storage_path: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          portfolio_id: string
          portfolio_media_id: string
          search_count?: number | null
          similarity: number
          storage_path: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          portfolio_id?: string
          portfolio_media_id?: string
          search_count?: number | null
          similarity?: number
          storage_path?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "similarity_top_results_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "similarity_top_results_portfolio_media_id_fkey"
            columns: ["portfolio_media_id"]
            isOneToOne: true
            referencedRelation: "portfolio_media"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analytics_daily: {
        Args: never
        Returns: {
          count: number
          date: string
          uv: number
        }[]
      }
      analytics_hourly: {
        Args: never
        Returns: {
          count: number
          hour: string
          uv: number
        }[]
      }
      analytics_monthly: {
        Args: never
        Returns: {
          count: number
          month: string
          uv: number
        }[]
      }
      analytics_period_counts: {
        Args: { p_period?: string }
        Returns: {
          period_pv: number
          period_uv: number
          total_pv: number
          total_uv: number
        }[]
      }
      analytics_top_countries:
        | {
            Args: never
            Returns: {
              count: number
              country: string
            }[]
          }
        | {
            Args: { p_period?: string }
            Returns: {
              count: number
              country: string
            }[]
          }
      analytics_top_paths:
        | {
            Args: never
            Returns: {
              count: number
              path: string
            }[]
          }
        | {
            Args: { p_period?: string }
            Returns: {
              count: number
              path: string
            }[]
          }
      analytics_uv_counts: {
        Args: never
        Returns: {
          today_uv: number
          total_uv: number
        }[]
      }
      analytics_yearly: {
        Args: never
        Returns: {
          count: number
          uv: number
          year: string
        }[]
      }
      auto_dormant_artists: { Args: never; Returns: undefined }
      count_portfolios_by_categories: {
        Args: { p_artist_ids: string[]; p_category_ids: string[] }
        Returns: number
      }
      decrement_likes_count: {
        Args: { artist_id_param: string }
        Returns: undefined
      }
      decrement_portfolio_likes: {
        Args: { portfolio_id_param: string }
        Returns: undefined
      }
      delete_user_account: { Args: never; Returns: undefined }
      get_artist_ids_with_portfolio: {
        Args: never
        Returns: {
          artist_id: string
        }[]
      }
      get_artist_review_stats: {
        Args: { artist_ids: string[] }
        Returns: {
          artist_id: string
          avg_rating: number
          review_count: number
        }[]
      }
      get_auth_triggers: {
        Args: never
        Returns: {
          action_statement: string
          event_manipulation: string
          trigger_name: string
        }[]
      }
      get_function_definition: { Args: { func_name: string }; Returns: string }
      get_general_members: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          contact: string
          created_at: string
          deleted_at: string
          email: string
          id: string
          is_admin: boolean
          language: string
          last_login_at: string
          nickname: string
          total_count: number
          type_social: string
          username: string
        }[]
      }
      get_login_stats: { Args: never; Returns: Json }
      get_popular_artists_with_portfolio: {
        Args: { p_limit?: number; p_type_artist: string }
        Returns: {
          address: string
          description: string
          id: string
          introduce: string
          lat: number
          likes_count: number
          lon: number
          profile_image_path: string
          region_name: string
          title: string
          type_artist: string
        }[]
      }
      get_recently_active_artists: {
        Args: { p_hours?: number; p_limit?: number }
        Returns: {
          address: string
          id: string
          introduce: string
          last_sign_in_at: string
          likes_count: number
          portfolio_media_count: number
          profile_image_path: string
          region_name: string
          title: string
          type_artist: string
          user_id: string
        }[]
      }
      get_recommendation_artist_ids: {
        Args: { p_type_artist: string }
        Returns: {
          artist_id: string
        }[]
      }
      increment_encyclopedia_view: {
        Args: { p_slug: string }
        Returns: undefined
      }
      increment_likes_count: {
        Args: { artist_id_param: string }
        Returns: undefined
      }
      increment_portfolio_likes: {
        Args: { portfolio_id_param: string }
        Returns: undefined
      }
      increment_portfolio_views: {
        Args: { portfolio_id_param: string }
        Returns: undefined
      }
      increment_search_count: { Args: { media_id: string }; Returns: undefined }
      mark_dormant_artists: { Args: never; Returns: number }
      match_portfolios: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          portfolio_id: string
          portfolio_media_id: string
          similarity: number
          storage_path: string
        }[]
      }
      nearby_artists: {
        Args: {
          limit_count?: number
          max_distance_km?: number
          p_type_artist?: string
          user_lat: number
          user_lng: number
        }
        Returns: {
          address: string
          distance_km: number
          id: string
          lat: number
          likes_count: number
          lon: number
          profile_image_path: string
          region_name: string
          title: string
          type_artist: string
        }[]
      }
      search_portfolios_by_categories: {
        Args: {
          p_artist_ids: string[]
          p_category_ids: string[]
          p_limit?: number
          p_offset?: number
          p_sort?: string
        }
        Returns: {
          id: string
        }[]
      }
      search_portfolios_by_category_ids: {
        Args: {
          p_category_ids: string[]
          p_region_ids?: string[]
          p_type_artist?: string
          p_type_sex?: string
        }
        Returns: {
          artist_id: string
          created_at: string | null
          deleted_at: string | null
          description: string
          description_cn: string | null
          description_jp: string | null
          discount_rate: number | null
          id: string
          legacy_id: number | null
          likes_count: number | null
          price: number
          price_origin: number
          sale_ended_at: string | null
          title: string
          title_cn: string | null
          title_jp: string | null
          updated_at: string | null
          views_count: number | null
          youtube_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "portfolios"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      upsert_similarity_top: {
        Args: {
          p_media_id: string
          p_portfolio_id: string
          p_similarity: number
          p_storage_path: string
        }
        Returns: undefined
      }
      upsert_similarity_top_batch: {
        Args: {
          p_media_ids: string[]
          p_portfolio_ids: string[]
          p_similarities: number[]
          p_storage_paths: string[]
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

