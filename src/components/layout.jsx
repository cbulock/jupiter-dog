import "@/App.css";
import styles from './layout.module.css';
import JupiterHead from "@/components/JupiterHead";
import Paw from "@/components/Paw";
import Title from "@/components/Title";
import KeyboardHandler from "@/components/KeyboardHandler";
import ScrollHandler from "@/components/ScrollHandler";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
      <ScrollHandler />
      <KeyboardHandler>
        <div id="root">
          <main className={styles.main}>
            <header className={styles.header}>
              <div className={styles.titleContainer}>
                <JupiterHead />
                <Title />
              </div>
              <Paw />
            </header>
            {children}
          </main>
        </div>
        </KeyboardHandler>
      </body>
    </html>
  );
}
