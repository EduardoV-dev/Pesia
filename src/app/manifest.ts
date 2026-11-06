import type { MetadataRoute } from "next"

const THEME_COLOR = "#F97316"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Weight Tracker",
    short_name: "Weight Tracker",
    description: "El pesaje familiar, en privado.",
    start_url: "/home",
    display: "standalone",
    background_color: "#FDE8D4",
    theme_color: THEME_COLOR,
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
}
