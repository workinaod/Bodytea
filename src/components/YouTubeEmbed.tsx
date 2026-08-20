import { useState } from 'react'

/**
 * Video help: verified ids embed on tap (privacy-friendly nocookie host,
 * never loaded eagerly); every exercise always gets a search deep-link
 * that can't go stale.
 */
/**
 * Height-capped, same as the set screen's clip.
 *
 * 16:9 across a full phone width is ~200px, which pushes the written
 * steps under the fold on the screen that exists to show them. The
 * width is limited to whatever keeps 16:9 inside the height budget
 * instead of capping height and cropping the picture.
 */
const VIDEO_BOX = { width: 'min(100%, calc(22vh * 16 / 9))' } as const

export function YouTubeEmbed({ videoId, query }: { videoId?: string; query: string }) {
  const [loaded, setLoaded] = useState(false)
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`

  return (
    <div className="space-y-2">
      {videoId &&
        (loaded ? (
          <div className="mx-auto overflow-hidden rounded-xl border border-edge" style={VIDEO_BOX}>
            <iframe
              className="aspect-video w-full"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
              title="Exercise tutorial"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <button
            onClick={() => setLoaded(true)}
            className="relative mx-auto block overflow-hidden rounded-xl border border-edge"
            style={VIDEO_BOX}
          >
            <img
              src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
              alt="Video tutorial thumbnail"
              className="aspect-video w-full object-cover opacity-80"
              loading="lazy"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent shadow-[0_4px_0_var(--lip-accent)]">
                <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-black">
                  <path d="M8 5v14l11-7L8 5Z" />
                </svg>
              </span>
            </span>
          </button>
        ))}
      <a
        href={searchUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 py-3 text-[13px] font-bold text-ink-dim active:bg-surface-2"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-danger">
          <path d="M23 7.5s-.2-1.6-.9-2.3c-.9-.9-1.9-.9-2.4-1C16.4 4 12 4 12 4s-4.4 0-7.7.2c-.5.1-1.5.1-2.4 1-.7.7-.9 2.3-.9 2.3S.8 9.4.8 11.3v1.4c0 1.9.2 3.8.2 3.8s.2 1.6.9 2.3c.9.9 2 .9 2.5 1 1.9.2 7.6.2 7.6.2s4.4 0 7.7-.2c.5-.1 1.5-.1 2.4-1 .7-.7.9-2.3.9-2.3s.2-1.9.2-3.8v-1.4c0-1.9-.2-3.8-.2-3.8ZM9.8 14.9V8.6l6.2 3.2-6.2 3.1Z" />
        </svg>
        {videoId ? 'More videos on YouTube' : 'Watch tutorials on YouTube'}
      </a>
    </div>
  )
}
