/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import {
  PlayCircleFilled,
  EyeOutlined,
} from '@ant-design/icons';
import {
  App as AntApp,
  Button,
  Card,
  Flex,
  Input,
  Table,
  Space,
  Spin,
  Typography,
} from 'antd';
import dayjs from 'dayjs';

import videoThumbnail from '@/assets/default.svg';
import { UserLayout } from '@/layouts/UserLayout';
import { withAuth } from '@/components/auth/with-auth';
import PageLoading from '@/components/common/PageLoading';
import { useCurrentUser } from '@/hooks/useAuth';
import { useClampedRows } from '@/hooks/useClampedRows';
import useNewBadge from '@/hooks/useNewBadge';
import { ROUTE_PATHS, VIDEO_PREVIEW_STORAGE_KEY } from '@/constants';
import {
  getContinueLearning,
  getLibraryBlogs,
  getLibraryFaqs,
  getLibraryVideos,
  type ContinueLearningData,
} from '@/services/libraryService';
import { submitFeedback } from '@/services/feedbackService';
import { mediaUrl, contentThumbnail } from '@/utils/media';
import { ViewFAQModal } from '@/components/common/ViewFAQModal';
import NewBadge from '@/components/common/NewBadge';
import ClampedCellText from '@/components/common/ClampedCellText';

const { Title, Text, Paragraph } = Typography;

interface LibraryTableItem {
  key: string;
  title: string;
  createdAt: string;
  createdByName: string;
  category?: string;
  thumbnailUrl?: string;
  question?: string;
  answer?: string;
  description?: string;
  videoUrl?: string;
  processingStatus?: string;
  isNew?: boolean;
}

