import type { Metadata, Viewport } from "next"
import { Hanken_Grotesk, Manrope } from "next/font/google"

import "./globals.css"

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
})

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
})

const THEME_COLOR = "#F97316"

export const metadata: Metadata = {
  title: "Weight Tracker",
  description: "El pesaje familiar, en privado.",
}

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

const themeScript = `
try {
  const storedTheme = localStorage.getItem("weight-tracker-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (storedTheme === "dark" || (!storedTheme && prefersDark)) {
    document.documentElement.classList.add("dark");
  }
} catch {}
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`${hankenGrotesk.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col">{children}</div>
      </body>
    </html>
  )
}
