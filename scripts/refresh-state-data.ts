/**
 * Generates data/states.json — the 50 US states dataset that parallels
 * data/countries.json. State entries use the same shape as Country entries so
 * the whole game stack (engine, library, stats) works unchanged; the
 * `continent` field holds the US Census region instead.
 *
 * Flag assets come from scripts/fetch-state-flags.sh (Wikimedia Commons) and
 * shape assets from scripts/generate-state-shapes.ts (@svg-maps/usa).
 */
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getStateFact } from "./place-facts";

type StateRow = [
  postal: string,
  name: string,
  capital: string,
  region: "Northeast" | "Midwest" | "South" | "West",
  division: string,
  population: number,
  areaKm2: number,
  borders: string[],
  nickname: string,
];

// Population: 2023 Census estimates. Area: total area in km².
const STATE_ROWS: StateRow[] = [
  ["AL", "Alabama", "Montgomery", "South", "East South Central", 5108468, 135767, ["FL", "GA", "MS", "TN"], "the Yellowhammer State"],
  ["AK", "Alaska", "Juneau", "West", "Pacific", 733406, 1723337, [], "the Last Frontier"],
  ["AZ", "Arizona", "Phoenix", "West", "Mountain", 7431344, 295234, ["CA", "CO", "NM", "NV", "UT"], "the Grand Canyon State"],
  ["AR", "Arkansas", "Little Rock", "South", "West South Central", 3067732, 137732, ["LA", "MO", "MS", "OK", "TN", "TX"], "the Natural State"],
  ["CA", "California", "Sacramento", "West", "Pacific", 38965193, 423967, ["AZ", "NV", "OR"], "the Golden State"],
  ["CO", "Colorado", "Denver", "West", "Mountain", 5877610, 269601, ["AZ", "KS", "NE", "NM", "OK", "UT", "WY"], "the Centennial State"],
  ["CT", "Connecticut", "Hartford", "Northeast", "New England", 3617176, 14357, ["MA", "NY", "RI"], "the Constitution State"],
  ["DE", "Delaware", "Dover", "South", "South Atlantic", 1031890, 6446, ["MD", "NJ", "PA"], "the First State"],
  ["FL", "Florida", "Tallahassee", "South", "South Atlantic", 22610726, 170312, ["AL", "GA"], "the Sunshine State"],
  ["GA", "Georgia", "Atlanta", "South", "South Atlantic", 11029227, 153910, ["AL", "FL", "NC", "SC", "TN"], "the Peach State"],
  ["HI", "Hawaii", "Honolulu", "West", "Pacific", 1435138, 28313, [], "the Aloha State"],
  ["ID", "Idaho", "Boise", "West", "Mountain", 1964726, 216443, ["MT", "NV", "OR", "UT", "WA", "WY"], "the Gem State"],
  ["IL", "Illinois", "Springfield", "Midwest", "East North Central", 12549689, 149995, ["IA", "IN", "KY", "MO", "WI"], "the Prairie State"],
  ["IN", "Indiana", "Indianapolis", "Midwest", "East North Central", 6862199, 94326, ["IL", "KY", "MI", "OH"], "the Hoosier State"],
  ["IA", "Iowa", "Des Moines", "Midwest", "West North Central", 3207004, 145746, ["IL", "MN", "MO", "NE", "SD", "WI"], "the Hawkeye State"],
  ["KS", "Kansas", "Topeka", "Midwest", "West North Central", 2940546, 213100, ["CO", "MO", "NE", "OK"], "the Sunflower State"],
  ["KY", "Kentucky", "Frankfort", "South", "East South Central", 4526154, 104656, ["IL", "IN", "MO", "OH", "TN", "VA", "WV"], "the Bluegrass State"],
  ["LA", "Louisiana", "Baton Rouge", "South", "West South Central", 4573749, 135659, ["AR", "MS", "TX"], "the Pelican State"],
  ["ME", "Maine", "Augusta", "Northeast", "New England", 1395722, 91633, ["NH"], "the Pine Tree State"],
  ["MD", "Maryland", "Annapolis", "South", "South Atlantic", 6180253, 32131, ["DE", "PA", "VA", "WV"], "the Old Line State"],
  ["MA", "Massachusetts", "Boston", "Northeast", "New England", 7001399, 27336, ["CT", "NH", "NY", "RI", "VT"], "the Bay State"],
  ["MI", "Michigan", "Lansing", "Midwest", "East North Central", 10037261, 250487, ["IN", "OH", "WI"], "the Great Lakes State"],
  ["MN", "Minnesota", "Saint Paul", "Midwest", "West North Central", 5737915, 225163, ["IA", "ND", "SD", "WI"], "the North Star State"],
  ["MS", "Mississippi", "Jackson", "South", "East South Central", 2939690, 125438, ["AL", "AR", "LA", "TN"], "the Magnolia State"],
  ["MO", "Missouri", "Jefferson City", "Midwest", "West North Central", 6196156, 180540, ["AR", "IA", "IL", "KS", "KY", "NE", "OK", "TN"], "the Show-Me State"],
  ["MT", "Montana", "Helena", "West", "Mountain", 1132812, 380831, ["ID", "ND", "SD", "WY"], "the Treasure State"],
  ["NE", "Nebraska", "Lincoln", "Midwest", "West North Central", 1978379, 200330, ["CO", "IA", "KS", "MO", "SD", "WY"], "the Cornhusker State"],
  ["NV", "Nevada", "Carson City", "West", "Mountain", 3194176, 286380, ["AZ", "CA", "ID", "OR", "UT"], "the Silver State"],
  ["NH", "New Hampshire", "Concord", "Northeast", "New England", 1402054, 24214, ["MA", "ME", "VT"], "the Granite State"],
  ["NJ", "New Jersey", "Trenton", "Northeast", "Mid-Atlantic", 9290841, 22591, ["DE", "NY", "PA"], "the Garden State"],
  ["NM", "New Mexico", "Santa Fe", "West", "Mountain", 2114371, 314917, ["AZ", "CO", "OK", "TX", "UT"], "the Land of Enchantment"],
  ["NY", "New York", "Albany", "Northeast", "Mid-Atlantic", 19571216, 141297, ["CT", "MA", "NJ", "PA", "VT"], "the Empire State"],
  ["NC", "North Carolina", "Raleigh", "South", "South Atlantic", 10835491, 139391, ["GA", "SC", "TN", "VA"], "the Tar Heel State"],
  ["ND", "North Dakota", "Bismarck", "Midwest", "West North Central", 783926, 183108, ["MN", "MT", "SD"], "the Peace Garden State"],
  ["OH", "Ohio", "Columbus", "Midwest", "East North Central", 11785935, 116098, ["IN", "KY", "MI", "PA", "WV"], "the Buckeye State"],
  ["OK", "Oklahoma", "Oklahoma City", "South", "West South Central", 4053824, 181037, ["AR", "CO", "KS", "MO", "NM", "TX"], "the Sooner State"],
  ["OR", "Oregon", "Salem", "West", "Pacific", 4233358, 254799, ["CA", "ID", "NV", "WA"], "the Beaver State"],
  ["PA", "Pennsylvania", "Harrisburg", "Northeast", "Mid-Atlantic", 12961683, 119280, ["DE", "MD", "NJ", "NY", "OH", "WV"], "the Keystone State"],
  ["RI", "Rhode Island", "Providence", "Northeast", "New England", 1095962, 4001, ["CT", "MA"], "the Ocean State"],
  ["SC", "South Carolina", "Columbia", "South", "South Atlantic", 5373555, 82933, ["GA", "NC"], "the Palmetto State"],
  ["SD", "South Dakota", "Pierre", "Midwest", "West North Central", 919318, 199729, ["IA", "MN", "MT", "ND", "NE", "WY"], "the Mount Rushmore State"],
  ["TN", "Tennessee", "Nashville", "South", "East South Central", 7126489, 109153, ["AL", "AR", "GA", "KY", "MO", "MS", "NC", "VA"], "the Volunteer State"],
  ["TX", "Texas", "Austin", "South", "West South Central", 30503301, 695662, ["AR", "LA", "NM", "OK"], "the Lone Star State"],
  ["UT", "Utah", "Salt Lake City", "West", "Mountain", 3417734, 219882, ["AZ", "CO", "ID", "NM", "NV", "WY"], "the Beehive State"],
  ["VT", "Vermont", "Montpelier", "Northeast", "New England", 647464, 24906, ["MA", "NH", "NY"], "the Green Mountain State"],
  ["VA", "Virginia", "Richmond", "South", "South Atlantic", 8715698, 110787, ["KY", "MD", "NC", "TN", "WV"], "the Old Dominion"],
  ["WA", "Washington", "Olympia", "West", "Pacific", 7812880, 184661, ["ID", "OR"], "the Evergreen State"],
  ["WV", "West Virginia", "Charleston", "South", "South Atlantic", 1770071, 62756, ["KY", "MD", "OH", "PA", "VA"], "the Mountain State"],
  ["WI", "Wisconsin", "Madison", "Midwest", "East North Central", 5910955, 169635, ["IA", "IL", "MI", "MN"], "the Badger State"],
  ["WY", "Wyoming", "Cheyenne", "West", "Mountain", 584057, 253335, ["CO", "ID", "MT", "NE", "SD", "UT"], "the Equality State"],
];

