import styles from "./Facts.module.css";
import { merriweatherSans } from "@/fonts";

import clsx from "clsx";
import { Chart as ChartJS, ArcElement, Legend, Tooltip } from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Legend, Tooltip);

const breedData = {
  labels: ["Beagle", "Chihuahua", "Rat Terrier", "Supermutt"],
  datasets: [
    {
      label: "Breed",
      data: [47, 35, 10, 8],
      backgroundColor: [
        "rgb(255, 99, 132)",
        "rgb(54, 162, 235)",
        "rgb(255, 205, 86)",
        "purple",
      ],
    },
  ],
};

const breedOptions = {
  plugins: {
    legend: {
      labels: {
        color: "#fcab10ff",
      },
    },
    tooltip: {
      callbacks: {
        label: function (context) {
          return ` ${context.formattedValue}%`;
        },
      },
    },
  },
};

const modalClick = (e) => {
  e.stopPropagation();
};

const Facts = ({ isOpen = false, closeModal }) => {
  return (
    <div
      onClick={modalClick}
      className={clsx(styles.modal, isOpen && styles.open)}
    >
      <div className={styles.triangle} />
      <div className={clsx(styles.modalContents, merriweatherSans.className)}>
        <h3 className={styles.header}>Jupiter Facts</h3>
        <ul>
          <li>Born June 27, 2018</li>
          <li>Gotcha Day: Sept 1, 2018</li>
          <li>30 Pounds</li>
        </ul>
        <div className={styles.breedChart}>
          <Pie data={breedData} options={breedOptions} />
        </div>
      </div>
    </div>
  );
};

export default Facts;
