import path from "path"
import { Process } from "./process"

export namespace Archive {
  export async function extractZip(zipPath: string, destDir: string) {
    console.log(`[Archive] extractZip called with zipPath=${zipPath}, destDir=${destDir}`)

    if (process.platform === "win32") {
      const winZipPath = path.resolve(zipPath)
      const winDestDir = path.resolve(destDir)

      console.log(`[Archive] Win32: resolved zipPath=${winZipPath}, destDir=${winDestDir}`)

      // $global:ProgressPreference suppresses PowerShell's blue progress bar popup
      const cmd = `$global:ProgressPreference = 'SilentlyContinue'; Expand-Archive -Path '${winZipPath}' -DestinationPath '${winDestDir}' -Force`
      console.log(`[Archive] Running: powershell -NoProfile -NonInteractive -Command "${cmd}"`)

      const result = await Process.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", cmd], {
        timeout: 120_000,
      })

      console.log(`[Archive] PowerShell exit code: ${result.code}`)
      if (result.stderr.length > 0) {
        console.log(`[Archive] PowerShell stderr: ${result.stderr.toString()}`)
      }

      return
    }

    await Process.run(["unzip", "-o", "-q", zipPath, "-d", destDir])
  }
}
