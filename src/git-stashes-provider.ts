import { Repository } from './ext/git';
import { GitManager } from './git-manager';
import { GitCommitsProvider } from './git-commits-provider';

export class GitStashesProvider extends GitCommitsProvider {
	protected async fetchCommits(manager: GitManager) {
		return manager.fetchStashes();
	}

	protected observeRepositoryState(repository: Repository) {
		if (this._stateObserver) { this._stateObserver.dispose(); }
		
		this._stateObserver = repository.state.onDidChange(() => {
			this.refresh();
		});
	}
}