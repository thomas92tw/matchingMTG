
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'font-semibold rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors duration-150';
  
  const variantStyles = {
    primary: 'bg-gray-700 text-white hover:bg-gray-600 focus-visible:outline-gray-700 disabled:bg-gray-400',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus-visible:outline-gray-400 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600 disabled:bg-red-300',
    warning: 'bg-yellow-500 text-black hover:bg-yellow-400 focus-visible:outline-yellow-500 disabled:bg-yellow-300 disabled:text-yellow-700',
    success: 'bg-green-600 text-white hover:bg-green-500 focus-visible:outline-green-600 disabled:bg-green-300 disabled:text-green-100',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
