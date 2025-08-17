// src/ui/theme.js
// Centralized design system tokens and theme configuration

export const theme = {
  // Color Palette
  colors: {
    // Primary
    primary: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1', // Main primary
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
    },
    
    // Success
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981', // Main success
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
    
    // Warning
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b', // Main warning
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    
    // Error
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // Main error
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    
    // Neutral
    neutral: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
  },
  
  // Spacing Scale
  spacing: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
  },
  
  // Border Radius
  borderRadius: {
    none: 0,
    sm: 4,
    base: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  
  // Typography
  typography: {
    fontFamily: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
      '5xl': '48px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  
  // Breakpoints
  breakpoints: {
    xs: 480,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1600,
  },
};

// Ant Design theme configuration
export const antdTheme = {
  token: {
    // Colors
    colorPrimary: theme.colors.primary[500],
    colorSuccess: theme.colors.success[500],
    colorWarning: theme.colors.warning[500],
    colorError: theme.colors.error[500],
    colorInfo: theme.colors.primary[500],
    
    // Background colors
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: theme.colors.neutral[50],
    colorBgSpotlight: theme.colors.neutral[800],
    
    // Text colors
    colorText: theme.colors.neutral[800],
    colorTextSecondary: theme.colors.neutral[600],
    colorTextTertiary: theme.colors.neutral[500],
    colorTextQuaternary: theme.colors.neutral[400],
    
    // Border colors
    colorBorder: theme.colors.neutral[200],
    colorBorderSecondary: theme.colors.neutral[100],
    
    // Border radius
    borderRadius: theme.borderRadius.base,
    borderRadiusLG: theme.borderRadius.md,
    borderRadiusSM: theme.borderRadius.sm,
    
    // Typography
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    
    // Control height
    controlHeight: 36,
    controlHeightLG: 40,
    controlHeightSM: 28,
    
    // Spacing
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    
    // Shadows
    boxShadow: theme.shadows.base,
    boxShadowSecondary: theme.shadows.md,
    
    // Motion
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
  },
  
  components: {
    // Card customization
    Card: {
      borderRadiusLG: theme.borderRadius.md,
      boxShadowTertiary: theme.shadows.sm,
    },
    
    // Button customization
    Button: {
      borderRadius: theme.borderRadius.base,
      controlHeight: 36,
      fontWeight: 500,
    },
    
    // Input customization
    Input: {
      borderRadius: theme.borderRadius.base,
      controlHeight: 36,
    },
    
    // Select customization
    Select: {
      borderRadius: theme.borderRadius.base,
      controlHeight: 36,
    },
    
    // Table customization
    Table: {
      borderRadius: theme.borderRadius.base,
      headerBg: theme.colors.neutral[50],
      headerColor: theme.colors.neutral[700],
    },
    
    // Modal customization
    Modal: {
      borderRadiusLG: theme.borderRadius.md,
    },
    
    // Drawer customization
    Drawer: {
      borderRadiusLG: theme.borderRadius.md,
    },
  },
};

// Utility functions for theme access
export const getSpacing = (size) => theme.spacing[size] || size;
export const getColor = (colorPath) => {
  const [category, shade] = colorPath.split('.');
  return theme.colors[category]?.[shade] || colorPath;
};
export const getBorderRadius = (size) => theme.borderRadius[size] || size;
export const getShadow = (size) => theme.shadows[size] || size; 