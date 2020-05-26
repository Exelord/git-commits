import { Commit as GitCommit } from './git.d';

const commitRegex = /([0-9a-f]{40})\n(.*)\n(.*)\n(.*)\n(.*)\n(.*)(?:\n([^]*?))?(?:\x00)/gm;

export function parseGitCommits(data: string): GitCommit[] {
	let commits: GitCommit[] = [];

	let ref;
	let authorName;
	let authorEmail;
	let authorDate;
	let commitDate;
	let parents;
	let message;
	let match;

	do {
		match = commitRegex.exec(data);
		if (match === null) {
			break;
		}

		[, ref, authorName, authorEmail, authorDate, commitDate, parents, message] = match;

		if (message[message.length - 1] === '\n') {
			message = message.substr(0, message.length - 1);
		}

		// Stop excessive memory usage by using substr -- https://bugs.chromium.org/p/v8/issues/detail?id=2869
		commits.push({
			hash: ` ${ref}`.substr(1),
			message: ` ${message}`.substr(1),
			parents: parents ? parents.split(' ') : [],
			authorDate: new Date(Number(authorDate) * 1000),
			authorName: ` ${authorName}`.substr(1),
			authorEmail: ` ${authorEmail}`.substr(1),
			commitDate: new Date(Number(commitDate) * 1000),
		});
	} while (true);

	return commits;
}