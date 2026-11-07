declare module "pdf-parse/lib/pdf-parse.js" {
  type PdfParseResult = {
    numpages: number;
    numrender: number;
    text: string;
  };

  type PdfPage = {
    pageNumber: number;
    getTextContent(options?: { normalizeWhitespace?: boolean; disableCombineTextItems?: boolean }): Promise<{
      items: { str: string; transform?: number[] }[];
    }>;
  };

  function pdfParse(data: Buffer, options?: { pagerender?: (page: PdfPage) => Promise<string> }): Promise<PdfParseResult>;
  export = pdfParse;
}
