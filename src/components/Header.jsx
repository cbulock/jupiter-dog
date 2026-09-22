"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Paw from "./Paw";
import styles from "./layout.module.css";

export default function Header() {
  const isFacts = usePathname() === "/facts";
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand} aria-label="Life of Jupiter home">
          <span>Life of</span>{" "}
          <span className={styles.brandName}>Jupiter<span className={styles.brandDot}>.</span></span>
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link href="/" aria-current={!isFacts ? "page" : undefined}>Photos</Link>
          <Link href="/facts" aria-current={isFacts ? "page" : undefined}>Meet Jupiter</Link>
        </nav>
        <Paw />
      </div>
    </header>
  );
}
