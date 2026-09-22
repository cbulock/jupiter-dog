import "@/App.css";
import styles from "@/components/layout.module.css";
import Header from "@/components/Header";
import { bodyFont, headingFont, twinkleStar } from "@/fonts";
import Link from "next/link";

export const metadata = {
  title: "Life of Jupiter",
  description: "A very good dog. A very full camera roll. Photos from the life of Jupiter.",
  manifest: "/site.webmanifest",
};

export const viewport = { themeColor: "#fff8ec" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable} ${twinkleStar.variable}`}>
      <body>
        <a href="#main" className={styles.skipLink}>Skip to photos and content</a>
        <Header />
        <main id="main" className={styles.main}>{children}</main>
        <footer className={styles.footer}>
          <Link href="/">Life of Jupiter<span aria-hidden="true"> ✳</span></Link>
          <span>A little corner of the internet. A whole lot of dog.</span>
          <span className={styles.footerNote}>Made with love (&amp; dog hair).</span>
        </footer>
      </body>
    </html>
  );
}
