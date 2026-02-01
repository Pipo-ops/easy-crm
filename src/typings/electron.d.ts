export {};

declare global {
  interface Window {
    desktop?: {
      printHtml: (html: string, options?: any) => Promise<boolean>;
    };
  }
}