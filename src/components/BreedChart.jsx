import styles from "./BreedChart.module.css";

const breeds = [
  { name: "Beagle", percent: 47, color: "var(--teal)" },
  { name: "Chihuahua", percent: 35, color: "var(--orange)" },
  { name: "Rat Terrier", percent: 10, color: "#a88835" },
  { name: "Supermutt", percent: 8, color: "#84768c" },
];

export default function BreedChart() {
  return (
    <ul className={styles.breeds}>
      {breeds.map(({ name, percent, color }) => (
        <li key={name}>
          <div className={styles.label}><span>{name}</span><strong>{percent}%</strong></div>
          <div className={styles.track} aria-hidden="true"><span style={{ width: `${percent}%`, background: color }} /></div>
        </li>
      ))}
    </ul>
  );
}
