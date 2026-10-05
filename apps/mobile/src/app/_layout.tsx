import { AtkinsonHyperlegibleMono_600SemiBold } from "@expo-google-fonts/atkinson-hyperlegible-mono"
import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_700Bold,
} from "@expo-google-fonts/atkinson-hyperlegible-next"
import { Baloo2_700Bold, Baloo2_800ExtraBold } from "@expo-google-fonts/baloo-2"
import { useFonts } from "expo-font"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { SessionProvider, useSession } from "@/lib/session"
import { useColors } from "@/theme"

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_700Bold,
    AtkinsonHyperlegibleMono_600SemiBold,
  })
  return (
    <SessionProvider>
      <StatusBar style="auto" />
      {fontsLoaded ? <Routes /> : null}
    </SessionProvider>
  )
}

/**
 * Three worlds, chosen by who is signed in on this device:
 * signed out → (auth), a parent → (parent), a kid → (kid).
 */
function Routes() {
  const { status, current } = useSession()
  const c = useColors()

  useEffect(() => {
    if (status !== "loading") SplashScreen.hideAsync()
  }, [status])
  if (status === "loading") return null

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Protected guard={status === "signedOut"}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={current?.kind === "parent"}>
        <Stack.Screen name="(parent)" />
      </Stack.Protected>
      <Stack.Protected guard={current?.kind === "kid"}>
        <Stack.Screen name="(kid)" />
      </Stack.Protected>
    </Stack>
  )
}
