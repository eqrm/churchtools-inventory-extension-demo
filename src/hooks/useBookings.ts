/**
 * TanStack Query hooks for booking management
 * 
 * Provides hooks for fetching, creating, updating, and deleting bookings,
 * as well as check-out and check-in operations.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useStorageProvider } from './useStorageProvider'
import type {
  Booking,
  BookingCreate,
  BookingUpdate,
  BookingFilters,
  UUID,
  ConditionAssessment,
} from '../types/entities'
import { syncBookingHistory } from '../services/bookings/bookingMutations'

// ============================================================================
// Query Keys
// ============================================================================

export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (filters?: BookingFilters) => [...bookingKeys.lists(), filters] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (id: UUID) => [...bookingKeys.details(), id] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all bookings with optional filtering
 */
export function useBookings(filters?: BookingFilters) {
  const storage = useStorageProvider()

  return useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn: async () => {
      if (!storage) throw new Error('Storage provider not initialized')
      return await storage.getBookings(filters)
    },
    enabled: !!storage,
    staleTime: 30_000, // 30 seconds
  })
}

/**
 * Fetch a single booking by ID
 */
export function useBooking(id: UUID | undefined) {
  const storage = useStorageProvider()

  return useQuery({
    queryKey: bookingKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!storage) throw new Error('Storage provider not initialized')
      if (!id) throw new Error('Booking ID is required')
      return await storage.getBooking(id)
    },
    enabled: !!storage && !!id,
    staleTime: 30_000,
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new booking
 */
export function useCreateBooking() {
  const storage = useStorageProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: BookingCreate) => {
      if (!storage) throw new Error('Storage provider not initialized')
      return await storage.createBooking(data)
    },
    onSuccess: (booking: Booking) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
      void syncBookingHistory(queryClient, booking.id)
    },
  })
}

/**
 * Update an existing booking
 */
export function useUpdateBooking() {
  const storage = useStorageProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: UUID; data: BookingUpdate }) => {
      if (!storage) throw new Error('Storage provider not initialized')
      return await storage.updateBooking(id, data)
    },
    onSuccess: (result: Booking, variables: { id: UUID; data: BookingUpdate }) => {
      const bookingId = result.id ?? variables.id
      if (bookingId) {
        queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) })
        void syncBookingHistory(queryClient, bookingId)
      }
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
    },
  })
}

/**
 * Cancel a booking
 */
export function useCancelBooking() {
  const storage = useStorageProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, reason }: { id: UUID; reason?: string }) => {
      if (!storage) throw new Error('Storage provider not initialized')
      return await storage.cancelBooking(id, reason)
    },
    onSuccess: (_result, variables: { id: UUID; reason?: string }) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
      void syncBookingHistory(queryClient, variables.id)
    },
  })
}

/**
 * Check out equipment for a booking
 */
export function useCheckOut() {
  const storage = useStorageProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bookingId,
      condition,
    }: {
      bookingId: UUID
      condition?: ConditionAssessment
    }) => {
      if (!storage) throw new Error('Storage provider not initialized')
      return await storage.checkOut(bookingId, condition)
    },
    onSuccess: (booking: Booking) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(booking.id) })
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
      // Also invalidate asset queries since asset status changes
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      void syncBookingHistory(queryClient, booking.id)
    },
  })
}

/**
 * Check in equipment from a booking
 * 
 * Note: The storage provider's checkIn only accepts bookingId and conditionAssessment.
 * Damage information is passed as part of the conditionAssessment object.
 */
export function useCheckIn() {
  const storage = useStorageProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bookingId,
      condition,
    }: {
      bookingId: UUID
      condition: ConditionAssessment
    }) => {
      if (!storage) throw new Error('Storage provider not initialized')
      // Package the condition assessment with damage info
      return await storage.checkIn(bookingId, condition)
    },
    onSuccess: (booking: Booking) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(booking.id) })
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
      // Also invalidate asset queries since asset status changes
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      void syncBookingHistory(queryClient, booking.id)
    },
  })
}

/**
 * Update overdue bookings (T121)
 * Checks for active bookings past their end date and marks them as overdue
 */
export function useUpdateOverdueBookings() {
  const storage = useStorageProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!storage) throw new Error('Storage provider not initialized')
      const bookings = await storage.getBookings({ status: 'active' })
      const now = new Date().toISOString()
      const overdueIds: UUID[] = []

      for (const booking of bookings) {
        if (booking.endDate < now) {
          await storage.updateBooking(booking.id, { status: 'overdue' })
          overdueIds.push(booking.id)
        }
      }

      return overdueIds
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
    },
  })
}

/**
 * Approve a pending booking (T122)
 * Admin can approve pending bookings
 */
export function useApproveBooking() {
  const storage = useStorageProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bookingId: UUID) => {
      if (!storage) throw new Error('Storage provider not initialized')
      return await storage.updateBooking(bookingId, { status: 'approved' })
    },
    onSuccess: (booking: Booking, bookingId: UUID) => {
      const id = booking.id ?? bookingId
      if (id) {
        queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) })
        void syncBookingHistory(queryClient, id)
      }
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
    },
  })
}

/**
 * Reject a pending booking (T122)
 */
export function useRejectBooking() {
  const storage = useStorageProvider()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: UUID; reason?: string }) => {
      if (!storage) throw new Error('Storage provider not initialized')
      return await storage.cancelBooking(bookingId, reason)
    },
    onSuccess: (_result, variables: { bookingId: UUID; reason?: string }) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
      void syncBookingHistory(queryClient, variables.bookingId)
    },
  })
}
