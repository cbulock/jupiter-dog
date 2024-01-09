import { signal } from "@preact/signals-react";

const isShowingFacts = signal(false);
const modalImage = signal(null);

export { isShowingFacts, modalImage };
