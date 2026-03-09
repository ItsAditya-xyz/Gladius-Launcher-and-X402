import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md cursor-pointer text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive';

const variants = {
  default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
  destructive:
    'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
  outline:
    'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
  secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
  link: 'text-primary underline-offset-4 hover:underline'
};

const sizes = {
  default: 'h-9 px-4 py-2 has-[>svg]:px-3',
  sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
  lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
  icon: 'size-9'
};

function Spinner() {
  return (
    <span className="inline-flex size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

export function Button({
  className = '',
  variant = 'default',
  size = 'default',
  type = 'button',
  loading = false,
  asChild = false,
  children,
  ...props
}) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      type={asChild ? undefined : type}
      data-slot="button"
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], loading && 'relative', className)}
      {...props}
    >
      {loading ? (
        <>
          <span className={cn({ 'opacity-0': loading })}>{children}</span>
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Spinner />
          </span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
