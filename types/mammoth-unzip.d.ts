declare module "mammoth/lib/unzip" {
  type DocxArchive = {
    exists(name: string): boolean;
    read(name: string, encoding: "utf8"): Promise<string>;
  };

  export function openZip(input: { buffer: Buffer }): Promise<DocxArchive>;
}
