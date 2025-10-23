*import type { Config } from "tailwindcss";

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
				// Premium Corporate (Navy & Gold Theme)
				primary: {
					DEFAULT: '#0F172A', // Navy Blue
					foreground: '#FFFFFF',
					hover: '#1E3A8A',
					light: '#1F2937',
					dark: '#0B1223'
				},
				secondary: {
					DEFAULT: '#1E3A8A', // Deep Blue
					foreground: '#FFFFFF',
					hover: '#1E40AF',
					light: '#334155',
					dark: '#172554'
				},
				accent: {
					DEFAULT: '#FACC15', // Gold
					foreground: '#111827',
					hover: '#EAB308',
					light: '#FDE68A',
					dark: '#CA8A04'
				},
				background: {
					DEFAULT: '#F8FAFC', // Soft White
					secondary: '#FFFFFF',
					tertiary: '#F1F5F9'
				},
				foreground: '#111827', // Rich Black for primary text
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
				'gradient-primary': 'linear-gradient(90deg, #0F172A, #1E3A8A)',
				'gradient-hero': 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)',
				'gradient-card': 'linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 100%)'
			},
			boxShadow: {
				'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
				'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
				'button': '0 2px 4px rgba(15, 23, 42, 0.2)',
				'button-hover': '0 4px 8px rgba(15, 23, 42, 0.3)'
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
