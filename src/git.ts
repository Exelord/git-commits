import { Repository } from "./ext/git";

export type Commit = {
  commit: string;
  subject: string;
  author: string;
  authorEmail: string;
  date: string;
  body: string;
}

async function run(repository: Repository, args: string[], options = {}) {
  const repo = repository._repository.repository;
  return repository._repository.repository.git.exec(repo.repositoryRoot, args, options)
}

function parseGitCommit(raw: string): Commit | null | undefined {
  const regexp = new RegExp('::commit::\n(?<commit>(.+)?)\n::commit::\n::subject::\n(?<subject>(.+)?)\n::subject::\n::author::\n(?<author>(.+)?)\n::author::\n::authorEmail::\n(?<authorEmail>(.+)?)\n::authorEmail::\n::date::\n(?<date>(.+)?)\n::date::\n::body::\n(?<body>(.+)?)\n::body::', 'gmus')
  const match = regexp.exec(raw.trim());

  return match && match.groups as Commit;
}

export async function log(repository: Repository): Promise<Commit[]> {
  const args = ['log', '-n 15', '--pretty=format:::commit::%n%H%n::commit::%n::subject::%n%s%n::subject::%n::author::%n%aN%n::author::%n::authorEmail::%n%aE%n::authorEmail::%n::date::%n%aD%n::date::%n::body::%n%b%n::body::%n%x00%x00'];

  const gitResult = await run(repository, args);
  if (gitResult.exitCode) {
    // An empty repo.
    return [];
  }

  const s = gitResult.stdout;
  const result: Commit[] = [];
  let index = 0;
  while (index < s.length) {
    let nextIndex = s.indexOf('\x00\x00', index);
    if (nextIndex === -1) {
      nextIndex = s.length;
    }

    let entry = s.substr(index, nextIndex - index);
    if (entry.startsWith('\n')) {
      entry = entry.substring(1);
    }
    const commit = parseGitCommit(entry);
    if (!commit) {
      break;
    }

    result.push(commit);
    index = nextIndex + 2;
  }

  return result;
}