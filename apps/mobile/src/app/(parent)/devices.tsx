import type { DevicesResponse } from "@growbucks/core/api"
import { useFocusEffect } from "expo-router"
import { useCallback, useState } from "react"
import { Text, View } from "react-native"
import { Body, Button, Card, ErrorText, Screen, Title } from "@/components/ui"
import { ApiClientError, call } from "@/lib/api"
import { useSession } from "@/lib/session"
import { fonts, space, useColors } from "@/theme"

type Device = DevicesResponse["devices"][number]

function lastSeen(iso: string | null) {
  if (!iso) return "never"
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000)
  if (mins < 2) return "just now"
  if (mins < 60) return `${mins} min ago`
  if (mins < 48 * 60) return `${Math.round(mins / 60)} h ago`
  return `${Math.round(mins / 1440)} days ago`
}

export default function Devices() {
  const c = useColors()
  const { current, signOut } = useSession()
  const [devices, setDevices] = useState<Device[] | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!current) return
    try {
      setDevices((await call("listDevices", { token: current.token })).devices)
    } catch (e) {
      setError(
        e instanceof ApiClientError ? e.message : "Couldn't load devices."
      )
    }
  }, [current])
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const remove = async (d: Device) => {
    if (!current) return
    try {
      await call("removeDevice", {
        token: current.token,
        params: { deviceId: d.id },
      })
      if (d.isThisDevice) return signOut()
      setConfirming(null)
      load()
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Couldn't remove it.")
    }
  }

  return (
    <Screen>
      <Title>Devices</Title>
      <Body muted>Removing a device signs everyone out of it right away.</Body>
      <ErrorText>{error}</ErrorText>
      {devices?.map((d) => (
        <Card key={d.id}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: space.sm,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontFamily: fonts.displayBold,
                fontSize: 20,
                color: c.fg,
              }}
            >
              {d.name}
              {d.isThisDevice ? " (this one)" : ""}
            </Text>
          </View>
          <Body muted>
            {d.kids.length
              ? `${d.kids.map((k) => k.name).join(" & ")} · `
              : "Parent · "}
            seen {lastSeen(d.lastSeenAt)}
          </Body>
          {confirming === d.id ? (
            <View style={{ gap: space.sm }}>
              <Body>
                Remove {d.name}?{" "}
                {d.kids.length ? "They'll need a new code to get back in." : ""}
              </Body>
              <Button
                label="Yes, remove"
                variant="danger"
                onPress={() => remove(d)}
              />
              <Button
                label="Keep it"
                variant="secondary"
                onPress={() => setConfirming(null)}
              />
            </View>
          ) : (
            <Button
              label="Remove"
              variant="secondary"
              onPress={() => setConfirming(d.id)}
            />
          )}
        </Card>
      ))}
    </Screen>
  )
}
