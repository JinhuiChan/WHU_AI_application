declare module "pdf-parse/lib/pdf-parse.js" {
  type PdfParseResult = {
    numpages: number;
    numrender: number;
    text: string;
  };

  function pdfParse(data: Buffer): Promise<PdfParseResult>;
  export = pdfParse;
}
