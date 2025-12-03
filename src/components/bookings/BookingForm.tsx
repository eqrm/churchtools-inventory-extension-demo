/**
 * BookingForm Component
 * 
 * Form for creating and editing equipment bookings.
 * Supports both individual asset bookings and kit bookings.
 * 
 * Feature: 002-bug-fixes-ux-improvements (US2 - T040-T042)
 * Updates: Integrated PersonPicker for "booking for" person selection
 */

import { useState, useEffect, useMemo } from 'react'
import { useForm } from '@mantine/form'
import { Stack, TextInput, Textarea, Select, Button, Group, Text, SegmentedControl, NumberInput, Badge } from '@mantine/core'
import { TimeInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { IconClock, IconBarcode } from '@tabler/icons-react'
import DateField from '../common/DateField'
import { useAssets } from '../../hooks/useAssets'
import { useKits } from '../../hooks/useKits'
import { useCreateBooking, useUpdateBooking, useBookings } from '../../hooks/useBookings'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { PersonPicker } from '../common/PersonPicker'
import { PersonAvatar } from '../common/PersonAvatar'
import { BookingConflictService } from '../../services/booking/BookingConflictService'
import { bookingStrings } from '../../i18n/bookingStrings'
import { findAssetByScanValue } from '../../utils/scanUtils'
import type { Booking, BookingCreate } from '../../types/entities'
import type { PersonSearchResult } from '../../services/person/PersonSearchService'
import { allocateBookingQuantity } from '../../services/bookings/quantityAllocator'

interface BookingFormProps {
  booking?: Booking
  kitId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

// T071: Initialize conflict service (singleton)
const conflictService = new BookingConflictService()

 
export function BookingForm({ booking, kitId, onSuccess, onCancel }: BookingFormProps) {
  const { data: assets } = useAssets() // T075: Get all assets, filter by bookable status and availability
  const { data: kitsData } = useKits()
  const kits = kitsData ?? []
  const { data: currentUser } = useCurrentUser()
  const { data: allBookings } = useBookings() // T076: For conflict checking
  const createBooking = useCreateBooking()
  const updateBooking = useUpdateBooking()

  // T075-T076: State for filtered available assets
  const [filteredAssets, setFilteredAssets] = useState(assets || [])

  // T040: State for PersonPicker ("Booking For")
  const [bookingForPerson, setBookingForPerson] = useState<PersonSearchResult | null>(
    booking ? {
      id: booking.bookingForId,
      firstName: booking.bookingForName?.split(' ')[0] || '',
      lastName: booking.bookingForName?.split(' ').slice(1).join(' ') || '',
      displayName: booking.bookingForName || '',
      email: undefined,
      avatarUrl: undefined,
      type: 'person'
    } : null
  )

  const [scanInput, setScanInput] = useState('')

  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const value = scanInput.trim()
      if (!value) return

      // Use filteredAssets to ensure we only select available assets
      const asset = findAssetByScanValue(filteredAssets, value)
      
      if (asset) {
        form.setFieldValue('asset', { id: asset.id, assetNumber: asset.assetNumber, name: asset.name })
        form.setFieldValue('allocatedChildAssets', undefined)
        notifications.show({
          title: 'Asset Found',
          message: `Selected ${asset.name}`,
          color: 'green'
        })
        setScanInput('')
      } else {
        // Check if it exists in all assets but was filtered out
        const rawAsset = findAssetByScanValue(assets || [], value)
        if (rawAsset) {
           notifications.show({
            title: 'Asset Unavailable',
            message: `Asset "${rawAsset.name}" is not available for the selected dates or is not bookable.`,
            color: 'red'
          })
        } else {
          notifications.show({
            title: 'Asset Not Found',
            message: `No asset found for "${value}"`,
            color: 'red'
          })
        }
      }
    }
  }

  const form = useForm<BookingCreate>({
    initialValues: booking ? {
      asset: booking.asset,
      kit: booking.kit,
      quantity: booking.quantity ?? 1,
      allocatedChildAssets: booking.allocatedChildAssets,
      bookedById: booking.bookedById,
      bookedByName: booking.bookedByName,
      bookingForId: booking.bookingForId,
      bookingForName: booking.bookingForName,
      bookingMode: booking.bookingMode,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      startDate: booking.startDate,
      endDate: booking.endDate,
      purpose: booking.purpose,
      notes: booking.notes,
      requestedBy: booking.requestedBy,
      requestedByName: booking.requestedByName,
    } : {
      kit: kitId ? { id: kitId, name: kits?.find(k => k.id === kitId)?.name || '' } : undefined,
      quantity: 1,
      bookedById: currentUser?.id || '',
      bookedByName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : '',
      bookingForId: currentUser?.id || '',
      bookingForName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : '',
      bookingMode: 'date-range' as const,
      startDate: '',
      endDate: '',
      purpose: '',
      requestedBy: currentUser?.id || '',
      requestedByName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : '',
    },
    validate: {
      // T061: Validate start time before end time (single-day mode)
      startTime: (value, values) => {
        if (values.bookingMode === 'single-day' && value && values.endTime) {
          const startParts = value.split(':').map(Number)
          const endParts = values.endTime.split(':').map(Number)
          if (startParts.length === 2 && endParts.length === 2 && 
              startParts[0] !== undefined && startParts[1] !== undefined &&
              endParts[0] !== undefined && endParts[1] !== undefined) {
            const startMinutes = startParts[0] * 60 + startParts[1]
            const endMinutes = endParts[0] * 60 + endParts[1]
            if (startMinutes >= endMinutes) {
              return 'Start time must be before end time'
            }
          }
        }
        return null
      },
      endTime: (value, values) => {
        if (values.bookingMode === 'single-day' && value && values.startTime) {
          const startParts = values.startTime.split(':').map(Number)
          const endParts = value.split(':').map(Number)
          if (startParts.length === 2 && endParts.length === 2 &&
              startParts[0] !== undefined && startParts[1] !== undefined &&
              endParts[0] !== undefined && endParts[1] !== undefined) {
            const startMinutes = startParts[0] * 60 + startParts[1]
            const endMinutes = endParts[0] * 60 + endParts[1]
            if (endMinutes <= startMinutes) {
              return 'End time must be after start time'
            }
          }
        }
        return null
      },
      // T062: Validate start date before end date (date-range mode ONLY)
      startDate: (value, values) => {
        // Skip validation for single-day mode (same date is expected)
        if (values.bookingMode === 'single-day') return null
        if (values.bookingMode === 'date-range' && value && values.endDate) {
          if (new Date(value) > new Date(values.endDate)) {
            return 'Start date must be before end date'
          }
        }
        return null
      },
      endDate: (value, values) => {
        // Skip validation for single-day mode (same date is expected)
        if (values.bookingMode === 'single-day') return null
        if (values.bookingMode === 'date-range' && value && values.startDate) {
          if (new Date(value) < new Date(values.startDate)) {
            return 'End date must be after start date'
          }
        }
        return null
      },
      quantity: value => {
        if (value === undefined || value < 1) {
          return 'Quantity must be at least 1'
        }
        return null
      },
    },
  })

  const selectedAsset = useMemo(() => {
    if (!form.values.asset?.id) return undefined
    return assets?.find(asset => asset.id === form.values.asset?.id)
  }, [assets, form.values.asset?.id])

  const childAssets = useMemo(() => {
    if (!selectedAsset) return []
    return (assets ?? []).filter(asset => asset.parentAssetId === selectedAsset.id)
  }, [assets, selectedAsset])

  const allocationCandidates = useMemo(() => {
    return childAssets.map(child => ({
      id: child.id,
      assetNumber: child.assetNumber,
      name: child.name,
      status: child.status,
      bookable: child.bookable,
      isAvailable: child.isAvailable,
      currentBookingId: child.currentBooking ?? null,
    }))
  }, [childAssets])

  const availableChildCount = useMemo(() => {
    return allocationCandidates.filter(child => {
      const statusOk = child.status === 'available'
      const availabilityFlag = child.isAvailable ?? true
      const bookingFree = !child.currentBookingId
      return child.bookable && statusOk && availabilityFlag && bookingFree
    }).length
  }, [allocationCandidates])

  useEffect(() => {
    if (!selectedAsset?.isParent) {
      if (form.values.quantity !== 1) {
        form.setFieldValue('quantity', 1)
      }
      if (form.values.allocatedChildAssets) {
        form.setFieldValue('allocatedChildAssets', undefined)
      }
    }
  }, [selectedAsset?.isParent, form])

  // T075-T076: Filter assets by bookable status and date availability
  useEffect(() => {
    const filterAssets = async () => {
      if (!assets || !allBookings) {
        setFilteredAssets([])
        return
      }

      // T075: First filter to only bookable assets
      const bookableAssets = assets.filter(asset => asset.bookable)

      // T076: Check for conflicts if date/time is selected
      const hasDateInfo = form.values.bookingMode === 'single-day' 
        ? form.values.date
        : form.values.startDate && form.values.endDate

      if (!hasDateInfo) {
        // No dates selected yet, show all bookable assets
        setFilteredAssets(bookableAssets)
        return
      }

      // Filter out assets with conflicts
      const availabilityChecks = await Promise.all(
        bookableAssets.map(async asset => {
          const result = await conflictService.checkConflicts({
            assetId: asset.id,
            bookingMode: form.values.bookingMode,
            date: form.values.date,
            startTime: form.values.startTime,
            endTime: form.values.endTime,
            startDate: form.values.startDate,
            endDate: form.values.endDate,
          }, allBookings)

          return { asset, available: !result.hasConflicts }
        })
      )

      const availableAssets = availabilityChecks
        .filter(check => check.available)
        .map(check => check.asset)

      setFilteredAssets(availableAssets)
    }

    filterAssets()
  }, [assets, allBookings, form.values.bookingMode, form.values.date, form.values.startTime, 
      form.values.endTime, form.values.startDate, form.values.endDate])

  // Helper to get user-friendly error message
  const getErrorMessage = (error: unknown): string => {
    if (!(error instanceof Error)) return 'An unexpected error occurred. Please try again.'
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Could not connect to server. Please check your internet connection and try again.'
    }
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      return 'Session expired. Please log in again.'
    }
    if (error.message.includes('400')) {
      return 'Invalid booking data. Please check all fields and try again.'
    }
    if (error.message.includes('conflict') || error.message.includes('already booked')) {
      return 'This asset is already booked for the selected dates. Please choose different dates.'
    }
    return error.message
  }

  // T077: Check for booking conflicts
  const checkForConflicts = async (values: BookingCreate): Promise<boolean> => {
    if (!values.asset?.id || !allBookings) return false

    const conflictResult = await conflictService.checkConflicts({
      assetId: values.asset.id,
      bookingMode: values.bookingMode,
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime,
      startDate: values.startDate,
      endDate: values.endDate,
    }, allBookings)

    if (conflictResult.hasConflicts && conflictResult.conflicts.length > 0) {
      const conflict = conflictResult.conflicts[0]
      if (conflict) {
        notifications.show({
          title: 'Booking Conflict',
          message: `Asset "${values.asset.name}" is already booked for these dates by ${conflict.bookingForName || 'another user'}.`,
          color: 'orange'
        })
      }
      return true
    }
    return false
  }

  // T042, T068: Enhanced validation and error handling
  const handleSubmit = async (values: BookingCreate) => {
    try {
      if (!values.bookingForId) {
        notifications.show({ title: 'Validation Error', message: 'Please select a person for this booking.', color: 'red' })
        return
      }

      if (!values.asset?.id && !values.kit?.id) {
        notifications.show({ title: 'Validation Error', message: 'Please select an asset or kit to reserve.', color: 'red' })
        return
      }

      const errors = form.validate()
      if (errors.hasErrors) {
        notifications.show({ title: 'Validation Error', message: 'Please fix the errors in the form before submitting.', color: 'red' })
        return
      }

      let submission: BookingCreate = values

      if (selectedAsset?.isParent) {
        const requestedQuantity = Math.max(1, Math.floor(values.quantity ?? 1))
        if (requestedQuantity !== (values.quantity ?? 1)) {
          form.setFieldValue('quantity', requestedQuantity)
        }
        const retainedAllocations = values.allocatedChildAssets ?? []

        if (requestedQuantity < retainedAllocations.length) {
          submission = {
            ...values,
            quantity: requestedQuantity,
            allocatedChildAssets: retainedAllocations.slice(0, requestedQuantity),
          }
        } else {
          const remainingQuantity = requestedQuantity - retainedAllocations.length
          const allocationResult = allocateBookingQuantity({
            parentAssetId: selectedAsset.id,
            quantity: remainingQuantity,
            children: allocationCandidates,
            excludeAssetIds: retainedAllocations.map(asset => asset.id),
          })

          if (allocationResult.status === 'shortage') {
            form.setFieldValue('allocatedChildAssets', [...retainedAllocations, ...allocationResult.allocated])
            notifications.show({
              title: bookingStrings.messages.quantityUnavailableTitle,
              message: allocationResult.shortage?.message ?? bookingStrings.messages.quantityUnavailableDescription,
              color: 'red',
            })
            return
          }

          const combinedAllocations = [...retainedAllocations, ...allocationResult.allocated]
          form.setFieldValue('allocatedChildAssets', combinedAllocations)
          submission = {
            ...values,
            quantity: requestedQuantity,
            allocatedChildAssets: combinedAllocations,
          }
        }
      } else {
        submission = {
          ...values,
          quantity: 1,
          allocatedChildAssets: undefined,
        }
      }

      if (await checkForConflicts(submission)) return

      const action = booking 
        ? updateBooking.mutateAsync({ id: booking.id, data: submission })
        : createBooking.mutateAsync(submission)
      await action
      notifications.show({ title: 'Success', message: booking ? 'Booking updated successfully' : 'Booking created successfully', color: 'green' })
      onSuccess?.()
    } catch (error) {
      notifications.show({ title: 'Error', message: getErrorMessage(error), color: 'red' })
    }
  }

  // T075-T076: Use filtered assets (bookable + available for selected dates)
  const assetOptions = filteredAssets.map(a => ({ value: a.id, label: `${a.assetNumber} - ${a.name}` }))

  // Determine appropriate placeholder message
  const getAssetPlaceholder = () => {
    if (!assets || assets.length === 0) {
      return "No assets available"
    }

    const bookableAssets = assets.filter(a => a.bookable)
    if (bookableAssets.length === 0) {
      return "No assets are enabled for booking (check 'Allow Booking' in asset settings)"
    }

    // If we have bookable assets but no filtered assets, check why
    if (filteredAssets.length === 0) {
      // Check if dates are selected and might be causing conflicts
      const hasDateInfo = form.values.bookingMode === 'single-day'
        ? form.values.date
        : form.values.startDate && form.values.endDate

      if (hasDateInfo) {
        return "No available assets for selected dates"
      } else {
        // No dates selected yet, but assets should be available
        return bookingStrings.form.selectAsset
      }
    }

    return 'Select an asset'
  }

  const kitOptions = kits?.map(k => ({ value: k.id, label: k.name })) || []

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        {/* T048, T040: PersonPicker for "booking for" person */}
        {/* T049: Permission check - currently always allowed per spec clarification Q2 */}
        {/* TODO: Add IPermissionService.canBookForOthers() when granular permissions available */}
        <PersonPicker
          label={bookingStrings.form.bookingFor}
          placeholder="Search for person..."
          value={bookingForPerson}
          onChange={(person) => {
            setBookingForPerson(person)
            if (person) {
              form.setFieldValue('bookingForId', person.id)
              form.setFieldValue('bookingForName', person.displayName)
            } else {
              // Default to current user if cleared
              form.setFieldValue('bookingForId', currentUser?.id || '')
              form.setFieldValue('bookingForName', currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : '')
            }
          }}
          required
        />

        {/* T050: Show who is creating the booking (not changeable) */}
        <Group gap="xs">
          <Text size="sm" fw={500}>{bookingStrings.form.bookedBy}</Text>
          <PersonAvatar
            personId={form.values.bookedById}
            name={form.values.bookedByName}
            size="sm"
            textSize="sm"
          />
        </Group>

        {/* T078: Date/time selection BEFORE asset picker for better UX and availability filtering */}
        {/* T058: Mode toggle switch */}
        <SegmentedControl
          value={form.values.bookingMode}
          onChange={(value) => {
            form.setFieldValue('bookingMode', value as 'single-day' | 'date-range')
            // Clear fields when switching modes
            if (value === 'single-day') {
              form.setFieldValue('startDate', '')
              form.setFieldValue('endDate', '')
            } else {
              form.setFieldValue('date', '')
              form.setFieldValue('startTime', '')
              form.setFieldValue('endTime', '')
            }
          }}
          data={[
            { label: 'Single Day', value: 'single-day' },
            { label: 'Date Range', value: 'date-range' }
          ]}
        />

        {/* T059: Single date picker + start/end time pickers when mode = 'single-day' */}
        {form.values.bookingMode === 'single-day' && (
          <>
            <Group align="flex-end">
              <DateField
                placeholder="Start date"
                value={form.values.date}
                onChange={(iso) => {
                  const dateStr = iso || ''
                  form.setFieldValue('date', dateStr)
                  form.setFieldValue('startDate', dateStr)
                  form.setFieldValue('endDate', dateStr)
                }}
              />
            </Group>
            <Group grow>
              <TimeInput
                label="Start Time"
                leftSection={<IconClock size={16} />}
                withSeconds={false}
                {...form.getInputProps('startTime')}
              />
              <TimeInput
                label="End Time"
                leftSection={<IconClock size={16} />}
                withSeconds={false}
                {...form.getInputProps('endTime')}
              />
            </Group>
          </>
        )}

        {/* T060: Start/end date pickers + optional time pickers when mode = 'date-range' */}
        {form.values.bookingMode === 'date-range' && (
          <>
            <Group align="flex-end">
              <DateField
                placeholder="Start date"
                value={form.values.startDate}
                onChange={(iso) => form.setFieldValue('startDate', iso || '')}
              />
              <DateField
                placeholder="End date"
                value={form.values.endDate}
                onChange={(iso) => form.setFieldValue('endDate', iso || '')}
              />
            </Group>
            <Group grow>
              <TimeInput
                label="Start Time (optional)"
                placeholder="HH:mm"
                leftSection={<IconClock size={16} />}
                withSeconds={false}
                {...form.getInputProps('startTime')}
              />
              <TimeInput
                label="End Time (optional)"
                placeholder="HH:mm"
                leftSection={<IconClock size={16} />}
                withSeconds={false}
                {...form.getInputProps('endTime')}
              />
            </Group>
          </>
        )}

        {/* T075-T076: Asset/Kit pickers - now show filtered available assets */}
        {!kitId && (
          <>
            <TextInput
              label="Scan Asset"
              placeholder="Scan barcode or asset number"
              leftSection={<IconBarcode size={16} />}
              value={scanInput}
              onChange={(e) => setScanInput(e.currentTarget.value)}
              onKeyDown={handleScan}
              mb="xs"
            />
            <Select
              label="Asset (optional)"
              placeholder={getAssetPlaceholder()}
              data={assetOptions}
              value={form.values.asset?.id}
              onChange={(value) => {
                const asset = filteredAssets.find(a => a.id === value)
                if (asset) {
                  form.setFieldValue('asset', { id: asset.id, assetNumber: asset.assetNumber, name: asset.name })
                } else {
                  form.setFieldValue('asset', undefined)
                }
                form.setFieldValue('allocatedChildAssets', undefined)
              }}
              searchable
              clearable
              disabled={assetOptions.length === 0}
            />
            <Select
              label="Kit (optional)"
              placeholder={bookingStrings.form.selectKit}
              data={kitOptions}
              value={form.values.kit?.id}
              onChange={(value) => {
                const kit = kits?.find(k => k.id === value)
                if (kit) form.setFieldValue('kit', { id: kit.id, name: kit.name })
                else form.setFieldValue('kit', undefined)
              }}
              searchable
              clearable
            />
          </>
        )}

        {selectedAsset?.isParent && (
          <Stack gap="xs">
            <NumberInput
              label={bookingStrings.form.quantity}
              min={1}
              max={Math.max(allocationCandidates.length, 1)}
              step={1}
              value={form.values.quantity ?? 1}
              onChange={(value) => {
                const numericValue = typeof value === 'number' ? value : Number(value)
                form.setFieldValue('quantity', Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : 1)
              }}
              error={form.errors['quantity']}
              description={allocationCandidates.length === 0
                ? bookingStrings.messages.noChildAssetsAvailable
                : bookingStrings.form.childAvailability
                    .replace('{available}', availableChildCount.toString())
                    .replace('{total}', allocationCandidates.length.toString())}
              disabled={allocationCandidates.length === 0}
            />
            {form.values.allocatedChildAssets?.length ? (
              <Group gap="xs">
                {form.values.allocatedChildAssets.map(child => (
                  <Badge key={child.id} variant="light" color="teal">
                    {child.assetNumber}
                  </Badge>
                ))}
              </Group>
            ) : null}
          </Stack>
        )}

        <TextInput label={bookingStrings.form.purpose} {...form.getInputProps('purpose')} required />
        <Textarea label={bookingStrings.form.notes} {...form.getInputProps('notes')} rows={3} />
        <Group justify="flex-end">
          {onCancel && <Button variant="subtle" onClick={onCancel}>{bookingStrings.form.cancel}</Button>}
          <Button type="submit" loading={createBooking.isPending || updateBooking.isPending}>
            {booking ? bookingStrings.form.update : bookingStrings.form.create}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
