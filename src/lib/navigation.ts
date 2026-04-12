/**
 * Check if a navigation link is active based on the current pathname.
 */
export function isActiveRoute(pathname: string, href: string, homePath: string): boolean {
  if (href === homePath) {
    return pathname === homePath || pathname === `${homePath}/`;
  }
  return pathname.startsWith(href);
}
