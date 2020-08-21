import { createHash } from "crypto";

const cache = new Map<string, string>();

type Sources = {
  [key: string]: (email: string) => string;
};

const sources: Sources = {
  github(email: string) {
    const match = email.match(/^(\d+)\+[^@]+@users.noreply.github.com$/);

    if (match) {
      return `https://avatars.githubusercontent.com/u/${match[1]}?s=20`;
    } else {
      return `https://avatars.githubusercontent.com/u/e?email=${encodeURIComponent(email)}&s=20`;
    }
  },

  gravatar(email: string) {
    const hash = createHash("md5").update(email).digest("hex");
    return `https://www.gravatar.com/avatar/${hash}?s=20`;
  }
};

const defaultSource = 'gravatar';

export function getAvatarUrl(email: string, source = defaultSource): string {
  const cacheKey = `${source}:${email}`;

  if (cache.has(cacheKey)) { return cache.get(cacheKey) as string; }

  const avatarUrl = (sources[source] || sources[defaultSource])(email);
  
  cache.set(cacheKey, avatarUrl);

  return avatarUrl;
}