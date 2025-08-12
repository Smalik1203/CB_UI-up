import React, { useState } from 'react';
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Button, 
  Table, 
  Select, 
  DatePicker, 
  Form, 
  Input, 
  Modal, 
  Tabs, 
  Tag, 
  Space, 
  Typography, 
  Statistic,
  Progress,
  Empty,
  Badge,
  Alert,
  Divider
} from 'antd';
import {
  DollarOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  CreditCardOutlined,
  CalendarOutlined,
  UserOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// ==========================================
// HARDCODED SAMPLE DATA
// ==========================================
// TODO: Replace with Supabase queries when integrating backend

const SAMPLE_FEE_STRUCTURES = [
  {
    id: 1,
    name: "Grade 10 Annual Fees",
    classId: 1,
    className: "Grade 10 - Section A",
    academicYear: "2024-25",
    components: [
      { name: "Tuition Fee", amount: 25000, type: "annual" },
      { name: "Library Fee", amount: 2000, type: "annual" },
      { name: "Lab Fee", amount: 3000, type: "annual" },
      { name: "Sports Fee", amount: 1500, type: "annual" }
    ],
    totalAmount: 31500,
    dueDate: "2025-04-30",
    status: "active"
  },
  {
    id: 2,
    name: "Grade 9 Monthly Fees",
    classId: 3,
    className: "Grade 9 - Section A",
    academicYear: "2024-25",
    components: [
      { name: "Monthly Tuition", amount: 2500, type: "monthly" },
      { name: "Transport Fee", amount: 800, type: "monthly" },
      { name: "Meal Fee", amount: 1200, type: "monthly" }
    ],
    totalAmount: 4500,
    dueDate: "2025-01-31",
    status: "active"
  }
];

const SAMPLE_FEE_PAYMENTS = [
  {
    id: 1,
    studentId: 1,
    studentName: "Amit Sharma",
    rollNumber: "10A001",
    classId: 1,
    className: "Grade 10 - Section A",
    feeStructureId: 1,
    amount: 31500,
    paidAmount: 31500,
    pendingAmount: 0,
    paymentDate: "2025-01-15",
    dueDate: "2025-04-30",
    status: "paid",
    paymentMethod: "Online",
    transactionId: "TXN123456789",
    remarks: "Full payment for academic year 2024-25"
  },
  {
    id: 2,
    studentId: 2,
    studentName: "Priya Singh",
    rollNumber: "10A002",
    classId: 1,
    className: "Grade 10 - Section A",
    feeStructureId: 1,
    amount: 31500,
    paidAmount: 15000,
    pendingAmount: 16500,
    paymentDate: "2025-01-10",
    dueDate: "2025-04-30",
    status: "partial",
    paymentMethod: "Cash",
    transactionId: "TXN123456790",
    remarks: "Partial payment - remaining due"
  },
  {
    id: 3,
    studentId: 3,
    studentName: "Rahul Verma",
    rollNumber: "10A003",
    classId: 1,
    className: "Grade 10 - Section A",
    feeStructureId: 1,
    amount: 31500,
    paidAmount: 0,
    pendingAmount: 31500,
    paymentDate: null,
    dueDate: "2025-04-30",
    status: "pending",
    paymentMethod: null,
    transactionId: null,
    remarks: "Payment pending"
  },
  {
    id: 4,
    studentId: 9,
    studentName: "Rohan Mehta",
    rollNumber: "9A001",
    classId: 3,
    className: "Grade 9 - Section A",
    feeStructureId: 2,
    amount: 4500,
    paidAmount: 4500,
    pendingAmount: 0,
    paymentDate: "2025-01-20",
    dueDate: "2025-01-31",
    status: "paid",
    paymentMethod: "Online",
    transactionId: "TXN123456791",
    remarks: "January 2025 monthly fee"
  },
  {
    id: 5,
    studentId: 10,
    studentName: "Ishita Agarwal",
    rollNumber: "9A002",
    classId: 3,
    className: "Grade 9 - Section A",
    feeStructureId: 2,
    amount: 4500,
    paidAmount: 0,
    pendingAmount: 4500,
    paymentDate: null,
    dueDate: "2025-01-31",
    status: "overdue",
    paymentMethod: null,
    transactionId: null,
    remarks: "Payment overdue"
  }
];

const SAMPLE_CLASSES = [
  { id: 1, name: "Grade 10 - Section A" },
  { id: 2, name: "Grade 10 - Section B" },
  { id: 3, name: "Grade 9 - Section A" },
  { id: 4, name: "Grade 11 - Section A" }
];

const Fees = () => {
  // ==========================================
  // COMPONENT STATE
  // ==========================================
  
  const [activeTab, setActiveTab] = useState('payments');
  const [feePayments, setFeePayments] = useState(SAMPLE_FEE_PAYMENTS);
  const [feeStructures, setFeeStructures] = useState(SAMPLE_FEE_STRUCTURES);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState('view'); // 'view', 'payment', 'structure'
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // TODO: Replace with actual user data from Supabase auth
  const currentUser = {
    role: 'admin', // Change to test different roles: 'superadmin', 'admin', 'student', 'parent'
    name: 'Mrs. Sunita Sharma',
    assignedClassIds: [1, 3],
    studentId: 1, // For student role
    childrenIds: [1, 2] // For parent role
  };

  // ==========================================
  // ROLE-BASED PERMISSIONS
  // ==========================================
  
  const permissions = {
    canManageFeeStructure: ['superadmin', 'admin'].includes(currentUser.role),
    canViewAllPayments: ['superadmin', 'admin'].includes(currentUser.role),
    canProcessPayments: ['superadmin', 'admin'].includes(currentUser.role),
    canViewReports: ['superadmin', 'admin'].includes(currentUser.role),
    availableTabs: currentUser.role === 'student' ? ['payments'] : 
                  currentUser.role === 'parent' ? ['payments', 'history'] :
                  ['payments', 'structure', 'reports']
  };

  // ==========================================
  // DATA FILTERING FUNCTIONS
  // ==========================================
  
  // Get fee payments based on user role
  // TODO: Replace with Supabase query based on user permissions
  const getFilteredPayments = () => {
    switch (currentUser.role) {
      case 'superadmin':
        return feePayments;
      case 'admin':
        return feePayments.filter(payment => 
          currentUser.assignedClassIds.includes(payment.classId)
        );
      case 'student':
        return feePayments.filter(payment => payment.studentId === currentUser.studentId);
      case 'parent':
        return feePayments.filter(payment => 
          currentUser.childrenIds.includes(payment.studentId)
        );
      default:
        return [];
    }
  };

  // Get available classes based on user role
  // TODO: Replace with Supabase query
  const getAvailableClasses = () => {
    switch (currentUser.role) {
      case 'superadmin':
        return SAMPLE_CLASSES;
      case 'admin':
        return SAMPLE_CLASSES.filter(cls => currentUser.assignedClassIds.includes(cls.id));
      default:
        return [];
    }
  };

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  
  const handleViewPayment = (payment) => {
    setModalType('view');
    setSelectedPayment(payment);
    setIsModalVisible(true);
  };

  const handleProcessPayment = (payment) => {
    setModalType('payment');
    setSelectedPayment(payment);
    form.setFieldsValue({
      studentName: payment.studentName,
      amount: payment.pendingAmount,
      paymentMethod: 'Online',
      paymentDate: dayjs()
    });
    setIsModalVisible(true);
  };

  const handleCreateFeeStructure = () => {
    setModalType('structure');
    setSelectedPayment(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleModalSubmit = async (values) => {
    setLoading(true);
    
    try {
      // TODO: Replace with Supabase operations
      if (modalType === 'payment') {
        // Process payment
        const updatedPayments = feePayments.map(payment => 
          payment.id === selectedPayment.id 
            ? {
                ...payment,
                paidAmount: payment.paidAmount + parseFloat(values.amount),
                pendingAmount: payment.pendingAmount - parseFloat(values.amount),
                status: payment.pendingAmount - parseFloat(values.amount) <= 0 ? 'paid' : 'partial',
                paymentDate: values.paymentDate.format('YYYY-MM-DD'),
                paymentMethod: values.paymentMethod,
                transactionId: `TXN${Date.now()}`,
                remarks: values.remarks || 'Payment processed'
              }
            : payment
        );
        setFeePayments(updatedPayments);
      } else if (modalType === 'structure') {
        // Create fee structure
        const newStructure = {
          id: Date.now(),
          ...values,
          className: SAMPLE_CLASSES.find(c => c.id === values.classId)?.name,
          status: 'active'
        };
        setFeeStructures(prev => [...prev, newStructure]);
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Error processing request:', error);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // TABLE COLUMNS
  // ==========================================
  
  const paymentColumns = [
    {
      title: 'Student',
      key: 'student',
      render: (_, record) => (
        <div>
          <Text strong>{record.studentName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.rollNumber} • {record.className}
          </Text>
        </div>
      ),
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_, record) => (
        <div>
          <Text strong>₹{record.amount.toLocaleString()}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Paid: ₹{record.paidAmount.toLocaleString()}
          </Text>
          {record.pendingAmount > 0 && (
            <>
              <br />
              <Text type="danger" style={{ fontSize: '12px' }}>
                Pending: ₹{record.pendingAmount.toLocaleString()}
              </Text>
            </>
          )}
        </div>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (dueDate) => {
        const isOverdue = dayjs(dueDate).isBefore(dayjs());
        return (
          <div>
            <Text type={isOverdue ? 'danger' : 'default'}>
              {dayjs(dueDate).format('DD MMM YYYY')}
            </Text>
            {isOverdue && (
              <>
                <br />
                <Text type="danger" style={{ fontSize: '12px' }}>
                  Overdue
                </Text>
              </>
            )}
          </div>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          paid: 'green',
          partial: 'orange',
          pending: 'blue',
          overdue: 'red'
        };
        const icons = {
          paid: <CheckCircleOutlined />,
          partial: <ClockCircleOutlined />,
          pending: <ClockCircleOutlined />,
          overdue: <CloseCircleOutlined />
        };
        return (
          <Tag color={colors[status]} icon={icons[status]}>
            {status.toUpperCase()}
          </Tag>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewPayment(record)}
          />
          {permissions.canProcessPayments && record.pendingAmount > 0 && (
            <Button
              type="text"
              icon={<CreditCardOutlined />}
              onClick={() => handleProcessPayment(record)}
            />
          )}
        </Space>
      ),
    },
  ];

  const structureColumns = [
    {
      title: 'Fee Structure',
      key: 'structure',
      render: (_, record) => (
        <div>
          <Text strong>{record.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.className} • {record.academicYear}
          </Text>
        </div>
      ),
    },
    {
      title: 'Components',
      key: 'components',
      render: (_, record) => (
        <div>
          {record.components.map((component, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              <Text style={{ fontSize: '12px' }}>
                {component.name}: ₹{component.amount.toLocaleString()}
              </Text>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => (
        <Text strong style={{ fontSize: '16px' }}>
          ₹{amount.toLocaleString()}
        </Text>
      )
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (dueDate) => dayjs(dueDate).format('DD MMM YYYY')
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} />
          {permissions.canManageFeeStructure && (
            <>
              <Button type="text" icon={<EditOutlined />} />
              <Button type="text" danger icon={<DeleteOutlined />} />
            </>
          )}
        </Space>
      ),
    },
  ];

  // ==========================================
  // RENDER FUNCTIONS
  // ==========================================
  
  const renderPayments = () => {
    const filteredPayments = getFilteredPayments();
    
    // Calculate statistics
    const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const paidAmount = filteredPayments.reduce((sum, payment) => sum + payment.paidAmount, 0);
    const pendingAmount = filteredPayments.reduce((sum, payment) => sum + payment.pendingAmount, 0);
    const overduePayments = filteredPayments.filter(payment => 
      payment.status === 'overdue' || 
      (payment.pendingAmount > 0 && dayjs(payment.dueDate).isBefore(dayjs()))
    ).length;
    
    return (
      <div>
        {/* Statistics Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Amount"
                value={totalAmount}
                prefix="₹"
                precision={0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Collected"
                value={paidAmount}
                prefix="₹"
                precision={0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Pending"
                value={pendingAmount}
                prefix="₹"
                precision={0}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Overdue"
                value={overduePayments}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Collection Progress */}
        <Card style={{ marginBottom: '16px' }}>
          <Row align="middle">
            <Col xs={24} md={18}>
              <Text strong>Fee Collection Progress</Text>
              <Progress
                percent={totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0}
                strokeColor="#52c41a"
                style={{ marginTop: '8px' }}
              />
            </Col>
            <Col xs={24} md={6} style={{ textAlign: 'right' }}>
              <Text strong style={{ fontSize: '18px' }}>
                {totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0}%
              </Text>
              <br />
              <Text type="secondary">Collected</Text>
            </Col>
          </Row>
        </Card>

        {/* Overdue Alert */}
        {overduePayments > 0 && (
          <Alert
            message={`${overduePayments} payment(s) are overdue`}
            description="Please follow up with students/parents for pending payments."
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* Payments Table */}
        <Card
          title="Fee Payments"
          extra={
            permissions.canProcessPayments && (
              <Button icon={<DownloadOutlined />}>
                Export Report
              </Button>
            )
          }
        >
          <Table
            columns={paymentColumns}
            dataSource={filteredPayments}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} payments`
            }}
          />
        </Card>
      </div>
    );
  };

  const renderFeeStructure = () => {
    if (!permissions.canManageFeeStructure) {
      return (
        <Card>
          <Empty
            description="You don't have permission to manage fee structures"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      );
    }

    return (
      <div>
        <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Fee Structures
            </Title>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateFeeStructure}
            >
              Create Fee Structure
            </Button>
          </Col>
        </Row>

        <Card>
          <Table
            columns={structureColumns}
            dataSource={feeStructures}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} structures`
            }}
          />
        </Card>
      </div>
    );
  };

  const renderReports = () => {
    if (!permissions.canViewReports) {
      return (
        <Card>
          <Empty
            description="You don't have permission to view reports"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      );
    }

    const filteredPayments = getFilteredPayments();
    const monthlyCollection = filteredPayments
      .filter(payment => payment.paymentDate)
      .reduce((acc, payment) => {
        const month = dayjs(payment.paymentDate).format('MMM YYYY');
        acc[month] = (acc[month] || 0) + payment.paidAmount;
        return acc;
      }, {});

    return (
      <div>
        <Title level={4} style={{ marginBottom: '16px' }}>
          Fee Reports & Analytics
        </Title>
        
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Monthly Collection">
              <Space direction="vertical" style={{ width: '100%' }}>
                {Object.entries(monthlyCollection).map(([month, amount]) => (
                  <div key={month} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>{month}</Text>
                    <Text strong>₹{amount.toLocaleString()}</Text>
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // ==========================================
  // MAIN RENDER
  // ==========================================
  
  return (
    <Content className="page-container">
      {/* Header */}
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              Fee Management
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              {currentUser.role === 'student' && 'View your fee payments and pending amounts'}
              {currentUser.role === 'parent' && 'Monitor your children\'s fee payments'}
              {['admin', 'superadmin'].includes(currentUser.role) && 'Manage fee structures and track payments'}
            </Text>
          </Col>
          <Col>
            <Badge color="#1890ff" text={`${currentUser.role.toUpperCase()} - ${currentUser.name}`} />
          </Col>
        </Row>
      </div>

      {/* Tab Content */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        size="large"
      >
        {permissions.availableTabs.includes('payments') && (
          <TabPane
            tab={
              <Space>
                <CreditCardOutlined />
                Payments
              </Space>
            }
            key="payments"
          >
            {renderPayments()}
          </TabPane>
        )}
        
        {permissions.availableTabs.includes('structure') && (
          <TabPane
            tab={
              <Space>
                <DollarOutlined />
                Fee Structure
              </Space>
            }
            key="structure"
          >
            {renderFeeStructure()}
          </TabPane>
        )}
        
        {permissions.availableTabs.includes('reports') && (
          <TabPane
            tab={
              <Space>
                <BarChartOutlined />
                Reports
              </Space>
            }
            key="reports"
          >
            {renderReports()}
          </TabPane>
        )}
      </Tabs>

      {/* Payment/Structure Modal */}
      <Modal
        title={
          modalType === 'view' ? 'Payment Details' :
          modalType === 'payment' ? 'Process Payment' : 'Create Fee Structure'
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={modalType === 'view' ? [
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Close
          </Button>
        ] : null}
        width={600}
      >
        {modalType === 'view' && selectedPayment && (
          <div>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Text strong>Student: </Text>
                <Text>{selectedPayment.studentName}</Text>
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Roll Number: </Text>
                <Text>{selectedPayment.rollNumber}</Text>
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Class: </Text>
                <Text>{selectedPayment.className}</Text>
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Total Amount: </Text>
                <Text>₹{selectedPayment.amount.toLocaleString()}</Text>
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Paid Amount: </Text>
                <Text style={{ color: '#52c41a' }}>₹{selectedPayment.paidAmount.toLocaleString()}</Text>
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Pending Amount: </Text>
                <Text style={{ color: selectedPayment.pendingAmount > 0 ? '#ff4d4f' : '#52c41a' }}>
                  ₹{selectedPayment.pendingAmount.toLocaleString()}
                </Text>
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Due Date: </Text>
                <Text>{dayjs(selectedPayment.dueDate).format('DD MMM YYYY')}</Text>
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Status: </Text>
                <Tag color={
                  selectedPayment.status === 'paid' ? 'green' :
                  selectedPayment.status === 'partial' ? 'orange' :
                  selectedPayment.status === 'overdue' ? 'red' : 'blue'
                }>
                  {selectedPayment.status.toUpperCase()}
                </Tag>
              </Col>
              {selectedPayment.paymentDate && (
                <>
                  <Col xs={24} md={12}>
                    <Text strong>Payment Date: </Text>
                    <Text>{dayjs(selectedPayment.paymentDate).format('DD MMM YYYY')}</Text>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>Payment Method: </Text>
                    <Text>{selectedPayment.paymentMethod}</Text>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong>Transaction ID: </Text>
                    <Text>{selectedPayment.transactionId}</Text>
                  </Col>
                </>
              )}
              <Col xs={24}>
                <Text strong>Remarks: </Text>
                <br />
                <Text>{selectedPayment.remarks}</Text>
              </Col>
            </Row>
          </div>
        )}
        
        {modalType === 'payment' && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleModalSubmit}
          >
            <Form.Item
              name="studentName"
              label="Student"
            >
              <Input disabled />
            </Form.Item>
            
            <Form.Item
              name="amount"
              label="Payment Amount"
              rules={[{ required: true, message: 'Please enter payment amount' }]}
            >
              <Input
                type="number"
                prefix="₹"
                placeholder="Enter amount"
              />
            </Form.Item>
            
            <Form.Item
              name="paymentMethod"
              label="Payment Method"
              rules={[{ required: true, message: 'Please select payment method' }]}
            >
              <Select placeholder="Select payment method">
                <Option value="Cash">Cash</Option>
                <Option value="Online">Online Transfer</Option>
                <Option value="Cheque">Cheque</Option>
                <Option value="Card">Debit/Credit Card</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="paymentDate"
              label="Payment Date"
              rules={[{ required: true, message: 'Please select payment date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item
              name="remarks"
              label="Remarks"
            >
              <Input.TextArea 
                rows={3} 
                placeholder="Enter any remarks or notes"
              />
            </Form.Item>
            
            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIsModalVisible(false)}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Process Payment
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </Content>
  );
};

export default Fees;