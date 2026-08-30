import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "pin";
  size?: "sm" | "md" | "icon";
};

export function Button({ className, variant = "ghost", size = "md", ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-[opacity,transform,background-color,color] duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:pointer-events-none disabled:opacity-40",
        "active:not-disabled:scale-[0.96]",
        size === "sm" && "h-9 rounded-[8px] px-3 text-sm",
        size === "md" && "h-11 rounded-[12px] px-4 text-sm",
        size === "icon" && "size-11 rounded-[12px]",
        variant === "primary" && "bg-accent text-accent-fg hover:opacity-90",
        variant === "ghost" && "bg-bg-subtle/70 text-fg hover:bg-bg-subtle",
        variant === "outline" && "border border-border bg-transparent text-fg hover:bg-bg-subtle/60",
        variant === "pin" && "bg-pin text-pin-fg hover:opacity-90",
        className,
      )}
      {...props}
    />
  );
}
