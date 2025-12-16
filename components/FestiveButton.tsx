import React from 'react';

interface FestiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'disabled';
  shake?: boolean;
}

export const FestiveButton: React.FC<FestiveButtonProps> = ({ 
  children, 
  variant = 'primary', 
  shake = false,
  className = '',
  ...props 
}) => {
  const baseStyle = "font-christmas font-bold text-2xl px-8 py-4 rounded-full border-4 shadow-[0_8px_0_rgba(0,0,0,0.3)] transition-all active:shadow-none active:translate-y-2 uppercase tracking-wider relative overflow-hidden group";
  
  const variants = {
    primary: "bg-santa-red border-gold text-white hover:bg-red-600",
    secondary: "bg-pine border-white text-white hover:bg-pine-light",
    disabled: "bg-gray-400 border-gray-600 text-gray-200 cursor-not-allowed shadow-none"
  };

  return (
    <button 
      className={`
        ${baseStyle} 
        ${variants[variant]} 
        ${shake ? 'animate-wiggle' : ''} 
        ${className}
      `}
      {...props}
    >
      {/* Gloss effect */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-white opacity-20 rounded-t-full pointer-events-none"></div>
      
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
};
