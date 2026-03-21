// Supabase Edge Function: admin-update-spot-photos
// Supports admin photo management for system spots:
// - add
// - replace
// - delete
// - set_cover
//
// Deploy:
//   supabase secrets set ADMIN_PUBLISH_SECRET=<your_secret>
//   supabase functions deploy admin-update-spot-photos
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

const MAX_PHOTO_COUNT = 6;

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
  return v
    .map((item) => asString(item))
    .filter(Boolean);
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

  const urlData = params.supabase.storage.from(params.bucket).getPublicUrl(filePath);
  const publicUrl = asString(urlData.data.publicUrl);

  if (!publicUrl) {
    throw new Error('图片上传成功但未获得访问链接');
  }

  return publicUrl;
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

  if (typeof body !== 'object' || body === null) {
    return json({ error: 'Invalid request body' }, 400);
  }

  const payload = body as Record<string, unknown>;
  const spotId = asString(payload.spotId);
  const action = asString(payload.action);
  const index = typeof payload.index === 'number' ? payload.index : Number(payload.index);
  const base64Data = asString(payload.base64Data);
  const mimeType = asString(payload.mimeType) || 'image/jpeg';

  if (!spotId) {
    return json({ error: '缺少必填字段: spotId' }, 400);
  }

  if (!['add', 'replace', 'delete', 'set_cover'].includes(action)) {
    return json({ error: '无效 action，支持: add/replace/delete/set_cover' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Supabase 服务端未配置' }, 500);
  }

  const bucket = asString(Deno.env.get('SPOT_COVER_BUCKET')) || 'spots-photos';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: currentSpot, error: currentSpotError } = await supabase
    .from('spots')
    .select('id,photo_uris')
    .eq('id', spotId)
    .single();

  if (currentSpotError) {
    return json({ error: currentSpotError.message }, 500);
  }

  if (!currentSpot) {
    return json({ error: 'Spot not found' }, 404);
  }

  const currentPhotoUris = asStringArray(currentSpot.photo_uris);
  let nextPhotoUris = [...currentPhotoUris];

  try {
    if (action === 'add') {
      if (nextPhotoUris.length >= MAX_PHOTO_COUNT) {
        return json({ error: `最多支持 ${MAX_PHOTO_COUNT} 张图片` }, 400);
      }
      if (!base64Data) {
        return json({ error: 'add 动作缺少图片数据' }, 400);
      }

      const newUrl = await uploadPhotoAndGetUrl({
        supabase,
        bucket,
        spotId,
        base64Data,
        mimeType,
      });
      nextPhotoUris = [...nextPhotoUris, newUrl];
    }

    if (action === 'replace') {
      if (!Number.isInteger(index) || index < 0 || index >= nextPhotoUris.length) {
        return json({ error: 'replace 动作 index 无效' }, 400);
      }
      if (!base64Data) {
        return json({ error: 'replace 动作缺少图片数据' }, 400);
      }

      const newUrl = await uploadPhotoAndGetUrl({
        supabase,
        bucket,
        spotId,
        base64Data,
        mimeType,
      });
      nextPhotoUris = nextPhotoUris.map((uri, idx) => (idx === index ? newUrl : uri));
    }

    if (action === 'delete') {
      if (!Number.isInteger(index) || index < 0 || index >= nextPhotoUris.length) {
        return json({ error: 'delete 动作 index 无效' }, 400);
      }
      nextPhotoUris = nextPhotoUris.filter((_, idx) => idx !== index);
    }

    if (action === 'set_cover') {
      if (!Number.isInteger(index) || index < 0 || index >= nextPhotoUris.length) {
        return json({ error: 'set_cover 动作 index 无效' }, 400);
      }
      const cover = nextPhotoUris[index];
      nextPhotoUris = [cover, ...nextPhotoUris.filter((_, idx) => idx !== index)];
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '图片处理失败';
    return json({ error: message }, 500);
  }

  const { data: updatedSpot, error: updateError } = await supabase
    .from('spots')
    .update({ photo_uris: nextPhotoUris })
    .eq('id', spotId)
    .select()
    .single();

  if (updateError) {
    return json({ error: updateError.message }, 500);
  }

  if (!updatedSpot) {
    return json({ error: '更新成功但未返回 spot' }, 500);
  }

  return json({ spot: updatedSpot });
});
