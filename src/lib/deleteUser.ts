import { supabase } from "@/integrations/supabase/client";

export async function deleteUser(userId: string) {
  const { data, error } = await supabase.functions.invoke('delete-user', {
    body: { userId }
  });

  if (error) throw error;
  return data;
}
