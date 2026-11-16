declare module "pdf-parse/lib/pdf-parse.js" {
  type PdfParseResult = {
    numpages: number;
    numrender: number;
    text: string;
  };

  type PdfPage = {
    pageNumber: number;
    getOperatorList(): Promise<{ fnArray: number[] }>;
    getTextContent(options?: { normalizeWhitespace?: boolean; disableCombineTextItems?: boolean }): Promise<{
      items: { str: string; transform?: number[]; width?: number; height?: number }[];
    }>;
  };

  function pdfParse(data: Buffer | Uint8Array, options?: { pagerender?: (page: PdfPage) => Promise<string> }): Promise<PdfParseResult>;
  export = pdfParse;
}
