import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { symbol } = req.query;

  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Brak symbolu' });
  }

  try {
    let cleanSymbol = symbol.trim().toUpperCase();
    
    // Mapowanie końcówek Londynu XTB -> Yahoo
    if (cleanSymbol.endsWith('.UK')) {
      cleanSymbol = cleanSymbol.replace(/\.UK$/, '.L');
    }

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?interval=1d&range=1d`;

    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Błąd odpowiedzi Yahoo' });
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;

    if (!meta) {
      return res.status(404).json({ error: 'Nie znaleziono symbolu' });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      price: meta.regularMarketPrice || null,
      name: meta.shortName || meta.longName || cleanSymbol,
      currency: meta.currency || 'PLN',
      type: meta.instrumentType === 'ETF' ? 'etf' : 'stock',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Błąd serwera API' });
  }
}