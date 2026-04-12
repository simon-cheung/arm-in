import { onCleanup, onMount, createEffect } from "solid-js"
import Cherry from "cherry-markdown"
import * as echarts from "echarts"
import type { RichTextViewerProps } from "./file"
import "cherry-markdown/dist/cherry-markdown.css"
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

export function RichTextViewerCM<T>(props: RichTextViewerProps<T>) {
  let containerRef: HTMLDivElement | undefined
  let cherryInstance: Cherry | null = null
  let containerId = `cherry-${Math.random().toString(36).slice(2)}`

  const isMd = () => isMarkdownFile(props.file.name)

  onMount(() => {
    if (containerRef) {
      containerRef.id = containerId
      cherryInstance = new Cherry({
        id: containerId,
        value: props.file.contents as string,
        engine: {
          global: {
            htmlWhiteList: "",
          },
          syntax: {
            codeBlock: {
              lineNumber: true,
              copyCode: true,
              editCode: true,
              changeLang: true,
            },
            table: {},
          },
        },
        editor: {
          defaultModel: "edit&preview",
          autoScrollByCursor: true,
        },
        toolbars: {
          theme: "light",
          showToolbar: true,
          toolbar: [
            "switchModel",
            "togglePreview",
            "|",
            "bold",
            "italic",
            "strikethrough",
            "quote",
            "|",
            "code",
            "codeTheme",
            "|",
            "link",
            "image",
            "|",
            "table",
            "graph",
            "|",
            "toc",
            "fullScreen",
          ],
        },
        event: {
          afterChange: (content: string) => {
            props.onContentChange?.(content)
          },
        },
      })
    }
  })

  createEffect(() => {
    if (cherryInstance && props.file.contents) {
      cherryInstance.setValue(props.file.contents as string)
    }
  })

  onCleanup(() => {
    props.search?.register(null)
    if (cherryInstance) {
      cherryInstance.destroy()
    }
  })

  return (
    <div ref={(el) => (containerRef = el)} class={`rich-text-viewer rich-text-viewer-cherry ${props.class ?? ""}`} />
  )
}
