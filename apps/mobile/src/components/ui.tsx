import type { ReactNode } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  type StyleProp,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { tapHaptic } from "@/lib/haptics"
import { fonts, MAX_CONTENT_WIDTH, radius, space, useColors } from "@/theme"

/** Scrollable page with a centered column (iPad) and safe-area padding. */
export function Screen({
  children,
  scroll = true,
}: {
  children: ReactNode
  scroll?: boolean
}) {
  const c = useColors()
  const column: ViewStyle = {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
    gap: space.lg,
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={column}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[column, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  )
}

export function Title({ children }: { children: ReactNode }) {
  const c = useColors()
  return (
    <Text
      accessibilityRole="header"
      style={{
        fontFamily: fonts.display,
        fontSize: 34,
        // No fixed lineHeight: Baloo 2's tall ascenders get clipped on iOS
        // when the line is shorter than the font's own metrics.
        color: c.leaf,
      }}
    >
      {children}
    </Text>
  )
}

export function Heading({ children }: { children: ReactNode }) {
  const c = useColors()
  return (
    <Text
      accessibilityRole="header"
      style={{ fontFamily: fonts.displayBold, fontSize: 22, color: c.fg }}
    >
      {children}
    </Text>
  )
}

export function Body({
  children,
  muted,
  style,
}: {
  children: ReactNode
  muted?: boolean
  style?: StyleProp<TextStyle>
}) {
  const c = useColors()
  return (
    <Text
      style={[
        {
          fontFamily: fonts.body,
          fontSize: 17,
          lineHeight: 24,
          color: muted ? c.muted : c.fg,
        },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

export function Num({
  children,
  size = 17,
  color,
}: {
  children: ReactNode
  size?: number
  color?: string
}) {
  const c = useColors()
  return (
    <Text
      style={{
        fontFamily: fonts.num,
        fontSize: size,
        color: color ?? c.fg,
        fontVariant: ["tabular-nums"],
      }}
    >
      {children}
    </Text>
  )
}

export function Card({
  children,
  tone = "surface",
  style,
}: {
  children: ReactNode
  tone?: "surface" | "leaf" | "sun" | "sky"
  style?: StyleProp<ViewStyle>
}) {
  const c = useColors()
  const bg = {
    surface: c.surface,
    leaf: c.leafSoft,
    sun: c.sunSoft,
    sky: c.skySoft,
  }[tone]
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius.lg,
          borderWidth: tone === "surface" ? 1 : 0,
          borderColor: c.line,
          padding: space.lg,
          gap: space.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  testID,
}: {
  label: string
  onPress: () => void
  variant?: "primary" | "secondary" | "danger"
  loading?: boolean
  disabled?: boolean
  testID?: string
}) {
  const c = useColors()
  const bg = { primary: c.leaf, secondary: c.surface, danger: c.berrySoft }[
    variant
  ]
  const fg = { primary: c.onLeaf, secondary: c.fg, danger: c.berry }[variant]
  const off = disabled || loading
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={() => {
        tapHaptic()
        onPress()
      }}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderRadius: radius.md,
        borderWidth: variant === "secondary" ? 1 : 0,
        borderColor: c.line,
        paddingVertical: 15,
        paddingHorizontal: space.lg,
        alignItems: "center",
        opacity: off ? 0.5 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: fg }}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}

export function Field({
  label,
  hint,
  ...input
}: TextInputProps & { label: string; hint?: string }) {
  const c = useColors()
  return (
    <View style={{ gap: space.xs }}>
      <Text
        style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: c.muted }}
      >
        {label}
      </Text>
      <TextInput
        placeholderTextColor={c.muted}
        {...input}
        style={[
          {
            fontFamily: fonts.body,
            fontSize: 19,
            color: c.fg,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: radius.md,
            paddingHorizontal: space.md,
            paddingVertical: 13,
          },
          input.style,
        ]}
      />
      {hint ? (
        <Body muted style={{ fontSize: 14 }}>
          {hint}
        </Body>
      ) : null}
    </View>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  const c = useColors()
  if (!children) return null
  return (
    <Text
      accessibilityRole="alert"
      style={{ fontFamily: fonts.body, fontSize: 15, color: c.berry }}
    >
      {children}
    </Text>
  )
}

export function Avatar({
  name,
  emoji,
}: {
  name: string
  emoji?: string | null
}) {
  const c = useColors()
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: c.leafSoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: fonts.display, fontSize: 20, color: c.leaf }}>
        {emoji || name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  )
}
