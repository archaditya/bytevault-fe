export interface Package {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  price_paise: number;
  gst_rate: number;
  price_with_gst_paise: number;
  currency: string;
  billing_period: string;
  storage_limit_bytes: number;
  max_file_size_bytes: number;
  razorpay_plan_id?: string;
  is_active: boolean;
  sort_order: number;
  features?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  package_id: string;
  razorpay_subscription_id?: string;
  status: string; // created, authenticated, active, pending, halted, cancelled, completed, paused, expired
  current_period_start?: string;
  current_period_end?: string;
  cancelled_at?: string;
  cancel_at_cycle_end: boolean;
  pending_package_id?: string;
  package?: Package;
  pending_package?: Package;
  user_email?: string;
  user_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  subscription_id?: string;
  package_id?: string;
  razorpay_payment_id?: string;
  amount_paise: number;
  tax_paise: number;
  total_paise: number;
  currency: string;
  type: string;
  status: string; // pending, captured, failed, refunded
  description?: string;
  failure_reason?: string;
  invoice_number?: string;
  invoice_generated: boolean;
  package_name?: string;
  user_email?: string;
  created_at: string;
}

export interface SubscriptionAuditLog {
  id: string;
  user_id?: string;
  subscription_id?: string;
  transaction_id?: string;
  event_type: string;
  event_source: string;
  status: string;
  error_message?: string;
  payload?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface SystemLogArchive {
  id: string;
  log_date: string;
  file_name: string;
  storage_location: "local" | "r2" | "purged";
  storage_key?: string;
  local_path?: string;
  file_size_bytes: number;
  compressed_size_bytes: number;
  archived_to_r2_at?: string;
  purged_at?: string;
  created_at: string;
  updated_at: string;
}
