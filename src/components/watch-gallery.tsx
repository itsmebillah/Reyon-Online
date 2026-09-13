"use client";
import Image from "next/image";
import { useState } from "react";
export function WatchGallery({
  images,
}: {
  images: readonly { src: string; alt: string }[];
}) {
  const [index, setIndex] = useState(0);
  const current = images[index];
  if (!current) return null;
  return (
    <div className="watch-gallery">
      <div className="watch-gallery-main">
        <Image
          src={current.src}
          alt={current.alt}
          fill
          priority
          sizes="(max-width:800px) 100vw, 50vw"
        />
      </div>
      {images.length > 1 && (
        <div className="watch-thumbnails">
          {images.map((im, i) => (
            <button
              key={im.src + i}
              aria-label={"View image " + (i + 1)}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
            >
              <Image src={im.src} alt={im.alt} width={80} height={80} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