const toCode = (postal: string) => `US-${postal}`;

function verifyBordersSymmetric() {
  const map = new Map(STATE_ROWS.map((row) => [row[0], new Set(row[7])]));
  for (const [postal, , , , , , , borders] of STATE_ROWS) {
    for (const other of borders) {
      if (!map.get(other)?.has(postal)) {
        throw new Error(`Asymmetric border: ${postal} -> ${other}`);
      }
    }
  }
}

verifyBordersSymmetric();

const states = STATE_ROWS.map(
  ([postal, name, capital, region, division, population, area, borders, nickname]) => {
    const code = toCode(postal);
    const flagPath = join(process.cwd(), "public", "flags", `${code.toLowerCase()}.svg`);
    const shapePath = join(process.cwd(), "public", "shapes", `${code.toLowerCase()}.svg`);
    const capitalPath = join(process.cwd(), "public", "capitals", `${code.toLowerCase()}.jpg`);
    const hasFlag = existsSync(flagPath);
    const hasShape = existsSync(shapePath);
    const hasCapitalImage = existsSync(capitalPath);
    if (!hasFlag || !hasShape) {
      throw new Error(`Missing assets for ${name}: flag=${hasFlag} shape=${hasShape}`);
    }
    return {
      code,
      code3: code,
      name,
      officialName: `State of ${name}`,
      capital,
      continent: region,
      subregion: division,
      population,
      area,
      borders: borders.map(toCode),
      aliases: [name.toLowerCase(), postal.toLowerCase()],
      shapeQuizEligible: true,
      hasFlag,
      hasShape,
      hasCapitalImage,
      isTerritory: false,
      fact: (() => {
        const fact = getStateFact(code);
        if (!fact) throw new Error(`Missing curated fact for ${name} (${code})`);
        return fact;
      })(),
    };
  },
);

const outPath = join(process.cwd(), "data", "states.json");
writeFileSync(outPath, `${JSON.stringify(states, null, 2)}\n`);
console.log(`Wrote ${states.length} states to data/states.json`);
