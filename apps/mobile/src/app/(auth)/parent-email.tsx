import { router } from "expo-router"
import { useState } from "react"
import { Body, Button, ErrorText, Field, Screen, Title } from "@/components/ui"
import { ApiClientError, call } from "@/lib/api"

export default function ParentEmail() {
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const send = async () => {
    setBusy(true)
    setError("")
    try {
      await call("startEmailSignIn", { body: { email: email.trim() } })
      router.push({ pathname: "/parent-code", params: { email: email.trim() } })
    } catch (e) {
      setError(
        e instanceof ApiClientError ? e.message : "Couldn't send the code."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Title>Parent sign-in</Title>
      <Body muted>
        We'll email you a 6-digit code. No password to remember.
      </Body>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={send}
        placeholder="you@example.com"
        testID="parent-email"
      />
      <ErrorText>{error}</ErrorText>
      <Button
        label="Email me a code"
        onPress={send}
        loading={busy}
        disabled={!email.includes("@")}
      />
    </Screen>
  )
}
