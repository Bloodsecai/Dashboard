'use client';

import { HelpCircle, Book, MessageCircle, Mail, ExternalLink } from 'lucide-react';
import { useTheme, COLOR_PALETTES } from '@/contexts/ThemeContext';

const helpTopics = [
  {
    icon: Book,
    title: 'Getting Started',
    description: 'Learn the basics of using the TEST dashboard',
    link: '#',
  },
  {
    icon: MessageCircle,
    title: 'FAQs',
    description: 'Find answers to commonly asked questions',
    link: '#',
  },
  {
    icon: Mail,
    title: 'Contact Support',
    description: 'Get in touch with our support team',
    link: '#',
  },
];

export default function HelpPage() {
  const { palette } = useTheme();
  const colors = COLOR_PALETTES[palette];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Help Center</h1>
        <p className="text-slate-400 mt-1">Find help and support resources</p>
      </div>

      {/* Search */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-8 mb-8 text-center">
        <HelpCircle className="w-16 h-16 mx-auto mb-4 text-primary-accent" style={{ color: colors.primary }} />
        <h2 className="text-xl font-bold text-white mb-4">How can we help you?</h2>
        <div className="max-w-md mx-auto">
          <input
            type="text"
            placeholder="Search for help topics..."
            className="w-full px-6 py-4 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus-primary transition-colors"
            style={{
              borderColor: 'rgba(255, 255, 255, 0.1)',
            }}
            onFocus={(e) => e.target.style.borderColor = `rgba(${colors.primaryRgb}, 0.5)`}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
          />
        </div>
      </div>

      {/* Help Topics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {helpTopics.map((topic, index) => (
          <a
            key={index}
            href={topic.link}
            className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6 transition-all group"
            style={{
              ['--hover-border-color' as any]: `rgba(${colors.primaryRgb}, 0.3)`,
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = `rgba(${colors.primaryRgb}, 0.3)`}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors"
              style={{
                background: `linear-gradient(135deg, rgba(${colors.primaryRgb}, 0.2), rgba(${colors.secondaryRgb}, 0.2))`
              }}
            >
              <topic.icon className="w-6 h-6" style={{ color: colors.primary }} />
            </div>
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              {topic.title}
              <ExternalLink
                className="w-4 h-4 text-slate-500 group-hover:transition-colors"
                style={{ ['--hover-color' as any]: colors.primary }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
                onMouseLeave={(e) => e.currentTarget.style.color = ''}
              />
            </h3>
            <p className="text-slate-400 text-sm">{topic.description}</p>
          </a>
        ))}
      </div>

      {/* Contact Info */}
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: `linear-gradient(to right, rgba(${colors.primaryRgb}, 0.2), rgba(${colors.secondaryRgb}, 0.2))`,
          border: `1px solid rgba(${colors.primaryRgb}, 0.3)`,
        }}
      >
        <h3 className="text-xl font-bold text-white mb-2">Still need help?</h3>
        <p className="text-slate-300 mb-6">Our support team is available 24/7 to assist you</p>
        <button
          className="px-8 py-3 text-white rounded-xl font-medium transition-all btn-gradient-primary hover:shadow-lg"
        >
          Contact Support
        </button>
      </div>
    </div>
  );
}
