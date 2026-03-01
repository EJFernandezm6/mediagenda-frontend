/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            colors: {
                primary: 'var(--primary-color)',
                success: 'var(--success-color)',
                app: 'var(--bg-app)',
                sidebar: 'var(--sidebar-bg)',
                'text-main': 'var(--text-main)',
                'text-muted': 'var(--text-muted)',
            },
            boxShadow: {
                float: 'var(--shadow-float)',
            }
        },
    },
    plugins: [],
}
