declare module 'color-thief-ts' {
  export type RGB = [number, number, number];

  export default class ColorThief {
    constructor();
    getColor(img: HTMLImageElement): RGB;
    getPalette(img: HTMLImageElement, colorCount?: number): RGB[];
  }
} 