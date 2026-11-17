import { z } from "zod";

export const checkoutSchema = z.object({
  /** One per payment, made by the browser; repeats of the same sale carry the same id. */
  clientRequestId: z.uuid({ error: "This payment is missing its id. Close it and try again." }),
  method: z.enum(["cash", "gcash"]),
  /** Centavos handed over by the customer. Ignored for GCash. */
  amountReceived: z.int().min(0).max(10_000_000),
  /** Centavos the till showed. A different server total means a price changed since the menu loaded. */
  expectedTotal: z.int().min(0),
  lines: z
    .array(z.object({ productId: z.string().min(1), quantity: z.int().min(1).max(99) }))
    .min(1, { error: "Add at least one item" })
    .max(50),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
