import {
  DEFAULT_BOOST_X100,
  DEFAULT_CADENCE,
  DEFAULT_MAX_RATE_PPM,
  DEFAULT_MIN_RATE_PPM,
  formatRatePpm,
} from "@growbucks/core/growth"
import { router } from "expo-router"
import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { Body, Button, ErrorText, Field, Screen, Title } from "@/components/ui"
import { ApiClientError, call } from "@/lib/api"
import { useSession } from "@/lib/session"
import { fonts, radius, space, useColors } from "@/theme"

const AVATARS = ["🌱", "🦊", "🐢", "🦄", "🐙", "🚀", "⚽️", "🎨"]
const DAYS = ["S", "M", "T", "W", "T", "F", "S"]

export default function AddKid() {
  const c = useColors()
  const { current } = useSession()
  const [name, setName] = useState("")
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [allowance, setAllowance] = useState("5.00")
  const [payday, setPayday] = useState(6)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const cents = Math.round(Number.parseFloat(allowance || "0") * 100)

  const add = async () => {
    if (!current) return
    setBusy(true)
    setError("")
    try {
      const { kid } = await call("addKid", {
        token: current.token,
        body: {
          name: name.trim(),
          avatar,
          rules: {
            cadence: DEFAULT_CADENCE,
            minRatePpm: DEFAULT_MIN_RATE_PPM,
            maxRatePpm: DEFAULT_MAX_RATE_PPM,
            boostX100: DEFAULT_BOOST_X100,
            weeklyAllowanceCents: Number.isFinite(cents) ? cents : 0,
            payday,
          },
        },
      })
      router.replace({
        pathname: "/link/[kidId]",
        params: { kidId: kid.id, name: kid.name },
      })
    } catch (e) {
      setError(
        e instanceof ApiClientError ? e.message : "Couldn't add the kid."
      )
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Title>Add a kid</Title>
      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Maya"
        testID="kid-name"
      />
      <View style={{ gap: space.xs }}>
        <Body muted>Picture</Body>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {AVATARS.map((a) => (
            <Pressable
              key={a}
              accessibilityRole="radio"
              accessibilityState={{ selected: a === avatar }}
              onPress={() => setAvatar(a)}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: a === avatar ? c.leafSoft : c.surface,
                borderWidth: 2,
                borderColor: a === avatar ? c.leaf : c.line,
              }}
            >
              <Text style={{ fontSize: 26 }}>{a}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Field
        label="Weekly allowance ($)"
        value={allowance}
        onChangeText={setAllowance}
        keyboardType="decimal-pad"
      />
      <View style={{ gap: space.xs }}>
        <Body muted>Payday</Body>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {DAYS.map((d, i) => (
            <Pressable
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed weekday list
              key={i}
              accessibilityRole="radio"
              accessibilityState={{ selected: i === payday }}
              onPress={() => setPayday(i)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: radius.sm,
                alignItems: "center",
                backgroundColor: i === payday ? c.leaf : c.sunken,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodyBold,
                  color: i === payday ? c.onLeaf : c.muted,
                }}
              >
                {d}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Body muted style={{ fontSize: 15 }}>
        Interest starts at {formatRatePpm(DEFAULT_MIN_RATE_PPM)}–
        {formatRatePpm(DEFAULT_MAX_RATE_PPM)} a day, compounded daily. You can
        change this and add tasks later.
      </Body>
      <ErrorText>{error}</ErrorText>
      <Button
        label="Add kid"
        onPress={add}
        loading={busy}
        disabled={!name.trim()}
        testID="add-kid-submit"
      />
    </Screen>
  )
}
