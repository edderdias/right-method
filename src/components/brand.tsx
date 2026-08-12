import logo from "@/assets/metodo-certo-logo.png";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="Método Certo"
      className={cn("h-10 w-10 rounded-xl object-cover", className)}
      loading="lazy"
    />
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark />
      <div className="leading-tight">
        <p className="text-base font-semibold tracking-tight">
          <span className="text-primary">Método</span> <span className="text-info">Certo</span>
        </p>
        <p className="whitespace-nowrap text-[10px] uppercase tracking-widest text-muted-foreground">
          Suas finanças, seu futuro
        </p>
      </div>
    </div>
  );
}
