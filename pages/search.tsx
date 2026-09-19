/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { App as AntApp, Button, Spin } from "antd";
import { SearchOutlined, CloseCircleFilled } from "@ant-design/icons";
import Link from "next/link";

import { UserLayout } from "@/layouts/user-layout";
import { ROUTE_PATHS, VIDEO_PREVIEW_STORAGE_KEY } from "@/constants";
import { withAuth } from "@/components/auth/with-auth";
import {
  getLibraryBlogs,
  getLibraryFaqs,
  getLibraryVideos,
  markViewed,
} from "@/services/library-service";
import { contentThumbnail } from "@/utils/media";
import type { FaqRecord } from "@/types/faq";
import type { BlogListItem } from "@/types/blog";
import type { VideoRecord } from "@/types/video";

interface SearchResult {
  type: "video" | "blog" | "faq";
  _id: string;
  title: string;
  description: string;
  thumbnail?: string;
  module?: string;
  category?: string;
  createdAt: string;
  question?: string;
  answer?: string;
}

const ITEMS_PER_PAGE = 10;
const ALL_TAB_MAX_PER_TYPE = 4;
const ALL_TAB_STEP = 4;
const INITIAL_SECTION_LIMITS: Record<SearchResult["type"], number> = {
  video: ALL_TAB_MAX_PER_TYPE,
  blog: ALL_TAB_MAX_PER_TYPE,
  faq: ALL_TAB_MAX_PER_TYPE,
};

