// Supabase Edge Function: admin-publish-spot
// Receives a spot payload from the PetMap admin client, validates the
// caller's secret, then inserts the spot into the `spots` table using
// the service role key (server-side only — never exposed to the client).
//
// Deploy:
//   supabase secrets set ADMIN_PUBLISH_SECRET=<your_secret>
//   supabase functions deploy admin-publish-spot
//
// Environment variables (auto-injected by Supabase):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
// Environment variables (set via supabase secrets set):
//   ADMIN_PUBLISH_SECRET
//   SPOT_COVER_BUCKET (optional, default: spots-photos)

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
  return v.filter((item): item is string => typeof item === 'string');
}

function bytesFromBase64(base64: string): Uint8Array {
  const normalized = base64.replace(/\s/g, '');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function inferExtension(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('heic') || normalized.includes('heif')) return 'heic';
  return 'jpg';
}

async function uploadPhotoAndGetUrl(params: {
  supabase: ReturnType<typeof createClient>;
  bucket: string;
  spotId: string;
  base64Data: string;
  mimeType: string;
}): Promise<string> {
  const ext = inferExtension(params.mimeType);
  const filePath = `spots/${params.spotId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const bytes = bytesFromBase64(params.base64Data);

  const { error } = await params.supabase.storage
    .from(params.bucket)
    .upload(filePath, bytes, {
      contentType: params.mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const publicUrlData = params.supabase.storage.from(params.bucket).getPublicUrl(filePath);
  const photoUrl = asString(publicUrlData.data.publicUrl);

  if (!photoUrl) {
    throw new Error('图片上传成功但未获得访问链接');
  }

  return photoUrl;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // ── Validate admin secret ──────────────────────────────────────────────────
  const expectedSecret = Deno.env.get('ADMIN_PUBLISH_SECRET') ?? '';
  const clientSecret = req.headers.get('x-admin-secret') ?? '';

  if (!expectedSecret || clientSecret !== expectedSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (typeof body !== 'object' || body === null || !('spot' in body)) {
    return json({ error: 'Missing "spot" in request body' }, 400);
  }

  const payloadBody = body as {
    spot: Record<string, unknown>;
    coverImage?: { base64Data?: unknown; mimeType?: unknown };
  };
  const spot = payloadBody.spot;
  const coverImage = payloadBody.coverImage;

  // ── Validate required fields ───────────────────────────────────────────────
  const name = asString(spot.name);
  const district = asString(spot.district);
  const lat = typeof spot.lat === 'number' ? spot.lat : 0;
  const lng = typeof spot.lng === 'number' ? spot.lng : 0;

  if (!name || !district || !lat || !lng) {
    return json({ error: '缺少必填字段: name, district, lat, lng' }, 400);
  }

  // ── Build insert payload ───────────────────────────────────────────────────
  const VALID_SPOT_TYPES = ['park', 'cafe', 'hospital', 'store', 'indoor', 'other'];
  const rawSpotType = asString(spot.spotType);
  const spotType = VALID_SPOT_TYPES.includes(rawSpotType) ? rawSpotType : 'other';

  const VALID_PET_LEVELS = ['high', 'medium', 'low'];
  const rawPetLevel = asString(spot.petFriendlyLevel);
  const petFriendlyLevel = VALID_PET_LEVELS.includes(rawPetLevel) ? rawPetLevel : null;

  const payload = {
    name,
    spot_type: spotType,
    district,
    address_hint: asString(spot.addressHint),
    formatted_address: asString(spot.formattedAddress) || null,
    lat,
    lng,
    tags: asStringArray(spot.tags),
    description: asString(spot.description),
    photo_uris: asStringArray(spot.photoUris),
    pet_friendly_level: petFriendlyLevel,
    business_hours: asString(spot.businessHours) || null,
    contact: asString(spot.contact) || null,
    votes: 5,
    verified: true,
    merchant_status: 'none',
  };

  // ── Write to Supabase spots table (service role key — server side only) ────
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Supabase 服务端未配置' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const bucket = asString(Deno.env.get('SPOT_COVER_BUCKET')) || 'spots-photos';

  const { data, error } = await supabase
    .from('spots')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[admin-publish-spot] insert error:', error);
    return json({ error: error.message }, 500);
  }

  if (!data?.id) {
    return json({ error: '创建成功但未返回 spot id' }, 500);
  }

  const coverBase64Data = asString(coverImage?.base64Data);
  const coverMimeType = asString(coverImage?.mimeType) || 'image/jpeg';

  if (!coverBase64Data) {
    console.log('[admin-publish-spot] published spot:', data?.id, name);
    return json({ spot: data });
  }

  try {
    const photoUrl = await uploadPhotoAndGetUrl({
      supabase,
      bucket,
      spotId: data.id,
      base64Data: coverBase64Data,
      mimeType: coverMimeType,
    });

    const { data: updatedSpot, error: updateError } = await supabase
      .from('spots')
      .update({ photo_uris: [photoUrl] })
      .eq('id', data.id)
      .select()
      .single();

    if (updateError || !updatedSpot) {
      throw new Error(updateError?.message || '创建成功但首图写入失败');
    }

    console.log('[admin-publish-spot] published spot with cover:', updatedSpot.id, name);
    return json({ spot: updatedSpot });
  } catch (coverError) {
    // rollback created spot to avoid "selected image but created without photo" partial success
    await supabase.from('spots').delete().eq('id', data.id);
    const message = coverError instanceof Error ? coverError.message : '首图上传失败';
    return json({ error: `首图上传失败：${message}` }, 500);
  }
});
