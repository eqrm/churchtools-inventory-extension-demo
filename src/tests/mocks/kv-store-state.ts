/**
 * KV Store Mock State Manager
 * 
 * Provides in-memory state for mocking ChurchTools KV store API endpoints.
 * Used to track modules, categories, and values during tests.
 */

import type {
    CustomModule,
    CustomModuleCreate,
    CustomModuleDataCategory,
    CustomModuleDataCategoryCreate,
    CustomModuleDataValue,
    CustomModuleDataValueCreate,
} from '../../utils/ct-types';

/**
 * Internal state structure for the KV store mock
 */
interface KVStoreState {
    modules: Map<number, CustomModule>;
    categories: Map<number, CustomModuleDataCategory>;
    values: Map<number, CustomModuleDataValue>;
    nextModuleId: number;
    nextCategoryId: number;
    nextValueId: number;
}

/**
 * KV Store State Manager
 * 
 * Manages in-memory state for the KV store mock.
 * Provides CRUD operations and inspection methods for testing.
 */
class KVStoreStateManager {
    private state: KVStoreState;

    constructor() {
        this.state = this.createInitialState();
    }

    /**
     * Create initial empty state
     */
    private createInitialState(): KVStoreState {
        return {
            modules: new Map(),
            categories: new Map(),
            values: new Map(),
            nextModuleId: 1,
            nextCategoryId: 1,
            nextValueId: 1,
        };
    }

    /**
     * Reset state to initial empty state
     */
    reset(): void {
        this.state = this.createInitialState();
    }

    // ────────────────────────────────────────────────
    //  MODULE OPERATIONS
    // ────────────────────────────────────────────────

    /**
     * Seed a module into the state
     */
    seedModule(moduleData: Partial<CustomModuleCreate> & { id?: number }): CustomModule {
        const id = moduleData.id ?? this.state.nextModuleId++;
        if (moduleData.id && moduleData.id >= this.state.nextModuleId) {
            this.state.nextModuleId = moduleData.id + 1;
        }

        const module: CustomModule = {
            id,
            name: moduleData.name ?? `Test Module ${id}`,
            shorty: moduleData.shorty ?? `testmodule${id}`,
            sortKey: moduleData.sortKey ?? 100,
            description: moduleData.description ?? '',
        };

        this.state.modules.set(id, module);
        return module;
    }

    /**
     * Create a new module
     */
    createModule(data: CustomModuleCreate): CustomModule {
        const id = this.state.nextModuleId++;
        const module: CustomModule = {
            id,
            ...data,
        };
        this.state.modules.set(id, module);
        return module;
    }

    /**
     * Get all modules
     */
    getModules(): CustomModule[] {
        return Array.from(this.state.modules.values());
    }

    /**
     * Get a module by ID
     */
    getModuleById(id: number): CustomModule | undefined {
        return this.state.modules.get(id);
    }

    /**
     * Get a module by shorty (extension key)
     */
    getModuleByShorty(shorty: string): CustomModule | undefined {
        return Array.from(this.state.modules.values()).find(m => m.shorty === shorty);
    }

    /**
     * Delete a module by ID
     */
    deleteModule(id: number): boolean {
        // Also delete all categories and values for this module
        const categoriesToDelete = Array.from(this.state.categories.values())
            .filter(c => c.customModuleId === id)
            .map(c => c.id);
        
        for (const categoryId of categoriesToDelete) {
            this.deleteCategory(categoryId);
        }

        return this.state.modules.delete(id);
    }

    // ────────────────────────────────────────────────
    //  CATEGORY OPERATIONS
    // ────────────────────────────────────────────────

    /**
     * Seed a category into the state
     */
    seedCategory(categoryData: Partial<CustomModuleDataCategoryCreate> & { id?: number; customModuleId: number }): CustomModuleDataCategory {
        const id = categoryData.id ?? this.state.nextCategoryId++;
        if (categoryData.id && categoryData.id >= this.state.nextCategoryId) {
            this.state.nextCategoryId = categoryData.id + 1;
        }

        const category: CustomModuleDataCategory = {
            id,
            customModuleId: categoryData.customModuleId,
            name: categoryData.name ?? `Test Category ${id}`,
            shorty: categoryData.shorty ?? `testcategory${id}`,
            description: categoryData.description ?? '',
            data: categoryData.data ?? '',
        };

        this.state.categories.set(id, category);
        return category;
    }

    /**
     * Create a new category
     */
    createCategory(data: CustomModuleDataCategoryCreate): CustomModuleDataCategory {
        const id = this.state.nextCategoryId++;
        const category: CustomModuleDataCategory = {
            id,
            ...data,
            data: data.data ?? '',
        };
        this.state.categories.set(id, category);
        return category;
    }

