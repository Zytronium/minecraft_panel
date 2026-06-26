export type PropLine =
  | { type: "comment"; content: string }
  | { type: "blank" }
  | { type: "entry"; key: string; value: string }

export function parseProperties(raw: string): PropLine[] {
  return raw.split("\n").map(line => {
    if (line.startsWith("#")) return { type: "comment" as const, content: line }
    if (line.trim() === "")   return { type: "blank"   as const }
    const eq = line.indexOf("=")
    if (eq === -1) return { type: "comment" as const, content: line }
    return { type: "entry" as const, key: line.slice(0, eq), value: line.slice(eq + 1) }
  })
}

export function serializeProperties(lines: PropLine[]): string {
  return lines.map(line => {
    if (line.type === "comment") return line.content
    if (line.type === "blank") return ""
    return `${line.key}=${line.value}`
  }).join("\n")
}
