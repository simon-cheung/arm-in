import { createSignal, onCleanup, Show, onMount } from "solid-js"
import MarkdownIt from "markdown-it"
import mermaid from "mermaid"
import type { RichTextFileProps } from "./file"
import "katex/dist/katex.min.css"
import "./rich-text-viewer.css"

const MARKDOWN_EXTS = [".md", ".markdown", ".mdown", ".mkd", ".mkdn", ".mdtxt"]

function extractFileExt(name: string): string | undefined {
  const match = name.match(/\.[^.]+$/)
  return match ? match[0] : undefined
}

function isMarkdownFile(name: string): boolean {
  const ext = extractFileExt(name)
  if (!ext) return false
  return MARKDOWN_EXTS.includes(ext.toLowerCase())
}

const md = MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
})

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
})

async function renderMermaidSvg(code: string, container: HTMLElement) {
  try {
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const { svg } = await mermaid.render(id, code)
    container.innerHTML = svg
  } catch {
    container.innerHTML = `<pre class="mermaid-error">${code}</pre>`
  }
}

function processMermaidBlocks(container: HTMLElement) {
  const codeBlocks = container.querySelectorAll("pre code")
  codeBlocks.forEach((codeEl) => {
    if (codeEl.classList.contains("language-mermaid")) {
      const pre = codeEl.parentElement
      if (!pre) return
      const code = codeEl.textContent || ""
      if (!code.trim()) return

      const div = document.createElement("div")
      div.className = "mermaid"
      pre.replaceWith(div)
      renderMermaidSvg(code, div)
    }
  })
}

export function RichTextViewer<T>(props: RichTextFileProps<T>) {
  const [query, setQuery] = createSignal("")
  const [open, setOpen] = createSignal(false)

  const isMd = () => isMarkdownFile(props.file.name)

  let containerRef!: HTMLDivElement

  onMount(() => {
    if (isMd()) {
      setTimeout(() => processMermaidBlocks(containerRef), 0)
    }
  })

  onCleanup(() => {
    props.search?.register(null)
  })

  const renderContent = () => {
    const content = props.file.contents as string
    if (!content) return ""
    return md.render(content)
  }

  return (
    <div ref={containerRef} class={`rich-text-viewer ${props.class ?? ""}`}>
      <Show when={open()}>
        <div class="search-overlay" onClick={() => setOpen(false)} />
        <div class="search-bar">
          <input type="text" placeholder="Search..." value={query()} onInput={(e) => setQuery(e.currentTarget.value)} />
          <button onClick={() => setOpen(false)}>×</button>
        </div>
      </Show>
      <div class="markdown-content" innerHTML={renderContent()} />
    </div>
  )
}
