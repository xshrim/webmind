export interface SerialTaskOptions {
  replaceable?: boolean;
}

export function articleExtractionAbortError(): Error {
  const error = new Error("Article extraction superseded");
  error.name = "AbortError";
  return error;
}

export function throwIfArticleExtractionAborted(signal: AbortSignal): void {
  if (signal.aborted) throw articleExtractionAbortError();
}

export function createArticleExtractionRunner() {
  let tail: Promise<void> = Promise.resolve();
  let latestReplaceableController: AbortController | null = null;

  return {
    run<T>(
      task: (signal: AbortSignal) => Promise<T>,
      options: SerialTaskOptions = {}
    ): Promise<T> {
      if (options.replaceable) {
        latestReplaceableController?.abort(articleExtractionAbortError());
        latestReplaceableController = null;
      }

      const controller = new AbortController();
      if (options.replaceable) latestReplaceableController = controller;

      const previous = tail.catch(() => undefined);
      let release: () => void = () => undefined;
      tail = new Promise<void>((resolve) => {
        release = resolve;
      });

      return (async () => {
        try {
          await previous;
          throwIfArticleExtractionAborted(controller.signal);
          return await task(controller.signal);
        } finally {
          if (latestReplaceableController === controller) {
            latestReplaceableController = null;
          }
          release();
        }
      })();
    }
  };
}
