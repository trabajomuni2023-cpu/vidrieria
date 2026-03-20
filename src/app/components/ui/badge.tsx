import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-gray-200 bg-gray-100 text-gray-700",
        secondary: "border-gray-200 bg-gray-100 text-gray-700",
        destructive: "border-red-200 bg-red-100 text-red-700",
        outline: "border-gray-300 bg-white text-gray-700",
        success: "border-green-200 bg-green-100 text-green-700",
        warning: "border-amber-200 bg-amber-100 text-amber-700",
        danger: "border-red-200 bg-red-100 text-red-700",
        info: "border-[color:var(--brand-100)] bg-[var(--brand-100)] text-[var(--brand-700)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
