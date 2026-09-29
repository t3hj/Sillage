// One-off: rasterise public/favicon.svg and emit public/favicon.ico.
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { readFileSync, writeFileSync } from "node:fs";

const svg = readFileSync("public/favicon.svg");

const png16 = await sharp(svg).resize(16, 16).png().toBuffer();
const png32 = await sharp(svg).resize(32, 32).png().toBuffer();
const png48 = await sharp(svg).resize(48, 48).png().toBuffer();

const ico = await pngToIco([png16, png32, png48]);
writeFileSync("public/favicon.ico", ico);
console.log("favicon.ico written");