function SearchPage() {
  const { message } = AntApp.useApp();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [resultsByType, setResultsByType] = useState<
    Record<SearchResult["type"], SearchResult[]>
  >({ video: [], blog: [], faq: [] });
  const [totals, setTotals] = useState<Record<SearchResult["type"], number>>({
    video: 0,
    blog: 0,
    faq: 0,
  });
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [sectionLimits, setSectionLimits] =
    useState<Record<SearchResult["type"], number>>(INITIAL_SECTION_LIMITS);
  const [expandedFaqIds, setExpandedFaqIds] = useState<Set<string>>(new Set());

  // Server result mappers
  const toFaqResult = (faq: FaqRecord): SearchResult => {
    const answer = faq.answer || "";
    return {
      type: "faq",
      _id: faq._id,
      title: faq.question,
      description:
        answer.substring(0, 150) + (answer.length > 150 ? "..." : ""),
      module: faq.module,
      category: faq.category,
      createdAt: faq.createdAt,
      question: faq.question,
      answer,
    };
  };

  const toVideoResult = (video: VideoRecord): SearchResult => ({
    type: "video",
    _id: video.key,
    title: video.title,
    description: video.description,
    thumbnail: video.thumbnailUrl,
    module: video.module,
    category: video.category,
    createdAt: video.createdAt,
  });

  const toBlogResult = (blog: BlogListItem): SearchResult => ({
    type: "blog",
    _id: blog._id,
    title: blog.title,
    description: blog.description,
    thumbnail: blog.thumbnail,
    module: blog.module,
    category: blog.category,
    createdAt: blog.createdAt,
  });

  // Pre-fill search box from URL query param and restore active tab.
  useEffect(() => {
    const syncQuery = async () => {
      await Promise.resolve();
      const query = router.query.q as string;
      if (query) {
        setSearchQuery(query);
      }
      const tab = router.query.tab as string;
      if (tab && ['all', 'videos', 'blogs', 'faqs'].includes(tab)) {
        setActiveTab(tab);
      }
    };
    void syncQuery();
  }, [router.query.q, router.query.tab]);

  // Debounce keystrokes to avoid per-character backend queries.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const tabType =
    activeTab === "videos"
      ? "video"
      : activeTab === "blogs"
        ? "blog"
        : activeTab === "faqs"
          ? "faq"
          : null;

  // Server-side search with per-section limits and true totals.
  const searchContent = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const q = debouncedQuery.trim() || undefined;

        if (activeTab === "all") {
          const [faqResult, videoResult, blogResult] = await Promise.allSettled([
            getLibraryFaqs({ page: 1, limit: sectionLimits.faq, q, fullText: true }, { signal }),
            getLibraryVideos({ page: 1, limit: sectionLimits.video, q, fullText: true }, { signal }),
            getLibraryBlogs({ page: 1, limit: sectionLimits.blog, q, fullText: true }, { signal }),
          ]);

          setResultsByType({
            video:
              videoResult.status === "fulfilled"
                ? videoResult.value.videos
                    .filter((v) => v.processingStatus !== "failed")
                    .map(toVideoResult)
                : [],
            blog:
              blogResult.status === "fulfilled"
                ? blogResult.value.blogs.map(toBlogResult)
                : [],
            faq:
              faqResult.status === "fulfilled"
                ? faqResult.value.faqs.map(toFaqResult)
                : [],
          });
          setTotals({
            video:
              videoResult.status === "fulfilled" ? videoResult.value.totalVideos : 0,
            blog:
              blogResult.status === "fulfilled" ? blogResult.value.totalBlogs : 0,
            faq:
              faqResult.status === "fulfilled" ? faqResult.value.totalFaqs : 0,
          });
          return;
        }

        const type: SearchResult["type"] = tabType ?? "faq";
        if (type === "faq") {
          const res = await getLibraryFaqs({ page: 1, limit: visibleCount, q, fullText: true }, { signal });
          setResultsByType((prev) => ({ ...prev, faq: res.faqs.map(toFaqResult) }));
          setTotals((prev) => ({ ...prev, faq: res.totalFaqs }));
        } else if (type === "video") {
          const res = await getLibraryVideos({ page: 1, limit: visibleCount, q, fullText: true }, { signal });
          setResultsByType((prev) => ({
            ...prev,
            video: res.videos
              .filter((v) => v.processingStatus !== "failed")
              .map(toVideoResult),
          }));
          setTotals((prev) => ({ ...prev, video: res.totalVideos }));
        } else {
          const res = await getLibraryBlogs({ page: 1, limit: visibleCount, q, fullText: true }, { signal });
          setResultsByType((prev) => ({ ...prev, blog: res.blogs.map(toBlogResult) }));
          setTotals((prev) => ({ ...prev, blog: res.totalBlogs }));
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        console.error("Failed to search content:", error);
        message.error("Failed to load content");
      } finally {
        setLoading(false);
      }
    },
    [activeTab, debouncedQuery, sectionLimits, tabType, visibleCount, message]
  );

  // Re-query on search changes; abort previous request.
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      await Promise.resolve();
      await searchContent(controller.signal);
    };
    void run();
    return () => controller.abort();
  }, [searchContent]);

  // "All" tab: group results by type, drop empty types.
  const groupedAllResults: { type: SearchResult["type"]; label: string; items: SearchResult[] }[] = ([
    { type: "video", label: "Videos" },
    { type: "blog", label: "Blogs" },
    { type: "faq", label: "FAQs" },
  ] as const)
    .map((group) => ({
      ...group,
      items: resultsByType[group.type],
    }))
    .filter((group) => group.items.length > 0);

  // "All" tab FAQ column.
  const visibleFaqs = resultsByType.faq;

  // Check if section has more items to load.
  const hasMoreByType = (type: SearchResult["type"]): boolean =>
    sectionLimits[type] < totals[type];

  const visibleResults = tabType ? resultsByType[tabType] : [];
  const hasMoreResults = tabType ? visibleCount < totals[tabType] : false;

  // Keep results mounted during search to avoid full-screen loader.
  const hasAnyResult =
    activeTab === "all"
      ? groupedAllResults.length > 0 || visibleFaqs.length > 0
      : visibleResults.length > 0;

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setVisibleCount(ITEMS_PER_PAGE);
    setSectionLimits(INITIAL_SECTION_LIMITS);
    setExpandedFaqIds(new Set());
    const query: Record<string, string> = {};
    if (searchQuery) query.q = searchQuery;
    if (key !== 'all') query.tab = key;
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  };

  const handleSeeMoreResults = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const handleSeeMoreSection = (type: SearchResult["type"]) => {
    setSectionLimits((prev) => ({ ...prev, [type]: prev[type] + ALL_TAB_STEP }));
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    // New query: collapse accordions and reset limits.
    setExpandedFaqIds(new Set());
    setSectionLimits(INITIAL_SECTION_LIMITS);
    setVisibleCount(ITEMS_PER_PAGE);
    // Persist query in URL for navigation.
    const query: Record<string, string> = {};
    if (value) query.q = value;
    if (activeTab !== 'all') query.tab = activeTab;
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  };

  const renderResultCard = (result: SearchResult) => {
    const hasImage = result.type === "video" || result.type === "blog";
    const thumbnailUrl = hasImage ? contentThumbnail(result.thumbnail) : null;

    return (
      <div
        key={`${result.type}-${result._id}`}
        className="search-result-card"
        onClick={() => handleResultClick(result)}
        style={{ cursor: "pointer" }}
      >
        {hasImage && (
          <div className="search-result-thumbnail">
            <img src={thumbnailUrl!} alt={result.title} />
          </div>
        )}
        <div className="search-result-content">
          <div className="search-result-title">{result.title}</div>
          <div className="search-result-description">
            Description: {result.description}
          </div>
        </div>
      </div>
    );
  };

  const toggleFaqExpand = (id: string) => {
    setExpandedFaqIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        markViewed('faq', id).catch(() => {});
      }
      return next;
    });
  };

  // All-tab FAQ: question-only accordion with inline answer expansion.
  const renderFaqCard = (result: SearchResult) => {
    const expanded = expandedFaqIds.has(result._id);
    return (
      <div key={result._id} className="question-item">
        <div className="question-text-bold" onClick={() => toggleFaqExpand(result._id)}>
          {result.question || result.title}
        </div>
        {expanded && (
          <div className="question-answer-box" style={{ marginTop: 12 }}>
            {result.answer}
          </div>
        )}
      </div>
    );
  };

  const handleResultClick = (result: SearchResult) => {
    const params = new URLSearchParams();
    params.set('from', 'search');
    if (activeTab !== 'all') params.set('tab', activeTab);
    if (searchQuery) params.set('q', searchQuery);
    const qs = params.toString();
    if (result.type === "video") {
      sessionStorage.setItem(
        VIDEO_PREVIEW_STORAGE_KEY,
        JSON.stringify({
          id: result._id,
          title: result.title,
          description: result.description || "",
        })
      );
      markViewed('video', result._id).catch(() => {});
      router.push(`${ROUTE_PATHS.userVideoPreview}?${qs}`);
    } else if (result.type === "blog") {
      router.push(`${ROUTE_PATHS.userBlogPreview}?id=${result._id}&${qs}`);
    }
  };

  return (
    <>
    <UserLayout activeKey={ROUTE_PATHS.search}>
      <div className="search-page">
        <div className="search-container">
          {/* Back Button + Search Input on same line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Link href={ROUTE_PATHS.userDashboard}>
              <Button
                style={{
                  fontSize: 14,
                  height: 34,
                  padding: '0 16px',
                  borderRadius: 8,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                Back
              </Button>
            </Link>

            {/* Search Input */}
            <div className="search-input-wrapper" style={{ marginBottom: 0, flex: 1 }}>
            <div className="search-input-box">
              <SearchOutlined className="search-icon" />
              <input
                className="search-input-field"
                placeholder="Search by category, title, description..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // New query: collapse accordions and reset limits.
                  setExpandedFaqIds(new Set());
                  setSectionLimits(INITIAL_SECTION_LIMITS);
                  setVisibleCount(ITEMS_PER_PAGE);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) handleSearch(val);
                  }
                }}
              />
              {searchQuery && (
                <CloseCircleFilled
                  className="search-clear-icon"
                  onClick={() => handleSearch("")}
                />
              )}
            </div>
          </div>
          </div>

          {/* Tabs */}
          <div className="search-tabs-bar">
            <div
              className={`search-tab ${activeTab === "all" ? "active" : ""}`}
              onClick={() => handleTabChange("all")}
            >
              All
            </div>
            <div
              className={`search-tab ${activeTab === "videos" ? "active" : ""}`}
              onClick={() => handleTabChange("videos")}
            >
              Videos
            </div>
            <div
              className={`search-tab ${activeTab === "blogs" ? "active" : ""}`}
              onClick={() => handleTabChange("blogs")}
            >
              Blog
            </div>
            <div
              className={`search-tab ${activeTab === "faqs" ? "active" : ""}`}
              onClick={() => handleTabChange("faqs")}
            >
              FAQs
            </div>
          </div>

          {/* Content Layout */}
          <div className="search-content-layout">
            {/* Results Section */}
            <div className="search-results-section">
              {loading && !hasAnyResult ? (
                <div className="search-loading-panel">
                  <Spin size="small" />
                </div>
              ) : (
                <>
                  {activeTab === "all" ? (
                    groupedAllResults.length > 0 ? (
                      groupedAllResults.map((group) => (
                        <div key={group.type} className="search-result-group">
                          <div className="search-result-group-title">{group.label}</div>
                          {group.items.map(group.type === 'faq' ? renderFaqCard : renderResultCard)}
                          {hasMoreByType(group.type) && (
                            <div className="see-more-wrapper">
                              <button className="see-more-btn" onClick={() => handleSeeMoreSection(group.type)}>
                                show more
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="search-empty-state">
                        <span>Result not found</span>
                      </div>
                    )
                  ) : visibleResults.length > 0 ? (
                    <>
                      {visibleResults.map(activeTab === "faqs" ? renderFaqCard : renderResultCard)}

                      {hasMoreResults && (
                        <div className="see-more-wrapper">
                          <button className="see-more-btn" onClick={handleSeeMoreResults}>
                            show more
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="search-empty-state">
                      <span>Result not found</span>
                    </div>
                  )}

                  {loading && (
                    <div className="search-loading-indicator">
                      <Spin size="small" />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </UserLayout>
    </>
  );
}

export default withAuth(SearchPage);