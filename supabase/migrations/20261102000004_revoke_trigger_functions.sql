-- Triggerfuncties hoeven niet via /rest/v1/rpc bereikbaar te zijn.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.enforce_signup_allowlist() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
