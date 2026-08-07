import { describe, expect, it } from "vitest";
import { englishLemmaCandidates } from "./englishInflections";

describe("englishLemmaCandidates", () => {
  it("normalizes regular verb forms", () => {
    expect(englishLemmaCandidates("walked")).toContain("walk");
    expect(englishLemmaCandidates("walking")).toContain("walk");
    expect(englishLemmaCandidates("studies")).toContain("study");
    expect(englishLemmaCandidates("studied")).toContain("study");
    expect(englishLemmaCandidates("running")).toContain("run");
  });

  it("normalizes regular noun and adjective forms", () => {
    expect(englishLemmaCandidates("books")).toContain("book");
    expect(englishLemmaCandidates("wives")).toContain("wife");
    expect(englishLemmaCandidates("larger")).toContain("large");
    expect(englishLemmaCandidates("happiest")).toContain("happy");
  });

  it("normalizes common irregular forms", () => {
    expect(englishLemmaCandidates("went")).toContain("go");
    expect(englishLemmaCandidates("bought")).toContain("buy");
    expect(englishLemmaCandidates("children")).toContain("child");
    expect(englishLemmaCandidates("written")).toContain("write");
  });
});
