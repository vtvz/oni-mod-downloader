import axios from "npm:axios";
import { homedir } from "node:os";
import fs from "node:fs";
import path from "node:path";
import decompress from "npm:decompress";
import { WorkshopItems } from "./interfaces.ts";

const mods = [
  /**
   * Bigger Building Menu
   * https://steamcommunity.com/sharedfiles/filedetails/?id=1703611962
   */
  1703611962,
  /**
   * Bigger Camera Zoom Out
   * https://steamcommunity.com/sharedfiles/filedetails/?id=1717463209
   */
  1717463209,
  /**
   * Plan Buildings Without Materials
   * https://steamcommunity.com/sharedfiles/filedetails/?id=1717526174
   */
  1717526174,
  /**
   * GasOverlay
   * https://steamcommunity.com/sharedfiles/filedetails/?id=1737859934
   */
  1737859934,
  /**
   * Suppress Notifications
   * https://steamcommunity.com/sharedfiles/filedetails/?id=1832319118
   */
  1832319118,
  /**
   * Build Over Plants
   * https://steamcommunity.com/sharedfiles/filedetails/?id=1835394161
   */
  1835394161,
  /**
   * Falling Sand
   * https://steamcommunity.com/sharedfiles/filedetails/?id=1855163252
   */
  1855163252,
  /**
   * Sweep By Type
   * https://steamcommunity.com/sharedfiles/filedetails/?id=1863428350
   */
  1863428350,
  /**
   * Schedule Master // by @Ony 👾
   * https://steamcommunity.com/sharedfiles/filedetails/?id=1865119054
   */
  1865119054,
  /**
   * No Drop // by @Ony 👾
   * https://steamcommunity.com/sharedfiles/filedetails/?id=1868454866
   */
  1868454866,
  /**
   * Research Queue
   * https://steamcommunity.com/sharedfiles/filedetails/?id=1893887916
   */
  1893887916,
  /**
   * Priority Zero
   * https://steamcommunity.com/sharedfiles/filedetails/?id=1972768699
   */
  1972768699,
  /**
   * Deconstruct Only Buildings
   * https://steamcommunity.com/sharedfiles/filedetails/?id=1992978572
   */
  1992978572,
  /**
   * Blueprints fixed
   * https://steamcommunity.com/sharedfiles/filedetails/?id=2435244304
   */
  2435244304,
  /**
   * Reverse Bridges
   * https://steamcommunity.com/sharedfiles/filedetails/?id=2982311017
   */
  2982311017,
  /**
   * Chain Tool
   * https://steamcommunity.com/sharedfiles/filedetails/?id=3303494244
   */
  3303494244,
];

async function downloadFile(url: string, outputLocationPath: string) {
  const writer = fs.createWriteStream(outputLocationPath);

  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

const resp = await axios.post(
  "https://db.steamworkshopdownloader.io/prod/api/details/file",
  mods,
);

const tempDirPath = await Deno.makeTempDir();

const modsPath = path.resolve(
  homedir(),
  ".config/unity3d/Klei/Oxygen Not Included/mods/Local/",
);

try {
  const modsPathStat = await Deno.stat(modsPath);
  if (modsPathStat.isDirectory) {
    await Deno.remove(modsPath, { recursive: true });
  }
} catch {
  //ignore
}

await Deno.mkdir(
  modsPath,
  { recursive: true },
);

console.log("const mods = [");

for (const item of resp.data as WorkshopItems) {
  console.log(`  /**`);
  console.log(`   * ${item.title}`);
  console.log(
    `   * https://steamcommunity.com/sharedfiles/filedetails/?id=${item.publishedfileid}`,
  );
  console.log(`   */`);
  console.log(`  ${item.publishedfileid},`);

  const modPath = path.resolve(
    modsPath,
    item.title_disk_safe,
  );

  await Deno.mkdir(
    modPath,
    { recursive: true },
  );

  const zipPath = path.resolve(tempDirPath, `${item.title_disk_safe}.zip`);
  await downloadFile(
    item.file_url,
    zipPath,
  );

  await decompress(
    zipPath,
    modPath,
  );
}

await Deno.remove(tempDirPath, { recursive: true });

console.log("];");
