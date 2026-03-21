const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const SUPABASE_KEY = (process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '').trim();

export type FeedbackSubmissionPayload = {
  feedback_type: string;
  title: string;
  content: string;
  spot_id?: string | null;
  spot_name?: string | null;
  district?: string | null;
  address?: string | null;
  app_section?: string | null;
  status: string;
};

export async function submitFeedbackToSupabase(
  payload: FeedbackSubmissionPayload,
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase is not configured');
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/feedback_submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase insert failed: ${response.status} ${text}`);
  }
}
