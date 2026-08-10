"use client";

import { useEffect, useRef, useState } from "react";

type LiveCameraFeedProps = {
  className?: string;
  /**
   * MediaMTX WHEP (WebRTC) endpoint for the camera.
   * Defaults to the `usbcam` stream on http://192.168.0.123:8889/usbcam
   * (WHEP handshake at `/whep`).
   */
  whepUrl?: string;
};

type FeedStatus = "connecting" | "live" | "error";

const DEFAULT_WHEP_URL =
  process.env.NEXT_PUBLIC_CAMERA_WHEP_URL ?? "http://192.168.0.123:8889/usbcam/whep";

/** Wait until ICE gathering finishes so we can POST a complete (non-trickle) offer. */
function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const checkState = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", checkState);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", checkState);
    // Safety timeout: some networks never report `complete`.
    setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", checkState);
      resolve();
    }, 2000);
  });
}

export function LiveCameraFeed({ className, whepUrl = DEFAULT_WHEP_URL }: LiveCameraFeedProps) {
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
    let pc: RTCPeerConnection | null = null;
    let abortController: AbortController | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const cleanupConnection = () => {
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      if (pc) {
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.close();
        pc = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) {
        return;
      }
      setStatus("error");
      cleanupConnection();
      reconnectTimer = setTimeout(() => void connect(), 3000);
    };

    const connect = async () => {
      if (cancelled) {
        return;
      }

      setStatus("connecting");
      cleanupConnection();

      try {
        pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });

        pc.ontrack = (event) => {
          const [stream] = event.streams;
          if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
          }
        };

        pc.onconnectionstatechange = () => {
          if (!pc) {
            return;
          }
          if (pc.connectionState === "connected") {
            setStatus("live");
          } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            scheduleReconnect();
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitForIceGathering(pc);

        abortController = new AbortController();
        const response = await fetch(whepUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: pc.localDescription?.sdp ?? offer.sdp,
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`WHEP request failed with status ${response.status}`);
        }

        const answerSdp = await response.text();
        if (cancelled || !pc) {
          return;
        }

        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("Live camera feed connection failed", error);
        scheduleReconnect();
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      cleanupConnection();
    };
  }, [whepUrl]);

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
