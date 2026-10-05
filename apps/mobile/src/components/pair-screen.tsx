import { formatPairCode, parsePairInput } from "@growbucks/core/pairing"
import { CameraView, useCameraPermissions } from "expo-camera"
import { router } from "expo-router"
import { useEffect, useRef, useState } from "react"
import { Pressable, Text, View } from "react-native"
import {
  Body,
  Button,
  Card,
  ErrorText,
  Field,
  Screen,
  Title,
} from "@/components/ui"
import { ApiClientError, call } from "@/lib/api"
import { deviceInfo } from "@/lib/device"
import { successHaptic } from "@/lib/haptics"
import { useSession } from "@/lib/session"
import { fonts, radius, space, useColors } from "@/theme"

/**
 * Kid links this device. Scan the QR on the parent's phone, or type the
 * 8-character code. Also reachable from a link: growbucks://pair/<code>.
 */
export function PairScreen({
  linkCode,
  addingSibling,
}: {
  linkCode?: string
  addingSibling?: boolean
}) {
  const c = useColors()
  const { signIn, current } = useSession()
  const [mode, setMode] = useState<"scan" | "type">("scan")
  const [typed, setTyped] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [permission, requestPermission] = useCameraPermissions()
  const handled = useRef(false)

  const redeem = async (input: string) => {
    const code = parsePairInput(input)
    if (!code) {
      setError(
        "That doesn't look like a GrowBucks code. It has 8 letters and numbers."
      )
      handled.current = false
      return
    }
    setBusy(true)
    setError("")
    try {
      const auth = await call("redeemPairingCode", {
        // Sending an existing kid token puts siblings on the same device.
        token: current?.kind === "kid" ? current.token : null,
        body: { code, device: deviceInfo() },
      })
      successHaptic()
      await signIn(auth) // the root layout switches to the kid screens
      if (addingSibling) router.replace("/")
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "That didn't work.")
      handled.current = false
      setBusy(false)
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once per deep link
  useEffect(() => {
    if (linkCode) redeem(linkCode)
  }, [linkCode])

  return (
    <Screen>
      <Title>{addingSibling ? "Add another kid" : "Link to your family"}</Title>
      <Body muted>
        Ask a parent to open GrowBucks, tap{" "}
        {addingSibling ? "the kid's" : "your"} name, then "Link a device".
      </Body>

      <View
        style={{
          flexDirection: "row",
          gap: space.xs,
          backgroundColor: c.sunken,
          padding: 4,
          borderRadius: radius.md,
        }}
      >
        {(["scan", "type"] as const).map((m) => (
          <Pressable
            key={m}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}
            onPress={() => setMode(m)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: radius.sm,
              backgroundColor: mode === m ? c.surface : "transparent",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodyBold,
                color: mode === m ? c.fg : c.muted,
              }}
            >
              {m === "scan" ? "Scan the code" : "Type the code"}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === "scan" ? (
        permission?.granted ? (
          <View
            style={{
              aspectRatio: 1,
              borderRadius: radius.lg,
              overflow: "hidden",
              backgroundColor: c.sunken,
            }}
          >
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={
                busy
                  ? undefined
                  : ({ data }) => {
                      if (handled.current) return
                      handled.current = true
                      redeem(data)
                    }
              }
            />
          </View>
        ) : (
          <Card tone="sky">
            <Body>
              GrowBucks needs the camera to scan the code on the parent's phone.
            </Body>
            <Button label="Allow camera" onPress={requestPermission} />
            <Button
              label="Type the code instead"
              variant="secondary"
              onPress={() => setMode("type")}
            />
          </Card>
        )
      ) : (
        <>
          <Field
            label="Code from the parent's phone"
            value={typed}
            onChangeText={(t) => {
              const raw = t
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 8)
              setTyped(raw.length > 4 ? formatPairCode(raw) : raw)
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="K7MQ-4XRT"
            style={{
              fontFamily: fonts.num,
              fontSize: 30,
              letterSpacing: 4,
              textAlign: "center",
            }}
            testID="pair-code"
          />
          <Button
            label="Link this device"
            onPress={() => redeem(typed)}
            loading={busy}
            disabled={typed.length < 9}
            testID="pair-submit"
          />
        </>
      )}
      <ErrorText>{error}</ErrorText>
    </Screen>
  )
}
