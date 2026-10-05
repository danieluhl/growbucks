import { router, useFocusEffect } from "expo-router"
import { useCallback } from "react"
import { Pressable, Text, View } from "react-native"
import { Avatar, Body, Card, Screen, Title } from "@/components/ui"
import { useSession } from "@/lib/session"
import { fonts, radius, space, useColors } from "@/theme"

/**
 * Kid home. The garden (balance, made-today counter, tasks) lands here in
 * the next milestone; for now it confirms the device is linked and lets
 * siblings on a shared iPad switch.
 */
export default function Garden() {
  const c = useColors()
  const { current, all, switchTo, refresh } = useSession()

  // Picks up a revoked device (parent removed it) on every visit.
  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  const kids = all.filter((s) => s.kind === "kid")
  return (
    <Screen>
      {kids.length > 1 ? (
        <View
          style={{ flexDirection: "row", gap: space.sm, paddingTop: space.md }}
        >
          {kids.map((k) => {
            const on = k.member.id === current?.member.id
            return (
              <Pressable
                key={k.member.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => switchTo(k.member.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.sm,
                  paddingVertical: 6,
                  paddingRight: 14,
                  paddingLeft: 6,
                  borderRadius: radius.pill,
                  backgroundColor: on ? c.leafSoft : c.surface,
                  borderWidth: 1,
                  borderColor: on ? c.leaf : c.line,
                }}
              >
                <Avatar name={k.member.name} emoji={k.member.avatar} />
                <Text
                  style={{
                    fontFamily: fonts.bodyBold,
                    color: on ? c.leaf : c.fg,
                  }}
                >
                  {k.member.name}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}

      <View style={{ gap: space.xs, paddingTop: space.lg }}>
        <Body muted>{current?.family?.name}</Body>
        <Title>
          Hi {current?.member.name} {current?.member.avatar ?? ""}
        </Title>
      </View>
      <Card tone="leaf">
        <Body>
          This iPad is linked. Your garden is being planted: soon you'll see
          your money grow here, every single day.
        </Body>
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/add-sibling")}
      >
        <Body muted style={{ fontSize: 15, textDecorationLine: "underline" }}>
          Share this iPad with a brother or sister
        </Body>
      </Pressable>
    </Screen>
  )
}
