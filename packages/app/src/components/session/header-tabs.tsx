import { For, Show, onCleanup, type Accessor, type Component } from "solid-js"
import { Portal } from "solid-js/web"
import { createStore } from "solid-js/store"
import { Tabs } from "@opencode-ai/ui/tabs"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { TooltipKeybind } from "@opencode-ai/ui/tooltip"
import { DragDropProvider, DragDropSensors, DragOverlay, SortableProvider, closestCenter } from "@thisbeyond/solid-dnd"
import type { DragEvent } from "@thisbeyond/solid-dnd"
import { useCommand } from "@/context/command"
import { useLanguage } from "@/context/language"
import { useSessionLayout } from "@/pages/session/session-layout"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { showUrlInputDialog } from "@/components/dialog-url-input"
import { SessionContextUsage } from "@/components/session-context-usage"
import { SortableTab } from "@/components/session"
import { decode64 } from "@/utils/base64"
import { ConstrainDragYAxis, getDraggableId } from "@/utils/solid-dnd"
import { createFileTabListSync } from "@/pages/session/file-tab-scroll"
import { getTabReorderIndex } from "@/pages/session/helpers"

export const HeaderTabs: Component<{
  centerMount: Accessor<HTMLElement | null | undefined>
  tabs: Accessor<{
    open: (tab: string) => void
    close: (tab: string) => void
    setActive: (tab: string) => void
    move: (tab: string, to: number) => void
    active: Accessor<string | undefined>
    all: Accessor<string[]>
  }>
  activeTab: Accessor<string | undefined>
  openedTabs: Accessor<string[]>
  homeviewOpen: Accessor<boolean>
  playgroundOpen: Accessor<boolean>
  playgroundRefresh: () => void
  contextOpen: Accessor<boolean>
  reviewTab: Accessor<boolean>
  canReview: Accessor<boolean>
  hasReview: Accessor<boolean>
  reviewCount: Accessor<number>
  onOpenFile: (tab: string) => void
}> = (props) => {
  const language = useLanguage()
  const command = useCommand()
  const dialog = useDialog()
  const { params, view } = useSessionLayout()

  const handleTabChange = (tab: string) => {
    const all = props.tabs().all()
    if (tab === "review" || tab === "context" || tab === "playground" || tab === "homeview" || tab === "empty") {
      props.tabs().open(tab)
      return
    }
    if (!all.includes(tab)) {
      props.tabs().open(tab)
      return
    }
    props.tabs().setActive(tab)
  }

  const [dragStore, setDragStore] = createStore({
    activeDraggable: undefined as string | undefined,
  })

  const handleDragStart = (event: unknown) => {
    const id = getDraggableId(event)
    if (!id) return
    setDragStore("activeDraggable", id)
  }

  const handleDragOver = (event: DragEvent) => {
    const { draggable, droppable } = event
    if (!draggable || !droppable) return
    const currentTabs = props.tabs().all()
    const toIndex = getTabReorderIndex(currentTabs, draggable.id.toString(), droppable.id.toString())
    if (toIndex === undefined) return
    props.tabs().move(draggable.id.toString(), toIndex)
  }

  const handleDragEnd = () => {
    setDragStore("activeDraggable", undefined)
  }

  return (
    <Show when={props.centerMount()}>
      {(mount) => (
        <Portal mount={mount()}>
          <DragDropProvider
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            collisionDetector={closestCenter}
          >
            <DragDropSensors />
            <ConstrainDragYAxis />
            <Tabs value={props.activeTab()} onChange={handleTabChange}>
              <Tabs.List
                class="flex items-center"
                ref={(el: HTMLDivElement) => {
                  const stop = createFileTabListSync({ el, contextOpen: props.contextOpen })
                  onCleanup(stop)
                }}
              >
                <Show when={props.reviewTab() && props.canReview()}>
                  <Tabs.Trigger value="review">
                    <div class="flex items-center gap-1.5">
                      <div>{language.t("session.tab.review")}</div>
                      <Show when={props.hasReview()}>
                        <div>{props.reviewCount()}</div>
                      </Show>
                    </div>
                  </Tabs.Trigger>
                </Show>
                <Show when={props.contextOpen()}>
                  <Tabs.Trigger
                    value="context"
                    closeButton={
                      <TooltipKeybind
                        title={language.t("common.closeTab")}
                        keybind={command.keybind("tab.close")}
                        placement="bottom"
                        gutter={10}
                      >
                        <IconButton
                          icon="close-small"
                          variant="ghost"
                          class="h-5 w-5"
                          onClick={() => props.tabs().close("context")}
                          aria-label={language.t("common.closeTab")}
                        />
                      </TooltipKeybind>
                    }
                    hideCloseButton
                    onMiddleClick={() => props.tabs().close("context")}
                  >
                    <div class="flex items-center gap-2">
                      <SessionContextUsage variant="indicator" />
                      <div>{language.t("session.tab.context")}</div>
                    </div>
                  </Tabs.Trigger>
                </Show>
                <Show when={props.homeviewOpen()}>
                  <Tabs.Trigger value="homeview" hideCloseButton>
                    <div class="flex items-center gap-1.5">
                      <div>HomeView</div>
                    </div>
                  </Tabs.Trigger>
                </Show>
                <Show when={props.playgroundOpen()}>
                  <Tabs.Trigger value="playground" hideCloseButton>
                    <div class="flex items-center gap-1.5">
                      <div>Playground</div>
                      <TooltipKeybind title="Refresh" keybind="" class="flex items-center">
                        <IconButton
                          icon="reset"
                          variant="ghost"
                          class="h-4 w-4"
                          onClick={(e) => {
                            e.stopPropagation()
                            props.playgroundRefresh()
                          }}
                          aria-label="Refresh playground"
                        />
                      </TooltipKeybind>
                    </div>
                  </Tabs.Trigger>
                </Show>
                <SortableProvider ids={props.openedTabs()}>
                  <For each={props.openedTabs()}>
                    {(tab) => <SortableTab tab={tab} onTabClose={props.tabs().close} />}
                  </For>
                </SortableProvider>
                <div class="flex items-center gap-1 ml-1">
                  <TooltipKeybind title="Open URL" keybind="" class="flex items-center">
                    <IconButton
                      icon="magnifying-glass"
                      variant="ghost"
                      iconSize="large"
                      class="!rounded-md"
                      onClick={() => {
                        showUrlInputDialog(dialog, (url: string) => {
                          const trimmed = url.trim()
                          if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
                            view().homeview.setUrl(trimmed)
                            props.tabs().open("homeview")
                          } else {
                            const path = trimmed.startsWith("workspace://")
                              ? trimmed
                              : `workspace://${trimmed.replace(/^\/+/, "")}`
                            view().playground.setUrl(path, decode64(params.dir) ?? "")
                            props.tabs().open("playground")
                          }
                        })
                      }}
                      aria-label="Open URL"
                    />
                  </TooltipKeybind>
                  <TooltipKeybind
                    title={language.t("command.file.open")}
                    keybind={command.keybind("file.open")}
                    class="flex items-center"
                  >
                    <IconButton
                      icon="plus-small"
                      variant="ghost"
                      iconSize="large"
                      class="!rounded-md"
                      onClick={() => {
                        void import("@/components/dialog-select-file").then((x) => {
                          dialog.show(() => <x.DialogSelectFile mode="files" onOpenFile={props.onOpenFile} />)
                        })
                      }}
                      aria-label={language.t("command.file.open")}
                    />
                  </TooltipKeybind>
                </div>
              </Tabs.List>
            </Tabs>
            <DragOverlay>
              <Show when={dragStore.activeDraggable}>
                {(active) => <SortableTab tab={active()} onTabClose={() => {}} />}
              </Show>
            </DragOverlay>
          </DragDropProvider>
        </Portal>
      )}
    </Show>
  )
}
