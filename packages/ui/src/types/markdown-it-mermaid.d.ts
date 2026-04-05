declare module "markdown-it-mermaid" {
  import type { PluginWithOptions } from "markdown-it"

  interface MermaidOptions {
    theme?: string
  }

  const mermaid: PluginWithOptions<MermaidOptions>
  export default mermaid
}
