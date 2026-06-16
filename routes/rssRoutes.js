const express = require('express');
const { withConn } = require('../config/database');

const createRssRoutes = () => {
  const router = express.Router();

  router.get('/api/rss', async (req, res) => {
    try {
      const [settings, items] = await Promise.all([
        withConn(async (conn) => {
          const [rows] = await conn.query("SELECT `key`, `value` FROM settings WHERE `key` IN ('site_name','site_description','site_url')");
          const s = {}; rows.forEach(r => s[r.key] = r.value); return s;
        }),
        withConn(async (conn) => {
          const [rows] = await conn.query(
            'SELECT id, title, software_name, summary, created_at FROM resources WHERE status = "approved" ORDER BY created_at DESC LIMIT 50'
          );
          return rows;
        })
      ]);

      const siteUrl = settings.site_url || `${req.protocol}://${req.get('host')}`;
      const siteName = settings.site_name || '资源分享博客';
      const description = settings.site_description || '';

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeXml(siteName)}</title>
  <link>${escapeXml(siteUrl)}</link>
  <description>${escapeXml(description)}</description>
  <language>zh-cn</language>
  <atom:link href="${escapeXml(siteUrl)}/api/rss" rel="self" type="application/rss+xml"/>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;

      items.forEach(item => {
        xml += `
  <item>
    <title>${escapeXml(item.title)}${item.software_name ? ' - ' + escapeXml(item.software_name) : ''}</title>
    <link>${escapeXml(siteUrl)}/detail/${item.id}</link>
    <guid>${escapeXml(siteUrl)}/detail/${item.id}</guid>
    <description>${escapeXml(item.summary || '')}</description>
    <pubDate>${new Date(item.created_at).toUTCString()}</pubDate>
  </item>`;
      });

      xml += '\n</channel>\n</rss>';
      res.set('Content-Type', 'application/rss+xml; charset=utf-8').send(xml);
    } catch { res.status(500).send('生成 RSS 失败'); }
  });

  router.get('/sitemap.xml', async (req, res) => {
    try {
      const [settings, items] = await Promise.all([
        withConn(async (conn) => {
          const [rows] = await conn.query("SELECT `value` FROM settings WHERE `key` = 'site_url'");
          return rows[0]?.value || `${req.protocol}://${req.get('host')}`;
        }),
        withConn(async (conn) => {
          const [rows] = await conn.query(
            'SELECT id, updated_at FROM resources WHERE status = "approved" ORDER BY updated_at DESC'
          );
          return rows;
        })
      ]);

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${escapeXml(settings)}/</loc><priority>1.0</priority></url>
  <url><loc>${escapeXml(settings)}/ranking</loc><priority>0.8</priority></url>`;
      items.forEach(item => {
        xml += `
  <url>
    <loc>${escapeXml(settings)}/detail/${item.id}</loc>
    <lastmod>${new Date(item.updated_at || item.created_at).toISOString()}</lastmod>
    <priority>0.6</priority>
  </url>`;
      });
      xml += '\n</urlset>';
      res.set('Content-Type', 'application/xml; charset=utf-8').send(xml);
    } catch { res.status(500).send('生成 Sitemap 失败'); }
  });

  return router;
};

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = createRssRoutes;
