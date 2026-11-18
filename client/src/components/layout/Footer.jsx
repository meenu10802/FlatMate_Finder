import { ArrowUpRight } from 'lucide-react';
import { Logo } from './Navbar.jsx';
import { GitHubIcon, LinkedInIcon } from '../ui/BrandIcons.jsx';

export const AUTHOR = {
  name: 'Meenakshi Kalimuthu',
  github: 'https://github.com/meenu10802',
  linkedin: 'https://www.linkedin.com/in/meenu-chettiar/',
};

const LINKS = [
  { label: 'GitHub', handle: 'meenu10802', href: AUTHOR.github, Icon: GitHubIcon },
  { label: 'LinkedIn', handle: 'meenu-chettiar', href: AUTHOR.linkedin, Icon: LinkedInIcon },
];

/** Site-wide footer crediting the author. Monochrome only. */
export default function Footer() {
  return (
    <footer className="mt-16 border-t border-sand-300/70 dark:border-neutral-800">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Logo />
          <p className="mt-6 text-xs font-bold uppercase tracking-wider text-neutral-600">Designed &amp; built by</p>
          <p className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">{AUTHOR.name}</p>
          <p className="mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
            A full-stack portfolio project — React, Node.js/Express and MySQL.
          </p>
        </div>

        <ul className="flex flex-wrap gap-3">
          {LINKS.map(({ label, handle, href, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-full border border-black/10 bg-white py-2 pl-2 pr-4 shadow-card transition-colors hover:border-black hover:bg-black hover:text-white dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-white dark:hover:text-black"
                aria-label={`${AUTHOR.name} on ${label} (opens in a new tab)`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-colors group-hover:bg-white group-hover:text-black dark:bg-white dark:text-black">
                  <Icon size={17} />
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-bold">{label}</span>
                  <span className="block text-xs text-neutral-600 group-hover:text-neutral-300">@{handle}</span>
                </span>
                <ArrowUpRight size={15} className="ml-1 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-sand-300/70 dark:border-neutral-800">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-neutral-600">
          © {new Date().getFullYear()} {AUTHOR.name} · Flatmate Finder
        </p>
      </div>
    </footer>
  );
}
