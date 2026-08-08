import { SCHEMA_VERSION, type AppData, type Envelope } from '../types'
import { migrate } from './schema'

export const APP_VERSION = '1.0.0'

// ============================================================
// One-tap transferability: the same Envelope shape is used for
// the localStorage record and the export file, so an export is
// always importable byte-for-byte.
// ============================================================

export function buildEnvelope(data: AppData, photoBlobs?: Record<string, string>): Envelope {
  return {
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
    ...(photoBlobs ? { photoBlobs } : {}),
  }
}

export function serializeState(data: AppData): string {
  return JSON.stringify(buildEnvelope(data))
}

/** Parse + migrate + validate anything loaded from disk or an import file. */
export function parseEnvelope(raw: string): Envelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  return migrate(parsed)
}

/**
 * Build a full export, optionally inlining photo blobs as base64.
 * `getPhoto` is injected so this stays testable outside the browser.
 */
export async function buildExport(
  data: AppData,
  includePhotos: boolean,
  getPhotoBase64: (id: string) => Promise<string | null>,
): Promise<Envelope> {
  if (!includePhotos) return buildEnvelope(data)
  const photoBlobs: Record<string, string> = {}
  for (const meta of data.photos) {
    const b64 = await getPhotoBase64(meta.id)
    if (b64) photoBlobs[meta.id] = b64
  }
  return buildEnvelope(data, photoBlobs)
}

export function exportFilename(includePhotos: boolean): string {
  const stamp = new Date().toISOString().slice(0, 10)
  return `naod-v3-backup-${stamp}${includePhotos ? '' : '-data-only'}.json`
}
