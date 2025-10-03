export default function Loading() {
  return (
    <div className="max-w-6xl md:w-[80vw] mx-auto px-4 py-8 animate-pulse">
      <div className="flex gap-6 md:flex-row flex-col">
        {/* Left: event image skeleton */}
        <div className="space-y-5">
          <div className="relative md:w-[36.319vw] md:h-[36.319vw] w-[91.794vw] h-[91.794vw] md:rounded-[1.3888888vw] rounded-[5.128vw] overflow-hidden bg-zinc-300" />
        </div>

        {/* Right: event content skeleton */}
        <aside className="md:w-full max-w-[92vw] space-y-4 overflow-hidden">
          {/* Title & tags skeleton */}
          <div className="flex flex-col gap-4 bg-white md:rounded-[1.3888888vw] rounded-[20px] py-5 px-4">
            <div className="h-10 bg-zinc-300 rounded-md md:w-[464px] w-[80%]" />

            {/* Tags */}
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-6 w-20 bg-zinc-300 rounded-full" />
              ))}
            </div>

            {/* Event details row */}
            <div className="px-6 py-5 bg-[#F5F5F5] md:rounded-[0.833333vw] rounded-xl flex flex-wrap w-full shrink-0 gap-5 justify-between">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-5 h-5 bg-zinc-300 rounded-full" />
                <div className="h-4 w-24 bg-zinc-300 rounded" />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="w-5 h-5 bg-zinc-300 rounded-full" />
                <div className="h-4 w-28 bg-zinc-300 rounded" />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="w-5 h-5 bg-zinc-300 rounded-full" />
                <div className="h-4 w-32 bg-zinc-300 rounded" />
              </div>
            </div>
          </div>

          {/* Description skeleton */}
          <div className="space-y-4 bg-white px-5 py-4 md:rounded-[1.3888888vw] rounded-xl">
            <div className="h-5 w-32 bg-zinc-300 rounded" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-zinc-300 rounded" />
              <div className="h-4 w-[90%] bg-zinc-300 rounded" />
              <div className="h-4 w-[85%] bg-zinc-300 rounded" />
              <div className="h-4 w-[80%] bg-zinc-300 rounded" />
              <div className="h-4 w-[75%] bg-zinc-300 rounded" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
