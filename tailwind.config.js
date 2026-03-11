/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: 'var(--primary-color)',
                    hover: 'var(--primary-hover)',
                },
                accent: {
                    DEFAULT: 'var(--accent-color)',
                    hover: 'var(--accent-hover)',
                    soft: 'var(--accent-soft)',
                },
                success: {
                    DEFAULT: 'var(--success-color)',
                    hover: 'var(--success-hover)',
                    soft: 'var(--success-soft)',
                },
                danger: {
                    DEFAULT: 'var(--danger-color)',
                    hover: 'var(--danger-hover)',
                    soft: 'var(--danger-soft)',
                },
                warning: {
                    DEFAULT: 'var(--warning-color)',
                    hover: 'var(--warning-hover)',
                    soft: 'var(--warning-soft)',
                },
                surface: 'var(--bg-surface)',
                muted: 'var(--bg-muted)',
                app: 'var(--bg-app)',
                sidebar: 'var(--sidebar-bg)',
                'text-main': 'var(--text-main)',
                'text-muted': 'var(--text-muted)',
                'text-light': 'var(--text-light)',
                'border-soft': 'var(--border-soft)',
                'border-main': 'var(--border-main)',
                'border-strong': 'var(--border-strong)',
            },
            textColor: {
                main: 'var(--text-main)',
                muted: 'var(--text-muted)',
                light: 'var(--text-light)',
            },
            borderColor: {
                DEFAULT: 'var(--border-main)',
                soft: 'var(--border-soft)',
                strong: 'var(--border-strong)',
                accent: 'var(--accent-color)',
            },
            ringColor: {
                DEFAULT: 'var(--accent-color)',
                accent: 'var(--accent-color)',
            },
            boxShadow: {
                sm: 'var(--shadow-sm)',
                md: 'var(--shadow-md)',
                lg: 'var(--shadow-lg)',
                accent: 'var(--shadow-accent)',
            }
        },
    },
    plugins: [],
}
