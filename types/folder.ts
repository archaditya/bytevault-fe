export interface FolderRecord {
  id: string;
  user_id: string;
  name: string;
  parent_id?: string | null;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
}
