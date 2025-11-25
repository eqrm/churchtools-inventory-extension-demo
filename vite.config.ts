import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

    return defineConfig({
        base: `/ccm/${process.env.VITE_KEY}/`,
        plugins: [react()],
        build: {
            // Bundle size optimization
            target: 'es2022',
            minify: 'terser',
            terserOptions: {
                compress: {
                    drop_console: true, // Remove console.log in production
                    drop_debugger: true,
                },
            },
            rollupOptions: {
                output: {
                    // Code splitting for better caching
                    manualChunks: {
                        // Vendor chunk for stable dependencies
                        vendor: ['react', 'react-dom'],
                        // Mantine UI chunk
                        mantine: [
                            '@mantine/core',
                            '@mantine/hooks',
                            '@mantine/form',
                            '@mantine/dates',
                            '@mantine/notifications',
                            '@mantine/dropzone',
                            'mantine-datatable',
                        ],
                        // State management chunk
                        state: ['@tanstack/react-query', 'zustand'],
                        // Barcode/QR chunk (loaded on demand)
                        scanner: ['jsbarcode', 'qrcode', 'html5-qrcode'],
                    },
                },
            },
            // Chunk size warning limit (5 MB = 5,000 KB for ChurchTools 20MB deployment limit)
            chunkSizeWarningLimit: 5000,
        },
        optimizeDeps: {
            // Pre-bundle dependencies for faster dev server
            include: [
                'react',
                'react-dom',
                '@mantine/core',
                '@mantine/hooks',
                '@tanstack/react-query',
                'zustand',
            ],
        },
    });
};
