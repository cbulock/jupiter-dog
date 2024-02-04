import * as stylex from "@stylexjs/stylex";
import Facts from "@/components/Facts";
import Image from "@/components/Image";
import { isShowingFacts, scaleTitlebar } from "@/state";

const styles = stylex.create({
  imagewrapper: {
    cursor: "url('paw.svg'), auto",
    transition: "transform 0.1s ease, filter 0.3s ease",
    ":active": {
      transform: "scale(0.95)",
    },
    ":hover": {
      filter: "drop-shadow(0 0 5px rgba(255, 255, 255, 0.75))",
    },
  },
  image: {
    borderRadius: "50%",
  },
});

export default () => (
  <>
    <div
      onClick={() => (isShowingFacts.value = !isShowingFacts.value)}
      {...stylex.props(styles.imagewrapper)}
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
