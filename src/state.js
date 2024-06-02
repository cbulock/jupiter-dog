import { signal } from "@preact/signals-react";

const imageList = signal([]);
const modalImage = signal(null);
const scaleTitlebar = signal(false);

export { imageList, modalImage, scaleTitlebar };
