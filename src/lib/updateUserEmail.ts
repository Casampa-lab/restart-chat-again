import { supabase } from "@/integrations/supabase/client";

export async function updateUserEmail(userId: string, newEmail: string) {
  const { data, error } = await supabase.functions.invoke('update-user-email', {
    body: { userId, newEmail }
  });

  if (error) throw error;
  return data;
}

export async function updateMultipleUserEmails(userIds: string[], newEmail: string) {
  const results = await Promise.allSettled(
    userIds.map(userId => updateUserEmail(userId, newEmail))
  );

  const errors = results.filter(r => r.status === 'rejected');
  if (errors.length > 0) {
    console.error('Erros ao atualizar emails:', errors);
    throw new Error(`Falha ao atualizar ${errors.length} email(s)`);
  }

  return results;
}
