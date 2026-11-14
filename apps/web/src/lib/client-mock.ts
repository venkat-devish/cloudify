/** UI-only API when no backend URL is configured (typical Vercel). Force with NEXT_PUBLIC_MOCK_API. */
export function isClientMockApi(): boolean {
  if (process.env.NEXT_PUBLIC_MOCK_API === "false") return false;
  if (process.env.NEXT_PUBLIC_MOCK_API === "true") return true;
  return !process.env.NEXT_PUBLIC_API_URL;
}