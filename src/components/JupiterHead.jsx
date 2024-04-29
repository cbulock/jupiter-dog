import styles from "./JupiterHead.module.scss";
import { useSignals } from "@preact/signals-react/runtime";
import Facts from "@/components/Facts";
import Image from "@/components/Image";
import { isShowingFacts, scaleTitlebar } from "@/state";

const JupiterHead = () => {
  useSignals();
  return (
    <>
      <div
        onClick={() => (isShowingFacts.value = !isShowingFacts.value)}
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
      <Facts isOpen={isShowingFacts.value} />
    </>
  );
};

export default JupiterHead;
