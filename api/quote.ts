import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { symbol } = req.query;

  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Brak symbolu' });
  }

  try {
    const cleanSymbol = symbol.trim().toUpperCase();
    const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${cleanSymbol}`;

    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Błąd odpowiedzi Yahoo' });
    }

    const data = await response.json();
    const quote = data?.quoteResponse?.result?.[0];

    if (!quote) {
      return res.status(404).json({ error: 'Nie znaleziono symbolu' });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      price: quote.regularMarketPrice || null,
      name: quote.longName || quote.shortName || cleanSymbol,
      currency: quote.currency || 'PLN',
      type: quote.quoteType === 'ETF' ? 'etf' : 'stock',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Błąd serwera API' });
  }
}