// src/ui/Page.jsx
// Standardized page shell component with consistent layout

import React from 'react';
import { Layout, Typography } from 'antd';
import { theme } from './theme';

const { Content } = Layout;
const { Title, Text } = Typography;

/**
 * Standardized page component with consistent layout
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Page content
 * @param {string} props.title - Page title
 * @param {string} props.subtitle - Page subtitle
 * @param {React.ReactNode} props.extra - Extra content (actions, filters, etc.)
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.error - Error state
 * @param {string} props.errorMessage - Error message
 * @param {Function} props.onRetry - Retry function for error state
 * @param {string} props.className - Additional CSS class
 * @param {Object} props.style - Additional inline styles
 */
const Page = ({
  children,
  title,
  subtitle,
  extra,
  loading = false,
  error = false,
  errorMessage = 'Something went wrong. Please try again.',
  onRetry,
  className = '',
  style = {},
}) => {
  return (
    <Content
      className={`page-container ${className}`}
      style={{
        padding: theme.spacing[6],
        minHeight: '100vh',
        background: theme.colors.neutral[50],
        ...style,
      }}
    >
      {/* Page Header */}
      {(title || extra) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: theme.spacing[6],
            gap: theme.spacing[4],
          }}
        >
          <div style={{ flex: 1 }}>
            {title && (
              <Title
                level={2}
                style={{
                  margin: 0,
                  marginBottom: subtitle ? theme.spacing[2] : 0,
                  color: theme.colors.neutral[800],
                  fontWeight: theme.typography.fontWeight.semibold,
                }}
              >
                {title}
              </Title>
            )}
            {subtitle && (
              <Text
                type="secondary"
                style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.neutral[600],
                }}
              >
                {subtitle}
              </Text>
            )}
          </div>
          {extra && (
            <div style={{ flexShrink: 0 }}>
              {extra}
            </div>
          )}
        </div>
      )}

      {/* Page Content */}
      <div
        style={{
          position: 'relative',
          minHeight: '200px',
        }}
      >
        {error ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: theme.spacing[12],
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                color: theme.colors.error[400],
                marginBottom: theme.spacing[4],
              }}
            >
              ⚠️
            </div>
            <Title
              level={4}
              style={{
                margin: 0,
                marginBottom: theme.spacing[2],
                color: theme.colors.neutral[800],
              }}
            >
              Error
            </Title>
            <Text
              type="secondary"
              style={{
                fontSize: theme.typography.fontSize.base,
                marginBottom: theme.spacing[4],
                maxWidth: '400px',
              }}
            >
              {errorMessage}
            </Text>
            {onRetry && (
              <button
                onClick={onRetry}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  background: theme.colors.primary[500],
                  color: 'white',
                  border: 'none',
                  borderRadius: theme.borderRadius.base,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = theme.colors.primary[600];
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = theme.colors.primary[500];
                }}
              >
                Try Again
              </button>
            )}
          </div>
        ) : loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: theme.spacing[12],
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: `4px solid ${theme.colors.neutral[200]}`,
                borderTop: `4px solid ${theme.colors.primary[500]}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
          </div>
        ) : (
          children
        )}
      </div>
    </Content>
  );
};

export default Page; 