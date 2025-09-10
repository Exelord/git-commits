import { createHash } from "crypto";

const cache = new Map<string, string>();

type Sources = {
  [key: string]: (email: string) => string;
};

const sources: Sources = {
  github(email: string) {
    const match = email.match(/^\d+\+([^@]+)@users.noreply.github.com$/);

    if (match) {
      return `https://github.com/${match[1]}.png`;
    } else {
      return `https://avatars.githubusercontent.com/u/e?email=${encodeURIComponent(
        email
      )}&s=20`;
    }
  },

  gravatar(email: string) {
    const hash = createHash("md5").update(email).digest("hex");
    return `https://www.gravatar.com/avatar/${hash}?s=20&d=retro`;
  },

  diceBear(email: string) {
    const hash = createHash("md5").update(email).digest("hex");
    return `https://api.dicebear.com/9.x/adventurer/svg?seed=${hash}&scale=150&backgroundType=gradientLinear&earringsProbability=65&glassesProbability=40&hair=long01,long02,long03,long04,long05,long06,long07,long08,long09,long10,long11,long12,long13,long14,long15,long16,long17,long18,long19,long20,long21,long22,long23,long24,long25,long26,short01,short02,short03,short04,short05,short06,short07,short08,short09,short10,short11,short12,short13,short14,short15,short16,short17,short18&skinColor=9e5622,ecad80,f2d3b1&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4`;
  },
};

const defaultSource = "diceBear";

export function getAvatarUrl(email: string, source = defaultSource): string {
  const cacheKey = `${source}:${email}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) as string;
  }

  const avatarUrl = (sources[source] || sources[defaultSource])(email);

  cache.set(cacheKey, avatarUrl);

  return avatarUrl;
}
