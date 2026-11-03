-- Booking-request SELECT policies traverse owners. This existing admin policy
-- still calls the restricted UUID overload; the no-argument helper checks the
-- same auth.uid() without exposing an arbitrary-user authorization function.
-- ALTER preserves this policy's command, roles, and permissive/restrictive mode.
begin;

alter policy "Admins manage owners" on public.owners
  using (public.is_admin())
  with check (public.is_admin());

commit;
