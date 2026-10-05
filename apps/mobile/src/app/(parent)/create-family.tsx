import { router } from "expo-router"
import { useState } from "react"
import { Body, Button, ErrorText, Field, Screen, Title } from "@/components/ui"
import { ApiClientError, call } from "@/lib/api"
import { useSession } from "@/lib/session"

export default function CreateFamily() {
  const { current, refresh } = useSession()
  const [familyName, setFamilyName] = useState("")
  const [parentName, setParentName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const create = async () => {
    if (!current) return
    setBusy(true)
    setError("")
    try {
      await call("createFamily", {
        token: current.token,
        body: {
          familyName: familyName.trim(),
          parentName: parentName.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      })
      await refresh()
      router.replace("/")
    } catch (e) {
      setError(
        e instanceof ApiClientError ? e.message : "Couldn't create the family."
      )
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Title>Start your family garden</Title>
      <Body muted>You can add a second parent and your kids next.</Body>
      <Field
        label="Family name"
        autoCorrect={false}
        spellCheck={false}
        value={familyName}
        onChangeText={setFamilyName}
        placeholder="The Ruhl family"
        testID="family-name"
      />
      <Field
        label="What should your kids see you as?"
        autoCorrect={false}
        spellCheck={false}
        value={parentName}
        onChangeText={setParentName}
        placeholder="Dad"
        testID="parent-name"
      />
      <ErrorText>{error}</ErrorText>
      <Button
        label="Create family"
        onPress={create}
        loading={busy}
        disabled={!familyName.trim() || !parentName.trim()}
        testID="create-family"
      />
    </Screen>
  )
}
