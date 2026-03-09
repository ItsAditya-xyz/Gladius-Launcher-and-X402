import * as React from "react";
import { cn } from "../../lib/utils";

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors",
      variant === "secondary" && "bg-secondary text-secondary-foreground",
      variant === "outline" && "border-border text-foreground",
      variant === "destructive" && "bg-destructive text-destructive-foreground",
      variant === "default" && "bg-primary text-primary-foreground",
      className
    )}
    {...props}
  />
));
Badge.displayName = "Badge";

export { Badge };
