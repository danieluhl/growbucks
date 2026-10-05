import { router } from "expo-router"
import { Text, View } from "react-native"
import { Body, Button, Card, Screen, Title } from "@/components/ui"
import { isTablet } from "@/lib/device"
import { fonts, space, useColors } from "@/theme"

/** First launch: who's using this device? */
export default function Welcome() {
  const c = useColors()
  const tablet = isTablet()
  const kid = (
    <Card tone="leaf">
      <Text
        style={{ fontFamily: fonts.displayBold, fontSize: 24, color: c.leaf }}
      >
        I'm a kid
      </Text>
      <Body>
        Link this {tablet ? "iPad" : "device"} to your family with the code on a
        parent's phone.
      </Body>
      <Button
        label="Link with a code"
        onPress={() => router.push("/pair")}
        testID="welcome-kid"
      />
    </Card>
  )
  const parent = (
    <Card>
      <Text
        style={{ fontFamily: fonts.displayBold, fontSize: 24, color: c.fg }}
      >
        I'm a parent
      </Text>
      <Body>Set up your family, add your kids and set the rules.</Body>
      <Button
        label="Sign in with email"
        variant="secondary"
        onPress={() => router.push("/parent-email")}
        testID="welcome-parent"
      />
    </Card>
  )
  return (
    <Screen>
      <View style={{ gap: space.sm, paddingTop: space.xxl }}>
        <Title>Plant a dollar. Watch it grow.</Title>
        <Body muted>Who's using this {tablet ? "iPad" : "phone"}?</Body>
      </View>
      {/* On an iPad a kid is the likely user, so lead with the kid path. */}
      {tablet ? kid : parent}
      {tablet ? parent : kid}
    </Screen>
  )
}
