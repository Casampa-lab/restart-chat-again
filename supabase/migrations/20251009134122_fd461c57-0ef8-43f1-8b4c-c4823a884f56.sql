-- Atualizar emails na tabela profiles
UPDATE profiles 
SET email = 'cassia.sampaio@me.com'
WHERE id IN (
  '6129443e-777f-4a80-b01c-afba11645c2d',
  '6105faf0-00a0-4afd-bd99-bb2adf1ea84c',
  '7d8bc31d-0f93-435f-ad6d-9f83311ae6d0'
);