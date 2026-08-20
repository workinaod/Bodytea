import { useEffect, useRef, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Btn } from '../../components/ui'
import { flushPersist, useAppStore } from '../../store/appStore'
import { base64ToBlob, blobToBase64, PhotoStore, storageUsage } from '../../store/storage'
import { buildExport, exportFilename, parseEnvelope } from '../../store/backup'
import { formatShort } from '../../engine/calendar'

/** Export / import, the "easily transferable" promise. */
export function DataTransferSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useAppStore((s) => s.data)
  const update = useAppStore((s) => s.update)
  const replaceData = useAppStore((s) => s.replaceData)
  const [busy, setBusy] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ usedMB: number; quotaMB: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof parseEnvelope> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) void storageUsage().then(setUsage)
  }, [open])

  async function doExport(includePhotos: boolean) {
    setBusy(includePhotos ? 'full' : 'data')
    try {
      flushPersist()
      const env = await buildExport(data, includePhotos, async (id) => {
        const blob = await PhotoStore.get(id)
        return blob ? blobToBase64(blob) : null
      })
      const blob = new Blob([JSON.stringify(env)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = exportFilename(includePhotos)
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      update((d) => {
        d.settings.lastExportAt = new Date().toISOString()
      })
    } finally {
      setBusy(null)
    }
  }

  async function applyImport() {
    if (!pendingImport) return
    setBusy('import')
    try {
      replaceData(pendingImport.data)
      if (pendingImport.photoBlobs) {
        for (const [id, b64] of Object.entries(pendingImport.photoBlobs)) {
          await PhotoStore.put(id, base64ToBlob(b64))
        }
      }
      flushPersist()
      setPendingImport(null)
      onClose()
    } finally {
      setBusy(null)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Your data">
      <div className="space-y-4 pb-6">
        <p className="text-[12.5px] leading-snug text-ink-dim">
          Everything lives on this phone. Exports are one file you can save anywhere and import
          on any device. That's the whole transfer story.
        </p>

        <div className="rounded-xl bg-surface-2 px-3.5 py-3 text-[12px] text-ink-dim">
          <div>
            Last backup:{' '}
            <span className="font-bold text-ink">
              {data.settings.lastExportAt ? formatShort(data.settings.lastExportAt.slice(0, 10)) : 'never'}
            </span>
          </div>
          {usage && (
            <div className="mt-0.5">
              Storage used: <span className="font-bold text-ink">{usage.usedMB} MB</span> ·{' '}
              {data.photos.length} photos
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Btn className="w-full" disabled={busy !== null} onClick={() => void doExport(true)}>
            {busy === 'full' ? 'Building…' : '⬇ Export everything (incl. photos)'}
          </Btn>
          <Btn kind="subtle" className="w-full" disabled={busy !== null} onClick={() => void doExport(false)}>
            {busy === 'data' ? 'Building…' : '⬇ Export data only (small file)'}
          </Btn>
        </div>

        <div className="border-t border-edge pt-4">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setImportError(null)
              const reader = new FileReader()
              reader.onload = () => {
                try {
                  setPendingImport(parseEnvelope(String(reader.result)))
                } catch (err) {
                  setImportError(err instanceof Error ? err.message : 'Could not read that file.')
                }
              }
              reader.readAsText(f)
              e.target.value = ''
            }}
          />
          <Btn kind="ghost" className="w-full" onClick={() => fileRef.current?.click()}>
            ⬆ Import a backup file
          </Btn>
          {importError && <p className="mt-2 text-[12px] font-semibold text-danger">{importError}</p>}
          {pendingImport && (
            <div className="mt-3 rounded-xl border border-danger/30 bg-danger/8 p-3.5">
              <p className="text-[13px] font-bold text-danger">
                This REPLACES everything currently on this device.
              </p>
              <p className="mt-1 text-[12px] text-ink-dim">
                Backup from {formatShort(pendingImport.exportedAt.slice(0, 10))} ·{' '}
                {Object.keys(pendingImport.data.sessions).length} sessions ·{' '}
                {pendingImport.data.measurements.length} check-ins
                {pendingImport.photoBlobs ? ` · ${Object.keys(pendingImport.photoBlobs).length} photos` : ' · no photos'}
              </p>
              <div className="mt-2.5 flex gap-2">
                <Btn kind="ghost" className="flex-1" onClick={() => setPendingImport(null)}>
                  Cancel
                </Btn>
                <Btn kind="danger" className="flex-1" disabled={busy === 'import'} onClick={() => void applyImport()}>
                  {busy === 'import' ? 'Importing…' : 'Replace & import'}
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}
