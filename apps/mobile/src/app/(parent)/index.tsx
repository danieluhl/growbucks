import type { MeResponse } from "@growbucks/core/api"
import { router, useFocusEffect } from "expo-router"
import { useCallback, useState } from "react"
import { Pressable, Text, View } from "react-native"
import {
  Avatar,
  Body,
  Button,
  Card,
  Heading,
  Screen,
  Title,
} from "@/components/ui"
import { useSession } from "@/lib/session"
import { fonts, space, useColors } from "@/theme"

/** Parent home: the family's kids, and where to link their devices. */
export default function Family() {
  const c = useColors()
  const { current, refresh, signOut } = useSession()
  const [me, setMe] = useState<MeResponse | null>(null)

  useFocusEffect(
    useCallback(() => {
      refresh().then(setMe)
    }, [refresh])
  )

  const kids = me?.kids ?? []
  return (
    <Screen>
      <View style={{ gap: space.xs, paddingTop: space.lg }}>
        <Body muted>{current?.family?.name}</Body>
        <Title>Hi {current?.member.name}</Title>
      </View>

      <Heading>Kids</Heading>
      {kids.length === 0 ? (
        <Card tone="leaf">
          <Body>Add your first kid to plant their garden.</Body>
        </Card>
      ) : (
        kids.map((kid) => (
          <Card key={kid.id}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
              }}
            >
              <Avatar name={kid.name} emoji={kid.avatar} />
              <Text
                style={{
                  flex: 1,
                  fontFamily: fonts.displayBold,
                  fontSize: 22,
                  color: c.fg,
                }}
              >
                {kid.name}
              </Text>
            </View>
            <Button
              label={`Link ${kid.name}'s iPad`}
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: "/link/[kidId]",
                  params: { kidId: kid.id, name: kid.name },
                })
              }
              testID={`link-${kid.name}`}
            />
          </Card>
        ))
      )}
      <Button
        label="Add a kid"
        onPress={() => router.push("/add-kid")}
        testID="add-kid"
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/devices")}
      >
        <Card>
          <Heading>Devices</Heading>
          <Body muted>
            See which phones and iPads are linked, and remove one.
          </Body>
        </Card>
      </Pressable>

      <Button label="Sign out" variant="danger" onPress={() => signOut()} />
    </Screen>
  )
}
