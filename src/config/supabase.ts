const requirePublicEnvironmentValue = (
  name: string,
  value: string | undefined,
) => {
  if (!value)
    throw new Error(`Missing required public environment variable: ${name}`);
  return value;
};

export const getSupabasePublicConfig = () => ({
  url: requirePublicEnvironmentValue(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  publishableKey: requirePublicEnvironmentValue(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
});
