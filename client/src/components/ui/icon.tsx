import React from 'react';
import { Icon as IconifyIcon } from '@iconify/react';

interface IconProps {
  icon: string;
  className?: string;
  size?: number;
  color?: string;
  onClick?: () => void;
}

export const Icon: React.FC<IconProps> = ({ 
  icon, 
  className = '', 
  size = 24, 
  color,
  onClick 
}) => {
  return (
    <IconifyIcon
      icon={icon}
      className={className}
      width={size}
      height={size}
      color={color}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    />
  );
};
