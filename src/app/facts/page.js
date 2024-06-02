import clsx from "clsx";
import Layout from "@/components/layout";
import BreedChart from "@/components/BreedChart";
import Image from "@/components/Image";
import styles from "./facts.module.css";
import { merriweatherSans } from "@/fonts";

const Facts = () => {
  return (
    <Layout>
      <div className={clsx(styles.facts, merriweatherSans.className)}>
        <div className={styles.header}>
          <Image
            src={"/headshot.jpg"}
            alt="Jupiter headshot"
            height={150}
            width={150}
          />
          <h1>Meet Jupiter</h1>
        </div>
        <div className={styles.info}>
          <div>
            <h2>Birthday</h2>
            <p>June 27, 2018</p>
          </div>
          <div>
            <h2>Gotcha Day</h2>
            <p>September 1, 2018</p>
          </div>
        </div>
        <div className={styles.breedChart}>
          <h2>Breed Information</h2>
          <BreedChart />
        </div>
      </div>
    </Layout>
  );
};

export default Facts;
