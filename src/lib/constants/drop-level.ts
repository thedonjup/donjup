export type DropLevel = "normal" | "decline" | "crash" | "severe";

export function calcDropLevel(changeRate: number | null): DropLevel {
  if (changeRate === null) return "normal";
  if (changeRate <= -20) return "severe"; // Adjusted from -25% to -20%
  if (changeRate <= -15) return "crash";
  if (changeRate <= -10) return "decline";
  return "normal";
}

export const DROP_LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  decline: {
    label: "하락",
    color: "var(--color-drop-level-decline)",
    bg: "var(--color-drop-level-decline-bg)",
  },
  crash: {
    label: "폭락",
    color: "var(--color-drop-level-crash)",
    bg: "var(--color-drop-level-crash-bg)",
  },
  severe: {
    label: "대폭락",
    color: "var(--color-drop-level-severe)",
    bg: "var(--color-drop-level-severe-bg)",
  },
};
