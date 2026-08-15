const GITHUB_SSH_CLONE_URL_PATTERN = /^git@github\.com:([^/\s]+)\/([^/\s]+)\.git$/;

export function githubSshCloneUrl(value: string): string | null {
  const match = value.trim().match(GITHUB_SSH_CLONE_URL_PATTERN);
  if (!match) return null;
  return `ssh://git@ssh.github.com:443/${match[1]}/${match[2]}.git`;
}

export function isGithubRepositoryPath(
  hostname: string,
  pathname: string
): boolean {
  if (hostname !== "github.com") return false;
  return pathname.split("/").filter(Boolean).length >= 2;
}
