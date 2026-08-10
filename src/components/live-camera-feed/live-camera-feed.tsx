"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

type LiveCameraFeedProps = {
  className?: string;
  /**
   * MediaMTX HLS playlist for the camera.
   * Defaults to the Tailscale-served `usbcam` stream.
   */
  streamUrl?: string;
};

type FeedStatus = "connecting" | "live" | "error";

const DEFAULT_STREAM_URL =
  process.env.NEXT_PUBLIC_CAMERA_HLS_URL ??
  "https://raspberrypi.tail93a11d.ts.net/usbcam/index.m3u8";

export function LiveCameraFeed({
  className,
  streamUrl = DEFAULT_STREAM_URL,
}: LiveCameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<FeedStatus>("connecting");
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Track the container size so the rotated video can be sized to cover it fully.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      setContainerSize({ width: element.clientWidth, height: element.clientHeight });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    let hls: Hls | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const clearVideo = () => {
      video.removeAttribute("src");
      video.load();
    };

    const scheduleReconnect = () => {
      if (cancelled) {
        return;
      }
      setStatus("error");
      if (hls) {
        hls.destroy();
        hls = null;
      }
      clearVideo();
      reconnectTimer = setTimeout(() => connect(), 3000);
    };

    const markLive = () => {
      if (!cancelled) {
        setStatus("live");
      }
    };

    const connect = () => {
      if (cancelled) {
        return;
      }

      setStatus("connecting");
      if (hls) {
        hls.destroy();
        hls = null;
      }
      clearVideo();

      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().then(markLive).catch(() => {
            // Autoplay can fail until metadata is ready; playing event still marks live.
          });
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) {
            return;
          }
          console.error("Live camera HLS error", data);
          scheduleReconnect();
        });
        return;
      }

      // Safari / iOS: native HLS
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
        void video.play().then(markLive).catch(() => {
          // Rely on the playing event below.
        });
        return;
      }

      console.error("HLS is not supported in this browser");
      scheduleReconnect();
    };

    const onPlaying = () => markLive();
    const onError = () => scheduleReconnect();

    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);
    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
      if (hls) {
        hls.destroy();
        hls = null;
      }
      clearVideo();
    };
  }, [streamUrl]);

  return (
    <section className={`flex min-h-0 flex-col ${className ?? ""}`} style={{ minHeight: 220 }}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div
          ref={containerRef}
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-zinc-900"
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute left-1/2 top-1/2 object-cover"
            style={{
              // Rotating 90° swaps the axes, so give the video the container's
              // height as its width (and vice versa) to cover the whole panel.
              width: containerSize.height,
              height: containerSize.width,
              transform: "translate(-50%, -50%) rotate(90deg)",
            }}
          />

          {status !== "live" && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-100">
              <div className="px-6 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Camera
                </p>
                <p className="mt-2 text-sm text-zinc-600">
                  {status === "connecting" ? "Connecting to live feed…" : "Reconnecting to live feed…"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
