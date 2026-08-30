/** Always-on public host (GitHub Pages). Independent of the Grok preview. */
export const PUBLIC_SITE = "https://gago3d.github.io/";

export function isAlwaysOnHost(hostname?: string) {
  const host =
    hostname ?? (typeof window === "undefined" ? "" : window.location.hostname);
  return host.endsWith(".github.io") || host.endsWith(".grok.me");
}

export function publicLink() {
  if (typeof window === "undefined") return PUBLIC_SITE;
  if (isAlwaysOnHost(window.location.hostname)) {
    const path = window.location.pathname.endsWith("/")
      ? window.location.pathname
      : `${window.location.pathname}/`;
    return `${window.location.origin}${path}`;
  }
  return PUBLIC_SITE;
}
