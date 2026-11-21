import { Inter, Sora } from "next/font/google";

/** Display font for landing headings. */
export const landingDisplay = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--rbx-font-display",
  display: "swap",
});

/** Body font for landing copy. */
export const landingBody = Inter({
  subsets: ["latin"],
  variable: "--rbx-font-body",
  display: "swap",
});
