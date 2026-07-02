import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "border-tag-neutral-border bg-tag-neutral-bg text-tag-neutral-text [a]:hover:bg-tag-neutral-bg/80",
        secondary:
          "border-tag-neutral-border bg-tag-neutral-bg text-tag-neutral-text [a]:hover:bg-tag-neutral-bg/80",
        destructive:
          "border-tag-red-border bg-tag-red-bg text-tag-red-text focus-visible:ring-tag-red-border/40 [a]:hover:bg-tag-red-bg/80",
        outline:
          "border-tag-neutral-border bg-transparent text-tag-neutral-text [a]:hover:bg-tag-neutral-bg/50",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-tag-neutral-bg/50 hover:text-tag-neutral-text",
        link: "border-transparent bg-transparent text-tag-red-text underline-offset-4 hover:underline",
        "chip-neutral":
          "border-tag-neutral-border bg-tag-neutral-bg text-tag-neutral-text",
        "chip-red":
          "border-tag-red-border bg-tag-red-bg text-tag-red-text",
        "chip-gold":
          "border-tag-gold-border bg-tag-gold-bg text-tag-gold-text",
        "chip-green":
          "border-tag-green-border bg-tag-green-bg text-tag-green-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
