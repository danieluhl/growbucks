import { useColorScheme } from "react-native"

/**
 * GrowBucks palette (same tokens as the web/design sketches, as sRGB hex).
 * leaf = saving/primary · sun = interest · sky = what-ifs · berry = spending
 */
const light = {
  bg: "#F3F9F2",
  surface: "#FFFFFF",
  sunken: "#E9F1E8",
  fg: "#132419",
  muted: "#57685A",
  line: "#D4DED2",
  leaf: "#1D7D3E",
  leafSoft: "#D1F2D7",
  onLeaf: "#F8FEF7",
  sun: "#DA950B",
  sunSoft: "#FEEEC1",
  sky: "#0E84B7",
  skySoft: "#D6F0FF",
  berry: "#CB454F",
  berrySoft: "#FFE6E5",
  soil: "#6A4F39",
}

const dark: typeof light = {
  bg: "#0A140E",
  surface: "#121F17",
  sunken: "#0F1912",
  fg: "#E9F1E8",
  muted: "#9BAD9E",
  line: "#27382C",
  leaf: "#5AC576",
  leafSoft: "#14361D",
  onLeaf: "#051B0E",
  sun: "#F1BF4E",
  sunSoft: "#413007",
  sky: "#53B6EB",
  skySoft: "#103243",
  berry: "#F47A79",
  berrySoft: "#472020",
  soil: "#BB9679",
}

export type Colors = typeof light

export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light
}

export const fonts = {
  display: "Baloo2_800ExtraBold",
  displayBold: "Baloo2_700Bold",
  body: "AtkinsonHyperlegibleNext_400Regular",
  bodyBold: "AtkinsonHyperlegibleNext_700Bold",
  num: "AtkinsonHyperlegibleMono_600SemiBold",
} as const

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const

/** Content column width: phones use the full width, iPads get a centered column. */
export const MAX_CONTENT_WIDTH = 560
