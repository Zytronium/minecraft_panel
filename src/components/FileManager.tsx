"use client"

import {useCallback, useEffect, useRef, useState} from "react"

interface DirEntry {
  name: string
  isDir: boolean
  size: number
  modified: string
}

interface FileView {
  path: string
  text: boolean
  content: string
  size: number
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join("/").replace(/\/+/g, "/")
}

export default function FileManager() {
  const [currentPath, setCurrentPath] = useState("")
  const [entries, setEntries] = useState<DirEntry[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [fileView, setFileView] = useState<FileView | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)

  const loadDir = useCallback(async (dirPath: string) => {
    setListLoading(true)
    setListError(null)
    try {
      const res = await fetch(`/api/server/files?path=${encodeURIComponent(dirPath)}`)
      const d = await res.json()
      if (!res.ok) {
        setListError(d.error);
        return
      }
      setEntries(d.entries)
      setCurrentPath(dirPath)
    } catch (e) {
      setListError((e as Error).message)
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDir("")
  }, [loadDir])

  async function openFile(entry: DirEntry) {
    const filePath = joinPath(currentPath, entry.name)
    setFileLoading(true)
    setSaved(false)
    setSaveError(null)
    try {
      const res = await fetch(`/api/server/files?path=${encodeURIComponent(filePath)}`)
      const d = await res.json()
      if (!res.ok) {
        setListError(d.error);
        return
      }
      setFileView({path: filePath, text: d.text, content: d.content ?? "", size: d.size ?? 0})
      if (d.text) setEditContent(d.content ?? "")
    } catch (e) {
      setListError((e as Error).message)
    } finally {
      setFileLoading(false)
    }
  }

  async function saveFile() {
    if (!fileView?.text) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const res = await fetch("/api/server/files", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({path: fileView.path, content: editContent}),
      })
      const d = await res.json()
      if (!res.ok) setSaveError(d.error)
      else setSaved(true)
    } catch (e) {
      setSaveError((e as Error).message)
    }
    setSaving(false)
  }

  async function deleteEntry(name: string, isDir: boolean) {
    const entryPath = joinPath(currentPath, name)
    const confirmed = window.confirm(
      isDir
        ? `Delete folder "${name}" and all its contents?`
        : `Delete "${name}"?`
    )
    if (!confirmed) return
    setDeleting(name)
    try {
      const res = await fetch(`/api/server/files?path=${encodeURIComponent(entryPath)}`, {method: "DELETE"})
      const d = await res.json()
      if (!res.ok) {
        setListError(d.error);
        return
      }
      if (fileView?.path === entryPath || fileView?.path.startsWith(entryPath + "/")) {
        setFileView(null)
      }
      await loadDir(currentPath)
    } catch (e) {
      setListError((e as Error).message)
    }
    setDeleting(null)
  }

  async function uploadFile(file: File) {
    setUploading(true)
    const destPath = joinPath(currentPath, file.name)
    const form = new FormData()
    form.append("file", file)
    form.append("path", destPath)
    try {
      const res = await fetch("/api/server/files", {method: "POST", body: form})
      const d = await res.json()
      if (!res.ok) setListError(d.error)
      else await loadDir(currentPath)
    } catch (e) {
      setListError((e as Error).message)
    }
    setUploading(false)
  }

  const segments = currentPath.split("/").filter(Boolean)

  return (
    <div style={{flex: 1, overflow: "hidden", display: "flex", flexDirection: "column"}}>

      {/* -------- breadcrumb + toolbar -------- */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px", flexShrink: 0,
        padding: "6px 14px", borderBottom: "1px solid var(--border2)", fontSize: "12px",
      }}>
        <div style={{flex: 1, display: "flex", alignItems: "center", gap: "2px", overflow: "hidden", minWidth: 0}}>
          <button onClick={() => loadDir("")} style={crumbBtn(segments.length === 0)}>
            server
          </button>
          {segments.map((seg, i) => {
            const segPath = segments.slice(0, i + 1).join("/")
            const isLast = i === segments.length - 1
            return (
              <span key={segPath} style={{display: "flex", alignItems: "center", gap: "2px"}}>
                <span style={{color: "var(--dim)"}}>/</span>
                <button
                  onClick={() => !isLast && loadDir(segPath)}
                  style={crumbBtn(isLast)}
                >
                  {seg}
                </button>
              </span>
            )
          })}
        </div>

        {listError && (
          <span style={{fontSize: "11px", color: "var(--red)", flexShrink: 0}}>{listError}</span>
        )}

        <input
          ref={uploadRef}
          type="file"
          style={{display: "none"}}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) uploadFile(file)
            e.target.value = ""
          }}
        />
        <button
          onClick={() => uploadRef.current?.click()}
          disabled={uploading}
          style={{...toolbarBtn, opacity: uploading ? 0.5 : 1}}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {/* -------- two-pane body -------- */}
      <div style={{flex: 1, overflow: "hidden", display: "flex"}}>

        {/* -------- file list -------- */}
        <div style={{
          width: "240px", flexShrink: 0, overflowY: "auto",
          borderRight: "1px solid var(--border2)",
        }}>
          {listLoading ? (
            <div style={{padding: "16px 12px", fontSize: "12px", color: "var(--dim)"}}>Loading...</div>
          ) : entries.length === 0 ? (
            <div style={{padding: "16px 12px", fontSize: "12px", color: "var(--dim)"}}>Empty directory</div>
          ) : entries.map(entry => {
            const entryPath = joinPath(currentPath, entry.name)
            const isSelected = fileView?.path === entryPath
            const isBusy = deleting === entry.name
            return (
              <div
                key={entry.name}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "5px 10px 5px 12px",
                  borderBottom: "1px solid var(--border2)",
                  background: isSelected ? "rgba(255,255,255,0.04)" : "transparent",
                }}
              >
                <span
                  onClick={() => entry.isDir ? loadDir(entryPath) : openFile(entry)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", gap: "7px",
                    minWidth: 0, cursor: "pointer",
                  }}
                >
                  <span style={{fontSize: "13px", flexShrink: 0}}>
                    {entry.isDir ? "📁" : "📄"}
                  </span>
                  <span style={{
                    fontSize: "12px",
                    color: entry.isDir ? "var(--text)" : "var(--muted)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {entry.name}
                  </span>
                </span>
                <button
                  onClick={() => deleteEntry(entry.name, entry.isDir)}
                  disabled={isBusy}
                  title={`Delete ${entry.isDir ? "folder" : "file"}`}
                  style={{
                    background: "transparent", border: "none", cursor: isBusy ? "not-allowed" : "pointer",
                    color: "var(--dim)", fontSize: "10px", padding: "2px 4px",
                    flexShrink: 0, opacity: isBusy ? 0.3 : 0.6, lineHeight: 1,
                    borderRadius: "3px",
                  }}
                  onMouseEnter={e => {
                    if (!isBusy) e.currentTarget.style.color = "var(--red)"
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = "var(--dim)"
                  }}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>

        {/* -------- editor / viewer -------- */}
        <div style={{flex: 1, overflow: "hidden", display: "flex", flexDirection: "column"}}>
          {fileLoading ? (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", color: "var(--dim)",
            }}>
              Loading...
            </div>
          ) : !fileView ? (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", color: "var(--dim)",
            }}>
              Select a file to view or edit
            </div>
          ) : fileView.text ? (
            <>
              {/* -------- editor toolbar -------- */}
              <div style={{
                display: "flex", alignItems: "center", gap: "8px", flexShrink: 0,
                padding: "6px 12px", borderBottom: "1px solid var(--border2)", fontSize: "11px",
              }}>
                <span style={{
                  color: "var(--dim)", flex: 1, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {fileView.path}
                </span>
                {saveError && <span style={{color: "var(--red)", flexShrink: 0}}>{saveError}</span>}
                {saved && !saving && <span style={{color: "var(--green)", flexShrink: 0}}>Saved</span>}
                <a
                  href={`/api/server/files?path=${encodeURIComponent(fileView.path)}&action=download`}
                  download
                  style={{...toolbarBtn, color: "var(--muted)", textDecoration: "none"}}
                >
                  Download
                </a>
                <button
                  onClick={saveFile}
                  disabled={saving}
                  style={{...toolbarBtn, opacity: saving ? 0.5 : 1}}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
              <textarea
                value={editContent}
                onChange={e => {
                  setEditContent(e.target.value);
                  setSaved(false)
                }}
                onKeyDown={e => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                    e.preventDefault()
                    saveFile()
                  }
                }}
                spellCheck={false}
                style={{
                  flex: 1, resize: "none", background: "transparent", border: "none",
                  outline: "none", color: "var(--text)", fontFamily: "monospace",
                  fontSize: "12px", padding: "12px", lineHeight: "1.6", overflowY: "auto",
                }}
              />
            </>
          ) : (
            /* -------- binary file -------- */
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "12px",
            }}>
              <span style={{fontSize: "36px"}}>📦</span>
              <span style={{fontSize: "13px", color: "var(--text)"}}>
                {fileView.path.split("/").pop()}
              </span>
              <span style={{fontSize: "11px", color: "var(--dim)"}}>
                {formatSize(fileView.size)} - binary file
              </span>
              <a
                href={`/api/server/files?path=${encodeURIComponent(fileView.path)}&action=download`}
                download
                style={{
                  fontSize: "12px", color: "var(--green)",
                  border: "1px solid var(--green)", borderRadius: "4px",
                  padding: "5px 16px", textDecoration: "none",
                }}
              >
                Download
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// -------- style helpers --------
function crumbBtn(active: boolean): React.CSSProperties {
  return {
    background: "transparent", border: "none", padding: "0 3px",
    color: active ? "var(--text)" : "var(--muted)",
    fontFamily: "inherit", fontSize: "12px",
    cursor: active ? "default" : "pointer",
  }
}

const toolbarBtn: React.CSSProperties = {
  padding: "3px 10px", borderRadius: "4px",
  border: "1px solid var(--border)", background: "transparent",
  color: "var(--muted)", fontFamily: "inherit", fontSize: "11px",
  cursor: "pointer", flexShrink: 0,
}
