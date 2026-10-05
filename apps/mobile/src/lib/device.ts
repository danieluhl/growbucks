import type { DeviceInfo } from "@growbucks/core/api"
import * as Device from "expo-device"
import { Platform } from "react-native"

/** What we tell the server about this phone/iPad when signing in. */
export function deviceInfo(): DeviceInfo {
  const fallback =
    Device.deviceType === Device.DeviceType.TABLET ? "iPad" : "Phone"
  return {
    name: (Device.deviceName ?? Device.modelName ?? fallback).slice(0, 60),
    platform:
      Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web",
    model: Device.modelName?.slice(0, 60),
  }
}

export const isTablet = () => Device.deviceType === Device.DeviceType.TABLET
