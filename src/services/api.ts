import { TOKEN_KEY } from "@/utils/constant";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(
      data?.message || "Something went wrong"
    ) as Error & { remaining?: number };

    if (typeof data?.remaining === "number") {
      error.remaining = data.remaining;
    }

    throw error;
  }

  return data;
}
