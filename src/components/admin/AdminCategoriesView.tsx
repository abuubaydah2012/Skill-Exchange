/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { categoryApi } from '../../services/api';
import { CategoryItem, CategorySuggestionItem } from '../../types';
import { Badge } from '../common/Badge';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit2,
  FolderTree,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';

export const AdminCategoriesView: React.FC = () => {
  const { addToast, refreshCategories } = useApp();

  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<CategorySuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCatIds, setExpandedCatIds] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'categories' | 'suggestions'>('categories');

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIcon, setCatIcon] = useState('Folder');
  const [isSaving, setIsSaving] = useState(false);

  // Subcategory inline input
  const [newSubParentId, setNewSubParentId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [catRes, sugRes] = await Promise.all([
        categoryApi.getCategories(true),
        categoryApi.getSuggestions(),
      ]);
      if (catRes.success && Array.isArray(catRes.data)) {
        setAllCategories(catRes.data);
      }
      if (sugRes.success && Array.isArray(sugRes.data)) {
        setSuggestions(sugRes.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openCreateCategory = () => {
    setEditingCat(null);
    setCatName('');
    setCatDesc('');
    setCatIcon('Folder');
    setIsCatModalOpen(true);
  };

  const openEditCategory = (cat: CategoryItem) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatDesc(cat.description || '');
    setCatIcon(cat.icon || 'Folder');
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setIsSaving(true);
    try {
      const res = editingCat
        ? await categoryApi.updateCategory(editingCat.id, {
            name: catName.trim(),
            description: catDesc.trim(),
            icon: catIcon.trim(),
          })
        : await categoryApi.createCategory({
            name: catName.trim(),
            description: catDesc.trim(),
            icon: catIcon.trim(),
          });

      if (res.success) {
        addToast('success', editingCat ? 'Category Updated' : 'Category Created', res.message || 'Saved.');
        setIsCatModalOpen(false);
        await Promise.all([loadAll(), refreshCategories()]);
      } else {
        addToast('error', 'Save Failed', res.message || 'Could not save category.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (cat: CategoryItem) => {
    const res = await categoryApi.updateCategory(cat.id, { isActive: !cat.isActive });
    if (res.success) {
      addToast(
        'info',
        cat.isActive ? 'Category Deactivated' : 'Category Activated',
        `"${cat.name}" is now ${cat.isActive ? 'inactive' : 'active'}.`
      );
      await Promise.all([loadAll(), refreshCategories()]);
    } else {
      addToast('error', 'Update Failed', res.message || 'Could not update category.');
    }
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    const res = await categoryApi.deleteCategory(cat.id);
    if (res.success) {
      addToast('info', 'Category Updated', res.message || 'Done.');
      await Promise.all([loadAll(), refreshCategories()]);
    } else {
      addToast('error', 'Delete Failed', res.message || 'Could not delete category.');
    }
  };

  const handleAddSubcategory = async (categoryId: string) => {
    if (!newSubName.trim()) return;
    const res = await categoryApi.createSubcategory(categoryId, { name: newSubName.trim() });
    if (res.success) {
      addToast('success', 'Subcategory Added', `"${newSubName.trim()}" added.`);
      setNewSubName('');
      setNewSubParentId(null);
      await Promise.all([loadAll(), refreshCategories()]);
    } else {
      addToast('error', 'Failed', res.message || 'Could not add subcategory.');
    }
  };

  const handleToggleSubActive = async (subId: string, currentActive: boolean) => {
    const res = await categoryApi.updateSubcategory(subId, { isActive: !currentActive });
    if (res.success) {
      await Promise.all([loadAll(), refreshCategories()]);
    }
  };

  const handleDeleteSub = async (subId: string) => {
    const res = await categoryApi.deleteSubcategory(subId);
    if (res.success) {
      addToast('info', 'Subcategory Updated', res.message || 'Done.');
      await Promise.all([loadAll(), refreshCategories()]);
    }
  };

  const handleReviewSuggestion = async (sug: CategorySuggestionItem, decision: 'Approved' | 'Rejected') => {
    const res = await categoryApi.reviewSuggestion(sug.id, decision);
    if (res.success) {
      addToast(
        decision === 'Approved' ? 'success' : 'info',
        `Suggestion ${decision}`,
        `"${sug.name}" has been ${decision.toLowerCase()}.`
      );
      await Promise.all([loadAll(), refreshCategories()]);
    } else {
      addToast('error', 'Review Failed', res.message || 'Could not review suggestion.');
    }
  };

  const filteredCategories = allCategories.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.subcategories.some((s) => s.name.toLowerCase().includes(q))
    );
  });

  const pendingSuggestionsCount = suggestions.filter((s) => s.status === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Skill Categories & Suggestions
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage database-driven categories, subcategories, and teacher-submitted category requests.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadAll}
            className="px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={openCreateCategory}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'categories'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Categories ({allCategories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('suggestions')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'suggestions'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Teacher Suggestions ({pendingSuggestionsCount} Pending)</span>
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-neutral-400 mb-2" />
          <p className="text-xs text-neutral-500">Loading categories from MongoDB...</p>
        </div>
      ) : activeTab === 'categories' ? (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories or subcategories..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
            />
          </div>

          <div className="space-y-3">
            {filteredCategories.map((cat) => {
              const isExpanded = Boolean(expandedCatIds[cat.id]);
              return (
                <div
                  key={cat.id}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden"
                >
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCatIds((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))
                      }
                      className="flex items-start gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                            {cat.name}
                          </h3>
                          <Badge variant={cat.isActive ? 'success' : 'neutral'}>
                            {cat.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="text-[11px] text-neutral-500">
                            {cat.subcategories.length} subcategories
                          </span>
                        </div>
                        {cat.description && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {cat.description}
                          </p>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => openEditCategory(cat)}
                        className="p-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                        title="Edit category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(cat)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      >
                        {cat.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                        title="Delete or safely deactivate if skills exist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {cat.subcategories.map((sub) => (
                          <div
                            key={sub.id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${
                              sub.isActive
                                ? 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200'
                                : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400 line-through'
                            }`}
                          >
                            <span>{sub.name}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleSubActive(sub.id, sub.isActive)}
                              className="text-[10px] text-sky-600 hover:underline cursor-pointer"
                              title={sub.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {sub.isActive ? 'Hide' : 'Show'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSub(sub.id)}
                              className="text-rose-500 hover:text-rose-700 cursor-pointer"
                              title="Delete subcategory"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {newSubParentId === cat.id ? (
                        <div className="flex items-center gap-2 max-w-sm">
                          <input
                            type="text"
                            value={newSubName}
                            onChange={(e) => setNewSubName(e.target.value)}
                            placeholder="New subcategory name..."
                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSubcategory(cat.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg cursor-pointer"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewSubParentId(null);
                              setNewSubName('');
                            }}
                            className="px-2 py-1.5 text-xs text-neutral-500 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setNewSubParentId(cat.id);
                            setNewSubName('');
                          }}
                          className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Subcategory</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <div className="p-10 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <p className="text-xs text-neutral-500">No category suggestions submitted yet.</p>
            </div>
          ) : (
            suggestions.map((sug) => (
              <div
                key={sug.id}
                className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={sug.status === 'Approved' ? 'success' : sug.status === 'Pending' ? 'warning' : 'error'}>
                      {sug.status}
                    </Badge>
                    <span className="text-[11px] uppercase font-semibold text-neutral-400">
                      {sug.type}
                    </span>
                    {sug.parentCategoryName && (
                      <span className="text-xs text-neutral-500">
                        under <strong>{sug.parentCategoryName}</strong>
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">{sug.name}</h4>
                  {sug.description && <p className="text-xs text-neutral-600 dark:text-neutral-400">{sug.description}</p>}
                  <p className="text-[11px] text-neutral-400">
                    Suggested by <strong>{sug.suggestedByName}</strong> · {new Date(sug.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {sug.status === 'Pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleReviewSuggestion(sug, 'Approved')}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewSuggestion(sug, 'Rejected')}
                      className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Create / Edit Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {editingCat ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCatModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Data Engineering & Analytics"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Brief summary of skills included in this category..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : editingCat ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
