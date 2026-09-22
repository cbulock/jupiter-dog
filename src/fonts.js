import { DM_Sans, Nunito_Sans, Twinkle_Star } from "next/font/google";

export const bodyFont = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
export const headingFont = Nunito_Sans({ subsets: ["latin"], variable: "--font-heading", display: "swap" });
export const twinkleStar = Twinkle_Star({ subsets: ["latin"], weight: "400", variable: "--font-hand", display: "swap" });
