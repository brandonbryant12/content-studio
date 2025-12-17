declare module 'pptx-parser' {
  interface Slide {
    text?: string;
    notes?: string;
  }

  function parse(buffer: Buffer): Promise<Slide[]>;
  export default parse;
}
