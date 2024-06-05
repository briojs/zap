import { createZapFetch } from "./zap.ts";

export * from "./zap";
export * from "./types";

export const $zap = createZapFetch();
