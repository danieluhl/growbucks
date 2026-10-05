import * as AppleAuthentication from "expo-apple-authentication"
import { useState } from "react"
import { ActivityIndicator, useColorScheme, View } from "react-native"
import { ErrorText } from "@/components/ui"
import { ApiClientError, call } from "@/lib/api"
import { deviceInfo } from "@/lib/device"
import { useSession } from "@/lib/session"
import { radius, useColors } from "@/theme"

const BUTTON_HEIGHT = 50

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
      if ((e as { code?: string }).code !== "ERR_REQUEST_CANCELED")
        setError("Apple sign-in didn't go through. Try again.")
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
      <ErrorText>{error}</ErrorText>
    </View>
  )
}
