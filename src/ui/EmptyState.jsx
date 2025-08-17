// src/ui/EmptyState.jsx
// Standardized empty state component

import React from 'react';
import { Typography, Button } from 'antd';
import { theme } from './theme';

const { Title, Text } = Typography;

/**
 * Standardized empty state component
 * @param {Object} props - Component props
 * @param {string} props.title - Empty state title
 * @param {string} props.description - Empty state description
 * @param {React.ReactNode} props.icon - Icon component
 * @param {string} props.actionText - Action button text
 * @param {Function} props.onAction - Action button click handler
 * @param {boolean} props.showAction - Whether to show action button
 * @param {string} props.className - Additional CSS class
 * @param {Object} props.style - Additional inline styles
 */
const EmptyState = ({
  title = 'No data found',
  description = 'There are no items to display at the moment.',
  icon = '📭',
  actionText,
  onAction,
  showAction = false,
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing[12],
        textAlign: 'center',
        minHeight: '300px',
        ...style,
      }}
    >
      {/* Icon */}
      <div
        style={{
          fontSize: '64px',
          marginBottom: theme.spacing[4],
          opacity: 0.6,
        }}
        role="img"
        aria-label="Empty state icon"
      >
        {icon}
      </div>

      {/* Title */}
      <Title
        level={4}
        style={{
          margin: 0,
          marginBottom: theme.spacing[2],
          color: theme.colors.neutral[800],
          fontWeight: theme.typography.fontWeight.medium,
        }}
      >
        {title}
      </Title>

      {/* Description */}
      <Text
        type="secondary"
        style={{
          fontSize: theme.typography.fontSize.base,
          color: theme.colors.neutral[600],
          marginBottom: showAction ? theme.spacing[4] : 0,
          maxWidth: '400px',
          lineHeight: theme.typography.lineHeight.relaxed,
        }}
      >
        {description}
      </Text>

      {/* Action Button */}
      {showAction && actionText && onAction && (
        <Button
          type="primary"
          onClick={onAction}
          style={{
            borderRadius: theme.borderRadius.base,
            fontWeight: theme.typography.fontWeight.medium,
          }}
        >
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState; 