import { useRouter } from 'next/router';
import React, { useState, useEffect } from 'react';
import { Typography, Card, Space, Table, Button, Spin, message } from 'antd';
import { 
  PlayCircleOutlined, 
  FormOutlined, 
  QuestionCircleOutlined,
  VideoCameraAddOutlined,
  EyeOutlined,
  EditOutlined
} from '@ant-design/icons';
import { AdminLayout } from '../src/components/layouts/admin-layout';
import { withAdminAuth } from '../src/components/auth/with-admin-auth';

const { Text } = Typography;

// 1. Define the TypeScript interfaces for data
interface TableItem {
  key: string;
  title: string;
  uploadDate: string;
}

interface DashboardStats {
  totalVideos: number;
  totalBlogs: number;
  totalFaqs: number;
}

const Dashboard = () => {
  const router = useRouter(); 
  const [activeTab, setActiveTab] = useState('Video');
  
  // 2. Apply the interfaces to state variables
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ totalVideos: 0, totalBlogs: 0, totalFaqs: 0 });
  const [tableData, setTableData] = useState<TableItem[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        /* =========================================================
           DATABASE CONNECTION INSTRUCTIONS
           =========================================================
           
           STEP 1: Delete the "Fake data for testing" block below 
                   (the whole setTimeout function).
           
           STEP 2: Uncomment the real API code block below.
           
           STEP 3: Change 'https://your-api.com/...' to your actual 
                   backend URLs.
        ========================================================= */

        /* 
          // --- REAL API CODE (Uncomment when ready) ---
          const statsResponse = await fetch('https://your-api.com/v1/dashboard/stats');
          const realStats = await statsResponse.json();
          
          const recentResponse = await fetch(`https://your-api.com/v1/dashboard/recent?type=${activeTab}`);
          const realRecentData = await recentResponse.json();

          setStats(realStats);
          setTableData(realRecentData);
        */

        // --- Fake data for testing (Delete this block when connecting DB) ---
        setTimeout(() => {
          setStats({ totalVideos: 0, totalBlogs: 0, totalFaqs: 0}); // Added fake numbers so the dashboard isn't 0
          
          if (activeTab === 'Video') {
            setTableData([
              { key: '1', title: 'Quotation Workflow', uploadDate: '20 Aug 2026' },
              { key: '2', title: 'What is enquiry', uploadDate: '18 Aug 2026' },
            ]);
          } else if (activeTab === 'Blog') {
            setTableData([
              { key: '1', title: '5 Sales Tips', uploadDate: '19 Aug 2026' },
            ]);
          } else {
            setTableData([]);
          }
          setLoading(false);
        }, 1000);
        // --- End Fake data ---

      } catch (error) {
        console.error("Failed to fetch data:", error);
        message.error("Could not load dashboard data.");
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [activeTab]);

  const summaryCards = [
    { title: 'Total Video', count: stats.totalVideos, icon: <PlayCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} /> },
    { title: 'Total Blog', count: stats.totalBlogs, icon: <FormOutlined style={{ color: '#52c41a', fontSize: '24px' }} /> },
    { title: 'Total FAQs', count: stats.totalFaqs, icon: <QuestionCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} /> },
  ];

  const quickActions = [
    { title: 'Upload new Video', desc: 'add new educational video', path: '/upload-video', icon: <VideoCameraAddOutlined style={{ color: '#52c41a', fontSize: '28px' }} /> },
    { title: 'Upload new Blog', desc: 'Write and publish a blog', path: '/upload-blog', icon: <FormOutlined style={{ color: '#000', fontSize: '28px' }} /> },
    { title: 'Upload new FAQs', desc: 'Create new FAQ', path: '/upload-faq', icon: <QuestionCircleOutlined style={{ color: '#52c41a', fontSize: '28px' }} /> }, 
  ];

  const tableColumns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => (
        <Space>
          <div style={{ width: 60, height: 40, backgroundColor: '#e6f7ff', borderRadius: 4, border: '1px solid #d9d9d9' }} />
          <Text strong style={{ color: '#000' }}>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Upload date',
      dataIndex: 'uploadDate', 
      key: 'uploadDate',
      render: (text: string) => <Text style={{ color: '#000' }}>{text}</Text>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Space size="middle">
          <Button type="text" icon={<EyeOutlined style={{ color: '#000', fontSize: '16px' }} />} />
          <Button type="text" icon={<EditOutlined style={{ color: '#000', fontSize: '16px' }} />} />
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <style>{`
        .lively-card {
          transition: all 0.3s ease;
        }
        .lively-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
          border-color: transparent !important;
          transform: translateY(-2px);
        }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#000' }}>Welcome, Admin!</div>
        <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>Review the complete set of uploaded data</Text>
      </div>

      {/* SUMMARY CARDS */}
      <Spin spinning={loading}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {summaryCards.map((card, index) => (
            <Card 
              key={index}
              className="lively-card" 
              styles={{ body: { padding: '16px' } }} 
              style={{ width: '220px', borderRadius: '10px', border: '1px solid #b7eb8f', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: 48, height: 48, backgroundColor: '#f6ffed', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                    {card.icon}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#000' }}>{card.title}</div>
                    <div style={{ fontWeight: 600, fontSize: '24px', color: '#52c41a', lineHeight: 1.2 }}>{card.count}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginTop: '8px' }}>
                  <a href="#" style={{ color: '#52c41a', fontSize: '11px', fontWeight: 600 }}>View all</a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Spin>

      {/* QUICK ACTIONS */}
      <div style={{ fontSize: '16px', fontWeight: 700, color: '#000', marginBottom: 16 }}>Quick action</div>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {quickActions.map((action, index) => (
          <Card 
            key={index}
            className="lively-card"
            onClick={() => router.push(action.path)} 
            styles={{ body: { display: 'flex', alignItems: 'center', gap: '15px', padding: '16px 20px' } }} 
            style={{ 
              width: '280px', 
              borderRadius: '8px', 
              border: '1px solid #b7eb8f',
              cursor: 'pointer' 
            }}
          >
            {action.icon}
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#000' }}>{action.title}</div>
              <div style={{ color: '#8c8c8c', fontSize: '11px', marginTop: '2px' }}>{action.desc}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* RECENTLY UPLOADED CONTENT */}
      <div style={{ fontSize: '16px', fontWeight: 700, color: '#000', marginBottom: 16 }}>Recently uploaded content</div>
      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '20px', backgroundColor: '#fff' }}>
        
        <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
          {['Video', 'Blog', 'FAQs'].map((tab) => (
            <div 
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ padding: '6px 24px', backgroundColor: activeTab === tab ? '#52c41a' : '#f0f0f0', color: activeTab === tab ? '#fff' : '#595959', cursor: 'pointer', fontWeight: activeTab === tab ? 600 : 500, fontSize: '13px', borderRadius: '2px' }}
            >
              {tab}
            </div>
          ))}
        </div>

        <Table 
          columns={tableColumns} 
          dataSource={tableData} 
          pagination={false} 
          bordered={false}
          loading={loading}
          locale={{ emptyText: loading ? 'Loading...' : `No ${activeTab}s uploaded yet.` }}
        />
        
      </div>
    </AdminLayout>
  );
};

export default withAdminAuth(Dashboard);