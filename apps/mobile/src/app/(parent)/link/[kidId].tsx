import type { PairingCodeResponse } from "@growbucks/core/api"
import { router, useLocalSearchParams } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { Text, View } from "react-native"
import QRCode from "react-native-qrcode-svg"
import { Body, Button, Card, ErrorText, Screen, Title } from "@/components/ui"
import { ApiClientError, call } from "@/lib/api"
import { successHaptic } from "@/lib/haptics"
import { useSession } from "@/lib/session"
import { fonts, radius, space, useColors } from "@/theme"

const POLL_MS = 3000

/**
 * Parent shows a one-time code for a kid's iPad. We poll the device list
 * and flip to "Linked!" as soon as a device with this kid shows up.
 */
export default function LinkDevice() {
  const c = useColors()
  const { kidId, name } = useLocalSearchParams<{
    kidId: string
    name: string
  }>()
  const { current } = useSession()
  const [pairing, setPairing] = useState<PairingCodeResponse | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [linkedTo, setLinkedTo] = useState<string | null>(null)
  const [error, setError] = useState("")
  const known = useRef<Set<string> | null>(null)

  const newCode = useCallback(async () => {
    if (!current) return
    setError("")
    try {
      const devices = await call("listDevices", { token: current.token })
      known.current = new Set(
        devices.devices
          .filter((d) => d.kids.some((k) => k.id === kidId))
          .map((d) => d.id)
      )
      setPairing(
        await call("createPairingCode", {
          token: current.token,
          params: { kidId },
          body: {},
        })
      )
    } catch (e) {
      setError(
        e instanceof ApiClientError ? e.message : "Couldn't make a code."
      )
    }
  }, [current, kidId])

  useEffect(() => {
    newCode()
  }, [newCode])

  // Countdown to expiry.
  useEffect(() => {
    if (!pairing) return
    const tick = () =>
      setSecondsLeft(
        Math.max(
          0,
          Math.round((Date.parse(pairing.expiresAt) - Date.now()) / 1000)
        )
      )
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [pairing])

  // Watch for the kid's device to appear.
  useEffect(() => {
    if (!pairing || linkedTo || !current) return
    const t = setInterval(async () => {
      try {
        const { devices } = await call("listDevices", { token: current.token })
        const fresh = devices.find(
          (d) => d.kids.some((k) => k.id === kidId) && !known.current?.has(d.id)
        )
        if (fresh) {
          setLinkedTo(fresh.name)
          successHaptic()
        }
      } catch {
        // keep polling; the code screen still works
      }
    }, POLL_MS)
    return () => clearInterval(t)
  }, [pairing, linkedTo, current, kidId])

  if (linkedTo)
    return (
      <Screen>
        <Title>Linked!</Title>
        <Card tone="leaf">
          <Body>
            {linkedTo} is now {name}'s. {name} can open GrowBucks on it any
            time, no password needed.
          </Body>
        </Card>
        <Button label="Done" onPress={() => router.back()} />
      </Screen>
    )

  const expired = pairing && secondsLeft === 0
  const mm = Math.floor(secondsLeft / 60)
  const ss = String(secondsLeft % 60).padStart(2, "0")

  return (
    <Screen>
      <Title>Link {name}'s iPad</Title>
      <Body muted>
        On {name}'s iPad, open GrowBucks, tap "I'm a kid", then scan this code
        or type it in.
      </Body>
      <Card
        style={{
          alignItems: "center",
          gap: space.lg,
          paddingVertical: space.xl,
        }}
      >
        {pairing && !expired ? (
          <>
            <View
              style={{
                padding: space.md,
                backgroundColor: "#FFFFFF",
                borderRadius: radius.md,
              }}
            >
              <QRCode
                value={pairing.url}
                size={220}
                color="#132419"
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text
              selectable
              testID="pairing-code"
              style={{
                fontFamily: fonts.num,
                fontSize: 36,
                letterSpacing: 4,
                color: c.fg,
              }}
            >
              {pairing.display}
            </Text>
            <Body muted>
              Works once · expires in {mm}:{ss}
            </Body>
          </>
        ) : (
          <Body muted>{expired ? "This code expired." : "Making a code…"}</Body>
        )}
      </Card>
      <ErrorText>{error}</ErrorText>
      <Button
        label={expired ? "Make a new code" : "New code"}
        variant="secondary"
        onPress={newCode}
      />
    </Screen>
  )
}
