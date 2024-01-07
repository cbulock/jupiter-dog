import { useState } from "react";

import * as stylex from "@stylexjs/stylex";
import Facts from "@/components/Facts";
import Image from "@/components/Image";

const styles = stylex.create({
  wrapper: {
    position: "relative",
  },
  imagewrapper: {
    cursor: "url('paw.svg'), auto",
    transition: "transform 0.1s ease",
    ":active": {
      transform: "scale(0.95)",
    },
  },
  image: {
    borderRadius: "50%",
  },
});

export default () => {
  const [showFacts, setShowFacts] = useState(false);

  return (
    <div {...stylex.props(styles.wrapper)}>
      <div
        onClick={() => setShowFacts(!showFacts)}
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
      <Facts isOpen={showFacts} />
    </div>
  );
};
