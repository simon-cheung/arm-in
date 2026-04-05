# RichTextViewer Implementation Specification

## Context

The current `TextViewer` in `@opencode-ai/ui` uses `@pierre/diffs` (PierreFile/VirtualizedFile) for rendering text/code content.

For rich text content (markdown documents), we have two implementations:

1. **RichTextViewer** - Based on `markdown-it` + `mermaid`
2. **RichTextViewerCM** - Based on `cherry-markdown` (Full Mode)

## References

- [markdown-it](https://github.com/markdown-it/markdown-it)
- [cherry-markdown](https://github.com/Tencent/cherry-markdown) - Full Mode demo: https://tencent.github.io/cherry-markdown/examples/index.html

## 1. Dependencies

### Both Viewers

```json
{
  "mermaid": "catalog:"
}
```

### RichTextViewer (markdown-it)

```json
{
  "markdown-it": "^14.1.0",
  "@types/markdown-it": "14.1.2"
}
```

### RichTextViewerCM (cherry-markdown)

```json
{
  "cherry-markdown": "^0.11.0-alpha.0",
  "echarts": "^5.5.0" // Optional: for table-to-chart feature
}
```

> **Note**: According to cherry-markdown docs, `echarts` is optional. If you need table-to-chart functionality, add it. Otherwise, it will work without chart features.

## 2. File Structure

```
packages/ui/src/components/
├── file.tsx                    # File component with RichTextViewer integration
├── rich-text-viewer.tsx        # markdown-it based viewer
├── rich-text-viewer-cm.tsx     # cherry-markdown based viewer (CM = Cherry Markdown)
├── rich-text-viewer.css        # Shared styles
└── file-media.tsx              # Existing media handling
```

## 3. Types

```typescript
export type RichTextFileProps<T = {}> = {
  file: FileContents
  mode: "rich-text"
  editable?: boolean
  onContentChange?: (content: string, html: string) => void
  class?: string
  classList?: ComponentProps<"div">["classList"]
  media?: FileMediaOptions
  search?: FileSearchControl
}
```

## 4. RichTextViewer (markdown-it)

```tsx
// packages/ui/src/components/rich-text-viewer.tsx
import MarkdownIt from "markdown-it"
import mermaid from "mermaid"

const md = MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
})

mermaid.initialize({ startOnLoad: false, theme: "default" })

function processMermaidBlocks(container: HTMLElement) {
  container.querySelectorAll("pre code").forEach((codeEl) => {
    if (codeEl.classList.contains("language-mermaid")) {
      const pre = codeEl.parentElement
      if (!pre) return
      const code = codeEl.textContent || ""
      if (!code.trim()) return

      const div = document.createElement("div")
      div.className = "mermaid"
      pre.replaceWith(div)
      mermaid.render(id, code).then(({ svg }) => (div.innerHTML = svg))
    }
  })
}

export function RichTextViewer<T>(props: RichTextFileProps<T>) {
  let containerRef!: HTMLDivElement

  onMount(() => {
    if (isMd()) {
      setTimeout(() => processMermaidBlocks(containerRef), 0)
    }
  })

  const renderContent = () => {
    return md.render(props.file.contents as string)
  }

  return (
    <div ref={containerRef} class="rich-text-viewer">
      <div class="markdown-content" innerHTML={renderContent()} />
    </div>
  )
}
```

**Features**:

- Markdown rendering via markdown-it
- Mermaid diagram support (via custom post-processing)
- Lightweight, fast

## 5. RichTextViewerCM (cherry-markdown Full Mode)

```tsx
// packages/ui/src/components/rich-text-viewer-cm.tsx
import Cherry from "cherry-markdown"
import "cherry-markdown/dist/cherry-markdown.css"

export function RichTextViewerCM<T>(props: RichTextFileProps<T>) {
  let containerRef!: HTMLDivElement
  let cherryInstance: Cherry | null = null

  onMount(() => {
    cherryInstance = new Cherry({
      id: containerRef,
      value: props.file.contents as string,
      editor: {
        enablePreview: false,
        editMask: false,
      },
      toolbars: {
        showToolbar: false,
        toolbar: [],
      },
    })
  })

  createEffect(() => {
    if (cherryInstance) {
      cherryInstance.setMarkdown(props.file.contents as string)
    }
  })

  onCleanup(() => {
    cherryInstance?.destroy()
  })

  return <div ref={containerRef} class="rich-text-viewer rich-text-viewer-cherry" />
}
```

**Features** (from cherry-markdown):

- Out-of-the-box markdown support
- Mermaid diagrams (built-in)
- Formula (KaTeX/MathJax)
- Code syntax highlighting
- Table support
- Task lists
- Multiple themes

## 6. File Component Integration

In `packages/ui/src/components/file.tsx`:

```tsx
const MARKDOWN_EXTS = [".md", ".markdown", ".mdown", ".mkd", ".mkdn", ".mdtxt"]

function isRichTextFile(file: { name: string }): boolean {
  const match = file.name.match(/\.[^.]+$/)
  if (!match) return false
  return MARKDOWN_EXTS.includes(match[0].toLowerCase())
}

export function File<T>(props: FileProps<T>) {
  if (props.mode === "text") {
    const useRichText = isRichTextFile(props.file)
    return (
      <FileMedia
        media={props.media}
        fallback={() => (useRichText ? <RichTextViewer {...(props as any)} /> : <TextViewer {...(props as any)} />)}
      />
    )
  }
  // ...
}
```

## 7. Feature Comparison

| Feature           | RichTextViewer (markdown-it) | RichTextViewerCM (cherry-markdown) |
| ----------------- | ---------------------------- | ---------------------------------- |
| Size              | Lightweight                  | Full bundle                        |
| Mermaid           | Via custom code              | Built-in                           |
| Formula           | KaTeX (manual)               | Built-in                           |
| Themes            | Custom CSS                   | Multiple built-in                  |
| Charts            | No                           | Table → Chart                      |
| Code highlighting | Via shiki (external)         | Built-in                           |

## 8. CSS Styles

Shared styles in `rich-text-viewer.css`:

```css
.rich-text-viewer {
  padding: 1rem;
  outline: none;
}

.rich-text-viewer .markdown-content h1 { ... }
.rich-text-viewer .markdown-content h2 { ... }
/* ... other markdown styles */

.rich-text-viewer .mermaid {
  text-align: center;
  margin: 1em 0;
}
```

## 9. Notes

- Both viewers detect markdown files via extension and use appropriate rendering
- cherry-markdown includes its own CSS and handles theming internally
- RichTextViewerCM is for full-featured markdown experience
- RichTextViewer is for lightweight scenarios

## 10. Open Questions

- Should we keep both implementations or pick one as primary?
- cherry-markdown size is significant (~500KB), may impact bundle size
