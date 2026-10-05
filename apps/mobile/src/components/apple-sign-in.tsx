import * as AppleAuthentication from "expo-apple-authentication"
import { useState } from "react"
import { ActivityIndicator, useColorScheme, View } from "react-native"
import { Button, ErrorText } from "@/components/ui"
import { ApiClientError, call } from "@/lib/api"
import { deviceInfo } from "@/lib/device"
import { useSession } from "@/lib/session"
import { radius, space, useColors } from "@/theme"

const BUTTON_HEIGHT = 50

/** In development, show why sign-in failed so it can be fixed. */
const devDetail = (code?: string, e?: unknown) =>
  __DEV__
    ? ` (${code ?? "error"}${e instanceof Error ? `: ${e.message}` : ""})`
    : ""

/** Parents sign in with Apple. Apple's own button, as App Review requires. */
export function AppleSignIn() {
  const c = useColors()
  const dark = useColorScheme() === "dark"
  const { signIn } = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const start = async () => {
    setError("")
    let credential: AppleAuthentication.AppleAuthenticationCredential
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
    } catch (e) {
      // Closing the Apple sheet isn't an error worth showing.
      const code = (e as { code?: string }).code
      if (code !== "ERR_REQUEST_CANCELED")
        setError(
          `Apple sign-in didn't go through. Try again.${devDetail(code, e)}`
        )
      return
    }
    if (!credential.identityToken) {
      setError("Apple sign-in didn't go through. Try again.")
      return
    }

    setBusy(true)
    try {
      const auth = await call("appleSignIn", {
        body: {
          identityToken: credential.identityToken,
          givenName: credential.fullName?.givenName ?? null,
          device: deviceInfo(),
        },
      })
      await signIn(auth) // the root layout switches to the parent screens
    } catch (e) {
      setError(
        e instanceof ApiClientError
          ? `${e.message}${devDetail(e.code)}`
          : "That didn't work."
      )
      setBusy(false)
    }
  }

  // Local development only: skip Apple (no developer team or Apple ID needed).
  const devSignIn = async () => {
    setError("")
    setBusy(true)
    try {
      const auth = await call("devSignIn", {
        body: { name: "Test Parent", device: deviceInfo() },
      })
      await signIn(auth)
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "That didn't work.")
      setBusy(false)
    }
  }

  return (
    <View>
      {busy ? (
        <View
          style={{ height: BUTTON_HEIGHT, justifyContent: "center" }}
          testID="apple-sign-in-busy"
        >
          <ActivityIndicator color={c.leaf} />
        </View>
      ) : (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={
            dark
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={radius.md}
          style={{ height: BUTTON_HEIGHT, width: "100%" }}
          onPress={start}
          testID="welcome-parent"
        />
      )}
      {__DEV__ && !busy && (
        <View style={{ marginTop: space.sm }}>
          <Button
            label="Dev: sign in as a test parent"
            variant="secondary"
            onPress={devSignIn}
            testID="dev-sign-in"
          />
        </View>
      )}
      <ErrorText>{error}</ErrorText>
    </View>
  )
}
