import { supabase } from "@/integrations/supabase/client";

export async function resetDatabase() {
  const { data, error } = await supabase.functions.invoke('reset-database');

  if (error) throw error;
  return data;
}
