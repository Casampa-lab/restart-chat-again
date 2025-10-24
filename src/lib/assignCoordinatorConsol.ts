import { supabase } from "@/integrations/supabase/client";

export async function assignCoordinatorConsol() {
  const { data, error } = await supabase.functions.invoke('assign-coordinator-consol');

  if (error) throw error;
  return data;
}
