import { Loader2 } from 'lucide-react';

export function Spinner({ size = 24 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-brand-500" />;
}

export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f0f10]">
      <Spinner size={40} />
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 sm:py-16 px-4 sm:px-6">
      <div className="mb-4 p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400">{icon}</div>
      <h3 className="font-condensed text-lg sm:text-xl font-bold mb-1 break-words">{title}</h3>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4 break-words">{description}</p>}
      {action}
    </div>
  );
}
