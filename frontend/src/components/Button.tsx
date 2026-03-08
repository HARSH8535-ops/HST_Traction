import React, { useRef } from 'react';
import anime from 'animejs';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'action';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  loading, 
  className = '', 
  ...props 
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || props.disabled) return;
    
    anime({
      targets: btnRef.current,
      scale: [1, 0.98, 1],
      duration: 200,
      easing: 'easeOutQuart'
    });

    if (props.onClick) props.onClick(e);
  };

  const baseStyles = "px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed text-[13px] tracking-tight-linear select-none";
  
  const variants = {
    primary: "bg-white text-black hover:bg-[#E5E5E5] shadow-[0_1px_2px_rgba(0,0,0,0.1)]",
    secondary: "bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20",
    action: "bg-white text-black hover:bg-[#E5E5E5] shadow-[0_10px_20px_rgba(255,255,255,0.05)]",
    ghost: "bg-transparent text-[#8A8A8E] hover:text-white hover:bg-white/5",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
  };

  return (
    <button 
      ref={btnRef}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : children}
    </button>
  );
};