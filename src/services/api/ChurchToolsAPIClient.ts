import { churchtoolsClient } from '@churchtools/churchtools-client';
import { ChurchToolsAPIError } from './ChurchToolsAPIError';
import type { PersonInfo, Person } from '../../types/entities';

/**
 * ChurchTools API Client
 * Wraps the ChurchTools client with type-safe methods and person caching
 */
export class ChurchToolsAPIClient {
    private personCache = new Map<string, { person: PersonInfo; cachedAt: number }>();
    private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    /**
     * Generic GET request
     */
    async get<T>(endpoint: string): Promise<T> {
        try {
            const response = await churchtoolsClient.get<T>(endpoint);
            return response;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Generic POST request
     */
    async post<T>(endpoint: string, data: unknown): Promise<T> {
        try {
            const response = await churchtoolsClient.post<T>(endpoint, data as Record<string, unknown>);
            return response;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Generic PUT request
     */
    async put<T>(endpoint: string, data: unknown): Promise<T> {
        try {
            const response = await churchtoolsClient.put<T>(endpoint, data as Record<string, unknown>);
            return response;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Generic PATCH request
     */
    async patch<T>(endpoint: string, data: unknown): Promise<T> {
        try {
            const response = await churchtoolsClient.patch<T>(endpoint, data as Record<string, unknown>);
            return response;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Generic DELETE request (using POST with _method override as churchtools client doesn't have delete)
     */
    async deleteRequest(endpoint: string): Promise<void> {
        try {
            await churchtoolsClient.deleteApi(endpoint, undefined, { needsAuthentication: true });
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Get current logged-in user
     */
    async getCurrentUser(): Promise<PersonInfo> {
        const person = await this.get<Person>('/whoami');
        return {
            id: person.id.toString(),
            firstName: person.firstName,
            lastName: person.lastName,
            name: `${person.firstName} ${person.lastName}`.trim(),
            email: person.email,
            avatarUrl: person.imageUrl,
        };
    }

    /**
     * Get person info by ID with caching
     */
    async getPersonInfo(personId: string): Promise<PersonInfo> {
        // Check cache
        const cached = this.personCache.get(personId);
        if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL) {
            return cached.person;
        }

        // Fetch from API
        const person = await this.get<Person>(`/persons/${personId}`);
        const personInfo: PersonInfo = {
            id: person.id.toString(),
            firstName: person.firstName,
            lastName: person.lastName,
            name: `${person.firstName} ${person.lastName}`.trim(),
            email: person.email,
            avatarUrl: person.imageUrl,
        };

        // Cache the result
        this.personCache.set(personId, {
            person: personInfo,
            cachedAt: Date.now(),
        });

        return personInfo;
    }

    /**
     * Search for people by query string
     */
    async searchPeople(query: string): Promise<PersonInfo[]> {
        const response = await this.get<{ data: Person[] }>(`/persons?search=${encodeURIComponent(query)}`);
        return response.data.map((person) => ({
            id: person.id.toString(),
            firstName: person.firstName,
            lastName: person.lastName,
            name: `${person.firstName} ${person.lastName}`.trim(),
            email: person.email,
            avatarUrl: person.imageUrl,
        }));
    }

    /**
     * Clear person cache
     */
    clearPersonCache(): void {
        this.personCache.clear();
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache(): void {
        const now = Date.now();
        for (const [personId, cached] of this.personCache.entries()) {
            if (now - cached.cachedAt >= this.CACHE_TTL) {
                this.personCache.delete(personId);
            }
        }
    }

    // ============================================================================
    // Custom Modules API Methods
    // ============================================================================

    /**
     * Get all data categories for a module
     */
    async getDataCategories(moduleId: string): Promise<unknown[]> {
        return await this.get<unknown[]>(`/custommodules/${moduleId}/customdatacategories`);
    }

    /**
     * Get a single data category
     */
    async getDataCategory(moduleId: string, assetTypeId: string): Promise<unknown> {
        return await this.get<unknown>(`/custommodules/${moduleId}/customdatacategories/${assetTypeId}`);
    }

    /**
     * Create a new data category
     */
    async createDataCategory(moduleId: string, data: unknown): Promise<unknown> {
        return await this.post<unknown>(`/custommodules/${moduleId}/customdatacategories`, data);
    }

    /**
     * Update a data category
     */
    async updateDataCategory(moduleId: string, assetTypeId: string, data: unknown): Promise<unknown> {
        return await this.put<unknown>(`/custommodules/${moduleId}/customdatacategories/${assetTypeId}`, data);
    }

    /**
     * Delete a data category
     */
    async deleteDataCategory(moduleId: string, assetTypeId: string): Promise<void> {
        await this.deleteRequest(`/custommodules/${moduleId}/customdatacategories/${assetTypeId}`);
    }

    /**
     * Get all data values for a category
     */
    async getDataValues(moduleId: string, assetTypeId: string): Promise<unknown[]> {
        return await this.get<unknown[]>(`/custommodules/${moduleId}/customdatacategories/${assetTypeId}/customdatavalues`);
    }

    /**
     * Get a single data value
     */
    async getDataValue(moduleId: string, assetTypeId: string, valueId: string): Promise<unknown> {
        return await this.get<unknown>(`/custommodules/${moduleId}/customdatacategories/${assetTypeId}/customdatavalues/${valueId}`);
    }

    /**
     * Create a new data value
     */
    async createDataValue(moduleId: string, assetTypeId: string, data: unknown): Promise<unknown> {
        return await this.post<unknown>(`/custommodules/${moduleId}/customdatacategories/${assetTypeId}/customdatavalues`, data);
    }

    /**
     * Update a data value
     */
    async updateDataValue(moduleId: string, assetTypeId: string, valueId: string, data: unknown): Promise<unknown> {
        return await this.put<unknown>(`/custommodules/${moduleId}/customdatacategories/${assetTypeId}/customdatavalues/${valueId}`, data);
    }

    /**
     * Delete a data value
     */
    async deleteDataValue(moduleId: string, assetTypeId: string, valueId: string): Promise<void> {
        await this.deleteRequest(`/custommodules/${moduleId}/customdatacategories/${assetTypeId}/customdatavalues/${valueId}`);
    }

    /**
     * Handle API errors and convert to ChurchToolsAPIError
     */
    private handleError(error: unknown): ChurchToolsAPIError {
        if (error instanceof ChurchToolsAPIError) {
            return error;
        }

        // Handle Response objects
        if (error instanceof Response) {
            return new ChurchToolsAPIError(
                error.status,
                error.statusText,
                `Request failed: ${error.status.toString()} ${error.statusText}`
            );
        }

        // Handle Error objects with response property
        if (error instanceof Error && 'response' in error) {
            const response = (error as { response: { status: number; statusText: string } }).response;
            return new ChurchToolsAPIError(
                response.status,
                response.statusText,
                error.message,
                error
            );
        }

        // Handle generic errors
        if (error instanceof Error) {
            return new ChurchToolsAPIError(
                500,
                'Internal Error',
                error.message,
                error
            );
        }

        // Fallback for unknown errors
        return new ChurchToolsAPIError(
            500,
            'Unknown Error',
            'An unknown error occurred',
            error
        );
    }
}

/**
 * Singleton instance of ChurchTools API client
 */
export const churchToolsAPIClient = new ChurchToolsAPIClient();
