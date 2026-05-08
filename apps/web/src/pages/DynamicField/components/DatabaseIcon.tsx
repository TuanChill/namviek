import { Database } from 'lucide-react';
import { getIconByName } from '../constants';

type DatabaseIconProps = {
  icon?: string | null;
  size?: number;
  className?: string;
};

export function DatabaseIcon({ icon, size = 16, className }: DatabaseIconProps) {
  const Icon = icon ? getIconByName(icon) : Database;
  return <Icon size={size} className={className} />;
}
