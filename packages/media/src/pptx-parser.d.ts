declare module 'pptx-parser' {
  interface ParseResult {
    text: string;
    slides: Array<{
      text: string;
    }>;
  }

  export default function parsePptx(buffer: Buffer): Promise<ParseResult>;
}
