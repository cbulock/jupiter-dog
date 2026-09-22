import styles from "./ImageCard.module.scss";
import Image from "./Image";
import { modalImage, photoDate, photoUrl } from "@/state";

export default function ImageCard({ imageData, index, lazyLoad = true }) {
  const { blurhash, width, height, createdDate } = imageData;
  const date = photoDate(createdDate);
  return (
    <button
      type="button" className={styles.card}
      onClick={() => { modalImage.value = imageData; }}
      aria-label={`Open photo ${index + 1} of Jupiter${date ? `, ${date}` : ""}`}
      aria-haspopup="dialog"
    >
      <span className={styles.photo}>
        <Image src={photoUrl(imageData)}
          blurhash={blurhash} width={width} height={height} lazyLoad={lazyLoad}
          sizes="(max-width: 479px) calc(100vw - 56px), (max-width: 700px) 45vw, (max-width: 1000px) 44vw, 30vw"
          alt={`Jupiter${date ? ` on ${date}` : ""}`} />
        <span className={styles.expand} aria-hidden="true">↗</span>
      </span>
      <span className={styles.caption}>
        {date ? <time dateTime={createdDate}>{date}</time> : <span>A moment with Jupiter</span>}
        <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      </span>
    </button>
  );
}
