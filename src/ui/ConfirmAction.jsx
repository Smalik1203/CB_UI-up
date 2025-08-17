// src/ui/ConfirmAction.jsx
// Standardized confirmation dialog component

import React from 'react';
import { Modal, Typography } from 'antd';
import { theme } from './theme';

const { Text } = Typography;

/**
 * Standardized confirmation dialog component
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether modal is visible
 * @param {string} props.title - Modal title
 * @param {string} props.message - Confirmation message
 * @param {string} props.okText - OK button text
 * @param {string} props.cancelText - Cancel button text
 * @param {boolean} props.dangerous - Whether this is a dangerous action
 * @param {Function} props.onOk - OK button click handler
 * @param {Function} props.onCancel - Cancel button click handler
 * @param {boolean} props.loading - Loading state for OK button
 * @param {string} props.className - Additional CSS class
 */
const ConfirmAction = ({
  visible,
  title = 'Confirm Action',
  message,
  okText = 'Confirm',
  cancelText = 'Cancel',
  dangerous = false,
  onOk,
  onCancel,
  loading = false,
  className = '',
}) => {
  return (
    <Modal
      open={visible}
      title={title}
      onOk={onOk}
      onCancel={onCancel}
      okText={okText}
      cancelText={cancelText}
      okButtonProps={{
        danger: dangerous,
        loading: loading,
        style: {
          borderRadius: theme.borderRadius.base,
          fontWeight: theme.typography.fontWeight.medium,
        },
      }}
      cancelButtonProps={{
        style: {
          borderRadius: theme.borderRadius.base,
          fontWeight: theme.typography.fontWeight.medium,
        },
      }}
      className={`confirm-action-modal ${className}`}
      centered
      maskClosable={false}
      keyboard={true}
      destroyOnClose
    >
      <div style={{ padding: theme.spacing[2] }}>
        <Text
          style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.neutral[700],
            lineHeight: theme.typography.lineHeight.relaxed,
          }}
        >
          {message}
        </Text>
      </div>
    </Modal>
  );
};

export default ConfirmAction; 