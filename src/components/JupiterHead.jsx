import * as stylex from "@stylexjs/stylex";
import Image from "@/components/Image";

const styles = stylex.create({
  wrapper: {
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

const handleClick = () => {};

export default () => {
  return (
    <div onClick={handleClick} {...stylex.props(styles.wrapper)}>
      <Image src={"/jupiter.png"} width={64} height={64} style={styles.image} />
    </div>
  );
};
