import Home from "@/components/Home";
import ImageModal from "@/components/ImageModal";
import KeyboardHandler from "@/components/KeyboardHandler";
import ScrollHandler from "@/components/ScrollHandler";

import "./App.css";

export default () => (
  <KeyboardHandler>
    <ScrollHandler />
    <Home />
    <ImageModal />
  </KeyboardHandler>
);
