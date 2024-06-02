import styles from "./JupiterHead.module.scss";
import Image from "@/components/Image";

const JupiterHead = () => {
  return (
    <a href='/facts'>
      <div
        className={styles.imagewrapper}
      >
        <Image
          alt="Jupiter face"
          src={"/jupiter.png"}
          width={64}
          height={64}
          style={styles.image}
        />
      </div>
    </a>
  );
};

export default JupiterHead;
