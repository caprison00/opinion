// 질문·이슈 묶음 이미지 (선택). 질문에 없으면 이슈 묶음의 이미지를 쓴다.
export type ImageFields = {
  image_url?: string | null;
  image_credit?: string | null; // 예전에 받던 출처 (지금은 받지도 표시하지도 않는다)
  image_alt?: string | null; // 화면 낭독기용 짧은 설명
};

export type PickedImage = { url: string; credit: string | null; alt: string };

export function pickImage(
  q: ImageFields & { title: string },
  issue?: (ImageFields & { title: string }) | null,
): PickedImage | null {
  for (const src of [q, issue]) {
    if (src?.image_url) {
      return {
        url: src.image_url,
        credit: src.image_credit ?? null,
        alt: src.image_alt || src.title,
      };
    }
  }
  return null;
}
