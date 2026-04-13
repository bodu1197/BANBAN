export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Type aliases for union types (extracted per SonarCloud recommendation)
export type ExhibitionEntryStatus = 'pending' | 'approved' | 'rejected';
export type SexType = 'MALE' | 'FEMALE' | 'OTHER';
export type ArtistType = 'TATTOO' | 'SEMI_PERMANENT' | 'BOTH';
export type ChatRoomStatus = 'ACTIVE' | 'CLOSED' | 'REPORTED';
export type AttachmentType = 'image' | 'file';
export type LikeableType = 'artist' | 'portfolio' | 'post' | 'Artist' | 'Portfolio' | 'Post';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          email: string | null
          password: string | null
          nickname: string
          contact: string | null
          is_admin: boolean
          type_social: string
          social_id: string | null
          language: string
          message_push_enabled: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id: string
          username: string
          email?: string | null
          password?: string | null
          nickname: string
          contact?: string | null
          is_admin?: boolean
          type_social?: string
          social_id?: string | null
          language?: string
          message_push_enabled?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          username?: string
          email?: string | null
          password?: string | null
          nickname?: string
          contact?: string | null
          is_admin?: boolean
          type_social?: string
          social_id?: string | null
          language?: string
          message_push_enabled?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      artists: {
        Row: {
          id: string
          user_id: string
          region_id: string | null
          type_sex: SexType
          contact: string
          kakao_url: string | null
          instagram_url: string | null
          title: string
          type_artist: ArtistType
          introduce: string
          description: string | null
          zipcode: string | null
          address: string
          address_detail: string | null
          lat: number | null
          lon: number | null
          bank_name: string | null
          bank_account: string | null
          bank_holder: string | null
          approved_at: string | null
          is_hide: boolean
          status: string
          likes_count: number
          views_count: number
          profile_image_path: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          region_id?: string | null
          type_sex: SexType
          contact: string
          kakao_url?: string | null
          instagram_url?: string | null
          title: string
          type_artist: ArtistType
          introduce: string
          description?: string | null
          zipcode?: string | null
          address: string
          address_detail?: string | null
          lat?: number | null
          lon?: number | null
          bank_name?: string | null
          bank_account?: string | null
          bank_holder?: string | null
          approved_at?: string | null
          is_hide?: boolean
          status?: string
          likes_count?: number
          views_count?: number
          profile_image_path?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          region_id?: string | null
          type_sex?: SexType
          contact?: string
          kakao_url?: string | null
          instagram_url?: string | null
          title?: string
          type_artist?: 'TATTOO' | 'PIERCING' | 'BOTH'
          introduce?: string
          description?: string | null
          zipcode?: string | null
          address?: string
          address_detail?: string | null
          lat?: number | null
          lon?: number | null
          bank_name?: string | null
          bank_account?: string | null
          bank_holder?: string | null
          approved_at?: string | null
          is_hide?: boolean
          status?: string
          likes_count?: number
          views_count?: number
          profile_image_path?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
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
          }
        ]
      }
      portfolios: {
        Row: {
          id: string
          artist_id: string
          title: string
          description: string
          price_origin: number
          price: number
          discount_rate: number
          sale_ended_at: string | null
          likes_count: number
          views_count: number
          created_at: string
          updated_at: string
          youtube_url: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          artist_id: string
          title: string
          description: string
          price_origin: number
          price: number
          discount_rate?: number
          sale_ended_at?: string | null
          likes_count?: number
          views_count?: number
          created_at?: string
          updated_at?: string
          youtube_url?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          artist_id?: string
          title?: string
          description?: string
          price_origin?: number
          price?: number
          discount_rate?: number
          sale_ended_at?: string | null
          likes_count?: number
          views_count?: number
          created_at?: string
          updated_at?: string
          youtube_url?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          }
        ]
      }
      portfolio_media: {
        Row: {
          id: string
          portfolio_id: string
          type: 'image' | 'video'
          storage_path: string
          thumbnail_path: string | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          portfolio_id: string
          type: 'image' | 'video'
          storage_path: string
          thumbnail_path?: string | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string
          type?: 'image' | 'video'
          storage_path?: string
          thumbnail_path?: string | null
          order_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_media_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          }
        ]
      }
      regions: {
        Row: {
          id: string
          name: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          order_index?: number
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          category_type: string | null
          order_index: number
          created_at: string
          artist_type: string | null
          parent_id: string | null
          target_gender: string | null
        }
        Insert: {
          id?: string
          name: string
          category_type?: string | null
          order_index?: number
          created_at?: string
          artist_type?: string | null
          parent_id?: string | null
          target_gender?: string | null
        }
        Update: {
          id?: string
          name?: string
          category_type?: string | null
          order_index?: number
          created_at?: string
          artist_type?: string | null
          parent_id?: string | null
          target_gender?: string | null
        }
        Relationships: []
      }
      chat_rooms: {
        Row: {
          id: string
          user_id: string | null
          artist_id: string
          estimate_id: string | null
          status: ChatRoomStatus
          last_message_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          artist_id: string
          estimate_id?: string | null
          status?: ChatRoomStatus
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          artist_id?: string
          estimate_id?: string | null
          status?: ChatRoomStatus
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          room_id: string
          sender_id: string | null
          message: string | null
          attachment_path: string | null
          attachment_type: AttachmentType | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          sender_id?: string | null
          message?: string | null
          attachment_path?: string | null
          attachment_type?: AttachmentType | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          sender_id?: string | null
          message?: string | null
          attachment_path?: string | null
          attachment_type?: AttachmentType | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          reservation_id: string | null
          user_id: string | null
          artist_id: string
          rating: number
          content: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          reservation_id?: string | null
          user_id?: string | null
          artist_id: string
          rating: number
          content: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          reservation_id?: string | null
          user_id?: string | null
          artist_id?: string
          rating?: number
          content?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          }
        ]
      }
      likes: {
        Row: {
          id: string
          user_id: string
          likeable_type: LikeableType
          likeable_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          likeable_type: LikeableType
          likeable_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          likeable_type?: LikeableType
          likeable_id?: string
          created_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          user_id: string | null
          title: string
          content: string
          type_board: string
          type_post: string
          type_artist: string
          likes_count: number
          views_count: number
          comments_count: number
          created_at: string
          updated_at: string
          deleted_at: string | null
          legacy_id: number | null
          image_url: string | null
          youtube_url: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          title: string
          content: string
          type_board?: string
          type_post?: string
          type_artist?: string
          likes_count?: number
          views_count?: number
          comments_count?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          image_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string
          content?: string
          type_board?: string
          type_post?: string
          type_artist?: string
          likes_count?: number
          views_count?: number
          comments_count?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          image_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      post_media: {
        Row: {
          id: string
          post_id: string
          storage_path: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          storage_path: string
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          storage_path?: string
          order_index?: number
          created_at?: string
        }
        Relationships: []
      }
      post_views: {
        Row: {
          id: string
          post_id: string
          user_id: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string | null
          parent_id: string | null
          content: string
          likes_count: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          post_id: string
          user_id?: string | null
          parent_id?: string | null
          content: string
          likes_count?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string | null
          parent_id?: string | null
          content?: string
          likes_count?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          data: Json | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          data?: Json | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          data?: Json | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      categorizables: {
        Row: {
          id: string
          category_id: string
          categorizable_type: 'artist' | 'portfolio'
          categorizable_id: string
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          categorizable_type: 'artist' | 'portfolio'
          categorizable_id: string
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          categorizable_type?: 'artist' | 'portfolio'
          categorizable_id?: string
          created_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          image_path: string
          link_url: string | null
          order_index: number
          is_active: boolean
          start_at: string | null
          end_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          subtitle?: string | null
          image_path: string
          link_url?: string | null
          order_index?: number
          is_active?: boolean
          start_at?: string | null
          end_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          subtitle?: string | null
          image_path?: string
          link_url?: string | null
          order_index?: number
          is_active?: boolean
          start_at?: string | null
          end_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      exhibitions: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          image_path: string
          link_url: string | null
          category: string
          order_index: number
          is_active: boolean
          start_at: string | null
          end_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          subtitle?: string | null
          image_path: string
          link_url?: string | null
          category?: string
          order_index?: number
          is_active?: boolean
          start_at?: string | null
          end_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          subtitle?: string | null
          image_path?: string
          link_url?: string | null
          category?: string
          order_index?: number
          is_active?: boolean
          start_at?: string | null
          end_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      artist_media: {
        Row: {
          id: string
          artist_id: string
          storage_path: string
          type: 'image' | 'video'
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          artist_id: string
          storage_path: string
          type?: 'image' | 'video'
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          artist_id?: string
          storage_path?: string
          type?: 'image' | 'video'
          order_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_media_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_generated_tattoos: {
        Row: {
          id: string
          user_id: string | null
          prompt: string
          flux_prompt: string | null
          style: string
          body_part: string | null
          generation_type: string
          storage_path: string
          likes_count: number
          views_count: number
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          prompt: string
          flux_prompt?: string | null
          style?: string
          body_part?: string | null
          generation_type?: string
          storage_path: string
          likes_count?: number
          views_count?: number
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          prompt?: string
          flux_prompt?: string | null
          style?: string
          body_part?: string | null
          generation_type?: string
          storage_path?: string
          likes_count?: number
          views_count?: number
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      recruitments: {
        Row: {
          id: string
          artist_id: string
          title: string
          description: string | null
          parts: string | null
          expense: number
          condition: string | null
          closed_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          artist_id: string
          title: string
          description?: string | null
          parts?: string | null
          expense: number
          condition?: string | null
          closed_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          artist_id?: string
          title?: string
          description?: string | null
          parts?: string | null
          expense?: number
          condition?: string | null
          closed_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitments_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          }
        ]
      }
      quote_requests: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          body_part: string
          size: string | null
          style: string | null
          budget_min: number | null
          budget_max: number | null
          reference_images: string[] | null
          status: string
          closed_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          body_part: string
          size?: string | null
          style?: string | null
          budget_min?: number | null
          budget_max?: number | null
          reference_images?: string[] | null
          status?: string
          closed_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          body_part?: string
          size?: string | null
          style?: string | null
          budget_min?: number | null
          budget_max?: number | null
          reference_images?: string[] | null
          status?: string
          closed_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      quote_bids: {
        Row: {
          id: string
          quote_request_id: string
          artist_id: string
          price: number
          description: string | null
          estimated_duration: string | null
          portfolio_id: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quote_request_id: string
          artist_id: string
          price: number
          description?: string | null
          estimated_duration?: string | null
          portfolio_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quote_request_id?: string
          artist_id?: string
          price?: number
          description?: string | null
          estimated_duration?: string | null
          portfolio_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_bids_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
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
          }
        ]
      }
      point_wallets: {
        Row: {
          id: string
          user_id: string
          balance: number
          total_earned: number
          total_spent: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          total_earned?: number
          total_spent?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          total_earned?: number
          total_spent?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          id: string
          wallet_id: string
          type: string
          amount: number
          reason: string
          description: string | null
          expires_at: string | null
          expired: boolean
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          wallet_id: string
          type: string
          amount: number
          reason: string
          description?: string | null
          expires_at?: string | null
          expired?: boolean
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          wallet_id?: string
          type?: string
          amount?: number
          reason?: string
          description?: string | null
          expires_at?: string | null
          expired?: boolean
          reference_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "point_wallets"
            referencedColumns: ["id"]
          }
        ]
      }
      point_policies: {
        Row: {
          id: string
          reason: string
          amount: number
          label: string
          target: string
          is_active: boolean
          daily_limit: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reason: string
          amount: number
          label: string
          target?: string
          is_active?: boolean
          daily_limit?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reason?: string
          amount?: number
          label?: string
          target?: string
          is_active?: boolean
          daily_limit?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      exhibition_entries: {
        Row: {
          id: string
          exhibition_id: string
          portfolio_id: string
          artist_id: string
          status: ExhibitionEntryStatus
          admin_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          exhibition_id: string
          portfolio_id: string
          artist_id: string
          status?: ExhibitionEntryStatus
          admin_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          exhibition_id?: string
          portfolio_id?: string
          artist_id?: string
          status?: ExhibitionEntryStatus
          admin_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
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
          {
            foreignKeyName: "exhibition_entries_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          }
        ]
      }
      attendance_logs: {
        Row: {
          id: string
          user_id: string
          checked_date: string
          streak: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          checked_date?: string
          streak?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          checked_date?: string
          streak?: number
          created_at?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          status: string
          admin_reply: string | null
          admin_replied_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          body: string
          status?: string
          admin_reply?: string | null
          admin_replied_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          body?: string
          status?: string
          admin_reply?: string | null
          admin_replied_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      admin_hidden_items: {
        Row: {
          id: string
          table_name: string
          item_id: string
          hidden_at: string
        }
        Insert: {
          id?: string
          table_name: string
          item_id: string
          hidden_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          item_id?: string
          hidden_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          participant_1: string
          participant_2: string
          last_message: string | null
          last_message_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          participant_1: string
          participant_2: string
          last_message?: string | null
          last_message_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          participant_1?: string
          participant_2?: string
          last_message?: string | null
          last_message_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          media_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          media_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          media_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      ad_subscriptions: {
        Row: {
          id: string
          artist_id: string
          status: string
          imp_uid: string | null
          merchant_uid: string | null
          paid_by_cash: number
          paid_by_points: number
          started_at: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          artist_id: string
          status?: string
          imp_uid?: string | null
          merchant_uid?: string | null
          paid_by_cash?: number
          paid_by_points?: number
          started_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          artist_id?: string
          status?: string
          imp_uid?: string | null
          merchant_uid?: string | null
          paid_by_cash?: number
          paid_by_points?: number
          started_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user_account: {
        Args: Record<string, never>
        Returns: undefined
      }
      increment_portfolio_likes: {
        Args: { portfolio_id_param: string }
        Returns: undefined
      }
      decrement_portfolio_likes: {
        Args: { portfolio_id_param: string }
        Returns: undefined
      }
      increment_likes_count: {
        Args: { artist_id_param: string }
        Returns: undefined
      }
      decrement_likes_count: {
        Args: { artist_id_param: string }
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

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

// Commonly used types
export type Profile = Tables<'profiles'>
export type Artist = Tables<'artists'>
export type Portfolio = Tables<'portfolios'>
export type PortfolioMedia = Tables<'portfolio_media'>
export type Region = Tables<'regions'>
export type Category = Tables<'categories'>
export type Review = Tables<'reviews'>
export type Like = Tables<'likes'>
export type Banner = Tables<'banners'>
export type Exhibition = Tables<'exhibitions'>
export type ArtistMedia = Tables<'artist_media'>
export type AiGeneratedTattoo = Tables<'ai_generated_tattoos'>
export type PointWalletRow = Tables<'point_wallets'>
export type PointTransactionRow = Tables<'point_transactions'>
export type PointPolicy = Tables<'point_policies'>
export type AttendanceLog = Tables<'attendance_logs'>
export type ExhibitionEntry = Tables<'exhibition_entries'>
