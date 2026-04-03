import { create } from 'zustand';
import { Category, CategoryType } from '../types';
import {
  getAllCategories,
  getActiveCategories,
  createCategory,
  updateCategory,
  deactivateCategory,
  deleteCategory,
} from '../database/queries/categories';

interface CategoryState {
  categories: Category[];
  loading: boolean;
  fetchCategories: () => Promise<void>;
  getByType: (type: CategoryType) => Category[];
  addCategory: (data: Omit<Category, 'id' | 'created_at'>) => Promise<void>;
  editCategory: (id: number, data: Partial<Omit<Category, 'id' | 'created_at' | 'is_system'>>) => Promise<void>;
  deactivate: (id: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  loading: false,

  fetchCategories: async () => {
    set({ loading: true });
    try {
      const categories = await getAllCategories();
      set({ categories, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  getByType: (type) => {
    return get().categories.filter((c) => c.type === type && c.is_active === 1);
  },

  addCategory: async (data) => {
    await createCategory(data);
    await get().fetchCategories();
  },

  editCategory: async (id, data) => {
    await updateCategory(id, data);
    await get().fetchCategories();
  },

  deactivate: async (id) => {
    await deactivateCategory(id);
    await get().fetchCategories();
  },

  remove: async (id) => {
    await deleteCategory(id);
    await get().fetchCategories();
  },
}));
