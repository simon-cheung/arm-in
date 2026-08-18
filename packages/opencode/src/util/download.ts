import path from "node:path"
import fs from "node:fs/promises"
import { Filesystem } from "./filesystem"
import { Archive } from "./archive"

export type DownloadStage = "downloading" | "extracting"

export async function downloadToBuffer(
  url: string,
  onProgress?: (received: number, total: number) => void,
): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`)
  }

  const contentLength = response.headers.get("content-length")
  const total = contentLength ? parseInt(contentLength, 10) : 0

  if (response.body) {
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      onProgress?.(received, total)
    }
    const buffer = Buffer.alloc(received)
    let offset = 0
    for (const chunk of chunks) {
      buffer.set(chunk, offset)
      offset += chunk.length
    }
    return buffer
  }

  const text = await response.text()
  return Buffer.from(new TextEncoder().encode(text))
}

export async function extractZipBuffer(buf: Buffer, targetDir: string): Promise<void> {
  const tmp = path.join(targetDir, `.__upload_tmp_${Date.now()}.zip`)
  await fs.mkdir(path.dirname(tmp), { recursive: true })
  await fs.writeFile(tmp, buf)
  try {
    await Archive.extractZip(tmp, targetDir)
  } finally {
    await fs.rm(tmp, { force: true })
  }
}
