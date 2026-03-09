import { cn } from '../../lib/utils';

const variants = {
  default: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  destructive:
    'border-transparent bg-destructive text-white dark:bg-destructive/60',
  outline: 'text-foreground hover:bg-accent hover:text-accent-foreground'
};

export function Badge({ className, variant = 'default', ...props }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-flex items-center  justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
