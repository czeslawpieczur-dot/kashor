import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { symbol } = req.query;

  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Brak symbolu' });
  }

  try {
    const cleanSymbol = symbol.trim().toUpperCase();

    // v7/quote jest zablokowane (401) – używamy v8/chart
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?interval=1d&range=1d`;

    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Błąd odpowiedzi Yahoo' });
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;

    if (!meta || meta.regularMarketPrice == null) {
      return res.status(404).json({ error: 'Nie znaleziono symbolu' });
    }

    let type = 'stock';
    if (meta.instrumentType === 'ETF') type = 'etf';
    if (meta.instrumentType === 'CRYPTOCURRENCY' || cleanSymbol.includes('-USD')) type = 'crypto';
    if (meta.instrumentType === 'FUTURE' || cleanSymbol.includes('=F')) type = 'commodity';

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      price: meta.regularMarketPrice,
      name: meta.shortName || meta.longName || cleanSymbol,
      currency: meta.currency || 'PLN',
      type,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Błąd serwera API' });
  }
}