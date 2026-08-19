import { useEffect, useState } from 'react'
import { PhotoStore } from '../../store/storage'

// ============================================================
// One progress photo, as a URL you can put in an <img>.
//
// Its own file because three screens need it and two of them had
// grown their own identical copy. The object URL is revoked on
// unmount and on every id change: a review that flicks through a
// year of photos leaks a blob per frame otherwise, and on a phone
// that is the tab dying rather than a slow tab.
// ============================================================

export function usePhotoUrl(id: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let revoked: string | null = null
    if (!id) {
      setUrl(null)
      return
    }
    void PhotoStore.get(id).then((blob) => {
      if (blob) {
        revoked = URL.createObjectURL(blob)
        setUrl(revoked)
      }
    })
    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [id])
  return url
}
