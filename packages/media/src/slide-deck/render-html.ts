import type { SlideContent, SlideDeckTheme } from '@repo/db/schema';

const THEME_MAP: Record<
  SlideDeckTheme,
  { bg: string; fg: string; accent: string; muted: string }
> = {
  executive: {
    bg: '#0b1220',
    fg: '#f8fafc',
    accent: '#38bdf8',
    muted: '#9fb0c4',
  },
  academic: {
    bg: '#f8fafc',
    fg: '#0f172a',
    accent: '#2563eb',
    muted: '#64748b',
  },
  minimal: {
    bg: '#ffffff',
    fg: '#111827',
    accent: '#111827',
    muted: '#6b7280',
  },
  contrast: {
    bg: '#111111',
    fg: '#ffffff',
    accent: '#f59e0b',
    muted: '#d1d5db',
  },
  blueprint: {
    bg: '#0a1931',
    fg: '#e2e8f0',
    accent: '#60a5fa',
    muted: '#93c5fd',
  },
  sunrise: {
    bg: '#fff7ed',
    fg: '#431407',
    accent: '#ea580c',
    muted: '#7c2d12',
  },
  graphite: {
    bg: '#1f2937',
    fg: '#f9fafb',
    accent: '#a78bfa',
    muted: '#d1d5db',
  },
  editorial: {
    bg: '#fdfbf7',
    fg: '#1f2933',
    accent: '#b45309',
    muted: '#6b7280',
  },
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderBullets = (slide: SlideContent): string => {
  const bullets = slide.bullets ?? [];
  if (bullets.length === 0) return '';
  return `<ul>${bullets
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('')}</ul>`;
};

const renderImage = (slide: SlideContent): string => {
  if (!slide.imageUrl) return '';
  return `<img src="${escapeHtml(slide.imageUrl)}" alt="${escapeHtml(slide.title)}" />`;
};

const renderSlide = (slide: SlideContent, index: number): string => {
  const body = slide.body ? `<p>${escapeHtml(slide.body)}</p>` : '';
  const notes = slide.notes
    ? `<div class="slide-notes">${escapeHtml(slide.notes)}</div>`
    : '';

  return `<section class="slide" data-index="${index}" aria-label="${escapeHtml(
    slide.title,
  )}">
  <header><h2>${escapeHtml(slide.title)}</h2></header>
  <div class="slide-content">
    ${body}
    ${renderBullets(slide)}
    ${renderImage(slide)}
  </div>
  ${notes}
</section>`;
};

export interface RenderSlideDeckHtmlInput {
  title: string;
  theme: SlideDeckTheme;
  slides: readonly SlideContent[];
}

export const renderSlideDeckHtml = (
  input: RenderSlideDeckHtmlInput,
): string => {
  const theme = THEME_MAP[input.theme];
  const slidesHtml = input.slides.map(renderSlide).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    :root {
      --bg: ${theme.bg};
      --fg: ${theme.fg};
      --accent: ${theme.accent};
      --muted: ${theme.muted};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      background: radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 18%, transparent), transparent 48%), var(--bg);
      color: var(--fg);
    }
    .deck {
      min-height: 100vh;
      display: grid;
      grid-template-rows: 1fr auto;
    }
    .slides {
      display: flex;
      overflow: auto;
      scroll-snap-type: x mandatory;
    }
    .slide {
      min-width: 100%;
      padding: min(8vw, 96px);
      scroll-snap-align: start;
      display: grid;
      align-content: center;
      gap: 1.25rem;
    }
    h2 {
      font-size: clamp(1.7rem, 3.6vw, 3rem);
      margin: 0;
      line-height: 1.15;
      max-width: 18ch;
    }
    p {
      font-size: clamp(1rem, 1.4vw, 1.3rem);
      line-height: 1.65;
      max-width: 68ch;
      color: color-mix(in srgb, var(--fg) 82%, var(--muted));
    }
    ul {
      margin: 0;
      padding-left: 1.2rem;
      display: grid;
      gap: 0.55rem;
      max-width: 70ch;
    }
    li {
      line-height: 1.45;
      color: color-mix(in srgb, var(--fg) 86%, var(--muted));
    }
    img {
      max-width: min(70vw, 960px);
      max-height: 48vh;
      border-radius: 14px;
      border: 1px solid color-mix(in srgb, var(--fg) 20%, transparent);
      box-shadow: 0 12px 44px color-mix(in srgb, black 36%, transparent);
    }
    .slide-notes {
      font-size: 0.85rem;
      color: var(--muted);
      border-top: 1px dashed color-mix(in srgb, var(--muted) 35%, transparent);
      padding-top: 0.7rem;
      margin-top: 0.5rem;
      max-width: 70ch;
    }
    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.9rem min(4vw, 42px) 1rem;
      border-top: 1px solid color-mix(in srgb, var(--muted) 35%, transparent);
      background: color-mix(in srgb, var(--bg) 85%, black 15%);
      backdrop-filter: blur(8px);
    }
    .title {
      font-size: 0.9rem;
      letter-spacing: 0.02em;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .hint {
      font-size: 0.8rem;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="deck">
    <div class="slides">${slidesHtml}</div>
    <footer class="nav">
      <div class="title">${escapeHtml(input.title)}</div>
      <div class="hint">Arrow keys or horizontal scroll</div>
    </footer>
  </div>
  <script>
    const slides = document.querySelector('.slides');
    window.addEventListener('keydown', (event) => {
      if (!slides) return;
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      slides.scrollBy({ left: direction * slides.clientWidth, behavior: 'smooth' });
    });
  </script>
</body>
</html>`;
};
