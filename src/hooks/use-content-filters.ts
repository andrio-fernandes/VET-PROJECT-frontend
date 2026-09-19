import { useState } from 'react';

// Shared pagination + module/category filter state for content list pages.
export const useContentFilters = (onReset?: () => void) => {
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const onModuleChange = (value: string) => {
    setModuleFilter(value);
    setCategoryFilter('All');
    onReset?.();
    setPage(1);
  };

  const onCategoryChange = (value: string) => {
    setCategoryFilter(value);
    onReset?.();
    setPage(1);
  };

  return {
    page,
    setPage,
    moduleFilter,
    setModuleFilter,
    categoryFilter,
    setCategoryFilter,
    onModuleChange,
    onCategoryChange,
  };
};