declare module "mpd-parser" {
  export function parse(text: string, options?: Record<string, unknown>): any;
  export function addSidxSegmentsToPlaylist(playlist: any, sidx: any, uri: string): void;
}

declare module "mux.js/lib/tools/parse-sidx" {
  const parseSidx: (data: Uint8Array) => unknown;
  export default parseSidx;
}
