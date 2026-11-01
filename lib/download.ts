export function attachmentDisposition(fileName: string, fallback: string) {
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
