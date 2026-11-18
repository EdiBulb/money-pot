// 그림 갈아 끼우기.
// 이 폴더에 정해진 이름의 이미지(png, webp, jpg, svg)를 넣으면 코드를 고치지 않아도
// 코드로 그린 임시 그림 대신 그 이미지가 쓰인다. 이름과 크기는 README의 "Artwork" 참고.
//
//   money-100, money-500, money-1000, money-5000, money-10000, money-50000   돈
//   pot, bed, farm                                              화분, 텃밭, 농장 (위에서 비스듬히 본 사진)
//   veranda                                                     배경
//   tank, worker                                                상점 그림

const files = import.meta.glob<string>('./*.{png,webp,jpg,jpeg,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const byName = new Map(
  Object.entries(files).map(([path, url]) => [path.replace(/^\.\//, '').replace(/\.[^.]+$/, ''), url]),
)

export type ArtName =
  | `money-${100 | 500 | 1000 | 5000 | 10000 | 50000}`
  | 'pot'
  | 'bed'
  | 'farm'
  | 'veranda'
  | 'tank'
  | 'worker'

/** 넣어 둔 이미지의 주소. 없으면 undefined(코드로 그린 그림을 쓴다). */
export const art = (name: ArtName): string | undefined => byName.get(name)
