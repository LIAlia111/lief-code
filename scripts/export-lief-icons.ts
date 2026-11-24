// @effect-diagnostics nodeBuiltinImport:off globalConsole:off - Standalone asset generator.
import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import sharp from "sharp";
import { BRAND_ASSET_PATHS, resolveWebIconOverrides } from "./lib/brand-assets.ts";
import { encodePngIco, WINDOWS_ICON_SIZES } from "./lib/icon-export.ts";

const root = NodePath.resolve(import.meta.dirname, "..");
const svg = await NodeFSP.readFile(NodePath.resolve(root, "assets/brand/lief-mark.svg"), "utf8");
const mark = Buffer.from(svg);
const check = process.argv.includes("--check");

function raster(size: number, source = mark) {
  return sharp(source).resize(size, size).png().toBuffer();
}

async function output(relativePath: string, contents: string | Buffer) {
  const file = NodePath.resolve(root, relativePath);
  if (!check) {
    await NodeFSP.writeFile(file, contents);
    return;
  }
  if (!(await NodeFSP.readFile(file)).equals(Buffer.from(contents))) {
    throw new Error("Stale icon asset: " + relativePath);
  }
}

const windowsIcons = encodePngIco(
  await Promise.all(
    WINDOWS_ICON_SIZES.map(async (size) => ({ size, contents: await raster(size) })),
  ),
);
const favicon = encodePngIco(
  await Promise.all([16, 32, 48].map(async (size) => ({ size, contents: await raster(size) }))),
);
const desktop = await raster(1024);
const ios = await sharp(mark)
  .resize(1024, 1024)
  .flatten({ background: "#2547d5" })
  .png()
  .toBuffer();
const iconComposer =
  JSON.stringify(
    {
      fill: { solid: "srgb:0.14510,0.27843,0.83529,1.00000" },
      groups: [{ layers: [{ "image-name": "text.svg", name: "Lief.code" }] }],
      "supported-platforms": { circles: ["watchOS"], squares: "shared" },
    },
    null,
    2,
  ) + "\n";

for (const [name, file] of Object.entries(BRAND_ASSET_PATHS)) {
  if (name.endsWith("IconComposerProject")) {
    await output(file + "/icon.json", iconComposer);
    await output(file + "/Assets/text.svg", svg);
  } else if (name.endsWith("IosIconPng")) {
    await output(file, ios);
  } else if (name.endsWith("WindowsIconIco")) {
    await output(file, windowsIcons);
  } else if (!name.includes("Web")) {
    await output(file, desktop);
  }
}

const webIcons = new Map([
  ["favicon.ico", favicon],
  ["favicon-16x16.png", await raster(16)],
  ["favicon-32x32.png", await raster(32)],
  ["apple-touch-icon.png", await raster(180)],
  ["icon-192x192.png", await raster(192)],
  ["icon-512x512.png", await raster(512)],
]);
for (const variant of ["development", "nightly", "production"] as const) {
  for (const paths of resolveWebIconOverrides(variant, "apps/web/public")) {
    const name = paths.targetRelativePath.split("/").at(-1)!;
    const contents = webIcons.get(name)!;
    await output(paths.sourceRelativePath, contents);
    if (variant === "production") await output(paths.targetRelativePath, contents);
  }
}

await output("apps/web/public/lief-mark.svg", svg);
await output("apps/web/public/lief-mark-light.svg", svg);
await output("assets/brand/lief-mark-light.svg", svg);
await output("apps/desktop/prod-resources/icon.png", desktop);
await output("apps/desktop/prod-resources/icon.ico", windowsIcons);
const icnsChunks = await Promise.all(
  (
    [
      ["icp4", 16],
      ["icp5", 32],
      ["icp6", 64],
      ["ic07", 128],
      ["ic08", 256],
      ["ic09", 512],
      ["ic10", 1024],
    ] as const
  ).map(async ([type, size]) => {
    const png = await raster(size);
    const header = Buffer.alloc(8);
    header.write(type);
    header.writeUInt32BE(header.length + png.length, 4);
    return Buffer.concat([header, png]);
  }),
);
const icns = Buffer.concat([Buffer.from("icns\0\0\0\0"), ...icnsChunks]);
icns.writeUInt32BE(icns.length, 4);
await output("apps/desktop/prod-resources/icon.icns", icns);
console.log(check ? "Lief.code icon assets are current." : "Exported Lief.code icon assets.");
