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

  console.log(`[download] URL: ${url}`)
  console.log(`[download] Filename: ${filename}`)
  console.log(`[download] Temp zip path: ${tempZipPath}`)

  await fs.mkdir(path.dirname(tempZipPath), { recursive: true })

  const response = await fetch(url)
  console.log(`[download] Response status: ${response.status}`)

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`)
  }

  const contentLength = response.headers.get("content-length")
  const total = contentLength ? parseInt(contentLength, 10) : 0
  console.log(`[download] Content-Length: ${contentLength}`)

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

  console.log(`[download] Downloaded ${buffer.length} bytes`)
  await Filesystem.write(tempZipPath, buffer)

  const extractedName = filename.endsWith(".zip") ? filename.slice(0, -4) : filename
  const extractedDir = path.join(targetDir, extractedName)

  console.log(`[download] Target dir: ${targetDir}`)
  console.log(`[download] Extracted name: ${extractedName}`)
  console.log(`[download] Expected extraction path: ${extractedDir}`)

  await fs.mkdir(targetDir, { recursive: true })

  // Get existing contents before extraction for comparison
  let existingContents: string[] = []
  try {
    existingContents = await fs.readdir(targetDir)
  } catch {
    // ignore
  }
  console.log(`[download] Existing contents count: ${existingContents.length}`)

  console.log(`[download] Starting extraction...`)
  onProgress("extracting")

  try {
    await Archive.extractZip(tempZipPath, targetDir)
    console.log(`[download] Extraction completed`)
  } catch (err) {
    console.error(`[download] Extraction failed:`, err)
    throw err
  }

  await fs.rm(tempZipPath, { force: true })

  // List contents after extraction
  const contents = await fs.readdir(targetDir)
  console.log(`[download] Contents after extraction:`, contents)

  // Check if extractedDir exists
  try {
    const stat = await fs.stat(extractedDir)
    console.log(`[download] extractedDir stat:`, { isDirectory: stat.isDirectory(), size: stat.size })
    return extractedDir
  } catch (err) {
    // extractedDir doesn't exist
    console.log(`[download] extractedDir does not exist, looking for alternatives...`)

    // Look for newly created items (items not in existingContents)
    const newItems = contents.filter((name) => !existingContents.includes(name))
    console.log(`[download] New items created:`, newItems)

    // Check if any new directory was created
    for (const item of newItems) {
      const itemPath = path.join(targetDir, item)
      try {
        const stat = await fs.stat(itemPath)
        if (stat.isDirectory()) {
          console.log(`[download] Found new directory: ${itemPath}`)
          return itemPath
        }
      } catch {
        // not a directory
      }
    }

    // Maybe extracted directly to targetDir without subfolder
    // Check if there's exactly one new item
    if (newItems.length === 1) {
      const newPath = path.join(targetDir, newItems[0])
      console.log(`[download] Using single new item as extracted path: ${newPath}`)
      return newPath
    }

    throw new Error(`Extraction failed: ${extractedDir} does not exist`)
  }
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
