import { useState, useEffect } from "react";
import { useSignals } from "@preact/signals-react/runtime";
import { useIntersectionObserver } from "@uidotdev/usehooks";

import { imageList } from "@/state";

const ImageLoader = () => {
  useSignals();

  const [isLoading, setIsLoading] = useState(false);
  const [nextPage, setNextPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(true);

  const [observerRef, intersectionObserverEntry] = useIntersectionObserver({
    threshold: 0,
    rootMargin: "30%",
  });

  useEffect(() => {
    const loadImages = async ({ page }) => {
      if (!isLoading && hasMoreResults) {
        setIsLoading(true);
        const response = await fetch(
          `/api/image/list?page=${page}&pageSize=8`
        );
        const data = await response.json();
        imageList.value = [...imageList.value, ...data.data];
        setHasMoreResults(data.hasNextPage);
        setNextPage(page + 1);
        setIsLoading(false);
      }
    };

    if (!intersectionObserverEntry?.isIntersecting) return;
    loadImages({ page: nextPage });
  }, [hasMoreResults, intersectionObserverEntry, isLoading, nextPage]);

  return <div ref={observerRef} />;
};

export default ImageLoader;
