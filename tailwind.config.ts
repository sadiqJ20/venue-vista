import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				// Smart Campus Blue Theme
				primary: {
					DEFAULT: '#2563EB', // Vibrant Blue
					foreground: '#FFFFFF',
					hover: '#1D4ED8',
					light: '#3B82F6',
					dark: '#1E40AF'
				},
				secondary: {
					DEFAULT: '#6366F1', // Indigo
					foreground: '#FFFFFF',
					hover: '#4F46E5',
					light: '#818CF8',
					dark: '#4338CA'
				},
				accent: {
					DEFAULT: '#10B981', // Emerald Green
					foreground: '#FFFFFF',
					hover: '#059669',
					light: '#34D399',
					dark: '#047857'
				},
				background: {
					DEFAULT: '#F9FAFB', // Light Grayish White
					secondary: '#FFFFFF',
					tertiary: '#F3F4F6'
				},
				foreground: '#111827', // Main text color
				text: {
					primary: '#111827',
					secondary: '#6B7280',
					muted: '#9CA3AF'
				},
				border: {
					DEFAULT: '#E5E7EB',
					light: '#F3F4F6',
					dark: '#D1D5DB'
				},
				success: {
					DEFAULT: '#10B981',
					foreground: '#FFFFFF',
					light: '#D1FAE5',
					dark: '#047857'
				},
				warning: {
					DEFAULT: '#F59E0B',
					foreground: '#FFFFFF',
					light: '#FEF3C7',
					dark: '#D97706'
				},
				error: {
					DEFAULT: '#EF4444',
					foreground: '#FFFFFF',
					light: '#FEE2E2',
					dark: '#DC2626'
				},
				card: {
					DEFAULT: '#FFFFFF',
					foreground: '#111827',
					border: '#E5E7EB'
				}
			},
			backgroundImage: {
				'gradient-primary': 'linear-gradient(90deg, #2563EB, #6366F1)',
				'gradient-hero': 'linear-gradient(135deg, #2563EB 0%, #6366F1 100%)',
				'gradient-card': 'linear-gradient(145deg, #FFFFFF 0%, #F9FAFB 100%)'
			},
			boxShadow: {
				'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
				'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
				'button': '0 2px 4px rgba(37, 99, 235, 0.2)',
				'button-hover': '0 4px 8px rgba(37, 99, 235, 0.3)'
			},
			borderRadius: {
				'card': '12px',
				'button': '8px',
				'input': '8px',
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
