/**
 * Serves a service page published at /uploadservice/ the moment it is published. Every other
 * /services/ page is the built page, untouched.
 *
 * Only an address saved in the database is handled (publishing refuses one that is a built or
 * redirected page). A draft or a page taken down is 404 at once. Otherwise the built page is used once a build has caught up
 * with this version (it carries data-upload="<version>"); until then the page is poured into the built
 * shell (src/pages/services/upload-shell/, fillServiceShell in src/lib/service-uploads.ts).
 */
import { SERVICE_SHELL, fillServiceShell, type CatalogLink, type ServicePage } from '../../src/lib/service-uploads';
import type { UploadEnv } from '../../src/lib/uploads';

interface Context {
  request: Request;
  env: UploadEnv;
  next(): Promise<Response>;
}

export async function onRequest({ request, env, next }: Context): Promise<Response> {
  const slug = new URL(request.url).pathname.match(/^\/services\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/)?.[1];
  if (!slug || slug === 'upload-shell' || !env.VOW_DB || !['GET', 'HEAD'].includes(request.method)) return next();
  let row: { live: number; page: string; updated: number } | null;
  try {
    row = await env.VOW_DB.prepare('SELECT live, page, updated FROM service_uploads WHERE slug = ?').bind(slug).first();
  } catch {
    return next();
  }
  if (!row) return next();

  // A draft or a removed page is not on the site, even if an earlier build still has it.
  if (row.live !== 1) {
    const notFound = await env.ASSETS!.fetch(new URL('/404.html', request.url));
    return new Response(notFound.body, { status: 404, headers: notFound.headers });
  }
  const built = await next();
  if (built.ok) {
    const html = await built.text();
    if (html.includes(`data-upload="${row.updated}"`)) return new Response(html, built);
  }
  const shell = await env.ASSETS!.fetch(new URL(SERVICE_SHELL, request.url));
  if (!shell.ok) return built.ok ? next() : shell;
  const headers = new Headers(shell.headers);
  headers.delete('x-robots-tag');
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  try {
    const page = JSON.parse(row.page) as ServicePage;
    const catalog = (await (await env.ASSETS!.fetch(new URL('/uploadservice/catalog.json', request.url))).json().catch(() => ({}))) as { links?: CatalogLink[] };
    const related = page.related_posts.map((u) => catalog.links?.find((l) => l.url === u)).filter((l): l is CatalogLink => Boolean(l));
    return new Response(fillServiceShell(await shell.text(), slug, page, row.updated, related), { status: 200, headers });
  } catch {
    // Never show a broken page: fall back to the built one, or not found until the next build.
    return built.ok ? next() : new Response((await env.ASSETS!.fetch(new URL('/404.html', request.url))).body, { status: 404 });
  }
}
