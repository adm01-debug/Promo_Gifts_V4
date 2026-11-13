export interface ProductCardSkeletonProps {
  variant?: 'compact' | 'default' | 'detailed';
  className?: string;
  animate?: boolean;
  hideCategoryBadges?: boolean;
  selectionMode?: boolean;
}

export interface MockupSkeletonProps {
  variant?: 'card' | 'config' | 'editor' | 'preview' | 'result' | 'wizard';
  className?: string;
  delay?: number;
}
