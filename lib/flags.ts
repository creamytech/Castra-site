type FlagName =
  | "inbox2"
  | "dailyBrief"
  | "pipelineV2"
  | "autoDrafts"

const defaults: Record<FlagName, boolean> = {
  inbox2: true,
  dailyBrief: true,
  pipelineV2: true,
  autoDrafts: false,
}

export function flag(name: FlagName): boolean {
  const envFlags = (process.env.NEXT_PUBLIC_FLAGS || "").split(",").filter(Boolean)
  if (envFlags.includes(`-${name}`)) return false
  if (envFlags.includes(name)) return true
  return defaults[name]
}


