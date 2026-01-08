export function openIntercom() {
  if (typeof window === "undefined") return false;
  const w = window as any;
  if (typeof w.Intercom === "function") {
    w.Intercom("show");
    return true;
  }
  return false;
}
