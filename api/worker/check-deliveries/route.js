import { NextResponse, NextRequest } from 'next/server';

export async function GET(req /*: NextRequest */) {
  // Опциональная защита: если задан CRON_SECRET, проверяем Authorization
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization') || '';
    if (auth !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  // Пока тестовый ответ — дальше сюда вставим реальную логику
  return NextResponse.json({
    ok: true,
    worker: 'check-deliveries',
    ts: new Date().toISOString(),
  });
}
