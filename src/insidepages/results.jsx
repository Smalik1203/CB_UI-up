import React, { useState } from 'react';
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Button, 
  Table, 
  Select, 
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
  TrophyOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  BarChartOutlined,
  UserOutlined,
  BookOutlined,
  CalendarOutlined,
  StarOutlined,
  DownloadOutlined,
  PrinterOutlined
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// ==========================================
// HARDCODED SAMPLE DATA
// ==========================================
// TODO: Replace with Supabase queries when integrating backend

const SAMPLE_RESULTS = [
  {
    id: 1,
    studentId: 1,
    studentName: "Amit Sharma",
    rollNumber: "10A001",
    classId: 1,
    className: "Grade 10 - Section A",
    examType: "Unit Test 1",
    examDate: "2025-01-15",
    subjects: [
      { name: "Mathematics", maxMarks: 100, obtainedMarks: 85, grade: "A" },
      { name: "Science", maxMarks: 100, obtainedMarks: 78, grade: "B+" },
      { name: "English", maxMarks: 100, obtainedMarks: 92, grade: "A+" },
      { name: "History", maxMarks: 100, obtainedMarks: 76, grade: "B+" },
      { name: "Geography", maxMarks: 100, obtainedMarks: 82, grade: "A" }
    ],
    totalMaxMarks: 500,
    totalObtainedMarks: 413,
    percentage: 82.6,
    overallGrade: "A",
    rank: 3,
    remarks: "Excellent performance. Keep up the good work!"
  },
  {
    id: 2,
    studentId: 2,
    studentName: "Priya Singh",
    rollNumber: "10A002",
    classId: 1,
    className: "Grade 10 - Section A",
    examType: "Unit Test 1",
    examDate: "2025-01-15",
    subjects: [
      { name: "Mathematics", maxMarks: 100, obtainedMarks: 95, grade: "A+" },
      { name: "Science", maxMarks: 100, obtainedMarks: 88, grade: "A" },
      { name: "English", maxMarks: 100, obtainedMarks: 90, grade: "A" },
      { name: "History", maxMarks: 100, obtainedMarks: 85, grade: "A" },
      { name: "Geography", maxMarks: 100, obtainedMarks: 87, grade: "A" }
    ],
    totalMaxMarks: 500,
    totalObtainedMarks: 445,
    percentage: 89.0,
    overallGrade: "A+",
    rank: 1,
    remarks: "Outstanding performance! Top of the class."
  },
  {
    id: 3,
    studentId: 3,
    studentName: "Rahul Verma",
    rollNumber: "10A003",
    classId: 1,
    className: "Grade 10 - Section A",
    examType: "Unit Test 1",
    examDate: "2025-01-15",
    subjects: [
      { name: "Mathematics", maxMarks: 100, obtainedMarks: 88, grade: "A" },
      { name: "Science", maxMarks: 100, obtainedMarks: 82, grade: "A" },
      { name: "English", maxMarks: 100, obtainedMarks: 79, grade: "B+" },
      { name: "History", maxMarks: 100, obtainedMarks: 91, grade: "A+" },
      { name: "Geography", maxMarks: 100, obtainedMarks: 86, grade: "A" }
    ],
    totalMaxMarks: 500,
    totalObtainedMarks: 426,
    percentage: 85.2,
    overallGrade: "A",
    rank: 2,
    remarks: "Very good performance across all subjects."
  },
  {
    id: 4,
    studentId: 9,
    studentName: "Rohan Mehta",
    rollNumber: "9A001",
    classId: 3,
    className: "Grade 9 - Section A",
    examType: "Monthly Test",
    examDate: "2025-01-20",
    subjects: [
      { name: "Mathematics", maxMarks: 50, obtainedMarks: 42, grade: "A" },
      { name: "Science", maxMarks: 50, obtainedMarks: 38, grade: "B+" },
      { name: "English", maxMarks: 50, obtainedMarks: 45, grade: "A+" },
      { name: "History", maxMarks: 50, obtainedMarks: 40, grade: "A" }
    ],
    totalMaxMarks: 200,
    totalObtainedMarks: 165,
    percentage: 82.5,
    overallGrade: "A",
    rank: 1,
    remarks: "Excellent work! Continue the good effort."
  }
];

