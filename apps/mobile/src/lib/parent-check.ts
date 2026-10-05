import * as LocalAuthentication from "expo-local-authentication"

/**
 * Before a kid's view on a parent's phone switches back to the parent's
 * view, ask for the phone owner's Face ID / Touch ID / passcode so a kid
 * can't wander into the money controls. A phone with no lock at all has
 * nothing to check against, so it lets the parent through.
 */
export async function confirmParent(): Promise<boolean> {
  const level = await LocalAuthentication.getEnrolledLevelAsync()
  if (level === LocalAuthentication.SecurityLevel.NONE) return true
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Switch to the parent view",
  })
  return result.success
}
