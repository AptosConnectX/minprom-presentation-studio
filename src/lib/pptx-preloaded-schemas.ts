export const PRELOADED_SCHEMA_NAMES = [
  "SlideOptions",
  "ShapeOptions",
  "TextBodyOptions",
  "TextRunOptions",
  "TableOptions",
  "BackgroundOptions",
] as const;

/** Короткий контракт (~3–4 КБ). НЕ читать pptx-schemas-raw.txt */
export const PPTX_PRELOADED_SCHEMAS = `
КОНТРАКТ generate-pptx (только этот формат):

{
  "slides": [
    {
      "background": { "fill": "011233" },
      "children": [ /* shape | table */ ]
    }
  ]
}

SHAPE (заголовок / текст / карточка):
{
  "shape": {
    "x": "0.4in", "y": "0.25in", "width": "9.2in", "height": "0.7in",
    "fill": null,
    "outline": { "fill": "FFFFFF", "width": 1.5 },
    "textBody": {
      "paragraphs": [
        {
          "align": "center",
          "runs": [
            {
              "text": "Текст",
              "font": "Arial",
              "fontSize": 22,
              "bold": true,
              "color": "FFFFFF"
            }
          ]
        }
      ]
    }
  }
}

TABLE (вместо любых диаграмм/графиков):
{
  "table": {
    "x": "0.4in", "y": "1.1in", "width": "9.2in", "height": "4.5in",
    "rows": [
      {
        "cells": [
          { "text": "Показатель", "color": "FFFFFF", "bold": true },
          { "text": "Значение", "color": "FFFFFF", "bold": true }
        ]
      },
      {
        "cells": [
          { "text": "Индекс пром. производства", "color": "FFFFFF" },
          { "text": "106,6 %", "color": "FFFFFF" }
        ]
      }
    ]
  }
}

ОБЯЗАТЕЛЬНО:
- background.fill каждого слайда = "011233"
- color каждого текстового run/ячейки = "FFFFFF"
- font = "Arial"
- заголовок ~22pt bold; цифры ~28pt; обычный текст ~15pt
- 12–15 слайдов; на слайде реальные цифры из структуры

ЗАПРЕЩЕНО на слайде как текст:
"диаграмма", "график", "водопадная", "круговая", "столбчатая", "карта", "инфографика", "иконки"
Если в структуре «круговая диаграмма» → TABLE или 3–6 shape-карточек с теми же %.
`.trim();