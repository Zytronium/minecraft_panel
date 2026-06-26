"use client"

import { useEffect, useState } from "react"
import type { PropLine } from "@/lib/minecraft/properties"

export default function PropertiesEditor() {
  const [lines, setLines]     = useState<PropLine[]>([])
  const [filter, setFilter]   = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/server/properties")
      .then(r => r.json())
      .then(d => { setLines(d.lines); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  function updateValue(key: string, value: string) {
    setLines(prev => prev.map(l =>
      l.type === "entry" && l.key === key ? { ...l, value } : l
    ))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/server/properties", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ lines }),
      })
      const d = await res.json()
      if (!res.ok) setError(d.error)
      else setSaved(true)
    } catch (e) {
      setError((e as Error).message)
    }
    setSaving(false)
  }

  const entries = lines.filter(l => l.type === "entry") as Array<{ type: "entry"; key: string; value: string }>
  const q        = filter.toLowerCase()
  const filtered = q
    ? entries.filter(e => e.key.includes(q) || e.value.toLowerCase().includes(q))
    : entries

  if (loading) return (
    <div style={{ padding: "20px 14px", color: "var(--dim)", fontSize: "13px" }}>
      Loading...
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* -------- toolbar -------- */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
        padding: "10px 14px", borderBottom: "1px solid var(--border2)",
      }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter properties..."
          style={{
            flex: 1, background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "4px", padding: "5px 10px", outline: "none",
            color: "var(--text)", fontFamily: "inherit", fontSize: "12px",
          }}
        />
        <span style={{ fontSize: "11px", color: "var(--dim)", flexShrink: 0 }}>
          {filtered.length} / {entries.length}
        </span>
        {saved && (
          <span style={{ fontSize: "11px", color: "var(--green)", flexShrink: 0 }}>Saved</span>
        )}
        {error && (
          <span style={{
            fontSize: "11px", color: "var(--red)", flexShrink: 0,
            maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {error}
          </span>
        )}
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: "5px 14px", borderRadius: "4px", flexShrink: 0,
            border: "1px solid var(--green)", background: "transparent",
            color: "var(--green)", fontFamily: "inherit", fontSize: "12px",
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* -------- restart notice -------- */}
      <div style={{
        padding: "6px 14px", flexShrink: 0,
        fontSize: "11px", color: "var(--amber)",
        background: "rgba(210,153,34,0.07)",
        borderBottom: "1px solid rgba(210,153,34,0.15)",
      }}>
        Changes take effect after server restart
      </div>

      {/* -------- rows -------- */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.map(entry => (
          <div
            key={entry.key}
            style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "5px 14px",
              borderBottom: "1px solid var(--border2)",
            }}
          >
            <span style={{
              width: "240px", flexShrink: 0, fontSize: "12px", color: "var(--muted)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {entry.key}
            </span>

            {entry.value === "true" || entry.value === "false" ? (
              // -------- boolean toggle --------
              <button
                onClick={() => updateValue(entry.key, entry.value === "true" ? "false" : "true")}
                style={{
                  padding: "2px 12px", borderRadius: "20px", cursor: "pointer",
                  border: `1px solid ${entry.value === "true" ? "var(--green)" : "var(--border)"}`,
                  background: entry.value === "true" ? "rgba(63,185,80,0.1)" : "transparent",
                  color: entry.value === "true" ? "var(--green)" : "var(--muted)",
                  fontFamily: "inherit", fontSize: "11px", letterSpacing: "0.04em",
                }}
              >
                {entry.value}
              </button>
            ) : (
              // -------- text input --------
              <input
                value={entry.value}
                onChange={e => updateValue(entry.key, e.target.value)}
                style={{
                  flex: 1, background: "transparent", outline: "none",
                  border: "none", borderBottom: "1px solid var(--border2)",
                  color: "var(--text)", fontFamily: "inherit", fontSize: "12px",
                  padding: "2px 4px",
                }}
                onFocus={e  => { e.target.style.borderBottomColor = "var(--muted)" }}
                onBlur={e   => { e.target.style.borderBottomColor = "var(--border2)" }}
              />
            )}
          </div>
        ))}
      </div>

    </div>
  )
}
