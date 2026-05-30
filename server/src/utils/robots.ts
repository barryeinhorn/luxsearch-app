const robotsCache = new Map<string, string>();

export async function getRobotsTxt(url: string): Promise<string | null> {
  try {
    const parsed = new URL(url);
    const origin = parsed.origin;
    if (robotsCache.has(origin)) {
      return robotsCache.get(origin) ?? null;
    }
    const response = await fetch(`${origin}/robots.txt`, { cache: 'force-cache' });
    if (!response.ok) {
      robotsCache.set(origin, '');
      return null;
    }
    const text = await response.text();
    robotsCache.set(origin, text);
    return text;
  } catch {
    // Domain unreachable or no robots.txt — assume allowed
    robotsCache.set(new URL(url).origin, '');
    return null;
  }
}

export function isAllowedByRobots(url: string, robotsText: string | null, userAgent = '*'): boolean {
  if (!robotsText) return true;
  const lines = robotsText.split(/\r?\n/).map((line) => line.trim());
  let applies = false;
  const disallow: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const [key, value] = line.split(':').map((part) => part.trim());
    if (!key || value === undefined) continue;
    if (key.toLowerCase() === 'user-agent') {
      applies = value === '*' || value.toLowerCase() === userAgent.toLowerCase();
    }
    if (applies && key.toLowerCase() === 'disallow' && value) {
      disallow.push(value);
    }
  }

  const pathname = new URL(url).pathname;
  return !disallow.some((path) => pathname.startsWith(path));
}
