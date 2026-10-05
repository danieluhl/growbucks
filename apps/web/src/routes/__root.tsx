/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import type { ReactNode } from "react"
import { DefaultCatchBoundary } from "@/components/default-catch-boundary"
import { NotFound } from "@/components/not-found"
import appCss from "@/styles/app.css?url"

// Follow the OS light/dark setting before first paint (no flash).
const themeScript = `(() => {
  const m = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => document.documentElement.classList.toggle("dark", m.matches);
  apply();
  m.addEventListener("change", apply);
})()`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GrowBucks" },
      {
        name: "description",
        content:
          "GrowBucks teaches kids (and parents) the power of compound interest.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;600&family=Atkinson+Hyperlegible+Next:wght@400;600;700&family=Baloo+2:wght@600;700;800&display=swap",
      },
    ],
    scripts: [{ children: themeScript }],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
  component: () => <Outlet />,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}