const SAMPLE_CLASSES = [
  { id: 1, name: "Grade 10 - Section A" },
  { id: 2, name: "Grade 10 - Section B" },
  { id: 3, name: "Grade 9 - Section A" },
  { id: 4, name: "Grade 11 - Section A" }
];

const SAMPLE_EXAM_TYPES = [
  "Unit Test 1", "Unit Test 2", "Monthly Test", "Mid-term Exam", "Final Exam", "Assignment"
];

const Results = () => {
  // ==========================================
  // COMPONENT STATE
  // ==========================================
  
  const [activeTab, setActiveTab] = useState('results');
  const [results, setResults] = useState(SAMPLE_RESULTS);
  const [selectedResult, setSelectedResult] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState('view'); // 'view', 'create', 'edit'
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // TODO: Replace with actual user data from Supabase auth
  const currentUser = {
    role: 'admin', // Change to test different roles: 'superadmin', 'admin', 'teacher', 'student', 'parent'
    name: 'Mrs. Sunita Sharma',
    assignedClassIds: [1, 3],
    studentId: 1, // For student role
    childrenIds: [1, 2] // For parent role
  };

  // ==========================================
  // ROLE-BASED PERMISSIONS
  // ==========================================
  
  const permissions = {
    canCreateResults: ['superadmin', 'admin', 'teacher'].includes(currentUser.role),
    canEditResults: ['superadmin', 'admin', 'teacher'].includes(currentUser.role),
    canDeleteResults: ['superadmin', 'admin'].includes(currentUser.role),
    canViewAllResults: ['superadmin', 'admin'].includes(currentUser.role),
    canViewReports: ['superadmin', 'admin', 'teacher', 'parent'].includes(currentUser.role),
    availableTabs: currentUser.role === 'student' ? ['results'] : 
                  currentUser.role === 'parent' ? ['results', 'analytics'] :
                  ['results', 'create', 'analytics']
  };

  // ==========================================
  // DATA FILTERING FUNCTIONS
  // ==========================================
  
  // Get results based on user role
  // TODO: Replace with Supabase query based on user permissions
  const getFilteredResults = () => {
    switch (currentUser.role) {
      case 'superadmin':
        return results;
      case 'admin':
      case 'teacher':
        return results.filter(result => 
          currentUser.assignedClassIds.includes(result.classId)
        );
      case 'student':
        return results.filter(result => result.studentId === currentUser.studentId);
      case 'parent':
        return results.filter(result => 
          currentUser.childrenIds.includes(result.studentId)
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
      case 'teacher':
        return SAMPLE_CLASSES.filter(cls => currentUser.assignedClassIds.includes(cls.id));
      default:
        return [];
    }
  };

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  
  const handleViewResult = (result) => {
    setModalType('view');
    setSelectedResult(result);
    setIsModalVisible(true);
  };

  const handleCreateResult = () => {
    setModalType('create');
    setSelectedResult(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditResult = (result) => {
    setModalType('edit');
    setSelectedResult(result);
    form.setFieldsValue(result);
    setIsModalVisible(true);
  };

  const handleDeleteResult = (resultId) => {
    Modal.confirm({
      title: 'Delete Result',
      content: 'Are you sure you want to delete this result? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        // TODO: Replace with Supabase delete operation
        setResults(prev => prev.filter(r => r.id !== resultId));
      }
    });
  };

  const handleModalSubmit = async (values) => {
    setLoading(true);
    
    try {
      // TODO: Replace with Supabase insert/update operations
      if (modalType === 'create') {
        const newResult = {
          id: Date.now(),
          ...values,
          className: SAMPLE_CLASSES.find(c => c.id === values.classId)?.name
        };
        setResults(prev => [...prev, newResult]);
      } else if (modalType === 'edit') {
        setResults(prev => prev.map(r => 
          r.id === selectedResult.id 
            ? { ...r, ...values, className: SAMPLE_CLASSES.find(c => c.id === values.classId)?.name }
            : r
        ));
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Error saving result:', error);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================
  
  const getGradeColor = (grade) => {
    const colors = {
      'A+': 'green',
      'A': 'green',
      'B+': 'blue',
      'B': 'blue',
      'C+': 'orange',
      'C': 'orange',
      'D': 'red',
      'F': 'red'
    };
    return colors[grade] || 'default';
  };

  const getRankSuffix = (rank) => {
    if (rank === 1) return 'st';
    if (rank === 2) return 'nd';
    if (rank === 3) return 'rd';
    return 'th';
  };

  // ==========================================
  // TABLE COLUMNS
  // ==========================================
  
  const resultColumns = [
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
      title: 'Exam',
      key: 'exam',
      render: (_, record) => (
        <div>
          <Text strong>{record.examType}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {new Date(record.examDate).toLocaleDateString('en-IN')}
          </Text>
        </div>
      ),
    },
    {
      title: 'Marks',
      key: 'marks',
      render: (_, record) => (
        <div>
          <Text strong style={{ fontSize: '16px' }}>
            {record.totalObtainedMarks}/{record.totalMaxMarks}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.percentage}%
          </Text>
        </div>
      ),
    },
    {
      title: 'Grade',
      key: 'grade',
      render: (_, record) => (
        <Tag color={getGradeColor(record.overallGrade)} style={{ fontSize: '14px', padding: '4px 8px' }}>
          {record.overallGrade}
        </Tag>
      )
    },
    {
      title: 'Rank',
      key: 'rank',
      render: (_, record) => (
        <div style={{ textAlign: 'center' }}>
          <Text strong style={{ fontSize: '16px' }}>
            {record.rank}{getRankSuffix(record.rank)}
          </Text>
          <br />
          <StarOutlined style={{ color: record.rank <= 3 ? '#faad14' : '#d9d9d9' }} />
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewResult(record)}
          />
          <Button
            type="text"
            icon={<PrinterOutlined />}
            onClick={() => console.log('Print result for:', record.studentName)}
          />
          {permissions.canEditResults && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditResult(record)}
            />
          )}
          {permissions.canDeleteResults && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteResult(record.id)}
            />
          )}
        </Space>
      ),
    },
  ];

  // ==========================================
  // RENDER FUNCTIONS
  // ==========================================
  
  const renderResults = () => {
    const filteredResults = getFilteredResults();
    
    // Calculate statistics
    const totalResults = filteredResults.length;
    const averagePercentage = totalResults > 0 
      ? filteredResults.reduce((sum, result) => sum + result.percentage, 0) / totalResults 
      : 0;
    const topPerformers = filteredResults.filter(result => result.percentage >= 90).length;
    const needImprovement = filteredResults.filter(result => result.percentage < 60).length;
    
    return (
      <div>
        {/* Header with Create Button */}
        <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Exam Results
            </Title>
          </Col>
          <Col>
            <Space>
              <Button icon={<DownloadOutlined />}>
                Export Results
              </Button>
              {permissions.canCreateResults && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateResult}
                >
                  Add Result
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Results"
                value={totalResults}
                prefix={<BookOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Average %"
                value={averagePercentage}
                precision={1}
                suffix="%"
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Top Performers"
                value={topPerformers}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ≥90% marks
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Need Support"
                value={needImprovement}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                &lt;60% marks
              </Text>
            </Card>
          </Col>
        </Row>

        {/* Performance Alert */}
        {needImprovement > 0 && permissions.canViewAllResults && (
          <Alert
            message={`${needImprovement} student(s) need additional support`}
            description="Consider providing extra guidance to students scoring below 60%."
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* Results Table */}
        <Card>
          <Table
            columns={resultColumns}
            dataSource={filteredResults}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} results`
            }}
          />
        </Card>
      </div>
    );
  };

  const renderCreateResult = () => {
    if (!permissions.canCreateResults) {
      return (
        <Card>
          <Empty
            description="You don't have permission to create results"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      );
    }

    return (
      <Card title="Add New Result">
        <Alert
          message="Feature Coming Soon"
          description="The result creation form will be available in the next update. For now, you can view and manage existing results."
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <Empty
          description="Result creation form will be implemented here"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  };

  const renderAnalytics = () => {
    if (!permissions.canViewReports) {
      return (
        <Card>
          <Empty
            description="You don't have permission to view analytics"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      );
    }

    const filteredResults = getFilteredResults();
    
    // Calculate subject-wise performance
    const subjectPerformance = {};
    filteredResults.forEach(result => {
      result.subjects.forEach(subject => {
        if (!subjectPerformance[subject.name]) {
          subjectPerformance[subject.name] = { total: 0, count: 0 };
        }
        subjectPerformance[subject.name].total += (subject.obtainedMarks / subject.maxMarks) * 100;
        subjectPerformance[subject.name].count += 1;
      });
    });

    const subjectAverages = Object.entries(subjectPerformance).map(([subject, data]) => ({
      subject,
      average: data.count > 0 ? data.total / data.count : 0
    }));

    return (
      <div>
        <Title level={4} style={{ marginBottom: '16px' }}>
          Performance Analytics
        </Title>
        
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Overall Performance Distribution">
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <Progress
                  type="circle"
                  percent={Math.round(filteredResults.reduce((sum, r) => sum + r.percentage, 0) / filteredResults.length)}
                  format={percent => `${percent}%`}
                  strokeColor="#52c41a"
                />
                <div style={{ marginTop: '8px' }}>
                  <Text>Class Average</Text>
                </div>
              </div>
              
              <Divider />
              
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text>Excellent (90-100%)</Text>
                  <Progress 
                    percent={Math.round((filteredResults.filter(r => r.percentage >= 90).length / filteredResults.length) * 100)} 
                    strokeColor="#52c41a" 
                  />
                </div>
                <div>
                  <Text>Good (75-89%)</Text>
                  <Progress 
                    percent={Math.round((filteredResults.filter(r => r.percentage >= 75 && r.percentage < 90).length / filteredResults.length) * 100)} 
                    strokeColor="#1890ff" 
                  />
                </div>
                <div>
                  <Text>Average (60-74%)</Text>
                  <Progress 
                    percent={Math.round((filteredResults.filter(r => r.percentage >= 60 && r.percentage < 75).length / filteredResults.length) * 100)} 
                    strokeColor="#faad14" 
                  />
                </div>
                <div>
                  <Text>Below Average (&lt;60%)</Text>
                  <Progress 
                    percent={Math.round((filteredResults.filter(r => r.percentage < 60).length / filteredResults.length) * 100)} 
                    strokeColor="#ff4d4f" 
                  />
                </div>
              </Space>
            </Card>
          </Col>
          
          <Col xs={24} md={12}>
            <Card title="Subject-wise Performance">
              <Space direction="vertical" style={{ width: '100%' }}>
                {subjectAverages.map(({ subject, average }) => (
                  <div key={subject}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <Text>{subject}</Text>
                      <Text strong>{Math.round(average)}%</Text>
                    </div>
                    <Progress 
                      percent={Math.round(average)} 
                      strokeColor={
                        average >= 85 ? '#52c41a' :
                        average >= 75 ? '#1890ff' :
                        average >= 60 ? '#faad14' : '#ff4d4f'
                      }
                      showInfo={false}
                    />
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Top Performers */}
        <Card title="Top Performers" style={{ marginTop: '16px' }}>
          <Row gutter={[16, 16]}>
            {filteredResults
              .sort((a, b) => b.percentage - a.percentage)
              .slice(0, 3)
              .map((result, index) => (
                <Col xs={24} sm={8} key={result.id}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    <Text strong>{result.studentName}</Text>
                    <br />
                    <Text type="secondary">{result.rollNumber}</Text>
                    <br />
                    <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                      {result.percentage}%
                    </Text>
                    <br />
                    <Tag color={getGradeColor(result.overallGrade)}>
                      {result.overallGrade}
                    </Tag>
                  </Card>
                </Col>
              ))}
          </Row>
        </Card>
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
              Results Management
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              {currentUser.role === 'student' && 'View your exam results and academic performance'}
              {currentUser.role === 'parent' && 'Monitor your children\'s academic progress and results'}
              {['admin', 'superadmin', 'teacher'].includes(currentUser.role) && 'Manage student results and track academic performance'}
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
        {permissions.availableTabs.includes('results') && (
          <TabPane
            tab={
              <Space>
                <TrophyOutlined />
                Results
              </Space>
            }
            key="results"
          >
            {renderResults()}
          </TabPane>
        )}
        
        {permissions.availableTabs.includes('create') && (
          <TabPane
            tab={
              <Space>
                <PlusOutlined />
                Add Result
              </Space>
            }
            key="create"
          >
            {renderCreateResult()}
          </TabPane>
        )}
        
        {permissions.availableTabs.includes('analytics') && (
          <TabPane
            tab={
              <Space>
                <BarChartOutlined />
                Analytics
              </Space>
            }
            key="analytics"
          >
            {renderAnalytics()}
          </TabPane>
        )}
      </Tabs>

      {/* Result Details Modal */}
      <Modal
        title={`${selectedResult?.studentName} - ${selectedResult?.examType}`}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="print" icon={<PrinterOutlined />}>
            Print Result
          </Button>,
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedResult && (
          <div>
            {/* Student Info */}
            <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
              <Col xs={24} md={12}>
                <Text strong>Student: </Text>
                <Text>{selectedResult.studentName}</Text>
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Roll Number: </Text>
                <Text>{selectedResult.rollNumber}</Text>
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Class: </Text>
                <Text>{selectedResult.className}</Text>
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Exam Date: </Text>
                <Text>{new Date(selectedResult.examDate).toLocaleDateString('en-IN')}</Text>
              </Col>
            </Row>

            <Divider />

            {/* Subject-wise Results */}
            <Title level={5}>Subject-wise Performance</Title>
            <Table
              dataSource={selectedResult.subjects}
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Subject',
                  dataIndex: 'name',
                  key: 'name',
                },
                {
                  title: 'Max Marks',
                  dataIndex: 'maxMarks',
                  key: 'maxMarks',
                  align: 'center'
                },
                {
                  title: 'Obtained',
                  dataIndex: 'obtainedMarks',
                  key: 'obtainedMarks',
                  align: 'center'
                },
                {
                  title: 'Percentage',
                  key: 'percentage',
                  align: 'center',
                  render: (_, record) => 
                    `${Math.round((record.obtainedMarks / record.maxMarks) * 100)}%`
                },
                {
                  title: 'Grade',
                  dataIndex: 'grade',
                  key: 'grade',
                  align: 'center',
                  render: (grade) => (
                    <Tag color={getGradeColor(grade)}>{grade}</Tag>
                  )
                }
              ]}
            />

            <Divider />

            {/* Overall Performance */}
            <Row gutter={[16, 16]} style={{ textAlign: 'center' }}>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Total Marks"
                  value={`${selectedResult.totalObtainedMarks}/${selectedResult.totalMaxMarks}`}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Percentage"
                  value={selectedResult.percentage}
                  suffix="%"
                  precision={1}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Class Rank"
                  value={`${selectedResult.rank}${getRankSuffix(selectedResult.rank)}`}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
            </Row>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Tag color={getGradeColor(selectedResult.overallGrade)} style={{ fontSize: '16px', padding: '8px 16px' }}>
                Overall Grade: {selectedResult.overallGrade}
              </Tag>
            </div>

            {selectedResult.remarks && (
              <>
                <Divider />
                <div>
                  <Text strong>Teacher's Remarks: </Text>
                  <br />
                  <Text italic>{selectedResult.remarks}</Text>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </Content>
  );
};

export default Results;