const UserDashboardPage = () => {
  const router = useRouter();
  const { message } = AntApp.useApp();
  const currentUser = useCurrentUser();
  const rawUserName = currentUser?.fullName || currentUser?.username || 'User';
  const userDisplayName = rawUserName.charAt(0).toUpperCase() + rawUserName.slice(1);

  // Feedback email comes from the authenticated account and is read-only; the
  // server stamps it from the token, so the field is informational only.
  const accountEmail = currentUser?.email || '';
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);

  const [activeTab, setActiveTab] = useState('Video');
  const [loading, setLoading] = useState(true);
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [recentVideos, setRecentVideos] = useState<LibraryTableItem[]>([]);
  const [recentBlogs, setRecentBlogs] = useState<LibraryTableItem[]>([]);
  const [recentFaqs, setRecentFaqs] = useState<LibraryTableItem[]>([]);
  const [continueData, setContinueData] = useState<ContinueLearningData | null>(null);
  const [viewingFaq, setViewingFaq] = useState<LibraryTableItem | null>(null);
  const libraryClamp = useClampedRows();
  const recentClamp = useClampedRows();

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isEmailValid = isValidEmail(accountEmail);

  const handleSendMessage = async () => {
    const feedbackMessageTrimmed = feedbackMessage.trim();
    if (feedbackSending || !isEmailValid || !feedbackMessageTrimmed) return;

    setFeedbackSending(true);
    try {
      await submitFeedback(feedbackMessageTrimmed);
      setFeedbackMessage("");
      message.success("Message sent successfully!");
    } catch (error: any) {
      message.error(error.message || 'Failed to send your message. Please try again.');
    } finally {
      setFeedbackSending(false);
    }
  };

  const handleSearchSubmit = (value: string) => {
    const query = value.trim();
    if (!query) return;
    router.push({
      pathname: ROUTE_PATHS.search,
      query: { q: query },
    });
  };

  const handleContinueVideo = () => {
    const cv = continueData?.continueVideo;
    if (!cv?.video?.key) return;
    sessionStorage.setItem(
      VIDEO_PREVIEW_STORAGE_KEY,
      JSON.stringify({
        id: cv.video.key,
        title: cv.video.title,
        description: cv.video.description || '',
        src: cv.video.videoUrl ? mediaUrl(cv.video.videoUrl) : '',
      })
    );
    router.push(ROUTE_PATHS.userVideoPreview);
  };

  const fetchVideoLibrary = useCallback(async () => {
    try {
      const data = await getLibraryVideos({ page: 1, limit: 4 });
      setRecentVideos(
        (data.videos ?? []).filter((v) => v.processingStatus !== 'failed').map((v) => ({
          key: v.key,
          title: v.title,
          createdAt: v.createdAt,
          createdByName: v.createdBy,
          category: v.category,
          thumbnailUrl: v.thumbnailUrl,
          description: v.description,
          videoUrl: v.videoUrl,
          processingStatus: v.processingStatus,
          isNew: v.isNew,
        }))
      );
    } catch (error: any) {
      message.error(error.message || 'Failed to load videos.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  const fetchBlogLibrary = useCallback(async () => {
    try {
      const data = await getLibraryBlogs({ page: 1, limit: 4 });
      setRecentBlogs(
        (data.blogs ?? []).map((b) => ({
          key: b._id,
          title: b.title,
          createdAt: b.createdAt,
          createdByName: b.createdBy?.fullName || b.createdBy?.username || 'Unknown',
          category: b.category,
          thumbnailUrl: b.thumbnail,
          isNew: b.isNew,
        }))
      );
    } catch (error: any) {
      message.error(error.message || 'Failed to load blogs.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  const fetchFaqLibrary = useCallback(async () => {
    try {
      const data = await getLibraryFaqs({ page: 1, limit: 4 });
      setRecentFaqs(
        (data.faqs ?? []).map((f) => ({
          key: f._id,
          title: f.question,
          createdAt: f.createdAt,
          createdByName: f.createdBy?.fullName || f.createdBy?.username || 'Unknown',
          category: f.category,
          question: f.question,
          answer: f.answer,
          isNew: f.isNew,
        }))
      );
    } catch (error: any) {
      message.error(error.message || 'Failed to load FAQs.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  // Load the continue-learning / recently-viewed payload once on mount.
  useEffect(() => {
    getContinueLearning()
      .then((data) => setContinueData(data))
      .catch(() => {
        // Continue card falls back to the empty state; the library still works.
      });
  }, []);

  // Scroll to a specific section when returning from a preview page.
  useEffect(() => {
    const section = router.query.section as string | undefined;
    if (section && router.isReady) {
      const timer = setTimeout(() => {
        document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [router.query.section, router.isReady]);

  useEffect(() => {
    const load = async () => {
      if (activeTab === 'Video') await fetchVideoLibrary();
      else if (activeTab === 'Blog') await fetchBlogLibrary();
      else await fetchFaqLibrary();
    };
    void load();
  }, [activeTab, fetchVideoLibrary, fetchBlogLibrary, fetchFaqLibrary]);

  const activeRecentData: LibraryTableItem[] =
    activeTab === 'Video'
      ? recentVideos
      : activeTab === 'Blog'
      ? recentBlogs
      : recentFaqs;

  const contentType = activeTab === 'Video' ? 'video' : activeTab === 'Blog' ? 'blog' : 'faq';
  const { isNew, isFading } = useNewBadge(contentType, activeRecentData.map(d => ({ _id: d.key, isNew: d.isNew })));

  const libraryViewAll =
    activeTab === 'Video'
      ? ROUTE_PATHS.userVideos
      : activeTab === 'Blog'
      ? ROUTE_PATHS.userBlogs
      : ROUTE_PATHS.userFaqs;

  const tableColumns = [
    {
      title: (
        <Flex align="center" gap={8}>
          <span>Title</span>
          <Button type="link" onClick={() => router.push(libraryViewAll)} className="dash-view-link" style={{ padding: 0, fontSize: 13 }}>
            (View All)
          </Button>
        </Flex>
      ),
      dataIndex: 'title',
      key: 'title',
      width: '38%',
      render: (text: string, record: LibraryTableItem) => (
        <Space size="middle">
          {activeTab !== 'FAQs' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img
                src={contentThumbnail(record.thumbnailUrl)}
                alt={text}
                style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }}
              />
              {isNew(record.key) && <NewBadge fading={isFading} />}
            </div>
          ) : (
            <div>
              <ClampedCellText
                text={text}
                expanded={libraryClamp.isExpanded(record.key)}
                onToggle={() => libraryClamp.toggle(record.key)}
              />
              {isNew(record.key) && <NewBadge fading={isFading} />}
            </div>
          )}
          {activeTab !== 'FAQs' && (
            <ClampedCellText
              text={text}
              expanded={libraryClamp.isExpanded(record.key)}
              onToggle={() => libraryClamp.toggle(record.key)}
            />
          )}
        </Space>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: '15%',
      render: (text: string) => <Text>{text}</Text>
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '18%',
      render: (text: string) => <Text>{dayjs(text).format('DD/MM/YY')}</Text>
    },
    {
      title: 'Created By',
      dataIndex: 'createdByName',
      key: 'createdByName',
      width: '17%',
      render: (text: string) => <Text>{text}</Text>
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '12%',
      render: (_: unknown, record: LibraryTableItem) => {
        const status = record.processingStatus;
        const processing = status && status !== 'ready' && status !== 'failed';
        return (
          <Space size="middle">
            <Button
              type="text"
              disabled={Boolean(processing)}
              title={processing ? 'Processing video...' : 'View'}
              icon={<EyeOutlined style={{ color: '#000', fontSize: '16px' }} />}
              onClick={() => {
                if (activeTab === 'FAQs') {
                  setViewingFaq(record);
                } else if (activeTab === 'Video') {
                  sessionStorage.setItem(
                    VIDEO_PREVIEW_STORAGE_KEY,
                    JSON.stringify({
                      id: record.key,
                      title: record.title,
                      description: record.description || '',
                      src: record.videoUrl ? mediaUrl(record.videoUrl) : '',
                    })
                  );
                  router.push(`${ROUTE_PATHS.userVideoPreview}?from=dashboard&section=latest-content`);
                } else {
                  router.push(`${ROUTE_PATHS.userBlogPreview}?id=${record.key}&from=dashboard&section=latest-content`);
                }
              }}
            />
          </Space>
        );
      },
    },
  ];

  return (
    <UserLayout activeKey={ROUTE_PATHS.userDashboard}>
      <div className="user-dashboard-page">
        <div className="user-dashboard-header">
          <Text strong style={{ fontSize: "18px" }}>Welcome, {userDisplayName}!</Text>
        </div>

        <div style={{ padding: "12px 32px" }}>
          <div style={{ background: "#fff", borderRadius: 8, padding: 24 }}>
            {/* Search and Quick Actions */}
            <Flex vertical align="center" style={{ textAlign: "center", marginBottom: 24 }}>
              <Title level={2}>What would you like to learn?</Title>
              <Input.Search
                className="user-dashboard-search"
                placeholder="search..."
                size="large"
                value={dashboardSearch}
                onChange={(e) => setDashboardSearch(e.target.value)}
                onSearch={handleSearchSubmit}
                allowClear
              />
            </Flex>

            {/* Continue Learning Card */}
            <Card className="user-continue-card">
              {continueData?.continueVideo?.video ? (
                <Flex align="center" gap={16} wrap="wrap">
                  <div className="user-continue-thumbnail" onClick={handleContinueVideo} style={{ cursor: 'pointer' }}>
                    <img
                      src={contentThumbnail(continueData.continueVideo.video.thumbnailUrl)}
                      alt="Continue learning"
                    />
                    <span className="user-thumbnail-play"><PlayCircleFilled /></span>
                  </div>
                  <Flex vertical style={{ flex: 1, minWidth: 240 }}>
                    <Title level={4} style={{ fontWeight: 700, marginBottom: 4 }}>Continue learning</Title>
                    <Text strong ellipsis style={{ marginBottom: 4 }}>
                      {continueData.continueVideo.video.title}
                    </Text>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }} ellipsis={{ rows: 2 }}>
                      {continueData.continueVideo.video.description || 'No description provided.'}
                    </Paragraph>
                  </Flex>
                  <Button
                    type="primary"
                    ghost
                    icon={<PlayCircleFilled />}
                    style={{ borderRadius: 6 }}
                    onClick={handleContinueVideo}
                  >
                    Continue
                  </Button>
                </Flex>
              ) : (
                <Flex align="center" gap={16}>
                  <div className="user-continue-thumbnail">
                    <img src={videoThumbnail.src} alt="Continue learning" />
                  </div>
                  <Flex vertical style={{ flex: 1 }}>
                    <Title level={4} style={{ fontWeight: 700, marginBottom: 4 }}>Continue learning</Title>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                      Start watching a video and we&apos;ll pick up right where you left off.
                    </Paragraph>
                  </Flex>
                  <Button
                    type="primary"
                    ghost
                    icon={<PlayCircleFilled />}
                    style={{ borderRadius: 6 }}
                    onClick={() => router.push(ROUTE_PATHS.userVideos)}
                  >
                    Browse videos
                  </Button>
                </Flex>
              )}
            </Card>

            {/* Recently Viewed */}
            {continueData?.recentlyViewed?.length ? (
              <div id="recently-viewed" style={{ marginTop: 24 }}>
                <div className="dash-section-title" style={{ fontWeight: 700 }}>Recently Viewed</div>
                <div className="dash-recent-box">
                  <Spin spinning={loading}>
                    <Table
                      columns={[
                        {
                          title: 'Title',
                          dataIndex: 'title',
                          key: 'title',
                          render: (text: string, record: any) => (
                            <Space size="middle">
                              {record.thumbnail && (
                                <img
                                  src={contentThumbnail(record.thumbnail)}
                                  alt={text}
                                  style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }}
                                />
                              )}
                              <ClampedCellText
                                text={text}
                                expanded={recentClamp.isExpanded(record.contentId)}
                                onToggle={() => recentClamp.toggle(record.contentId)}
                              />
                            </Space>
                          ),
                        },
                        {
                          title: 'Type',
                          dataIndex: 'type',
                          key: 'type',
                          width: '15%',
                          render: (text: string) => <Text>{text === 'faq' ? 'FAQ' : 'Blog'}</Text>,
                        },
                        {
                          title: 'Viewed',
                          dataIndex: 'viewedAt',
                          key: 'viewedAt',
                          width: '18%',
                          render: (text: string) => <Text>{text ? dayjs(text).format('DD/MM/YY') : '—'}</Text>,
                        },
                        {
                          title: 'Actions',
                          key: 'actions',
                          width: '12%',
                          render: (_: unknown, record: any) => (
                            <Button
                              type="text"
                              title="View"
                              icon={<EyeOutlined style={{ color: '#000', fontSize: '16px' }} />}
                              onClick={() => {
                                if (record.type === 'faq') {
                                  setViewingFaq({
                                    key: record.contentId,
                                    title: record.title,
                                    createdAt: record.viewedAt,
                                    createdByName: '',
                                    question: record.title,
                                    answer: record.text,
                                  });
                                } else {
                                  router.push(`${ROUTE_PATHS.userBlogPreview}?id=${record.contentId}&from=dashboard&section=recently-viewed`);
                                }
                              }}
                            />
                          ),
                        },
                      ]}
                      dataSource={continueData.recentlyViewed}
                      rowKey="contentId"
                      pagination={false}
                      bordered={false}
                      tableLayout="fixed"
                    />
                  </Spin>
                </div>
              </div>
            ) : null}

            {/* Content Library */}
            <div id="latest-content" style={{ marginTop: 40 }}>
              <div className="dash-section-title" style={{ fontWeight: 700 }}>Latest Content</div>
              <div className="dash-recent-box">
                <div className="dash-tabs">
                  {['Video', 'Blog', 'FAQs'].map((tab) => (
                    <div
                      key={tab}
                      onClick={() => {
                        if (tab !== activeTab) {
                          setLoading(true);
                          setActiveTab(tab);
                        }
                      }}
                      className={`dash-tab${activeTab === tab ? ' dash-tab-active' : ''}`}
                    >
                      {tab}
                    </div>
                  ))}
                </div>
                {loading && <PageLoading />}
                <Table
                  columns={tableColumns}
                  dataSource={activeRecentData}
                  rowKey="key"
                  loading={false}
                  pagination={false}
                  bordered={false}
                  tableLayout="fixed"
                  locale={{ emptyText: loading ? 'Loading...' : `No ${activeTab === 'FAQs' ? 'FAQs' : activeTab + 's'} available yet.` }}
                />
              </div>
            </div>

            {/* Feedback Form */}
            <Flex id="feedback" vertical align="center" gap={16} style={{ marginTop: 48, marginBottom: 40 }}>
              <Title level={2} style={{ color: "#52c41a", marginBottom: 0, fontWeight: 700 }}>Have a Question or Feedback?</Title>
              <Paragraph style={{ textAlign: "center", marginBottom: 24, color: "#000", fontSize: "18px", fontWeight: 600, maxWidth: 600 }}>
                Have a doubt, suggestion, or feedback? Share it with us. Your input helps us improve your learning experience.
              </Paragraph>
              <Flex vertical gap={24} style={{ width: "100%", maxWidth: 600 }}>
                <Flex vertical gap={8}>
                  <Text strong style={{ fontSize: "16px" }}>Email</Text>
                  <Input
                    size="large"
                    value={accountEmail}
                    disabled
                    placeholder="your@email.com"
                  />
                </Flex>
                <Flex vertical gap={8}>
                  <Text strong style={{ fontSize: "16px" }}>Message</Text>
                  <Input.TextArea
                    rows={5}
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    maxLength={2000}
                    showCount
                    placeholder="Tell us your question, suggestion, or feedback..."
                  />
                </Flex>
                <Button type="primary" disabled={!isEmailValid || !feedbackMessage.trim()} loading={feedbackSending} style={{ width: 160, height: 42, borderRadius: 8, backgroundColor: "#52c41a", borderColor: "#52c41a", fontWeight: 600, fontSize: "15px" }} onClick={handleSendMessage}>
                  Send
                </Button>
              </Flex>
            </Flex>
          </div>
        </div>
      </div>

      {/* VIEW FAQ MODAL */}
      <ViewFAQModal
        open={Boolean(viewingFaq)}
        question={viewingFaq?.question}
        answer={viewingFaq?.answer}
        onClose={() => setViewingFaq(null)}
      />
    </UserLayout>
  );
};

export default withAuth(UserDashboardPage);