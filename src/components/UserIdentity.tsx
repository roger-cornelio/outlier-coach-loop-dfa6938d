/**
 * UserIdentity - Centralized component for consistent user identification
 * 
 * RULES:
 * 1. Name is PRIMARY identification (when available)
 * 2. Email is SECONDARY identification
 * 3. If no name, email becomes the fallback primary
 * 4. This pattern is used across ALL screens
 */

import { cn } from '@/lib/utils';

export interface UserIdentityData {
  name?: string | null;
  email: string;
}

interface UserIdentityProps {
  user: UserIdentityData;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show only the primary identifier */
  primaryOnly?: boolean;
  /** Additional class for the container */
  className?: string;
  /** Additional class for the primary text */
  primaryClassName?: string;
  /** Additional class for the secondary text */
  secondaryClassName?: string;
  /** Show email even when name exists (inline format) */
  inline?: boolean;
}

/**
 * Helper to get display name with email fallback
 */
export function getDisplayName(user: UserIdentityData): string {
  return user.name?.trim() || user.email;
}

/**
 * Helper to check if user has a real name (not just email)
 */
export function hasName(user: UserIdentityData): boolean {
  return !!user.name?.trim();
}

export function UserIdentity({
  user,
  size = 'md',
  primaryOnly = false,
  className,
  primaryClassName,
  secondaryClassName,
  inline = false,
}: UserIdentityProps) {
  const displayName = getDisplayName(user);
  const showSecondary = !primaryOnly && hasName(user);

  const sizeClasses = {
    sm: {
      primary: 'text-sm font-medium',
      secondary: 'text-xs',
    },
    md: {
      primary: 'text-base font-medium',
      secondary: 'text-sm',
    },
    lg: {
      primary: 'text-lg font-semibold',
      secondary: 'text-sm',
    },
  };

  if (inline && showSecondary) {
    return (
      <span className={cn('inline-flex items-center gap-1.5', className)}>
        <span className={cn(sizeClasses[size].primary, 'text-foreground', primaryClassName)}>
          {displayName}
        </span>
        <span className={cn(sizeClasses[size].secondary, 'text-muted-foreground', secondaryClassName)}>
          ({user.email})
        </span>
      </span>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <span className={cn(sizeClasses[size].primary, 'text-foreground truncate', primaryClassName)}>
        {displayName}
      </span>
      {showSecondary && (
        <span className={cn(sizeClasses[size].secondary, 'text-muted-foreground truncate', secondaryClassName)}>
          {user.email}
        </span>
      )}
    </div>
  );
}

/**
 * Compact version for badges, chips, lists
 */
export function UserIdentityCompact({
  user,
  className,
}: {
  user: UserIdentityData;
  className?: string;
}) {
  return (
    <span className={cn('text-sm text-foreground truncate', className)}>
      {getDisplayName(user)}
    </span>
  );
}
