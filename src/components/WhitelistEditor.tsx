"use client"

import { useCallback, useEffect, useState } from "react"

interface WhitelistEntry {
  uuid: string
  name: string
}

export default function WhitelistEditor() {
  const [enabled, setEnabled]   = useState(false)
  const [entries, setEntries]   = useState<WhitelistEntry[]>([])
  const [queue, setQueue]       = useState<string[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [addName, setAddName]   = useState("")
  const [adding, setAdding]     = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const fetchWhitelist = useCallback(async () => {
    try {
      const r = await fetch("/api/server/whitelist")
      const d = await r.json()
      setEnabled(d.enabled)
      setEntries(d.entries ?? [])
      setQueue(d.queue ?? [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWhitelist() }, [fetchWhitelist])

  async function saveEntries(ents: WhitelistEntry[]) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/server/whitelist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "save", entries: ents }),
      })
      const d = await res.json()
      if (!res.ok) setError(d.error)
      else setSaved(true)
    } catch (e) {
      setError((e as Error).message)
    }
    setSaving(false)
  }

  async function addPlayer() {
    const name = addName.trim()
    if (!name) return
    setAdding(true)
    setAddError(null)
    try {
      const alreadyEntry  = entries.some(e => e.name.toLowerCase() === name.toLowerCase())
      const alreadyQueued = queue.some(n => n.toLowerCase() === name.toLowerCase())
      if (alreadyEntry || alreadyQueued) {
        setAddError("Already whitelisted")
        setAdding(false)
        return
      }
      const res = await fetch("/api/server/whitelist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "add", name }),
      })
      const d = await res.json()
      if (!res.ok) {
        setAddError(d.error)
      } else {
        setAddName("")
        setSaved(false)
        // re-fetch to get ground truth - if online, MC may need a moment to write whitelist.json
        setTimeout(fetchWhitelist, 800)
      }
    } catch (e) {
      setAddError((e as Error).message)
    }
    setAdding(false)
  }

  async function removePlayer(uuid: string) {
    const next = entries.filter(e => e.uuid !== uuid)
    setEntries(next)
    setSaved(false)
    await saveEntries(next)
  }

  async function dequeuePlayer(name: string) {
    setQueue(q => q.filter(n => n !== name))
    try {
      await fetch("/api/server/whitelist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "dequeue", name }),
      })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (loading) return (
    <div style={{ padding: "20px 14px", color: "var(--dim)", fontSize: "13px" }}>Loading...</div>
  )

  if (!enabled) return (
    <div style={{ padding: "20px 14px" }}>
      <div style={{
        fontSize: "12px", color: "var(--amber)",
        background: "rgba(210,153,34,0.07)",
        border: "1px solid rgba(210,153,34,0.2)",
        borderRadius: "4px", padding: "12px 14px", lineHeight: "1.6",
      }}>
        Whitelist is disabled. Enable it in the Properties tab by setting{" "}
        <span style={{ color: "var(--text)" }}>white-list</span> to{" "}
        <span style={{ color: "var(--green)" }}>true</span>.
      </div>
    </div>
  )

  const totalCount = entries.length + queue.length

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* -------- add player bar -------- */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
        padding: "10px 14px", borderBottom: "1px solid var(--border2)",
      }}>
        <input
          value={addName}
          onChange={e => { setAddName(e.target.value); setAddError(null) }}
          onKeyDown={e => e.key === "Enter" && addPlayer()}
          placeholder="Username..."
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1, background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "4px", padding: "5px 10px", outline: "none",
            color: "var(--text)", fontFamily: "inherit", fontSize: "12px",
          }}
        />
        {addError && (
          <span style={{ fontSize: "11px", color: "var(--red)", flexShrink: 0 }}>
            {addError}
          </span>
        )}
        {saving && (
          <span style={{ fontSize: "11px", color: "var(--muted)", flexShrink: 0 }}>Saving...</span>
        )}
        {saved && !saving && !addError && (
          <span style={{ fontSize: "11px", color: "var(--green)", flexShrink: 0 }}>Saved</span>
        )}
        <button
          onClick={addPlayer}
          disabled={adding || !addName.trim()}
          style={{
            padding: "5px 14px", borderRadius: "4px", flexShrink: 0,
            border: "1px solid var(--green)", background: "transparent",
            color: "var(--green)", fontFamily: "inherit", fontSize: "12px",
            cursor: adding || !addName.trim() ? "not-allowed" : "pointer",
            opacity: adding || !addName.trim() ? 0.5 : 1,
          }}
        >
          {adding ? "Adding..." : "Add player"}
        </button>
      </div>

      {/* -------- count bar -------- */}
      <div style={{
        padding: "5px 14px", flexShrink: 0, display: "flex",
        justifyContent: "space-between", alignItems: "center",
        fontSize: "11px", color: "var(--dim)",
        borderBottom: "1px solid var(--border2)",
      }}>
        <span>
          {totalCount} player{totalCount !== 1 ? "s" : ""} whitelisted
          {queue.length > 0 && (
            <span style={{ color: "var(--amber)" }}> ({queue.length} pending reboot)</span>
          )}
        </span>
        {error && <span style={{ color: "var(--red)" }}>{error}</span>}
      </div>

      {/* -------- player list -------- */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {totalCount === 0 ? (
          <div style={{ padding: "20px 14px", color: "var(--dim)", fontSize: "13px" }}>
            No players whitelisted yet.
          </div>
        ) : (
          <>
            {entries.map(entry => (
              <div
                key={entry.uuid}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "8px 14px", borderBottom: "1px solid var(--border2)",
                }}
              >
                <img
                  src={`https://mc-heads.net/avatar/${entry.uuid}/24`}
                  alt={entry.name}
                  width={24} height={24}
                  style={{ borderRadius: "2px", imageRendering: "pixelated", flexShrink: 0 }}
                />
                <span style={{ flex: 1, fontSize: "13px", color: "var(--text)" }}>
                  {entry.name}
                </span>
                <span style={{ fontSize: "11px", color: "var(--dim)" }}>
                  {entry.uuid}
                </span>
                <button
                  onClick={() => removePlayer(entry.uuid)}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "var(--red)"
                    e.currentTarget.style.color       = "var(--red)"
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "var(--border)"
                    e.currentTarget.style.color       = "var(--muted)"
                  }}
                  style={{
                    background: "transparent", border: "1px solid var(--border)",
                    borderRadius: "4px", color: "var(--muted)", cursor: "pointer",
                    fontFamily: "inherit", fontSize: "11px", padding: "2px 10px",
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                >
                  Remove
                </button>
              </div>
            ))}

            {queue.map(name => (
              <div
                key={`queue-${name}`}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "8px 14px", borderBottom: "1px solid var(--border2)",
                  opacity: 0.75,
                }}
              >
                {/* placeholder avatar box */}
                <div style={{
                  width: 24, height: 24, flexShrink: 0, borderRadius: "2px",
                  background: "var(--surface)", border: "1px solid var(--border)",
                }} />
                <span style={{ flex: 1, fontSize: "13px", color: "var(--text)" }}>
                  {name}
                </span>
                <span style={{
                  fontSize: "10px", color: "var(--amber)", flexShrink: 0,
                  background: "rgba(210,153,34,0.08)",
                  border: "1px solid rgba(210,153,34,0.25)",
                  borderRadius: "3px", padding: "1px 6px",
                }}>
                  pending reboot
                </span>
                <button
                  onClick={() => dequeuePlayer(name)}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "var(--red)"
                    e.currentTarget.style.color       = "var(--red)"
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "var(--border)"
                    e.currentTarget.style.color       = "var(--muted)"
                  }}
                  style={{
                    background: "transparent", border: "1px solid var(--border)",
                    borderRadius: "4px", color: "var(--muted)", cursor: "pointer",
                    fontFamily: "inherit", fontSize: "11px", padding: "2px 10px",
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                >
                  Cancel
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
