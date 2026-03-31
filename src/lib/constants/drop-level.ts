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
