import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// twMerge harus tahu skala tipe kustom (@theme di globals.css). Tanpa ini, `text-headline`
// dianggap warna dan membuang `text-on-accent` di sebelahnya.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'caption', 'subhead', 'headline', 'callout', 'footnote', 'display',
            'title-1', 'title-2', 'title-3', 'metric-m', 'metric-l', 'metric-xl',
          ],
        },
      ],
    },
  },
});

// Gabung className kondisional, lalu buang utilitas Tailwind yang bertabrakan.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
