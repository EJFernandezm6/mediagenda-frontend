/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            colors: {
                primary: 'var(--primary-color)',   /* Slate 950 — estructural */
                accent: 'var(--accent-color)',    /* Indigo 600 — CTAs admin */
                success: 'var(--success-color)',   /* Emerald 500 */
                danger: 'var(--danger-color)',    /* Red 500 */
                warning: 'var(--warning-color)',   /* Amber 500 */
                app: 'var(--bg-app)',
                sidebar: 'var(--sidebar-bg)',
                'text-main': 'var(--text-main)',
                'text-muted': 'var(--text-muted)',
            },
            boxShadow: {
                float: 'var(--shadow-float)',
                accent: 'var(--shadow-accent)',
            }
        },
    },
    plugins: [],
}
