import { writeFileSync } from "node:fs";

const names = [
  "SlideOptions",
  "SlideChild",
  "ShapeOptions",
  "TextBodyOptions",
  "TextRunOptions",
  "TableOptions",
  "TextFontOptions",
  "BackgroundOptions",
];

async function main() {
  let mod;
  try {
    mod = await import("office-open/schemas");
  } catch {
    mod = await import("office-open");
  }

  console.log("exports:", Object.keys(mod));

  const fn =
    mod.sliceDocumentSchema ||
    mod.sliceSchema ||
    mod.slicePresentationSchema ||
    mod.getSchemaSlice ||
    mod.default?.sliceDocumentSchema;

  if (!fn) {
    console.error("Не нашли функцию slice*. Смотрите exports выше.");
    process.exit(1);
  }

  const slice = fn("pptx", names);
  const text =
    typeof slice === "string"
      ? slice
      : JSON.stringify(slice, null, 2);

  writeFileSync("src/lib/pptx-schemas-raw.txt", text, "utf8");
  console.log("OK bytes:", Buffer.byteLength(text, "utf8"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});