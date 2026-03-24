import type { Publication } from './content-types';

interface RawPublication {
  title?: unknown;
  abstract?: unknown;
  authors?: unknown;
  date?: unknown;
  source?: unknown;
  links?: unknown;
}

function ensureNonEmptyString(value: unknown, key: string, filePath: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Invalid publication field "${key}" in ${filePath}`);
  }

  return value.trim();
}

function ensureAuthors(value: unknown, filePath: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Invalid publication field "authors" in ${filePath}`);
  }

  const authors = value
    .map((author) => (typeof author === 'string' ? author.trim() : ''))
    .filter(Boolean);

  if (authors.length === 0) {
    throw new Error(`Invalid publication field "authors" in ${filePath}`);
  }

  return authors;
}

function normalizePublicationLinks(raw: RawPublication): Record<string, string> | undefined {
  if (!raw.links || typeof raw.links !== 'object' || Array.isArray(raw.links)) {
    return undefined;
  }

  const links = Object.entries(raw.links)
    .map(([name, href]) => {
      if (typeof href !== 'string') {
        return null;
      }

      const normalizedName = name.trim();
      const normalizedHref = href.trim();
      if (!normalizedName || !normalizedHref) {
        return null;
      }

      return [normalizedName, normalizedHref] as const;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry))
    .sort(([nameA], [nameB]) => nameA.localeCompare(nameB, 'en'));

  if (links.length === 0) {
    return undefined;
  }

  return Object.fromEntries(links);
}

export function normalizePublication(rawValue: unknown, filePath: string): Publication {
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    throw new Error(`Invalid publication content in ${filePath}`);
  }

  const raw = rawValue as RawPublication;
  const title = ensureNonEmptyString(raw.title, 'title', filePath);
  const date = ensureNonEmptyString(raw.date, 'date', filePath);

  return {
    title,
    date,
    authors: ensureAuthors(raw.authors, filePath),
    abstract: typeof raw.abstract === 'string' && raw.abstract.trim() ? raw.abstract.trim() : undefined,
    source: typeof raw.source === 'string' && raw.source.trim() ? raw.source.trim() : undefined,
    links: normalizePublicationLinks(raw),
  };
}

export interface PublicationLinkEntry {
  name: string;
  href: string;
  label: string;
}

export function formatPublicationLinkLabel(name: string): string {
  return name
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(' ');
}

export function resolvePublicationLinks(publication: Publication): PublicationLinkEntry[] {
  return Object.entries(publication.links ?? {})
    .filter(([name, href]) => Boolean(name.trim() && href.trim()))
    .sort(([nameA], [nameB]) => nameA.localeCompare(nameB, 'en'))
    .map(([name, href]) => {
      const normalizedName = name.trim();
      return {
        name: normalizedName,
        href: href.trim(),
        label: formatPublicationLinkLabel(normalizedName),
      };
    });
}
