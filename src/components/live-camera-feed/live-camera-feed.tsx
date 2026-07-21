type LiveCameraFeedProps = {
  className?: string;
};

export function LiveCameraFeed({ className }: LiveCameraFeedProps) {
  return (
    <section className={`flex min-h-0 flex-col ${className ?? ""}`}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-zinc-100">
          {/* Hook up the camera stream here (e.g. <video> / WebRTC). */}
          <div className="px-6 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Camera
            </p>
            <p className="mt-2 text-sm text-zinc-600">Live feed will appear here</p>
          </div>
        </div>
      </div>
    </section>
  );
}
