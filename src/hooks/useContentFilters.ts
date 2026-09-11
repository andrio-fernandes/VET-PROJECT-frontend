import { useState } from 'react';

// Shared pagination + module/category filter state for the content list
// pages. onReset runs when a filter change resets back to page 1 (the FAQ
// list, for example, also toggles its loading spinner).
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