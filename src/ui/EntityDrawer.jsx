// src/ui/EntityDrawer.jsx
// Standardized entity drawer component for forms and details

import React from 'react';
import { Drawer, Space, Button, Typography } from 'antd';
import { theme } from './theme';

const { Title } = Typography;

/**
 * Standardized entity drawer component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether drawer is open
 * @param {string} props.title - Drawer title
 * @param {React.ReactNode} props.children - Drawer content
 * @param {React.ReactNode} props.extra - Extra content in header
 * @param {React.ReactNode} props.footer - Footer content
 * @param {string} props.okText - OK button text
 * @param {string} props.cancelText - Cancel button text
 * @param {Function} props.onOk - OK button click handler
 * @param {Function} props.onCancel - Cancel button click handler
 * @param {boolean} props.loading - Loading state for OK button
 * @param {boolean} props.disableOk - Whether to disable OK button
 * @param {number} props.width - Drawer width
 * @param {string} props.placement - Drawer placement
 * @param {string} props.className - Additional CSS class
 */
const EntityDrawer = ({
  open,
  title,
  children,
  extra,
  footer,
  okText = 'Save',
  cancelText = 'Cancel',
  onOk,
  onCancel,
  loading = false,
  disableOk = false,
  width = 560,
  placement = 'right',
  className = '',
}) => {
  const defaultFooter = (
    <Space>
      <Button onClick={onCancel} disabled={loading}>
        {cancelText}
      </Button>
      {onOk && (
        <Button
          type="primary"
          onClick={onOk}
          loading={loading}
          disabled={disableOk}
          style={{
            borderRadius: theme.borderRadius.base,
            fontWeight: theme.typography.fontWeight.medium,
          }}
        >
          {okText}
        </Button>
      )}
    </Space>
  );

  return (
    <Drawer
      open={open}
      title={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Title
            level={4}
            style={{
              margin: 0,
              color: theme.colors.neutral[800],
              fontWeight: theme.typography.fontWeight.semibold,
            }}
          >
            {title}
          </Title>
          {extra && (
            <div style={{ flexShrink: 0 }}>
              {extra}
            </div>
          )}
        </div>
      }
      onClose={onCancel}
      width={width}
      placement={placement}
      className={`entity-drawer ${className}`}
      destroyOnClose
      maskClosable={false}
      keyboard={true}
      footer={footer || defaultFooter}
      styles={{
        body: {
          padding: theme.spacing[4],
        },
        header: {
          padding: `${theme.spacing[4]} ${theme.spacing[4]} 0`,
          borderBottom: `1px solid ${theme.colors.neutral[200]}`,
        },
        footer: {
          padding: theme.spacing[4],
          borderTop: `1px solid ${theme.colors.neutral[200]}`,
        },
      }}
    >
      <div
        style={{
          minHeight: '200px',
        }}
      >
        {children}
      </div>
    </Drawer>
  );
};

export default EntityDrawer; 