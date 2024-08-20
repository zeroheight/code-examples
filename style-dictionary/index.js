import { promises as fs } from "fs";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import StyleDictionary from "style-dictionary";
import { extractCollectionAndMode, extractCollectionModes } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const styleDictionaryURL =
  "https://zeroheight.zeroheight.com/api/token_management/token_set/7770/style_dictionary_links";

/**
 * Fetches links for each collection and mode
 *
 * @returns {string[]} list of URLs for each collection and mode
 */
async function fetchLinks() {
  try {
    /** styleDictionaryURL value is generated per a token set at zeroheight.
     *
     * If you generate a private link, you need to generate access token and add additional headers to the request
     * X-API-CLIENT
     * X-API-KEY
     *
     * Learn more: https://zeroheight.com/help/article/documenting-figma-color-variables/
     */
    const response = await fetch(styleDictionaryURL);
    const textResponse = await response.text();
    const links = textResponse.split("\n");

    return links;
  } catch (error) {
    console.error("❗️Error fetching links:", error);
  }
}

/**
 * Iterates links, fetches Style Dictionary JSON files and saves them
 *
 * @param {string[]} links
 */
async function saveFiles(links) {
  try {
    for (const link of links) {
      const response = await fetch(link);

      if (!response.ok) {
        throw new Error(`Failed to fetch from ${link}: ${response.statusText}`);
      }

      const jsonData = await response.json();

      const [collection, mode] = extractCollectionAndMode(link);
      const directory = path.join(__dirname, "json", collection);

      await fs.mkdir(directory, { recursive: true });

      const fileName = `${mode}.json`;
      const filePath = path.join(directory, fileName);

      await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2));
    }
  } catch (error) {
    console.error("❗️Error:", error);
  }
}

/**
 * Returns Style Dictionary config
 *
 * @param {string} mode1
 * @param {string} mode2
 * @returns {json} Style Dictionary config
 */
function getStyleDictionaryConfig(mode1, mode2) {
  const buildDir = [mode1, mode2].join("_");

  return {
    source: [`json/tokens/${mode1}.json`, `json/primitives/${mode2}.json`],
    platforms: {
      web: {
        transformGroup: "web",
        buildPath: `build/web/${buildDir}/`,
        files: [
          {
            destination: "tokens.css",
            format: "css/variables",
          },
        ],
      },
      ios: {
        transformGroup: "ios",
        buildPath: `build/ios/${buildDir}/`,
        files: [
          {
            destination: "tokens.h",
            format: "ios/macros",
          },
        ],
      },
    },
  };
}

/**
 * Main function that builds tokens
 */
(async () => {
  const links = await fetchLinks();
  await saveFiles(links);

  const collectionModes = extractCollectionModes(links);
  const tokensCollectionModes = collectionModes.tokens;
  const primitivesCollectionModes = collectionModes.primitives;
  const platforms = ["web", "ios"];

  console.log("\n🚀 Build started...");

  tokensCollectionModes.forEach((m1) => {
    primitivesCollectionModes.forEach((m2) => {
      platforms.forEach((platform) => {
        const sd = new StyleDictionary(getStyleDictionaryConfig(m1, m2));
        sd.buildPlatform(platform);
      });
    });
  });
})();
