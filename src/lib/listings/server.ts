import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fallbackPayload } from "./seed";

export const getListings = createServerFn({ method: "GET" })
  .validator(z.object({ includeSale: z.boolean().optional() }))
  .handler(async ({ data }) => {
    const includeSale = true;
    try {
      const { loadPayload } = await import("./load.server");
      return await loadPayload(includeSale);
    } catch (err) {
      console.error("[listings] falling back to last-seen seed", err);
      return fallbackPayload(includeSale);
    }
  });

export const refreshListings = createServerFn({ method: "POST" })
  .validator(z.object({ includeSale: z.boolean().optional() }))
  .handler(async ({ data }) => {
    const includeSale = true;
    try {
      const { refreshThenLoad } = await import("./load.server");
      return await refreshThenLoad(includeSale);
    } catch (err) {
      console.error("[listings] refresh failed", err);
      return fallbackPayload(includeSale);
    }
  });
