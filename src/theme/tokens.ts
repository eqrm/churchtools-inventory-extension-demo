import type { MantineColorsTuple } from '@mantine/core';

/**
 * Core spacing scale expressed in pixels to match Mantine expectations.
 * The values are stored as strings to allow direct theme assignment.
 */
export const spacingScale = {
    xs: '10px',
    sm: '12px',
    md: '16px',
    lg: '20px',
    xl: '32px',
} as const;

export type SpacingToken = keyof typeof spacingScale;

/**
 * Border radius tokens used across surfaces and controls.
 */
export const radiusScale = {
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
} as const;

export type RadiusToken = keyof typeof radiusScale;

/**
 * Font size tokens with pixel values for Mantine typography.
 */
export const fontScale = {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    display: '32px',
} as const;

export type FontSizeToken = keyof typeof fontScale;

/**
 * Icon sizing guidance in pixels, used for consistent iconography.
 */
export const iconSizes = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
} as const;

export type IconSizeToken = keyof typeof iconSizes;

/**
 * Brand-driven blue palette inspired by ChurchTools UI.
 */
export const ctBlue: MantineColorsTuple = [
    '#e7f5ff',
    '#d0ebff',
    '#a5d8ff',
    '#74c0fc',
    '#4dabf7',
    '#339af0',
    '#228be6',
    '#1c7ed6',
    '#1971c2',
    '#1864ab',
];

/**
 * Semantic color groupings for status indicators and actions.
 */
export const semanticColors = {
    assetStatus: {
        available: 'blue',
        'in-use': 'teal',
        broken: 'red',
        'in-repair': 'yellow',
        retired: 'gray',
        disposed: 'gray',
        'in-maintenance': 'violet',
        sold: 'gray',
        destroyed: 'red',
        deleted: 'gray',
    },
    workOrderStatus: {
        draft: 'gray',
        offerPending: 'violet',
        inProgress: 'teal',
        completed: 'green',
        cancelled: 'gray',
    },
    bookingStatus: {
        pending: 'yellow',
        approved: 'blue',
        active: 'teal',
        completed: 'green',
        overdue: 'red',
        cancelled: 'gray',
    },
} as const;

export type SemanticColorGroup = typeof semanticColors;

/**
 * Aggregate export for quick consumption within components.
 */
export const designTokens = {
    spacing: spacingScale,
    radius: radiusScale,
    font: fontScale,
    icons: iconSizes,
    colors: semanticColors,
    palettes: {
        'ct-blue': ctBlue,
    },
} as const;

export type DesignTokens = typeof designTokens;
