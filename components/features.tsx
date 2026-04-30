'use client';

import { Zap, Shield, FileText } from 'lucide-react';

export function Features() {
  const features = [
    {
      icon: Zap,
      title: 'Instant Access',
      description: 'Limit increased after payment confirmation.',
    },
    {
      icon: Shield,
      title: 'Secure Payment',
      description: 'Protected by M-Pesa secure infrastructure.',
    },
    {
      icon: FileText,
      title: 'No Paperwork',
      description: 'Complete everything digitally in minutes.',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
      {features.map((feature, idx) => {
        const Icon = feature.icon;
        return (
          <div key={idx} className="p-6 text-center rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 transition-colors duration-200">
            <Icon className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{feature.description}</p>
          </div>
        );
      })}
    </div>
  );
}
