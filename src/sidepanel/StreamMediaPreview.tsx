import type shaka from "shaka-player";
import { useEffect, useRef, useState } from "react";
import type { MediaResource } from "../shared/types";

export function StreamMediaPreview({
  resource,
  onDuration
}: {
  resource: MediaResource;
  onDuration: (duration: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDurationRef = useRef(onDuration);
  const [error, setError] = useState("");
  onDurationRef.current = onDuration;
  const url = resource.manifestUrl || resource.url;
  const height = resource.height;
  const width = resource.width;
  const bitrate = resource.variants?.find((variant) =>
    variant.representationId === resource.representationId || variant.id === resource.representationId
  )?.bitrate;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;
    let player: shaka.Player | undefined;
    setError("");
    void (async () => {
      try {
        const shakaRuntime = (await import("shaka-player")).default;
        shakaRuntime.polyfill.installAll();
        if (!shakaRuntime.Player.isBrowserSupported()) throw new Error("This browser cannot play this stream");
        player = new shakaRuntime.Player(video);
        player.configure({
          abr: { enabled: false },
          streaming: {
            retryParameters: { maxAttempts: 4, baseDelay: 500, backoffFactor: 2, fuzzFactor: 0.5 }
          }
        });
        player.addEventListener("error", (event) => {
          const detail = (event as CustomEvent<{ message?: string }>).detail;
          if (!disposed) setError(detail?.message || "无法预览此流");
        });
        await player.load(url);
        if (disposed) return;
        const track = player.getVariantTracks().find((candidate) =>
          (!height || candidate.height === height) &&
          (!width || candidate.width === width) &&
          (!bitrate || !candidate.bandwidth || candidate.bandwidth === bitrate)
        ) ?? player.getVariantTracks().find((candidate) => !height || candidate.height === height);
        if (track) player.selectVariantTrack(track, true);
        const duration = video.duration;
        if (Number.isFinite(duration) && duration > 0) onDurationRef.current(duration);
      } catch (cause) {
        if (!disposed) setError(cause instanceof Error ? cause.message : String(cause));
      }
    })();

    return () => {
      disposed = true;
      void player?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [url, height, width, bitrate]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        controls
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => onDurationRef.current(event.currentTarget.duration)}
      />
      {error ? <span className="media-preview-error" title={error}>{error}</span> : null}
    </>
  );
}