    /**
     * Get all categories for a module
     */
    getCategories(moduleId: number): CustomModuleDataCategory[] {
        return Array.from(this.state.categories.values())
            .filter(c => c.customModuleId === moduleId);
    }

    /**
     * Get all categories (for inspection)
     */
    getAllCategories(): CustomModuleDataCategory[] {
        return Array.from(this.state.categories.values());
    }

    /**
     * Get a category by ID
     */
    getCategoryById(id: number): CustomModuleDataCategory | undefined {
        return this.state.categories.get(id);
    }

    /**
     * Get a category by shorty
     */
    getCategoryByShorty(moduleId: number, shorty: string): CustomModuleDataCategory | undefined {
        return this.getCategories(moduleId).find(c => c.shorty === shorty);
    }

    /**
     * Update a category
     */
    updateCategory(id: number, data: Partial<CustomModuleDataCategory>): CustomModuleDataCategory | undefined {
        const category = this.state.categories.get(id);
        if (!category) return undefined;

        const updated = { ...category, ...data, id }; // Preserve id
        this.state.categories.set(id, updated);
        return updated;
    }

    /**
     * Delete a category by ID
     */
    deleteCategory(id: number): boolean {
        // Also delete all values for this category
        const valuesToDelete = Array.from(this.state.values.values())
            .filter(v => v.dataCategoryId === id)
            .map(v => v.id);
        
        for (const valueId of valuesToDelete) {
            this.state.values.delete(valueId);
        }

        return this.state.categories.delete(id);
    }

    // ────────────────────────────────────────────────
    //  VALUE OPERATIONS
    // ────────────────────────────────────────────────

    /**
     * Seed a value into the state
     */
    seedValue(valueData: Partial<CustomModuleDataValueCreate> & { id?: number; dataCategoryId: number }): CustomModuleDataValue {
        const id = valueData.id ?? this.state.nextValueId++;
        if (valueData.id && valueData.id >= this.state.nextValueId) {
            this.state.nextValueId = valueData.id + 1;
        }

        const value: CustomModuleDataValue = {
            id,
            dataCategoryId: valueData.dataCategoryId,
            value: valueData.value ?? '{}',
        };

        this.state.values.set(id, value);
        return value;
    }

    /**
     * Create a new value
     */
    createValue(data: CustomModuleDataValueCreate): CustomModuleDataValue {
        const id = this.state.nextValueId++;
        const value: CustomModuleDataValue = {
            id,
            ...data,
        };
        this.state.values.set(id, value);
        return value;
    }

    /**
     * Get all values for a category
     */
    getValues(categoryId: number): CustomModuleDataValue[] {
        return Array.from(this.state.values.values())
            .filter(v => v.dataCategoryId === categoryId);
    }

    /**
     * Get all values (for inspection)
     */
    getAllValues(): CustomModuleDataValue[] {
        return Array.from(this.state.values.values());
    }

    /**
     * Get a value by ID
     */
    getValueById(id: number): CustomModuleDataValue | undefined {
        return this.state.values.get(id);
    }

    /**
     * Update a value
     */
    updateValue(id: number, data: Partial<CustomModuleDataValue>): CustomModuleDataValue | undefined {
        const value = this.state.values.get(id);
        if (!value) return undefined;

        const updated = { ...value, ...data, id }; // Preserve id
        this.state.values.set(id, updated);
        return updated;
    }

    /**
     * Delete a value by ID
     */
    deleteValue(id: number): boolean {
        return this.state.values.delete(id);
    }

    // ────────────────────────────────────────────────
    //  VALIDATION HELPERS
    // ────────────────────────────────────────────────

    /**
     * Check if a module exists
     */
    moduleExists(id: number): boolean {
        return this.state.modules.has(id);
    }

    /**
     * Check if a category exists
     */
    categoryExists(id: number): boolean {
        return this.state.categories.has(id);
    }

    /**
     * Check if a value exists
     */
    valueExists(id: number): boolean {
        return this.state.values.has(id);
    }

    /**
     * Validate that a category belongs to a module
     */
    categoryBelongsToModule(categoryId: number, moduleId: number): boolean {
        const category = this.state.categories.get(categoryId);
        return category?.customModuleId === moduleId;
    }

    /**
     * Validate that a value belongs to a category
     */
    valueBelongsToCategory(valueId: number, categoryId: number): boolean {
        const value = this.state.values.get(valueId);
        return value?.dataCategoryId === categoryId;
    }
}

/**
 * Singleton instance of the KV store state manager
 */
export const kvStoreState = new KVStoreStateManager();

export type { KVStoreState };
