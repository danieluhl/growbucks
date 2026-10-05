import type { Tier } from "@growbucks/core/rewards"
import * as Haptics from "expo-haptics"

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Haptics scaled to the celebration tier. iPads have no Taptic Engine, so on
 * a kid's iPad these do nothing and the animation carries the moment.
 */
export async function celebrateHaptics(tier: Tier) {
  try {
    if (tier === 1) return Haptics.selectionAsync()
    if (tier === 2)
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    if (tier === 4) {
      for (const style of [
        Haptics.ImpactFeedbackStyle.Light,
        Haptics.ImpactFeedbackStyle.Medium,
        Haptics.ImpactFeedbackStyle.Heavy,
      ]) {
        await wait(120)
        await Haptics.impactAsync(style)
      }
    }
  } catch {
    // Haptics are a nice-to-have; never let them break the flow.
  }
}

export const tapHaptic = () => Haptics.selectionAsync().catch(() => {})
export const successHaptic = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {}
  )
