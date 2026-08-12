import { describe, expect, it } from "vitest";
import { createArticleExtractionRunner } from "./articleExtractionRunner";

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("article extraction runner", () => {
  it("runs article extraction tasks serially", async () => {
    const runner = createArticleExtractionRunner();
    const firstGate = deferred<void>();
    const firstStarted = deferred<void>();
    const events: string[] = [];
    const first = runner.run(async () => {
      events.push("first-start");
      firstStarted.resolve();
      await firstGate.promise;
      events.push("first-end");
    });
    const second = runner.run(async () => {
      events.push("second-start");
    });

    await firstStarted.promise;
    expect(events).toEqual(["first-start"]);
    firstGate.resolve();
    await Promise.all([first, second]);
    expect(events).toEqual(["first-start", "first-end", "second-start"]);
  });

  it("supersedes an older replaceable task", async () => {
    const runner = createArticleExtractionRunner();
    const firstStarted = deferred<void>();
    const first = runner.run(
      async (signal) => {
        firstStarted.resolve();
        await new Promise<void>((resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true
          });
        });
      },
      { replaceable: true }
    );
    await firstStarted.promise;
    const second = runner.run(async () => "latest", { replaceable: true });

    await expect(first).rejects.toMatchObject({ name: "AbortError" });
    await expect(second).resolves.toBe("latest");
  });

  it("does not cancel an automatic refresh for a required task", async () => {
    const runner = createArticleExtractionRunner();
    const automaticStarted = deferred<void>();
    const automaticGate = deferred<void>();
    const events: string[] = [];
    const automatic = runner.run(
      async () => {
        events.push("automatic-start");
        automaticStarted.resolve();
        await automaticGate.promise;
        events.push("automatic-end");
      },
      { replaceable: true }
    );
    await automaticStarted.promise;
    const required = runner.run(async () => {
      events.push("required");
      return "required";
    });

    expect(events).toEqual(["automatic-start"]);
    automaticGate.resolve();
    await expect(automatic).resolves.toBeUndefined();
    await expect(required).resolves.toBe("required");
    expect(events).toEqual(["automatic-start", "automatic-end", "required"]);
  });
});
