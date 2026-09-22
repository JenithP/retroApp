import { FileBlob, PresentationFile } from "@oai/artifact-tool";
const p = await PresentationFile.importPptx(await FileBlob.load("F:/성신여자대학교/수업/2025_02/HCI와 커뮤니케이션/템플릿.pptx"));
console.log(p.slides.getItem(0).frame);
