import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl font-sans',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-medium',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          error:
            'group-[.toast]:border-destructive/30 group-[.toast]:text-destructive group-[.toast]:bg-destructive/10',
          success:
            'group-[.toast]:border-emerald-500/30 group-[.toast]:text-emerald-600 dark:group-[.toast]:text-emerald-400 group-[.toast]:bg-emerald-500/10',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
