export interface FolderRecord {
  id: string;
  user_id: string;
  name: string;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
}
