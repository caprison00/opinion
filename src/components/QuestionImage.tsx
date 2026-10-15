/* eslint-disable @next/next/no-img-element -- 미리 줄여서 올린 이미지라 원본을 그대로 쓴다 */
import type { PickedImage } from "@/lib/images";

// 카드·목록용 작은 이미지 (꾸밈용이라 낭독기에서는 건너뛴다)
export function Thumb({
  image,
  className = "",
}: {
  image: PickedImage;
  className?: string;
}) {
  return (
    <img
      src={image.url}
      alt=""
      loading="lazy"
      className={`shrink-0 bg-fill object-cover ${className}`}
    />
  );
}

// 질문 상세 상단의 큰 이미지 + 출처
export function HeroImage({ image }: { image: PickedImage }) {
  return (
    <figure className="overflow-hidden rounded-[14px] bg-fill">
      <img
        src={image.url}
        alt={image.alt}
        className="aspect-[2/1] w-full object-cover"
      />
      {image.credit && (
        <figcaption className="bg-surface px-3 py-1.5 text-right t-caption-1 text-label-alt">
          사진: {image.credit}
        </figcaption>
      )}
    </figure>
  );
}
