import * as stylex from "@stylexjs/stylex";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip);

const breedData = {
  labels: ["Beagle", "Chihuahua", "Rat Terrier", "Supermutt"],
  datasets: [
    {
      label: "Breed",
      data: [47.2, 34.8, 9.8, 8.2],
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
    tooltip: {
      callbacks: {
        label: function (context) {
          return `${context.formattedValue}%`;
        },
      },
    },
  },
};

const styles = stylex.create({
  modal: {
    display: "none",
    position: "absolute",
    top: 75,
    left: 75,
    zIndex: 500,
    padding: 32,
    background: "var(--raspberry)",
    fontSize: "2rem",
    borderRadius: "12px",
    boxShadow: "5px 5px 30px 0px rgba(0,0,0,0.75)",
  },
  open: {
    display: "block",
  },
  modalContents: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    height: "100%",
    width: "calc(90vw - 150px)",
    fontFamily: "Merriweather Sans, sans-serif",
    color: "var(--secondary-color)",
  },
  triangle: {
    position: "absolute",
    top: "-20px",
    left: "-10px",
    transform: "rotate(320deg)",
    width: 0,
    height: 0,
    "border-left": "15px solid transparent", // this seems like a styleX bug, can't used borderLeft
    borderRight: "15px solid transparent",
    borderBottom: "40px solid var(--raspberry)",
  },
  header: {
    fontWeight: 800,
  },
});

const modalClick = (e) => {
  e.stopPropagation();
};

export default ({ isOpen = false, closeModal }) => {
  return (
    <div
      onClick={modalClick}
      {...stylex.props(styles.modal, isOpen && styles.open)}
    >
      <div {...stylex.props(styles.triangle)} />
      <div {...stylex.props(styles.modalContents)}>
        <h3 {...stylex.props(styles.header)}>Jupiter Facts</h3>
        <ul>
          <li>Born June 27, 2018</li>
          <li>30 Pounds</li>
          <li>Gotcha Day: Sept 1, 2018</li>
          <li>Breed</li>
        </ul>
        <Pie data={breedData} options={breedOptions} />
      </div>
    </div>
  );
};
