// Supabase Edge Function: admin-update-spot
// Receives a system spot payload from the PetMap admin client, validates
// the caller's secret, then updates the `spots` table with service role key.
//
// Deploy:
//   supabase secrets set ADMIN_PUBLISH_SECRET=<your_secret>
//   supabase functions deploy admin-update-spot
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

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((item): item is string => typeof item === 'string').map((item) => item.trim());
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

  if (typeof body !== 'object' || body === null || !('spot' in body)) {
    return json({ error: 'Missing "spot" in request body' }, 400);
  }

  const spot = (body as { spot: Record<string, unknown> }).spot;
  const id = asString(spot.id);
  const name = asString(spot.name);
  const district = asString(spot.district);

  if (!id || !name || !district) {
    return json({ error: '缺少必填字段: id, name, district' }, 400);
  }

  const VALID_SPOT_TYPES = ['park', 'cafe', 'hospital', 'store', 'indoor', 'other'];
  const rawSpotType = asString(spot.spotType);
  const spotType = VALID_SPOT_TYPES.includes(rawSpotType) ? rawSpotType : 'other';

  const VALID_PET_LEVELS = ['high', 'medium', 'low'];
  const rawPetLevel = asString(spot.petFriendlyLevel);
  const petFriendlyLevel = VALID_PET_LEVELS.includes(rawPetLevel) ? rawPetLevel : null;

  const payload = {
    name,
    district,
    address_hint: asString(spot.addressHint),
    description: asString(spot.description),
    tags: asStringArray(spot.tags),
    spot_type: spotType,
    pet_friendly_level: petFriendlyLevel,
    business_hours: asString(spot.businessHours) || null,
    contact: asString(spot.contact) || null,
    formatted_address: asString(spot.formattedAddress) || null,
  };

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Supabase 服务端未配置' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from('spots')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[admin-update-spot] update error:', error);
    return json({ error: error.message }, 500);
  }

  if (!data) {
    return json({ error: 'Spot not found' }, 404);
  }

  console.log('[admin-update-spot] updated spot:', data.id, name);
  return json({ spot: data });
});
