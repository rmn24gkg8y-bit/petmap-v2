// ── Admin Mode ──────────────────────────────────────────────────────────────
// Controls whether the admin "publish spot" UI is visible in the app.
// Set to false for regular user builds.
export const ADMIN_MODE_ENABLED = false;

// URL of the Supabase Edge Function that writes spots on the server side.
// Set EXPO_PUBLIC_ADMIN_PUBLISH_ENDPOINT in your .env file.
// Example: https://xxxx.supabase.co/functions/v1/admin-publish-spot
export const ADMIN_PUBLISH_ENDPOINT =
  (process.env.EXPO_PUBLIC_ADMIN_PUBLISH_ENDPOINT ?? '').trim();

// URL of the Supabase Edge Function that updates an existing system spot.
// Set EXPO_PUBLIC_ADMIN_UPDATE_ENDPOINT in your .env file.
// Example: https://xxxx.supabase.co/functions/v1/admin-update-spot
export const ADMIN_UPDATE_ENDPOINT =
  (process.env.EXPO_PUBLIC_ADMIN_UPDATE_ENDPOINT ?? '').trim();

// URL of the Supabase Edge Function that deletes an existing system spot.
// Set EXPO_PUBLIC_ADMIN_DELETE_ENDPOINT in your .env file.
// Example: https://xxxx.supabase.co/functions/v1/admin-delete-spot
export const ADMIN_DELETE_ENDPOINT =
  (process.env.EXPO_PUBLIC_ADMIN_DELETE_ENDPOINT ?? '').trim();

// URL of the Supabase Edge Function that uploads/replaces a system spot cover.
// Set EXPO_PUBLIC_ADMIN_UPLOAD_COVER_ENDPOINT in your .env file.
// Example: https://xxxx.supabase.co/functions/v1/admin-upload-spot-cover
export const ADMIN_UPLOAD_COVER_ENDPOINT =
  (process.env.EXPO_PUBLIC_ADMIN_UPLOAD_COVER_ENDPOINT ?? '').trim();

// URL of the Supabase Edge Function that manages all system spot photos.
// Set EXPO_PUBLIC_ADMIN_UPDATE_PHOTOS_ENDPOINT in your .env file.
// Example: https://xxxx.supabase.co/functions/v1/admin-update-spot-photos
export const ADMIN_UPDATE_PHOTOS_ENDPOINT =
  (process.env.EXPO_PUBLIC_ADMIN_UPDATE_PHOTOS_ENDPOINT ?? '').trim();

// Shared secret sent in the x-admin-secret header.
// The Edge Function validates this before writing to the DB.
// Set EXPO_PUBLIC_ADMIN_PUBLISH_SECRET in your .env file.
// Note: this is bundled into the client, but grants access only to this
// specific function — NOT to a service role key or full DB access.
export const ADMIN_PUBLISH_SECRET =
  (process.env.EXPO_PUBLIC_ADMIN_PUBLISH_SECRET ?? '').trim();

console.log('ADMIN_MODE_ENABLED =', process.env.EXPO_PUBLIC_ADMIN_MODE_ENABLED);
console.log('ADMIN_PUBLISH_ENDPOINT =', process.env.EXPO_PUBLIC_ADMIN_PUBLISH_ENDPOINT);
console.log('ADMIN_UPDATE_ENDPOINT =', process.env.EXPO_PUBLIC_ADMIN_UPDATE_ENDPOINT);
console.log('ADMIN_DELETE_ENDPOINT =', process.env.EXPO_PUBLIC_ADMIN_DELETE_ENDPOINT);
console.log(
  'ADMIN_UPLOAD_COVER_ENDPOINT =',
  process.env.EXPO_PUBLIC_ADMIN_UPLOAD_COVER_ENDPOINT
);
console.log(
  'ADMIN_UPDATE_PHOTOS_ENDPOINT =',
  process.env.EXPO_PUBLIC_ADMIN_UPDATE_PHOTOS_ENDPOINT
);
