import path from "path"
import fs from "fs/promises"
import { Filesystem } from "./filesystem"
import { Archive } from "./archive"
import { Global } from "@/global"

export type DownloadStage = "downloading" | "extracting"

export async function downloadAndExtract(
  url: string,
  targetDir: string,
  onProgress: (stage: DownloadStage, percent?: number) => void,
): Promise<string> {
  const filename = getFilenameFromUrl(url)
  const zipName = filename.endsWith(".zip") ? filename : `${filename}.zip`
  const tempZipPath = path.join(Global.Path.cache, "downloads", zipName)

  await fs.mkdir(path.dirname(tempZipPath), { recursive: true })

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`)
  }

  const contentLength = response.headers.get("content-length")
  const total = contentLength ? parseInt(contentLength, 10) : 0

  if (total === 0) {
    throw new Error("Server did not report content-length, file may be empty")
  }

  let buffer: Uint8Array

  if (response.body) {
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      onProgress("downloading", Math.round((received / total) * 100))
    }

    buffer = new Uint8Array(received)
    let offset = 0
    for (const chunk of chunks) {
      buffer.set(chunk, offset)
      offset += chunk.length
    }
  } else {
    const text = await response.text()
    buffer = new TextEncoder().encode(text)
  }

  await Filesystem.write(tempZipPath, buffer)

  await fs.mkdir(targetDir, { recursive: true })

  // Clear contents of targetDir without removing the directory itself
  let existingContents: string[] = []
  try {
    existingContents = await fs.readdir(targetDir)
    await Promise.all(
      existingContents.map((name) => fs.rm(path.join(targetDir, name), { recursive: true, force: true })),
    )
  } catch {
    // ignore
  }

  onProgress("extracting")

  await Archive.extractZip(tempZipPath, targetDir)

  await fs.rm(tempZipPath, { force: true })

  // Find the extraction root:
  // - if exactly one new directory was created, it's a nested-zip layout (zip contains a top-level folder)
  // - otherwise extraction was flattened into targetDir
  const contents = await fs.readdir(targetDir)
  const newItems = contents.filter((name) => !existingContents.includes(name))

  if (newItems.length === 1) {
    const newPath = path.join(targetDir, newItems[0])
    try {
      const stat = await fs.stat(newPath)
      if (stat.isDirectory()) return newPath
    } catch {
      // fall through
    }
  }

  return targetDir
}

function getFilenameFromUrl(url: string): string {
  try {
    const u = new URL(url)
    const segments = u.pathname.split("/").filter(Boolean)
    return segments[segments.length - 1] || "download"
  } catch {
    return "download"
  }
}
