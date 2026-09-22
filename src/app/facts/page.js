import Link from "next/link";
import Image from "next/image";
import BreedChart from "@/components/BreedChart";
import styles from "./facts.module.css";

export const metadata = {
  title: "Meet Jupiter — Life of Jupiter",
  description: "Meet Jupiter: born June 27, 2018. A little Beagle, a little Chihuahua, and a whole lot of good dog.",
};

export default function Facts() {
  return (
    <div className={styles.facts}>
      <Link href="/" className={styles.back}><span aria-hidden="true">←</span> Back to the camera roll</Link>
      <div className={styles.profile}>
        <div className={styles.portrait}>
          <Image src="/headshot.jpg" alt="Jupiter smiling for his close-up" width={700} height={700} priority sizes="(max-width: 700px) 85vw, 40vw" />
          <span className={styles.annotation}>the face behind the feed.</span>
          <span className={styles.star} aria-hidden="true">✳</span>
        </div>
        <div className={styles.about}>
          <p className={styles.eyebrow}>A FORMAL INTRODUCTION (SORT OF)</p>
          <h1>Meet Jupiter<span>.</span></h1>
          <p className={styles.subtitle}>Big ears. Bigger personality.</p>
          <p className={styles.description}>The very good dog behind this very full camera roll. Here’s a little more about the face you came to see.</p>
          <div className={styles.dates}>
            <div><span className={styles.dateIcon} aria-hidden="true">✳</span><h2>Birthday</h2><time dateTime="2018-06-27">June 27, 2018</time></div>
            <div><span className={styles.dateIcon} aria-hidden="true">♡</span><h2>Gotcha day</h2><time dateTime="2018-09-01">September 1, 2018</time></div>
          </div>
          <section className={styles.breedSection} aria-labelledby="breed-title">
            <div className={styles.breedHeading}><h2 id="breed-title">A little bit of everything.</h2><span>100% Jupiter</span></div>
            <BreedChart />
          </section>
        </div>
      </div>
      <div className={styles.invitation}><span>Enough about me. More pictures?</span><Link href="/">Back to the photos <span aria-hidden="true">↗</span></Link></div>
    </div>
  );
}
