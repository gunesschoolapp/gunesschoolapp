import React from 'react';

const channelConfig = {
  whatsapp:  { label: 'WhatsApp',  bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  email:     { label: 'Email',     bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  facebook:  { label: 'Facebook',  bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  instagram: { label: 'Instagram', bg: 'bg-pink-100',   text: 'text-pink-700',   dot: 'bg-pink-500' },
  sms:       { label: 'SMS',       bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  other:     { label: 'Other',     bg: 'bg-gray-100',   text: 'text-gray-700',   dot: 'bg-gray-400' },
};

export default function ChannelBadge({ channel, size = 'sm' }) {
  const cfg = channelConfig[channel] || channelConfig.other;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export { channelConfig };