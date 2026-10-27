# AI Presentation Studio

Министерский стилист презентаций для Министерства промышленности, энергетики и инноваций Республики Башкортостан.

Генерирует структурированные `.pptx` презентации из официальных справок и докладов в жёстком фирменном стиле.

## Стек

- Next.js 15 (App Router)
- Grok 4.7 через ProxyAPI.ru
- PptxGenJS
- Mammoth (парсинг DOCX)

## Локальный запуск

```bash
cp .env.example .env.local
# вставьте свой PROXYAPI_KEY

npm install
npm run dev
```

## Деплой на Vercel

1. Импортируйте репозиторий
2. Добавьте Environment Variable:
   - Key: `PROXYAPI_KEY`
   - Value: ваш ключ ProxyAPI
3. Deploy

Ключ **никогда** не попадает в клиентский код и не коммитится в Git.
