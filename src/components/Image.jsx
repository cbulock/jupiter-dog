import styles from './Image.module.css';
import clsx from "clsx";
import { useState, useEffect } from "react";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { decode } from "blurhash";

const isDev = process.env.NODE_ENV === "development";

const imagePath = ({ src, width, height }) => {
  if (isDev) return src;
  return width && height
    ? `/.netlify/images?url=${src}&w=${width}&h=${height}`
    : `/.netlify/images?url=${src}`;
};

const Image = ({
  alt = "",
  blurhash,
  src,
  width,
  height,
  lazyLoad = false,
  style,
}) => {

  const [backgroundImage, setBackgroundImage] = useState(null);
  const [observerRef, intersectionObserverEntry] = useIntersectionObserver({
    threshold: 0,
    rootMargin: "20%",
  });

  useEffect(() => {
    if (!blurhash) return;
    if (!intersectionObserverEntry?.isIntersecting || backgroundImage) return;
    const pixels = decode(blurhash, width, height);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;
    const imageData = ctx.createImageData(width, height);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);

    const imageURL = canvas.toDataURL();
    setBackgroundImage(`url(${imageURL})`);
  }, [backgroundImage, blurhash, width, height, intersectionObserverEntry]);

  const srcSet =
    width && height
      ? `${imagePath({ src, width, height })}, ${imagePath({
          src,
          width: width * 2,
          height: height * 2,
        })} 2x, ${imagePath({ src, width: width * 3, height: height * 3 })} 3x`
      : imagePath({ src });

  return (
    <img
      loading={lazyLoad ? "lazy" : "eager"}
      alt={alt}
      src={imagePath({ src, width, height })}
      srcSet={srcSet}
      width={width}
      height={height}
      style={{ backgroundImage }}
      ref={observerRef}
      className={clsx(styles.image, style)}
    />
  );
};

export default Image;
