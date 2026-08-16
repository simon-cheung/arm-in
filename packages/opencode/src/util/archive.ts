import path from "path"
import fs from "fs/promises"
import AdmZip from "adm-zip"

export namespace Archive {
  export async function extractZip(zipPath: string, destDir: string) {
    await fs.mkdir(destDir, { recursive: true })

    const zip = new AdmZip(zipPath)
    for (const entry of zip.getEntries()) {
      const filename = entry.entryName.replace(/\\/g, "/").replace(/\/+$/, "")
      if (!filename) continue
      if (entry.isDirectory) continue
      const target = path.join(destDir, filename)
      await fs.mkdir(path.dirname(target), { recursive: true })
      try {
        await fs.rm(target, { force: true })
      } catch {
        // ignore
      }
      await fs.writeFile(target, entry.getData())
    }
  }
}
