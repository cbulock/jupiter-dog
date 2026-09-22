import { DM_Sans, Nunito_Sans, Twinkle_Star } from "next/font/google";

// Preload the brand fonts, but keep the fallback for this navigation if a slow
// connection misses the initial paint. Late swaps were rewrapping the hero.
export const bodyFont = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "optional" });
export const headingFont = Nunito_Sans({ subsets: ["latin"], variable: "--font-heading", display: "optional" });
export const twinkleStar = Twinkle_Star({ subsets: ["latin"], weight: "400", variable: "--font-hand", display: "optional" });
