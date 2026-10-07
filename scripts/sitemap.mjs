// pages.json → sitemap.xml (deploy.yml이 _site/sitemap.xml로 출력)
// usage: node scripts/sitemap.mjs > _site/sitemap.xml
import { readFileSync } from 'node:fs';

const ORIGIN = 'https://dohyun-jose-kim.github.io';
const { hub, pages } = JSON.parse(readFileSync(new URL('../pages.json', import.meta.url), 'utf8'));
const urls = [hub, ...pages].map((p) => `  <url><loc>${ORIGIN}${p.path}</loc></url>`);
console.log(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`);
