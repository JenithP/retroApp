import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";
const templatePath = "F:/성신여자대학교/수업/2025_02/HCI와 커뮤니케이션/템플릿.pptx";
const outDir = "F:/성신여자대학교/수업/2026_02/HCI와 커뮤니케이션/retroApp/.codex-build/week4-affordance/template-preview";
await fs.mkdir(outDir, { recursive: true });
const presentation = await PresentationFile.importPptx(await FileBlob.load(templatePath));
const snapshot = await presentation.inspect({ kind: "deck,slide,textbox,shape,image,table,chart,layout", maxChars: 50000 });
await fs.writeFile(path.join(outDir, "inspect.ndjson"), snapshot.ndjson, "utf8");
const montage = await presentation.export({ format: "webp", montage: true, scale: 1 });
await fs.writeFile(path.join(outDir, "montage.webp"), new Uint8Array(await montage.arrayBuffer()));
const count = presentation.slides.items.length;
for (let i = 0; i < Math.min(count, 6); i++) {
  const slide = presentation.slides.getItem(i);
  const png = await slide.export({ format: "png", scale: 1 });
  await fs.writeFile(path.join(outDir, `slide-${i+1}.png`), new Uint8Array(await png.arrayBuffer()));
}
console.log(JSON.stringify({ count, outDir }, null, 2));
