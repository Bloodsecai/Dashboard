'use client';

import { HelpCircle, Book, MessageCircle, Mail, ExternalLink } from 'lucide-react';

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
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Help Center</h1>
        <p className="text-slate-400 mt-1">Find help and support resources</p>
      </div>

      {/* Search */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-8 mb-8 text-center">
        <HelpCircle className="w-16 h-16 text-pink-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-4">How can we help you?</h2>
        <div className="max-w-md mx-auto">
          <input
            type="text"
            placeholder="Search for help topics..."
            className="w-full px-6 py-4 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50"
          />
        </div>
      </div>

      {/* Help Topics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {helpTopics.map((topic, index) => (
          <a
            key={index}
            href={topic.link}
            className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6 hover:border-pink-500/30 transition-all group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:from-pink-500/30 group-hover:to-purple-500/30 transition-colors">
              <topic.icon className="w-6 h-6 text-pink-400" />
            </div>
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              {topic.title}
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-pink-400 transition-colors" />
            </h3>
            <p className="text-slate-400 text-sm">{topic.description}</p>
          </a>
        ))}
      </div>

      {/* Contact Info */}
      <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl border border-pink-500/30 p-8 text-center">
        <h3 className="text-xl font-bold text-white mb-2">Still need help?</h3>
        <p className="text-slate-300 mb-6">Our support team is available 24/7 to assist you</p>
        <button className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:from-pink-600 hover:to-purple-700 transition-all">
          Contact Support
        </button>
      </div>
    </div>
  );
}
