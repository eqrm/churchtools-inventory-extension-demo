import { createTheme } from '@mantine/core';
import { designTokens, semanticColors } from './theme/tokens';

/**
 * Mantine theme configuration
 * Customized to match ChurchTools UI/UX patterns
 */
export const theme = createTheme({
    primaryColor: 'ct-blue',
    colors: {
        'ct-blue': designTokens.palettes['ct-blue'],
    },
    defaultRadius: 'md',
    radius: designTokens.radius,
    spacing: designTokens.spacing,
    fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontFamilyMonospace: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, monospace',
    fontSizes: {
        xs: designTokens.font.xs,
        sm: designTokens.font.sm,
        md: designTokens.font.md,
        lg: designTokens.font.lg,
        xl: designTokens.font.xl,
    },
    headings: {
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontWeight: '600',
        sizes: {
            h1: { fontSize: designTokens.font.display, lineHeight: '1.2' },
            h2: { fontSize: designTokens.font.xl, lineHeight: '1.25' },
            h3: { fontSize: designTokens.font.lg, lineHeight: '1.3' },
            h4: { fontSize: designTokens.font.md, lineHeight: '1.35' },
            h5: { fontSize: designTokens.font.sm, lineHeight: '1.4' },
            h6: { fontSize: designTokens.font.xs, lineHeight: '1.45' },
        },
    },
    components: {
        Button: {
            defaultProps: {
                size: 'md',
            },
        },
        TextInput: {
            defaultProps: {
                size: 'md',
            },
        },
        Select: {
            defaultProps: {
                size: 'md',
            },
        },
        Table: {
            defaultProps: {
                striped: true,
                highlightOnHover: true,
            },
        },
    },
});

/**
 * Status colors for asset management
 */
export const statusColors = semanticColors.assetStatus;

/**
 * Booking status colors
 */
export const bookingStatusColors = semanticColors.bookingStatus;
