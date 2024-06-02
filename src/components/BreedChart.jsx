"use client";

import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Legend, Tooltip } from "chart.js";

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

const BreedChart = () => <Pie data={breedData} options={breedOptions} />;

export default BreedChart;
