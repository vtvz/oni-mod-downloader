import axios from "npm:axios";
import { homedir } from "node:os";
import fs from "node:fs";
import path from "node:path";
import decompress from "npm:decompress";
import { WorkshopItems } from "./interfaces.ts";
import { parse } from "jsr:@std/yaml";

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

// deno-lint-ignore no-explicit-any
function isNumber(value: any) {
  return typeof value === "number";
}

interface ModItem {
  id: number;
  disabled: boolean;
}

async function getModsList(): Promise<ModItem[]> {
  const modsFilePath = path.join(Deno.cwd(), "./mods.yml");
  const modsFileRaw = await Deno.readTextFile(modsFilePath);
  const modsFileYml = parse(modsFileRaw) as (ModItem | number)[];
  const mods = modsFileYml.map((mod) =>
    isNumber(mod) ? { id: mod as number, disabled: false } : mod
  );

  return mods;
}

async function app() {
  const mods = await getModsList();
  const modsIds = mods.map((mod) => mod.id);
  const disabledIds = mods.filter((mod) => mod.disabled).map((mod) => mod.id);

  const resp = await axios.post(
    "https://db.steamworkshopdownloader.io/prod/api/details/file",
    modsIds,
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

  const modsFileContent = ["---"];

  for (const item of resp.data as WorkshopItems) {
    console.log(`${item.publishedfileid} : ${item.title}`);
    const isDisabled = disabledIds.includes(parseInt(item.publishedfileid));
    const timeUpdated = new Date(item.time_updated * 1000);

    modsFileContent.push(`# ${item.title}`);
    modsFileContent.push(`# ${timeUpdated}`);
    modsFileContent.push(
      `# https://steamcommunity.com/sharedfiles/filedetails/?id=${item.publishedfileid}`,
    );
    modsFileContent.push(`- id: ${item.publishedfileid}`);
    if (isDisabled) {
      console.log("  Skip downloading as it's disabled");
      modsFileContent.push(`  disabled: true`);
      modsFileContent.push(``);

      continue;
    }
    modsFileContent.push(``);

    const modPath = path.resolve(
      modsPath,
      item.title_disk_safe,
    );

    await Deno.mkdir(
      modPath,
      { recursive: true },
    );

    const zipPath = path.resolve(tempDirPath, `${item.title_disk_safe}.zip`);
    for (const attempt of Array(5).keys()) {
      try {
        await downloadFile(
          item.file_url,
          zipPath,
        );
        continue;
      } catch (err) {
        if (attempt == 4) throw err;

        console.log("Caught error", `Attempt ${attempt + 2}`);
      }
    }

    await decompress(
      zipPath,
      modPath,
    );
  }

  await Deno.remove(tempDirPath, { recursive: true });

  await Deno.writeTextFile("mods.yml", modsFileContent.join("\n").trim());
}

await app();
