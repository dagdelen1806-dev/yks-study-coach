import { memo, useEffect, useRef, useState } from "react";

const VIDEO_SRC = "/videos/neurons-or-nerve-cells.mp4";

type FocusAuraVideoProps = {
  /** Drives play/pause only — never progress/color. Keeping this the sole
   * prop that can change during a running session is what keeps the video
   * element from re-rendering (and re-buffering) on every timer tick. */
  isPlaying: boolean;
  enabled: boolean;
};

/**
 * Background video layer (spec §3/§9/§37). `memo`-wrapped so it only
 * re-renders when `isPlaying`/`enabled` actually flip — never on the
 * once-a-second aura/timer tick. Playback is driven imperatively via a ref
 * instead of the `autoPlay` attribute so state changes never remount (and
 * therefore never re-initialize) the underlying `<video>`.
 *
 * Errors (missing codec, failed decode, etc.) degrade to `null` — the
 * caller's existing CSS aura background remains fully visible underneath,
 * so a video failure can never block or visually break the focus session.
 */
function FocusAuraVideoBase({ isPlaying, enabled }: FocusAuraVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled || failed) return;
    if (isPlaying) {
      // Autoplay can still be blocked by the browser (e.g. no recent user
      // gesture); that's fine — the aura/timer never depend on video state.
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [isPlaying, enabled, failed]);

  if (!enabled || failed) return null;

  return (
    <video
      ref={videoRef}
      className="focus-aura-video"
      src={VIDEO_SRC}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      onError={() => setFailed(true)}
    />
  );
}

const FocusAuraVideo = memo(FocusAuraVideoBase);
export default FocusAuraVideo;
