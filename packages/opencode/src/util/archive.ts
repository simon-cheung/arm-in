import path from "path"
import { Process } from "./process"

export namespace Archive {
  export async function extractZip(zipPath: string, destDir: string) {
    if (process.platform === "win32") {
      const winZipPath = path.resolve(zipPath)
      const winDestDir = path.resolve(destDir)
      const cmd = `$global:ProgressPreference = 'SilentlyContinue'; Expand-Archive -Path '${winZipPath}' -DestinationPath '${winDestDir}' -Force`
      await Process.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", cmd], { timeout: 120_000 })
      return
    }

    await Process.run(["unzip", "-o", "-q", zipPath, "-d", destDir])
  }
}
