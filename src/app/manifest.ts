import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CM Operations",
    short_name: "CM Ops",
    description: "Operational task management for Chiang Mai Thai Dining.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F9F6F9",
    theme_color: "#440E48",
    icons: [
      { src: "/logo-new.png", sizes: "any", type: "image/png", purpose: "any" },
      { src: "/logo-new.png", sizes: "any", type: "image/png", purpose: "maskable" },
    ],
  };
}
