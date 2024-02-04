import * as stylex from "@stylexjs/stylex";

import { isShowingFacts, modalImage } from "@/state";

const styles = stylex.create({
  keyboard: {
    ":focus": {
      outline: "none",
    },
  },
});

const handleKeyDown = (event) => {
  event.preventDefault();

  switch (event.key) {
    case "Escape":
      isShowingFacts.value = false;
      modalImage.value = null;
      break;
  }
};

const KeyboardHandler = ({ children }) => (
  <div
    onKeyDown={handleKeyDown}
    tabIndex={-1}
    {...stylex.props(styles.keyboard)}
  >
    {children}
  </div>
);

export default KeyboardHandler;