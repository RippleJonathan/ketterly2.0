/**
 * UI Design Constants
 * 
 * Design Philosophy:
 * - Mobile-first responsive design
 * - Clean, modern aesthetics
 * - Smooth animations and transitions
 * - Accessible color contrasts
 * - Touch-friendly tap targets (min 44x44px)
 */

export const DESIGN_TOKENS = {
  // Spacing
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem',  // 8px
    md: '1rem',    // 16px
    lg: '1.5rem',  // 24px
    xl: '2rem',    // 32px
    '2xl': '3rem', // 48px
  },

  // Border Radius
  radius: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px',
  },

  // Breakpoints (mobile-first)
  breakpoints: {
    sm: '640px',   // Small tablets
    md: '768px',   // Tablets
    lg: '1024px',  // Laptops
    xl: '1280px',  // Desktops
    '2xl': '1536px', // Large desktops
  },

  // Transitions
  transitions: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
}

export const MOBILE_DESIGN_GUIDELINES = {
  // Minimum tap target size for touch devices
  minTapTarget: '44px',
  
  // Recommended padding for mobile containers
  mobilePadding: '1rem', // 16px
  
  // Mobile menu breakpoint
  mobileBreakpoint: '1024px', // lg
  
  // Touch-friendly spacing between interactive elements
  touchSpacing: '0.75rem', // 12px
}

export const RESPONSIVE_PATTERNS = {
  // Grid columns by breakpoint
  grid: {
    mobile: 1,
    tablet: 2,
    desktop: 4,
  },

  // Container max widths
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },

  // Font sizes (responsive scaling)
  fontSize: {
    heading: {
      mobile: '1.5rem',   // 24px
      tablet: '2rem',     // 32px
      desktop: '2.5rem',  // 40px
    },
    body: {
      mobile: '0.875rem', // 14px
      desktop: '1rem',    // 16px
    },
  },
}

export const COLOR_SCHEME = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  success: {
    50: '#f0fdf4',
    500: '#22c55e',
    700: '#15803d',
  },
  warning: {
    50: '#fefce8',
    500: '#eab308',
    700: '#a16207',
  },
  error: {
    50: '#fef2f2',
    500: '#ef4444',
    700: '#b91c1c',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    600: '#4b5563',
    700: '#374151',
    900: '#111827',
  },
}

/**
 * Component Design Standards
 */
export const COMPONENT_STANDARDS = {
  // Cards
  card: {
    padding: 'p-6',
    shadow: 'shadow-sm',
    border: 'border border-gray-200',
    radius: 'rounded-xl',
    hover: 'hover:shadow-md transition-shadow',
  },

  // Buttons
  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors',
    ghost: 'hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors',
  },

  // Inputs
  input: {
    base: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
    error: 'border-red-500 focus:ring-red-500',
  },

  // Badges/Tags
  badge: {
    base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    primary: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
  },
}

export const ANIMATION_PRESETS = {
  fadeIn: 'animate-in fade-in duration-200',
  fadeOut: 'animate-out fade-out duration-200',
  slideInFromBottom: 'animate-in slide-in-from-bottom duration-300',
  slideInFromRight: 'animate-in slide-in-from-right duration-300',
  scaleIn: 'animate-in zoom-in duration-200',
}
