import { Redirect, Stack, useSegments } from "expo-router"
import { useSession } from "@/lib/session"
import { useColors } from "@/theme"

export default function ParentLayout() {
  const c = useColors()
  const { current } = useSession()
  const segments = useSegments()
  // A new parent has to create their family before anything else.
  if (!current?.family && segments.at(-1) !== "create-family")
    return <Redirect href="/create-family" />
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerTitle: "",
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: c.leaf,
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="create-family" options={{ headerShown: false }} />
    </Stack>
  )
}
