import { signal } from "@preact/signals-react";

const imageList = signal([]);
const isShowingFacts = signal(false);
const modalImage = signal(null);
const scaleTitlebar = signal(false);

export { imageList, isShowingFacts, modalImage, scaleTitlebar };
