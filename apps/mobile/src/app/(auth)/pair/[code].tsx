import { useLocalSearchParams } from "expo-router"
import { PairScreen } from "@/components/pair-screen"

/** Opened from growbucks://pair/<code> (e.g. the camera app scanning the QR). */
export default function PairFromLink() {
  const { code } = useLocalSearchParams<{ code: string }>()
  return <PairScreen linkCode={code} />
}
