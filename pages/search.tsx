/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { App as AntApp, Spin } from "antd";
import { SearchOutlined, CloseCircleFilled, LoadingOutlined } from "@ant-design/icons";

import { UserLayout } from "@/layouts/UserLayout";
import { ROUTE_PATHS, VIDEO_PREVIEW_STORAGE_KEY } from "@/constants";
import { withAuth } from "@/components/auth/with-auth";
import {
  getLibraryBlogs,
  getLibraryFaqs,
  getLibraryVideos,
} from "@/services/libraryService";
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

  // ── Server result mappers ─────────────────────────────────────
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

  // Pre-fill the box when opened with /search?q=... (load-only; typing never
  // touches the URL).
  useEffect(() => {
    const syncQuery = async () => {
      await Promise.resolve();
      const query = router.query.q as string;
      if (query) {
        setSearchQuery(query);
      }
    };
    void syncQuery();
  }, [router.query.q]);

  // Debounce keystrokes so the backend is queried per settled text, not per
  // character typed.
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

  // Server-side search. Each type is fetched with its current per-section
  // limit so the backend does the matching + pagination and returns only the
  // matching rows plus the true total (which drives the "show more" buttons).
  const searchContent = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const q = debouncedQuery.trim() || undefined;

        if (activeTab === "all") {
          const [faqResult, videoResult, blogResult] = await Promise.allSettled([
            getLibraryFaqs({ page: 1, limit: sectionLimits.faq, q }, { signal }),
            getLibraryVideos({ page: 1, limit: sectionLimits.video, q }, { signal }),
            getLibraryBlogs({ page: 1, limit: sectionLimits.blog, q }, { signal }),
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
          const res = await getLibraryFaqs({ page: 1, limit: visibleCount, q }, { signal });
          setResultsByType((prev) => ({ ...prev, faq: res.faqs.map(toFaqResult) }));
          setTotals((prev) => ({ ...prev, faq: res.totalFaqs }));
        } else if (type === "video") {
          const res = await getLibraryVideos({ page: 1, limit: visibleCount, q }, { signal });
          setResultsByType((prev) => ({
            ...prev,
            video: res.videos
              .filter((v) => v.processingStatus !== "failed")
              .map(toVideoResult),
          }));
          setTotals((prev) => ({ ...prev, video: res.totalVideos }));
        } else {
          const res = await getLibraryBlogs({ page: 1, limit: visibleCount, q }, { signal });
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

  // Every search-relevant change re-queries the backend; the previous in-flight
  // request is aborted so stale responses never overwrite newer ones.
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      await Promise.resolve();
      await searchContent(controller.signal);
    };
    void run();
    return () => controller.abort();
  }, [searchContent]);

  // "All" tab: left column shows Videos + Blogs as their own sections (the
  // server already capped each to sectionLimits[type] rows). FAQs live in the
  // right column (see visibleFaqs below), so no FAQ group is rendered here.
  // Empty types are dropped.
  const groupedAllResults: { type: SearchResult["type"]; label: string; items: SearchResult[] }[] = ([
    { type: "video", label: "Videos" },
    { type: "blog", label: "Blogs" },
  ] as const)
    .map((group) => ({
      ...group,
      items: resultsByType[group.type],
    }))
    .filter((group) => group.items.length > 0);

  // "All" tab right column: matching FAQs returned by the server.
  const visibleFaqs = resultsByType.faq;

  // True server totals decide whether each section still has more to load.
  const hasMoreByType = (type: SearchResult["type"]): boolean =>
    sectionLimits[type] < totals[type];

  const visibleResults = tabType ? resultsByType[tabType] : [];
  const hasMoreResults = tabType ? visibleCount < totals[tabType] : false;

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setVisibleCount(ITEMS_PER_PAGE);
    setSectionLimits(INITIAL_SECTION_LIMITS);
    setExpandedFaqIds(new Set());
  };

  const handleSeeMoreResults = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const handleSeeMoreSection = (type: SearchResult["type"]) => {
    setSectionLimits((prev) => ({ ...prev, [type]: prev[type] + ALL_TAB_STEP }));
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    // New query = fresh results: collapse accordions and reset the sizes sent
    // to the backend as limits.
    setExpandedFaqIds(new Set());
    setSectionLimits(INITIAL_SECTION_LIMITS);
    setVisibleCount(ITEMS_PER_PAGE);
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
      else next.add(id);
      return next;
    });
  };

  // All-tab FAQ column: question-only accordion rows; the answer expands inline
  // below a question only when it is clicked (no modal in this column).
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
    if (result.type === "video") {
      sessionStorage.setItem(
        VIDEO_PREVIEW_STORAGE_KEY,
        JSON.stringify({
          id: result._id,
          title: result.title,
          description: result.description || "",
        })
      );
      router.push(ROUTE_PATHS.userVideoPreview);
    } else if (result.type === "blog") {
      router.push(`${ROUTE_PATHS.userBlogPreview}?id=${result._id}`);
    }
  };

  return (
    <>
    <UserLayout activeKey={ROUTE_PATHS.search}>
      <div className="search-page">
        <div className="search-container">
          {/* Search Input */}
          <div className="search-input-wrapper">
            <div className="search-input-box">
              <SearchOutlined className="search-icon" />
              <input
                className="search-input-field"
                placeholder="Create Quotation"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // New query = fresh results: collapse accordions and reset
                  // the sizes sent to the backend as limits.
                  setExpandedFaqIds(new Set());
                  setSectionLimits(INITIAL_SECTION_LIMITS);
                  setVisibleCount(ITEMS_PER_PAGE);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch((e.target as HTMLInputElement).value);
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
              {loading ? (
                <div className="search-loading">
                  <Spin size="large" indicator={<LoadingOutlined spin />} />
                </div>
              ) : activeTab === "all" ? (
                groupedAllResults.length > 0 ? (
                  groupedAllResults.map((group) => (
                    <div key={group.type} className="search-result-group">
                      <div className="search-result-group-title">{group.label}</div>
                      {group.items.map(renderResultCard)}
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
            </div>

            {/* FAQs (right column, only on the All tab) */}
            {activeTab === "all" && (
              <div className="search-questions-sidebar">
                {visibleFaqs.length > 0 ? (
                  <>
                    <div className="search-result-group-title">FAQs</div>
                    {visibleFaqs.map(renderFaqCard)}
                    {hasMoreByType("faq") && (
                      <div className="see-more-wrapper">
                        <button className="see-more-btn" onClick={() => handleSeeMoreSection("faq")}>
                          show more
                        </button>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>

        </div>
      </div>
    </UserLayout>
    </>
  );
}

export default withAuth(SearchPage);