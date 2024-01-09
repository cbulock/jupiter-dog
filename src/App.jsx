import Home from "@/components/Home";
import ImageModal from "@/components/ImageModal";
import KeyboardHandler from "@/components/KeyboardHandler";

import "./App.css";

export default () => (
  <KeyboardHandler>
    <Home />
    <ImageModal />
  </KeyboardHandler>
);
