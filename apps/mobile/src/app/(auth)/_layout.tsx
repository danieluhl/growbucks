import { Stack } from "expo-router"
import { useColors } from "@/theme"

export default function AuthLayout() {
  const c = useColors()
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
    </Stack>
  )
}
