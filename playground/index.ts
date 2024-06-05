import { createZapFetch } from "../src/zap.ts";

const $zap = createZapFetch({
  timeout: 5000,
});

const ctx = await $zap.get<{ message: string }>("http://localhost:3000", {});
