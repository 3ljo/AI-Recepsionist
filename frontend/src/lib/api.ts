import { supabase } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    "Content-Type": "application/json",
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

export async function sendMessage(
  message: string,
  callId?: string,
  businessId?: string
) {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
      call_id: callId,
      business_id: businessId,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Failed to send message");
  }

  return res.json();
}

export async function endCall(callId: string, businessId?: string) {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/end-call`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      call_id: callId,
      business_id: businessId,
    }),
  });

  return res.json();
}

export async function getStatus() {
  const res = await fetch(`${API_URL}/status`);
  return res.json();
}
