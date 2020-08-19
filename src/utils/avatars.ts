import { createHash } from "crypto";

const cache = new Map();

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
  if (cache.has(email)) { return cache.get(email); }

  const avatarUrl = (sources[source] || sources[defaultSource])(email);
  
  cache.set(email, avatarUrl);

  return avatarUrl;
}