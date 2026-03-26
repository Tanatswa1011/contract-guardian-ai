import logoFull from '@/assets/logo-full.png';

interface LogoFullProps {
  className?: string;
  imgClassName?: string;
}

export function LogoFull({ className = '', imgClassName = 'h-8' }: LogoFullProps) {
  return (
    <span className={`flex items-center ${className}`}>
      <img src={logoFull} alt="ContractGuard AI" className={`${imgClassName} w-auto`} />
    </span>
  );
}

export function LogoIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <img src={logoFull} alt="ContractGuard AI" className={`${className} object-contain`} />
  );
}
