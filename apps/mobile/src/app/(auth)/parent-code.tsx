import { useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { Body, Button, ErrorText, Field, Screen, Title } from "@/components/ui"
import { ApiClientError, call } from "@/lib/api"
import { deviceInfo } from "@/lib/device"
import { useSession } from "@/lib/session"

export default function ParentCode() {
  const { email = "" } = useLocalSearchParams<{ email: string }>()
  const { signIn } = useSession()
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const verify = async (value = code) => {
    setBusy(true)
    setError("")
    try {
      const auth = await call("verifyEmailSignIn", {
        body: { email, code: value, device: deviceInfo() },
      })
      await signIn(auth) // the root layout switches to the parent screens
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "That didn't work.")
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Title>Check your email</Title>
      <Body muted>Enter the 6-digit code we sent to {email}.</Body>
      <Field
        label="Code"
        value={code}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, "").slice(0, 6)
          setCode(digits)
          if (digits.length === 6) verify(digits)
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        style={{ fontSize: 28, letterSpacing: 8 }}
        testID="parent-code"
      />
      <ErrorText>{error}</ErrorText>
      <Button
        label="Sign in"
        onPress={() => verify()}
        loading={busy}
        disabled={code.length !== 6}
      />
    </Screen>
  )
}
