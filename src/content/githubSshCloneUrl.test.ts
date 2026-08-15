import { describe, expect, it } from "vitest";
import {
  githubSshCloneUrl,
  isGithubRepositoryPath
} from "./githubSshCloneUrl";

describe("GitHub SSH clone URL rewrite", () => {
  it("rewrites GitHub SCP-style SSH clone URLs to the port 443 URI", () => {
    expect(githubSshCloneUrl("git@github.com:owner/repository.git")).toBe(
      "ssh://git@ssh.github.com:443/owner/repository.git"
    );
    expect(githubSshCloneUrl("  git@github.com:owner/repository.git  ")).toBe(
      "ssh://git@ssh.github.com:443/owner/repository.git"
    );
  });

  it("leaves non-GitHub, HTTPS, and already rewritten URLs unchanged", () => {
    expect(githubSshCloneUrl("https://github.com/owner/repository.git")).toBeNull();
    expect(githubSshCloneUrl("git@git.example.com:owner/repository.git")).toBeNull();
    expect(
      githubSshCloneUrl("ssh://git@ssh.github.com:443/owner/repository.git")
    ).toBeNull();
    expect(githubSshCloneUrl("git@github.com:owner/repository")).toBeNull();
  });

  it("starts only on github.com paths that identify a repository", () => {
    expect(isGithubRepositoryPath("github.com", "/owner/repository")).toBe(true);
    expect(isGithubRepositoryPath("github.com", "/owner/repository/issues")).toBe(
      true
    );
    expect(isGithubRepositoryPath("github.com", "/owner")).toBe(false);
    expect(isGithubRepositoryPath("github.enterprise.example", "/owner/repository")).toBe(
      false
    );
  });
});
