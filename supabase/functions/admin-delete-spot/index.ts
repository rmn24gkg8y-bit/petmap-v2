// Supabase Edge Function: admin-delete-spot
// Receives a spotId from the PetMap admin client, validates the caller's
// secret, then deletes the row from `spots` using service role key.
//
// Deploy:
//   supabase secrets set ADMIN_PUBLISH_SECRET=<your_secret>
//   supabase functions deploy admin-delete-spot
//
// Environment variables (auto-injected by Supabase):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
// Environment variables (set via supabase secrets set):
//   ADMIN_PUBLISH_SECRET

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-admin-secret',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const expectedSecret = Deno.env.get('ADMIN_PUBLISH_SECRET') ?? '';
  const clientSecret = req.headers.get('x-admin-secret') ?? '';

  if (!expectedSecret || clientSecret !== expectedSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (typeof body !== 'object' || body === null || !('spotId' in body)) {
    return json({ error: 'Missing "spotId" in request body' }, 400);
  }

  const spotId = asString((body as { spotId: unknown }).spotId);

  if (!spotId) {
    return json({ error: '缺少必填字段: spotId' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Supabase 服务端未配置' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await supabase
    .from('spots')
    .delete()
    .eq('id', spotId);

  if (error) {
    console.error('[admin-delete-spot] delete error:', error);
    return json({ error: error.message }, 500);
  }

  console.log('[admin-delete-spot] deleted spot:', spotId);
  return json({ success: true, spotId });
});
