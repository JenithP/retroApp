import { FileBlob, PresentationFile } from "@oai/artifact-tool";
const p = await PresentationFile.importPptx(await FileBlob.load("F:/성신여자대학교/수업/2025_02/HCI와 커뮤니케이션/템플릿.pptx"));
const s = p.slides.getItem(1);
const sh = s.shapes.items[0];
const im = s.images.items[0];
console.log('shape proto methods', Object.getOwnPropertyNames(Object.getPrototypeOf(sh)).filter(k=>typeof sh[k]==='function'));
console.log('shape props', {name: sh.name, position: sh.position, text: sh.text?.toString?.(), fill: sh.fill});
console.log('image proto methods', Object.getOwnPropertyNames(Object.getPrototypeOf(im)).filter(k=>typeof im[k]==='function'));
console.log('image props', {name: im.name, position: im.position, frame: im.frame});
