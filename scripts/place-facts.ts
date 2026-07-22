/** Curated trivia for library detail pages and game mode — one remarkable fact per place. */

export type PlaceFactEntry = {
  fact: string;
  question: string;
};

export const COUNTRY_FACTS: Record<string, PlaceFactEntry> = {
  AFG: {
    fact: "The Buddhas of Bamiyan were two giant cliff carvings—among the largest in the world before their destruction in 2001.",
    question: "Which country was home to the Buddhas of Bamiyan, two giant cliff carvings destroyed in 2001?",
  },
  ALA: {
    fact: "An autonomous, Swedish-speaking archipelago that belongs to Finland but has its own parliament and flag.",
    question: "Which autonomous Swedish-speaking archipelago belongs to Finland but has its own parliament and flag?",
  },
  ALB: {
    fact: "During the Cold War, hundreds of thousands of concrete bunkers were built here—more per person than anywhere else on Earth.",
    question: "Which country built more concrete bunkers per person during the Cold War than anywhere else on Earth?",
  },
  DZA: {
    fact: "About 90% of the land is covered by the Sahara, yet most people live along the Mediterranean coast.",
    question: "Which country is about 90% Sahara desert, with most of its population living along the Mediterranean coast?",
  },
  ASM: {
    fact: "The only U.S. territory south of the equator, famous for NFL players and the tuna industry.",
    question: "Which country is the only U.S. territory south of the equator, known for NFL players and tuna?",
  },
  AND: {
    fact: "There is no airport or railway—visitors arrive by road through mountain passes from France or Spain.",
    question: "Which country has no airport or railway, with visitors arriving only by road through mountain passes?",
  },
  AGO: {
    fact: "Kalandula Falls are among the largest and most powerful waterfalls in Africa.",
    question: "Which country is home to Kalandula Falls, among the largest and most powerful waterfalls in Africa?",
  },
  AIA: {
    fact: "Beaches here are so prized that the island has repeatedly voted against full independence to keep ties with Britain.",
    question: "Which country has repeatedly voted against full independence to preserve ties with Britain because of its prized beaches?",
  },
  ATA: {
    fact: "Holds about 90% of the world's ice and roughly 70% of its fresh water.",
    question: "Which country holds about 90% of the world's ice and roughly 70% of its fresh water?",
  },
  ATG: {
    fact: "Locals claim 365 beaches—one for every day of the year.",
    question: "Which country claims 365 beaches—one for every day of the year?",
  },
  ARG: {
    fact: "The Perito Moreno Glacier is one of the few major glaciers in the world that is still advancing.",
    question: "Which country is home to the Perito Moreno Glacier, one of the few major glaciers in the world that is still advancing?",
  },
  ARM: {
    fact: "Mount Ararat, visible from much of the territory, is a national symbol though it lies just across the border in Türkiye.",
    question: "Which country counts Mount Ararat—a peak visible across the border in Türkiye—as a national symbol?",
  },
  ABW: {
    fact: "Sits outside the Caribbean hurricane belt, giving it reliably sunny weather year-round.",
    question: "Which country sits outside the Caribbean hurricane belt with reliably sunny weather year-round?",
  },
  AUS: {
    fact: "More venomous snakes live here than anywhere else—and most wildlife is found nowhere else on Earth.",
    question: "Which country has more venomous snakes than anywhere else, with wildlife found nowhere else on Earth?",
  },
  AUT: {
    fact: "Vienna ranked among Europe's great imperial capitals; Mozart, Beethoven, and Strauss all made their mark here.",
    question: "Which country is home to Vienna, where Mozart, Beethoven, and Strauss all made their mark?",
  },
  AZE: {
    fact: "Nearly half of the land lies below sea level thanks to the Caspian shoreline and the low-lying Kura plain.",
    question: "Which country has nearly half its land below sea level due to the Caspian shoreline and the Kura plain?",
  },
  BHS: {
    fact: "More than 700 islands and cays spread across clear turquoise shallows.",
    question: "Which country has more than 700 islands and cays spread across clear turquoise shallows?",
  },
  BHR: {
    fact: "The Tree of Life is a lone mesquite tree thriving in the desert with no obvious water source for centuries.",
    question: "Which country is home to the Tree of Life, a lone mesquite tree thriving in the desert with no obvious water source?",
  },
  BGD: {
    fact: "More than 170 million people live in a delta the size of Iowa—one of the densest populations on Earth.",
    question: "Which country crams more than 170 million people into a delta the size of Iowa?",
  },
  BRB: {
    fact: "The easternmost island of the Caribbean, once a major center of British sugar production.",
    question: "Which country is the easternmost island of the Caribbean and was once a major center of British sugar production?",
  },
  BLR: {
    fact: "About 40% of the land is forested, earning the nickname 'the lungs of Europe.'",
    question: "Which country is about 40% forested and nicknamed 'the lungs of Europe'?",
  },
  BEL: {
    fact: "More than 1,500 varieties of beer are produced here, with centuries of brewing tradition.",
    question: "Which country produces more than 1,500 varieties of beer with centuries of brewing tradition?",
  },
  BLZ: {
    fact: "The Great Blue Hole, a perfect circular sinkhole visible from space, lies off the coast.",
    question: "Which country is home to the Great Blue Hole, a circular sinkhole visible from space?",
  },
  BEN: {
    fact: "Once the powerful Kingdom of Dahomey, whose all-female warrior units inspired the Dora Milaje in Black Panther.",
    question: "Which country was once the Kingdom of Dahomey, whose all-female warriors inspired the Dora Milaje?",
  },
  BMU: {
    fact: "Pink-sand beaches get their color from crushed coral and shell fragments mixed with white sand.",
    question: "Which country has pink-sand beaches colored by crushed coral and shell fragments?",
  },
  BTN: {
    fact: "Progress is measured with Gross National Happiness instead of focusing only on economic output.",
    question: "Which country measures progress with Gross National Happiness instead of focusing only on economic output?",
  },
  BOL: {
    fact: "Two capital cities serve the nation: La Paz is the administrative seat and Sucre the constitutional capital.",
    question: "Which country has two capitals—La Paz as the administrative seat and Sucre as the constitutional capital?",
  },
  BIH: {
    fact: "Mostar's Ottoman-era Stari Most bridge was destroyed in 1993 and painstakingly rebuilt stone by stone.",
    question: "Which country is home to Mostar's Stari Most bridge, destroyed in 1993 and rebuilt stone by stone?",
  },
  BWA: {
    fact: "The Okavango Delta is one of the world's largest inland deltas—a desert oasis teeming with wildlife.",
    question: "Which country contains the Okavango Delta, one of the world's largest inland deltas?",
  },
  BVT: {
    fact: "One of the most remote uninhabited islands on Earth, more than 1,000 miles from Antarctica.",
    question: "Which country includes one of the most remote uninhabited islands on Earth, over 1,000 miles from Antarctica?",
  },
  BRA: {
    fact: "About 60% of the Amazon rainforest—the largest tropical forest on the planet—lies within these borders.",
    question: "Which country contains about 60% of the Amazon rainforest, the largest tropical forest on the planet?",
  },
  IOT: {
    fact: "The Chagos Archipelago includes Diego Garcia, a strategically vital U.S.–U.K. military base in the Indian Ocean.",
    question: "Which country includes Diego Garcia, a strategically vital U.S.–U.K. military base in the Indian Ocean?",
  },
  VGB: {
    fact: "A sailing paradise with dozens of sheltered bays and reef-protected waters.",
    question: "Which country is a sailing paradise with dozens of sheltered bays and reef-protected waters?",
  },
  BRN: {
    fact: "One of the world's richest nations per capita, built largely on offshore oil and gas.",
    question: "Which country is one of the world's richest nations per capita, built largely on offshore oil and gas?",
  },
  BGR: {
    fact: "One of the world's oldest countries, still using the Cyrillic alphabet invented by local saints.",
    question: "Which country is one of the world's oldest nations and still uses the Cyrillic alphabet invented by local saints?",
  },
  BFA: {
    fact: "The name means 'land of upright people' in Mossi and Dioula.",
    question: "Which country's name means 'land of upright people' in Mossi and Dioula?",
  },
  BDI: {
    fact: "This nation and Rwanda were once a single kingdom before European colonization split them.",
    question: "Which country was once a single kingdom with Rwanda before European colonization split them?",
  },
  KHM: {
    fact: "Angkor Wat is the largest religious monument in the world by land area.",
    question: "Which country is home to Angkor Wat, the largest religious monument in the world by land area?",
  },
  CMR: {
    fact: "Nicknamed 'Africa in miniature' for its coast, rainforest, savanna, and volcanic highlands in one nation.",
    question: "Which country is nicknamed 'Africa in miniature' for its coast, rainforest, savanna, and volcanic highlands?",
  },
  CAN: {
    fact: "More lakes are found here than in the rest of the world's countries combined.",
    question: "Which country has more lakes than the rest of the world's countries combined?",
  },
  CPV: {
    fact: "Morna music from these islands has influenced styles across the Atlantic world.",
    question: "Which country's morna music has influenced styles across the Atlantic world?",
  },
  BES: {
    fact: "Bonaire, Sint Eustatius, and Saba are Caribbean municipalities of the Netherlands known for diving and reefs.",
    question: "Which country includes Bonaire, Sint Eustatius, and Saba—Caribbean municipalities known for diving and reefs?",
  },
  CYM: {
    fact: "A global financial hub with more registered companies than residents.",
    question: "Which country is a global financial hub with more registered companies than residents?",
  },
  CAF: {
    fact: "Sits near the continent's geographic center, largely covered in rainforest.",
    question: "Which country sits near Africa's geographic center, largely covered in rainforest?",
  },
  TCD: {
    fact: "A major lake in the region has shrunk dramatically since the 1960s—an environmental crisis for the entire Sahel.",
    question: "Which country lies in a region where a major lake has shrunk dramatically since the 1960s?",
  },
  CHL: {
    fact: "More than 4,000 km long but averages only about 177 km wide—one of the world's most stretched countries.",
    question: "Which country is more than 4,000 km long but averages only about 177 km wide?",
  },
  CHN: {
    fact: "The Great Wall isn't one continuous wall—it's a network of fortifications built over many centuries.",
    question: "Which country built the Great Wall—a network of fortifications constructed over many centuries?",
  },
  CXR: {
    fact: "Famous for the annual red crab migration, when millions of crabs cross roads and beaches.",
    question: "Which country is famous for an annual red crab migration when millions of crabs cross roads and beaches?",
  },
  CCK: {
    fact: "A remote coral atoll group in the Indian Ocean with a population under 600.",
    question: "Which country is a remote coral atoll group in the Indian Ocean with a population under 600?",
  },
  COL: {
    fact: "More emeralds are produced here than anywhere else, and it ranks among the world's top coffee exporters.",
    question: "Which country produces more emeralds than anywhere else and ranks among the world's top coffee exporters?",
  },
  COM: {
    fact: "One of the world's largest producers of ylang-ylang, a flower essential to many perfumes.",
    question: "Which country is one of the world's largest producers of ylang-ylang, essential to many perfumes?",
  },
  COG: {
    fact: "The Congo Basin rainforest here is the world's second-largest tropical forest after the Amazon.",
    question: "Which country contains the Congo Basin rainforest, the world's second-largest tropical forest after the Amazon?",
  },
  COK: {
    fact: "Residents carry New Zealand passports but govern themselves in free association with Wellington.",
    question: "Which country's residents carry New Zealand passports but govern themselves in free association with Wellington?",
  },
  CRI: {
    fact: "The army was abolished in 1948 and military spending was redirected to education and health care.",
    question: "Which country abolished its army in 1948 and redirected military spending to education and health care?",
  },
  HRV: {
    fact: "Dubrovnik's medieval walls became a filming location for King's Landing in Game of Thrones.",
    question: "Which country is home to Dubrovnik's medieval walls, a filming location for King's Landing in Game of Thrones?",
  },
  CUB: {
    fact: "Classic 1950s American cars are still on the road thanks to decades of ingenious local repair.",
    question: "Which country still has classic 1950s American cars on the road thanks to decades of ingenious local repair?",
  },
  CUW: {
    fact: "Handelskade waterfront is lined with pastel Dutch colonial buildings overlooking the harbor.",
    question: "Which country has a Handelskade waterfront lined with pastel Dutch colonial buildings?",
  },
  CYP: {
    fact: "Legend holds this is the birthplace of Aphrodite, the Greek goddess of love.",
    question: "Which country is legendary birthplace of Aphrodite, the Greek goddess of love?",
  },
  CZE: {
    fact: "Prague's Astronomical Clock has been keeping time since 1410—one of the oldest still working.",
    question: "Which country is home to Prague's Astronomical Clock, keeping time since 1410?",
  },
  DNK: {
    fact: "LEGO bricks were invented in Billund, where the original LEGOLAND theme park still stands.",
    question: "Which country invented LEGO bricks in Billund, home to the original LEGOLAND theme park?",
  },
  DJI: {
    fact: "Sits on the Afar Triple Junction where three tectonic plates pull apart—creating dramatic rift landscapes.",
    question: "Which country sits on the Afar Triple Junction where three tectonic plates pull apart?",
  },
  DMA: {
    fact: "Boiling Lake is the world's second-largest hot spring and steams like a giant cauldron.",
    question: "Which country is home to Boiling Lake, the world's second-largest hot spring?",
  },
  DOM: {
    fact: "Shares Hispaniola with Haiti—the only island split between two nations in the Caribbean.",
    question: "Which country shares Hispaniola with Haiti—the only Caribbean island split between two nations?",
  },
  COD: {
    fact: "The Congo River is the world's deepest river and second-largest by discharge, cutting through rainforests.",
    question: "Which country is home to the Congo River, the world's deepest and second-largest by discharge?",
  },
  ECU: {
    fact: "Named for the equator, which runs through the nation—and the Galápagos Islands belong to it.",
    question: "Which country is named for the equator and includes the Galápagos Islands?",
  },
  EGY: {
    fact: "The Great Pyramid of Giza was the tallest human-made structure in the world for nearly 4,000 years.",
    question: "Which country is home to the Great Pyramid of Giza, the tallest human-made structure for nearly 4,000 years?",
  },
  SLV: {
    fact: "The smallest and most densely populated country in Central America.",
    question: "Which country is the smallest and most densely populated in Central America?",
  },
  GNQ: {
    fact: "The only African country with Spanish as an official language.",
    question: "Which country is the only African nation with Spanish as an official language?",
  },
  ERI: {
    fact: "The capital Asmara has one of the world's finest collections of Art Deco and Modernist architecture.",
    question: "Which country's capital Asmara has one of the world's finest collections of Art Deco architecture?",
  },
  EST: {
    fact: "One of the world's most digital societies—citizens can vote, sign documents, and file taxes online.",
    question: "Which country is one of the world's most digital societies, where citizens vote and file taxes online?",
  },
  SWZ: {
    fact: "One of the world's last absolute monarchies in Africa.",
    question: "Which country is one of the world's last absolute monarchies in Africa?",
  },
  ETH: {
    fact: "Follows its own calendar—about seven to eight years behind the Gregorian calendar most of the world uses.",
    question: "Which country follows its own calendar, about seven to eight years behind the Gregorian calendar?",
  },
  FLK: {
    fact: "These islands were the setting of a brief but intense war between Britain and Argentina in 1982.",
    question: "Which country was the setting of a brief but intense war between Britain and Argentina in 1982?",
  },
  FRO: {
    fact: "Residents drive through tunnels between islands and generate much of their power from wind and hydro.",
    question: "Which country has tunnels connecting its islands and generates much of its power from wind and hydro?",
  },
  FJI: {
    fact: "Straddles the International Date Line, among the first countries to greet each new day.",
    question: "Which country straddles the International Date Line and is among the first to greet each new day?",
  },
  FIN: {
    fact: "More saunas than cars—roughly one sauna for every two people.",
    question: "Which country has more saunas than cars—roughly one sauna for every two people?",
  },
  FRA: {
    fact: "The most visited nation on Earth, drawing more international tourists than any other.",
    question: "Which country is the most visited on Earth, drawing more international tourists than any other?",
  },
  GUF: {
    fact: "Europe's main spaceport at Kourou launches rockets from South America under a European flag.",
    question: "Which country hosts Europe's main spaceport at Kourou, launching rockets from South America?",
  },
  PYF: {
    fact: "Bora Bora and Tahiti helped define the world's image of a tropical paradise.",
    question: "Which country includes Bora Bora and Tahiti, which helped define the image of a tropical paradise?",
  },
  ATF: {
    fact: "Remote sub-Antarctic islands with no permanent human population.",
    question: "Which country includes remote sub-Antarctic islands with no permanent human population?",
  },
  GAB: {
    fact: "About 11% of the land is preserved in national parks—among the highest proportions in the world.",
    question: "Which country preserves about 11% of its land in national parks—among the highest proportions worldwide?",
  },
  GMB: {
    fact: "A narrow strip of land along a major river, surrounded on three sides by Senegal.",
    question: "Which country is a narrow strip of land along a river, surrounded on three sides by Senegal?",
  },
  GEO: {
    fact: "Archaeologists found 8,000-year-old winemaking evidence here, supporting a claim as wine's birthplace.",
    question: "Which country has 8,000-year-old winemaking evidence supporting a claim as wine's birthplace?",
  },
  DEU: {
    fact: "The Autobahn famously has long stretches with no official speed limit for cars.",
    question: "Which country has an Autobahn with long stretches and no official speed limit for cars?",
  },
  GHA: {
    fact: "The first sub-Saharan African country to gain independence from colonial rule, in 1957.",
    question: "Which country was the first sub-Saharan African nation to gain independence from colonial rule, in 1957?",
  },
  GIB: {
    fact: "The Rock is a limestone promontory guarded by wild Barbary macaques—the only wild monkeys in Europe.",
    question: "Which country is guarded by wild Barbary macaques—the only wild monkeys in Europe?",
  },
  GRC: {
    fact: "Thousands of islands dot the seas here, though only a few hundred are inhabited.",
    question: "Which country has thousands of islands, though only a few hundred are inhabited?",
  },
  GRL: {
    fact: "The world's largest island, covered by an ice sheet up to three kilometers thick.",
    question: "Which country is the world's largest island, covered by an ice sheet up to three kilometers thick?",
  },
  GRD: {
    fact: "Known as the 'Spice Isle' for nutmeg, mace, and cinnamon exports.",
    question: "Which country is known as the 'Spice Isle' for nutmeg, mace, and cinnamon exports?",
  },
  GLP: {
    fact: "La Soufrière volcano last erupted in 1976, forcing the evacuation of 73,000 people.",
    question: "Which country saw La Soufrière volcano erupt in 1976, forcing the evacuation of 73,000 people?",
  },
  GUM: {
    fact: "The westernmost U.S. territory and a key military hub in the Pacific.",
    question: "Which country is the westernmost U.S. territory and a key military hub in the Pacific?",
  },
  GTM: {
    fact: "Tikal ruins were a major Maya city—its temples rise above the Petén jungle canopy.",
    question: "Which country is home to the Tikal ruins, a major Maya city rising above the Petén jungle?",
  },
  GGY: {
    fact: "The famous dairy cows take their name from this Channel Island.",
    question: "Which country gives its name to a famous breed of dairy cows from the Channel Islands?",
  },
  GIN: {
    fact: "About one-third of the world's bauxite—the ore used to make aluminum—is found here.",
    question: "Which country holds about one-third of the world's bauxite, the ore used to make aluminum?",
  },
  GNB: {
    fact: "The Bijagós Archipelago is a UNESCO biosphere reserve of mangroves and rare sea turtles.",
    question: "Which country contains the Bijagós Archipelago, a UNESCO biosphere reserve of mangroves and sea turtles?",
  },
  GUY: {
    fact: "About 80% of the land is covered by pristine Amazon rainforest—one of the highest percentages in South America.",
    question: "Which country has about 80% of its land covered by pristine Amazon rainforest?",
  },
  HTI: {
    fact: "The first nation founded by formerly enslaved people who won independence, in 1804.",
    question: "Which country was the first nation founded by formerly enslaved people who won independence, in 1804?",
  },
  HMD: {
    fact: "Among the most remote places on Earth, near Antarctica.",
    question: "Which country includes islands among the most remote places on Earth, near Antarctica?",
  },
  HND: {
    fact: "Copán ruins feature some of the finest Maya stone carving in Central America.",
    question: "Which country is home to the Copán ruins, featuring some of the finest Maya stone carving in Central America?",
  },
  HKG: {
    fact: "More skyscrapers rise here than in any other city in the world—well over 500 buildings above 150 meters.",
    question: "Which country has more skyscrapers than any other city—well over 500 buildings above 150 meters?",
  },
  HUN: {
    fact: "Budapest was formed by merging three cities and sits atop more than 100 thermal springs.",
    question: "Which country is home to Budapest, formed by merging three cities atop more than 100 thermal springs?",
  },
  ISL: {
    fact: "Runs almost entirely on renewable energy and sits atop the Mid-Atlantic Ridge, splitting two continents.",
    question: "Which country runs almost entirely on renewable energy and sits atop the Mid-Atlantic Ridge?",
  },
  IND: {
    fact: "22 official languages are spoken, and the population is on track to become the world's largest.",
    question: "Which country has 22 official languages and is on track to become the world's most populous nation?",
  },
  IDN: {
    fact: "The world's largest archipelago—more than 17,000 islands spanning three time zones.",
    question: "Which country is the world's largest archipelago, with more than 17,000 islands spanning three time zones?",
  },
  IRN: {
    fact: "Persian carpets are so prized that fine antique rugs can sell for millions of dollars.",
    question: "Which country produces Persian carpets so prized that fine antique rugs sell for millions?",
  },
  IRQ: {
    fact: "Mesopotamia—'the land between the rivers'—is where writing, the wheel, and cities first emerged.",
    question: "Which country contains Mesopotamia, where writing, the wheel, and cities first emerged?",
  },
  IRL: {
    fact: "Lush green countryside shaped by Gulf Stream rains covers much of the landscape.",
    question: "Which country has lush green countryside shaped by Gulf Stream rains?",
  },
  IMN: {
    fact: "A self-governing Crown dependency famous for the TT motorcycle races since 1907.",
    question: "Which country is a self-governing Crown dependency famous for the TT motorcycle races since 1907?",
  },
  ISR: {
    fact: "The Dead Sea shoreline is the lowest dry land on Earth—about 430 meters below sea level.",
    question: "Which country contains the Dead Sea shoreline, the lowest dry land on Earth?",
  },
  ITA: {
    fact: "More UNESCO World Heritage Sites than any other country—58 and counting.",
    question: "Which country has more UNESCO World Heritage Sites than any other—58 and counting?",
  },
  CIV: {
    fact: "About 40% of the world's cocoa is produced here, making it the top chocolate ingredient supplier.",
    question: "Which country produces about 40% of the world's cocoa, making it the top chocolate ingredient supplier?",
  },
  JAM: {
    fact: "Reggae originated here—Bob Marley's music turned a small island sound into a global movement.",
    question: "Which country gave the world reggae, turning a small island sound into a global movement?",
  },
  JPN: {
    fact: "More than 6,800 islands and a location on the Pacific Ring of Fire with over 100 active volcanoes.",
    question: "Which country has more than 6,800 islands and over 100 active volcanoes on the Pacific Ring of Fire?",
  },
  JEY: {
    fact: "The tidal range is among the largest in the world—at low tide, the island nearly doubles in size.",
    question: "Which country has one of the world's largest tidal ranges—at low tide the island nearly doubles in size?",
  },
  JOR: {
    fact: "Petra is a rose-red city carved into sandstone cliffs by the Nabataeans over 2,000 years ago.",
    question: "Which country is home to Petra, a rose-red city carved into sandstone cliffs by the Nabataeans?",
  },
  KAZ: {
    fact: "The world's largest landlocked country and the last Soviet republic to declare independence.",
    question: "Which country is the world's largest landlocked nation and the last Soviet republic to declare independence?",
  },
  KEN: {
    fact: "Great Rift Valley lakes draw millions of flamingos, turning shores pink during migration.",
    question: "Which country's Great Rift Valley lakes draw millions of flamingos, turning shores pink?",
  },
  KIR: {
    fact: "One of the first countries likely to lose land to rising seas—some islands sit just two meters above water.",
    question: "Which country is among the first likely to lose land to rising seas, with islands just two meters above water?",
  },
  UNK: {
    fact: "Independence was declared in 2008; the flag shows a map with six stars for the main ethnic groups.",
    question: "Which country declared independence in 2008 and has a flag showing a map with six stars?",
  },
  KWT: {
    fact: "The Liberation Tower was named after the 1991 Gulf War that ended the Iraqi occupation.",
    question: "Which country named its Liberation Tower after the 1991 Gulf War that ended Iraqi occupation?",
  },
  KGZ: {
    fact: "Over 90% mountainous—the Tian Shan range dominates the landscape.",
    question: "Which country is over 90% mountainous, dominated by the Tian Shan range?",
  },
  LAO: {
    fact: "The most heavily bombed country per capita in history due to the Secret War during the Vietnam era.",
    question: "Which country is the most heavily bombed per capita in history due to the Secret War during the Vietnam era?",
  },
  LVA: {
    fact: "Riga has one of Europe's largest collections of Art Nouveau architecture.",
    question: "Which country's capital Riga has one of Europe's largest collections of Art Nouveau architecture?",
  },
  LBN: {
    fact: "Cedars on the flag were prized by ancient Egyptians and Phoenicians for shipbuilding.",
    question: "Which country features cedars on its flag that were prized by ancient Egyptians and Phoenicians?",
  },
  LSO: {
    fact: "Entirely surrounded by South Africa and the only country in the world that lies entirely above 1,000 meters.",
    question: "Which country is entirely surrounded by South Africa and lies entirely above 1,000 meters?",
  },
  LBR: {
    fact: "Founded in the 19th century by freed American slaves—the flag echoes the U.S. stars and stripes.",
    question: "Which country was founded in the 19th century by freed American slaves with a flag echoing U.S. stars and stripes?",
  },
  LBY: {
    fact: "Much of the land lies within the Sahara, including the ancient Roman ruins of Leptis Magna on the coast.",
    question: "Which country has ancient Roman ruins of Leptis Magna on its coast within the Sahara?",
  },
  LIE: {
    fact: "One of only two doubly landlocked countries—surrounded by landlocked nations.",
    question: "Which country is one of only two doubly landlocked nations, surrounded by landlocked countries?",
  },
  LTU: {
    fact: "The last European nation to abandon paganism and the first Soviet republic to declare independence.",
    question: "Which country was the last European nation to abandon paganism and the first Soviet republic to declare independence?",
  },
  LUX: {
    fact: "The highest GDP per capita in the world and a founding member of the European Union.",
    question: "Which country has the highest GDP per capita in the world and is a founding EU member?",
  },
  MAC: {
    fact: "A Portuguese colony for 400 years before returning to China in 1999—it rivals Las Vegas for gambling revenue.",
    question: "Which country was a Portuguese colony for 400 years and rivals Las Vegas for gambling revenue?",
  },
  MDG: {
    fact: "Broke away from Africa 88 million years ago—about 90% of wildlife is found nowhere else.",
    question: "Which country broke away from Africa 88 million years ago, with 90% of wildlife found nowhere else?",
  },
  MWI: {
    fact: "Lake Malawi contains more species of fish than any other lake on Earth—hundreds of colorful cichlids.",
    question: "Which country contains Lake Malawi, which has more fish species than any other lake on Earth?",
  },
  MYS: {
    fact: "Petronas Towers in Kuala Lumpur were the world's tallest buildings from 1998 to 2004.",
    question: "Which country is home to the Petronas Towers, the world's tallest buildings from 1998 to 2004?",
  },
  MDV: {
    fact: "The world's lowest country—the highest natural point is only about 2.4 meters above sea level.",
    question: "Which country is the world's lowest, with a highest natural point of only about 2.4 meters above sea level?",
  },
  MLI: {
    fact: "Timbuktu was once a legendary center of Islamic learning and trans-Saharan trade.",
    question: "Which country is home to Timbuktu, once a legendary center of Islamic learning and trans-Saharan trade?",
  },
  MLT: {
    fact: "Megalithic Temples here are older than Stonehenge and the Egyptian pyramids.",
    question: "Which country has Megalithic Temples older than Stonehenge and the Egyptian pyramids?",
  },
  MHL: {
    fact: "Bikini Atoll, where U.S. nuclear tests in the 1940s–50s forced entire communities to relocate.",
    question: "Which country includes Bikini Atoll, where U.S. nuclear tests forced entire communities to relocate?",
  },
  MTQ: {
    fact: "Mount Pelée erupted in 1902, destroying the city of Saint-Pierre in minutes.",
    question: "Which country saw Mount Pelée erupt in 1902, destroying the city of Saint-Pierre in minutes?",
  },
  MRT: {
    fact: "The Richat Structure—a giant bull's-eye in the Sahara—is visible from space and was once thought to be an impact crater.",
    question: "Which country is home to the Richat Structure, a giant bull's-eye in the Sahara visible from space?",
  },
  MUS: {
    fact: "The only known home of the dodo before the flightless bird was hunted to extinction by the 1680s.",
    question: "Which country was the only known home of the dodo before it was hunted to extinction by the 1680s?",
  },
  MYT: {
    fact: "Sits in the Comoros archipelago but chose to remain French—a source of ongoing regional tension.",
    question: "Which country sits in the Comoros archipelago but chose to remain French?",
  },
  MEX: {
    fact: "The capital was built on the ruins of Tenochtitlán, the Aztec capital that once floated on a lake.",
    question: "Which country's capital was built on the ruins of Tenochtitlán, the Aztec capital that once floated on a lake?",
  },
  FSM: {
    fact: "Spans more than 2.7 million square kilometers of ocean but has a land area smaller than Rhode Island.",
    question: "Which country spans more than 2.7 million square kilometers of ocean but has land smaller than Rhode Island?",
  },
  MDA: {
    fact: "Mileștii Mici holds one of the world's largest wine cellars—over 200 km of underground tunnels.",
    question: "Which country is home to Mileștii Mici, one of the world's largest wine cellars with over 200 km of tunnels?",
  },
  MCO: {
    fact: "Smaller than Central Park in New York yet packs luxury casinos, a Grand Prix, and a royal palace.",
    question: "Which country is smaller than Central Park yet has luxury casinos, a Grand Prix, and a royal palace?",
  },
  MNG: {
    fact: "Genghis Khan's empire began on the steppe—the nation still celebrates him as a founding father.",
    question: "Which country is where Genghis Khan's empire began on the steppe?",
  },
  MNE: {
    fact: "The name means 'Black Mountain' in Venetian Italian, named for the dark forests on Mount Lovćen.",
    question: "Which country's name means 'Black Mountain' in Venetian Italian, for the dark forests on Mount Lovćen?",
  },
  MSR: {
    fact: "Soufrière Hills volcano erupted in 1995, burying the capital Plymouth in ash and forcing evacuation.",
    question: "Which country saw Soufrière Hills volcano erupt in 1995, burying its capital in ash?",
  },
  MAR: {
    fact: "Chefchaouen is famous for buildings painted in shades of blue.",
    question: "Which country is home to Chefchaouen, famous for buildings painted in shades of blue?",
  },
  MOZ: {
    fact: "The Bazaruto Archipelago protects dugongs—rare sea cows once mistaken for mermaids by sailors.",
    question: "Which country's Bazaruto Archipelago protects dugongs, rare sea cows once mistaken for mermaids?",
  },
  MMR: {
    fact: "Shwedagon Pagoda in Yangon is covered in gold leaf and topped with thousands of diamonds and rubies.",
    question: "Which country is home to the Shwedagon Pagoda, covered in gold leaf and topped with thousands of gems?",
  },
  NAM: {
    fact: "A coastal desert here is considered the world's oldest—some dunes are millions of years old.",
    question: "Which country has a coastal desert considered the world's oldest, with dunes millions of years old?",
  },
  NRU: {
    fact: "Once among the richest countries per capita thanks to phosphate mining—but the deposits are nearly gone.",
    question: "Which country was once among the richest per capita thanks to phosphate mining, but deposits are nearly gone?",
  },
  NPL: {
    fact: "Mount Everest's summit sits on the border with China—the world's highest point at 8,849 meters.",
    question: "Which country shares Mount Everest's summit on its border with China—the world's highest point?",
  },
  NLD: {
    fact: "About a quarter of the land lies below sea level, protected by an elaborate system of dikes and pumps.",
    question: "Which country has about a quarter of its land below sea level, protected by dikes and pumps?",
  },
  NCL: {
    fact: "The world's largest lagoon, surrounded by the world's second-longest barrier reef.",
    question: "Which country has the world's largest lagoon, surrounded by the second-longest barrier reef?",
  },
  NZL: {
    fact: "The first country to give women the right to vote, in 1893.",
    question: "Which country was the first to give women the right to vote, in 1893?",
  },
  NIC: {
    fact: "The two largest freshwater lakes in Central America lie here—Lake Nicaragua even has freshwater sharks.",
    question: "Which country has the two largest freshwater lakes in Central America, one with freshwater sharks?",
  },
  NER: {
    fact: "The Sahara covers most of the land, with a great river arcing through the southwest corner.",
    question: "Which country is mostly Sahara desert, with a great river arcing through its southwest corner?",
  },
  NGA: {
    fact: "Africa's largest population and Nollywood produces more films than Hollywood by volume.",
    question: "Which country has Africa's largest population and a film industry that produces more films than Hollywood?",
  },
  NIU: {
    fact: "One of the world's largest raised coral atolls and uses New Zealand currency.",
    question: "Which country is one of the world's largest raised coral atolls and uses New Zealand currency?",
  },
  NFK: {
    fact: "Settled by descendants of the Bounty mutineers after they left Pitcairn.",
    question: "Which country was settled by descendants of the Bounty mutineers after they left Pitcairn?",
  },
  PRK: {
    fact: "Still technically at war with its southern neighbor—the 1953 armistice never became a peace treaty.",
    question: "Which country is still technically at war with its southern neighbor since a 1953 armistice never became peace?",
  },
  MKD: {
    fact: "Lake Ohrid is one of Europe's oldest and deepest lakes, home to species found nowhere else.",
    question: "Which country contains Lake Ohrid, one of Europe's oldest and deepest lakes?",
  },
  MNP: {
    fact: "The Mariana Trench nearby is the deepest point in the ocean—almost 11 km down.",
    question: "Which country is near the Mariana Trench, the deepest point in the ocean at almost 11 km down?",
  },
  NOR: {
    fact: "Fjords were carved by Ice Age glaciers and the coastline would stretch halfway around the equator if straightened.",
    question: "Which country has fjords carved by Ice Age glaciers and a coastline that would stretch halfway around the equator?",
  },
  OMN: {
    fact: "Sultan Qaboos transformed the nation from an isolated sultanate into a modern state over his 50-year reign.",
    question: "Which country was transformed from an isolated sultanate into a modern state over Sultan Qaboos's 50-year reign?",
  },
  PAK: {
    fact: "K2, the world's second-highest mountain—harder to climb than Everest and nicknamed the Savage Mountain.",
    question: "Which country is home to K2, the world's second-highest mountain nicknamed the Savage Mountain?",
  },
  PLW: {
    fact: "Jellyfish Lake lets swimmers snorkel among millions of harmless golden jellyfish.",
    question: "Which country has a Jellyfish Lake where swimmers snorkel among millions of harmless golden jellyfish?",
  },
  PSE: {
    fact: "Jericho is one of the oldest continuously inhabited cities in the world.",
    question: "Which country is home to Jericho, one of the oldest continuously inhabited cities in the world?",
  },
  PAN: {
    fact: "The canal saves ships a 13,000-km journey around South America by cutting through the isthmus.",
    question: "Which country has a canal that saves ships a 13,000-km journey around South America?",
  },
  PNG: {
    fact: "More than 800 living languages are spoken—more than any other country.",
    question: "Which country has more than 800 living languages—more than any other nation?",
  },
  PRY: {
    fact: "Guaraní is one of the few indigenous American languages with official status alongside Spanish.",
    question: "Which country gives Guaraní official status alongside Spanish?",
  },
  PER: {
    fact: "Machu Picchu is a 15th-century Inca citadel perched 2,430 meters above sea level in the Andes.",
    question: "Which country is home to Machu Picchu, a 15th-century Inca citadel perched in the Andes?",
  },
  PHL: {
    fact: "About 7,641 islands make up the archipelago, and it is the world's top exporter of nurses.",
    question: "Which country has about 7,641 islands and is the world's top exporter of nurses?",
  },
  PCN: {
    fact: "Settled by mutineers from HMS Bounty—today fewer than 50 people live there.",
    question: "Which country was settled by mutineers from HMS Bounty, with fewer than 50 people living there today?",
  },
  POL: {
    fact: "Wieliczka Salt Mine has chapels, sculptures, and chandeliers carved entirely from salt.",
    question: "Which country is home to the Wieliczka Salt Mine, with chapels and chandeliers carved from salt?",
  },
  PRT: {
    fact: "Explorers from here opened sea routes to India, Brazil, and Japan—shaping the first global age of trade.",
    question: "Which country's explorers opened sea routes to India, Brazil, and Japan, shaping the first global age of trade?",
  },
  PRI: {
    fact: "Bioluminescent bays glow blue at night when microscopic organisms are disturbed in the water.",
    question: "Which country has bioluminescent bays that glow blue at night when organisms are disturbed in the water?",
  },
  QAT: {
    fact: "Hosted a FIFA World Cup where every stadium was within about an hour's drive of each other.",
    question: "Which country hosted a FIFA World Cup where every stadium was within about an hour's drive of each other?",
  },
  REU: {
    fact: "Piton de la Fournaise is one of the world's most active volcanoes, erupting dozens of times since 2000.",
    question: "Which country is home to Piton de la Fournaise, one of the world's most active volcanoes?",
  },
  ROU: {
    fact: "Transylvania inspired Bram Stoker's Dracula—though Vlad the Impaler never lived in Bran Castle.",
    question: "Which country's Transylvania region inspired Bram Stoker's Dracula?",
  },
  RUS: {
    fact: "Spans 11 time zones and crosses both Europe and Asia—it is the largest country on Earth by area.",
    question: "Which country spans 11 time zones and is the largest on Earth by area?",
  },
  RWA: {
    fact: "Plastic bags were banned nationwide in 2008 and a monthly community cleanup called Umuganda is held.",
    question: "Which country banned plastic bags nationwide in 2008 and holds a monthly cleanup called Umuganda?",
  },
  BLM: {
    fact: "A glamorous Caribbean island popular with yachts and celebrities.",
    question: "Which country is a glamorous Caribbean island popular with yachts and celebrities?",
  },
  SHN: {
    fact: "Napoleon was exiled here after Waterloo—it took ships weeks to reach from Europe.",
    question: "Which country was where Napoleon was exiled after Waterloo?",
  },
  KNA: {
    fact: "The smallest sovereign country in the Western Hemisphere by both area and population.",
    question: "Which country is the smallest sovereign nation in the Western Hemisphere by area and population?",
  },
  LCA: {
    fact: "Twin Pitons—volcanic spires rising from the sea—are a UNESCO World Heritage Site.",
    question: "Which country has twin Pitons—volcanic spires rising from the sea—as a UNESCO World Heritage Site?",
  },
  MAF: {
    fact: "Split between France and the Netherlands—the smallest landmass shared by two nations.",
    question: "Which country is split between France and the Netherlands—the smallest landmass shared by two nations?",
  },
  SPM: {
    fact: "French islands off Canada's coast—residents use the euro just 25 km from Newfoundland.",
    question: "Which country has French islands off Canada's coast where residents use the euro 25 km from Newfoundland?",
  },
  VCT: {
    fact: "La Soufrière volcano erupted in 2021, covering much of the island in ash.",
    question: "Which country saw La Soufrière volcano erupt in 2021, covering much of the island in ash?",
  },
  WSM: {
    fact: "Skipped December 30, 2011 entirely when it moved across the International Date Line to align with trading partners.",
    question: "Which country skipped December 30, 2011 entirely when it moved across the International Date Line?",
  },
  SMR: {
    fact: "Claims to be the world's oldest republic, founded in 301 AD on Mount Titano.",
    question: "Which country claims to be the world's oldest republic, founded in 301 AD on Mount Titano?",
  },
  STP: {
    fact: "Cocoa plantations once made this a major chocolate supplier to Europe.",
    question: "Which country's cocoa plantations once made it a major chocolate supplier to Europe?",
  },
  SAU: {
    fact: "No permanent rivers—the land is mostly desert, including the vast Empty Quarter.",
    question: "Which country has no permanent rivers and is mostly desert, including the vast Empty Quarter?",
  },
  SEN: {
    fact: "Lake Retba is bright pink from salt-loving algae and is harvested for salt like the Dead Sea.",
    question: "Which country has Lake Retba, bright pink from salt-loving algae and harvested for salt?",
  },
  SRB: {
    fact: "Sits at a crossroads of empires—Belgrade is one of Europe's oldest continuously inhabited cities.",
    question: "Which country sits at a crossroads of empires, with Belgrade among Europe's oldest continuously inhabited cities?",
  },
  SYC: {
    fact: "Vallée de Mai preserves the coco de mer, a palm that produces the world's heaviest seed.",
    question: "Which country preserves the coco de mer in Vallée de Mai—a palm with the world's heaviest seed?",
  },
  SLE: {
    fact: "The name means 'lion mountains' in Portuguese, though lions no longer live there.",
    question: "Which country's name means 'lion mountains' in Portuguese, though lions no longer live there?",
  },
  SGP: {
    fact: "Transformed from a fishing village to a global financial hub in a single generation.",
    question: "Which country transformed from a fishing village to a global financial hub in a single generation?",
  },
  SXM: {
    fact: "Maho Beach is famous for airliners passing just meters overhead on approach to the runway.",
    question: "Which country has Maho Beach, where airliners pass just meters overhead on approach to the runway?",
  },
  SVK: {
    fact: "More castles and châteaux per capita than almost anywhere else in Europe.",
    question: "Which country has more castles and châteaux per capita than almost anywhere else in Europe?",
  },
  SVN: {
    fact: "Postojna Cave holds a unique species of blind salamander called the olm—or 'human fish.'",
    question: "Which country is home to Postojna Cave and the olm, a blind salamander called the 'human fish'?",
  },
  SLB: {
    fact: "Residents fought alongside U.S. Marines in World War II's brutal Guadalcanal campaign.",
    question: "Which country's residents fought alongside U.S. Marines in World War II's Guadalcanal campaign?",
  },
  SOM: {
    fact: "The longest coastline on mainland Africa, though piracy has troubled its shores.",
    question: "Which country has the longest coastline on mainland Africa?",
  },
  ZAF: {
    fact: "Three capital cities—each hosts a different branch of government.",
    question: "Which country has three capital cities, each hosting a different branch of government?",
  },
  SGS: {
    fact: "Grytviken whaling station is where explorer Ernest Shackleton is buried.",
    question: "Which country is where explorer Ernest Shackleton is buried at Grytviken whaling station?",
  },
  KOR: {
    fact: "Hangul alphabet was scientifically designed in 1443 so anyone could learn to read.",
    question: "Which country scientifically designed the Hangul alphabet in 1443 so anyone could learn to read?",
  },
  SSD: {
    fact: "The world's newest widely recognized country, gaining independence in 2011.",
    question: "Which country is the world's newest widely recognized nation, gaining independence in 2011?",
  },
  ESP: {
    fact: "Sagrada Família in Barcelona has been under construction since 1882 and is still not finished.",
    question: "Which country is home to the Sagrada Família in Barcelona, under construction since 1882?",
  },
  LKA: {
    fact: "Once known by a colonial-era name and produces distinctive highland tea from its plantations.",
    question: "Which country produces distinctive highland tea from plantations and was once known by a colonial-era name?",
  },
  SDN: {
    fact: "More pyramids than Egypt—ancient Nubian kingdoms left hundreds along the Nile.",
    question: "Which country has more pyramids than Egypt, left by ancient Nubian kingdoms along the Nile?",
  },
  SUR: {
    fact: "The smallest independent country in South America and one of the most forested.",
    question: "Which country is the smallest independent nation in South America and one of the most forested?",
  },
  SJM: {
    fact: "The Global Seed Vault stores backup copies of crop seeds from around the world in Arctic permafrost.",
    question: "Which country stores backup copies of crop seeds from around the world in an Arctic Global Seed Vault?",
  },
  SWE: {
    fact: "Nobel Prizes are awarded each year in Stockholm—except Peace, which is given in Oslo.",
    question: "Which country awards Nobel Prizes each year in Stockholm—except Peace, given in Oslo?",
  },
  CHE: {
    fact: "Four official languages and no foreign war fought since 1815.",
    question: "Which country has four official languages and has not fought a foreign war since 1815?",
  },
  SYR: {
    fact: "Damascus is one of the oldest continuously inhabited cities in the world.",
    question: "Which country is home to Damascus, one of the oldest continuously inhabited cities in the world?",
  },
  TWN: {
    fact: "Taipei 101 was the world's tallest building from 2004 to 2010 and is designed to withstand typhoons and earthquakes.",
    question: "Which country is home to Taipei 101, the world's tallest building from 2004 to 2010?",
  },
  TJK: {
    fact: "Over 90% mountainous—the Pamir range is nicknamed the 'Roof of the World.'",
    question: "Which country is over 90% mountainous, with the Pamir range nicknamed the 'Roof of the World'?",
  },
  TZA: {
    fact: "The Serengeti hosts the largest terrestrial mammal migration on Earth—over a million wildebeest.",
    question: "Which country is home to the Serengeti, hosting the largest terrestrial mammal migration on Earth?",
  },
  THA: {
    fact: "The only Southeast Asian country never colonized by a European power.",
    question: "Which country is the only Southeast Asian nation never colonized by a European power?",
  },
  TLS: {
    fact: "One of the world's youngest countries, gaining full independence in 2002 after centuries of occupation.",
    question: "Which country is one of the world's youngest, gaining full independence in 2002?",
  },
  TGO: {
    fact: "One of the world's top producers of phosphates, used in fertilizer.",
    question: "Which country is one of the world's top producers of phosphates used in fertilizer?",
  },
  TKL: {
    fact: "One of the first territories to produce more than 100% of its electricity from solar power.",
    question: "Which country was among the first to produce more than 100% of its electricity from solar power?",
  },
  TON: {
    fact: "The only Pacific nation that was never fully colonized—it became a constitutional monarchy in 1875.",
    question: "Which country is the only Pacific nation never fully colonized, becoming a constitutional monarchy in 1875?",
  },
  TTO: {
    fact: "The steelpan was invented here—the only acoustic instrument invented in the 20th century.",
    question: "Which country invented the steelpan, the only acoustic instrument created in the 20th century?",
  },
  TUN: {
    fact: "Ancient Carthage once rivaled Rome before being destroyed and rebuilt by the Romans.",
    question: "Which country was home to ancient Carthage, which once rivaled Rome?",
  },
  TUR: {
    fact: "Istanbul is the only major city spanning two continents—Europe and Asia.",
    question: "Which country is home to Istanbul, the only major city spanning two continents?",
  },
  TKM: {
    fact: "The Darvaza gas crater has burned continuously in the desert since Soviet engineers lit it in 1971.",
    question: "Which country has the Darvaza gas crater, burning continuously in the desert since 1971?",
  },
  TCA: {
    fact: "Some of the clearest turquoise water in the Caribbean and a thriving conch fishery.",
    question: "Which country has some of the clearest turquoise water in the Caribbean and a thriving conch fishery?",
  },
  TUV: {
    fact: "Among the world's smallest and most low-lying nations—rising seas threaten its very existence.",
    question: "Which country is among the world's smallest and most low-lying, with rising seas threatening its existence?",
  },
  UGA: {
    fact: "One of the few places where mountain gorillas live in the wild—about half the world's population is here.",
    question: "Which country is home to about half the world's wild mountain gorilla population?",
  },
  UKR: {
    fact: "One of the world's largest grain exporters—the 'breadbasket of Europe.'",
    question: "Which country is one of the world's largest grain exporters, called the 'breadbasket of Europe'?",
  },
  ARE: {
    fact: "The Burj Khalifa, the world's tallest building at 828 meters, rises in Dubai.",
    question: "Which country is home to the Burj Khalifa, the world's tallest building at 828 meters?",
  },
  GBR: {
    fact: "Made up of four countries—England, Scotland, Wales, and Northern Ireland.",
    question: "Which country is made up of four countries—England, Scotland, Wales, and Northern Ireland?",
  },
  USA: {
    fact: "The world's largest economy and the third most populous country.",
    question: "Which country has the world's largest economy and is the third most populous?",
  },
  UMI: {
    fact: "Includes Midway Atoll, site of a pivotal 1942 naval battle in World War II.",
    question: "Which country includes Midway Atoll, site of a pivotal 1942 naval battle in World War II?",
  },
  VIR: {
    fact: "Purchased from Denmark in 1917 for $25 million in gold.",
    question: "Which country was purchased from Denmark in 1917 for $25 million in gold?",
  },
  URY: {
    fact: "The first country to legalize recreational cannabis nationwide, in 2013.",
    question: "Which country was the first to legalize recreational cannabis nationwide, in 2013?",
  },
  UZB: {
    fact: "The Registan in Samarkand was a glittering center of the Silk Road trade route.",
    question: "Which country is home to the Registan in Samarkand, a center of the Silk Road trade route?",
  },
  VUT: {
    fact: "Bungee jumping was inspired by local land divers on Pentecost Island.",
    question: "Which country's land divers on Pentecost Island inspired the invention of bungee jumping?",
  },
  VAT: {
    fact: "The world's smallest independent state—about 44 hectares enclosed within Rome.",
    question: "Which country is the world's smallest independent state, about 44 hectares enclosed within Rome?",
  },
  VEN: {
    fact: "Angel Falls is the world's highest uninterrupted waterfall, plunging 979 meters.",
    question: "Which country is home to Angel Falls, the world's highest uninterrupted waterfall?",
  },
  VNM: {
    fact: "Ha Long Bay has thousands of limestone karsts rising from emerald water—a UNESCO World Heritage Site.",
    question: "Which country is home to Ha Long Bay, with thousands of limestone karsts rising from emerald water?",
  },
  WLF: {
    fact: "One of the last French territories where traditional kings still hold official authority.",
    question: "Which country is one of the last French territories where traditional kings still hold official authority?",
  },
  ESH: {
    fact: "One of the most sparsely populated places on Earth—mostly desert with a disputed political status.",
    question: "Which country is one of the most sparsely populated places on Earth, mostly desert with disputed status?",
  },
  YEM: {
    fact: "Old City of Sana'a has distinctive multi-story tower houses decorated with white gypsum patterns.",
    question: "Which country is home to the Old City of Sana'a, with multi-story tower houses decorated with white gypsum?",
  },
  ZMB: {
    fact: "Victoria Falls—locally called Mosi-oa-Tunya, 'the smoke that thunders'—is one of the world's largest waterfalls.",
    question: "Which country is home to Victoria Falls, locally called Mosi-oa-Tunya, 'the smoke that thunders'?",
  },
  ZWE: {
    fact: "Medieval stone ruins here were the capital of a trading empire that exported gold to the Indian Ocean.",
    question: "Which country is home to medieval stone ruins that were the capital of a trading empire exporting gold?",
  },
};

export const STATE_FACTS: Record<string, PlaceFactEntry> = {
  "US-AL": {
    fact: "The Saturn V rockets that carried Apollo astronauts to the Moon were designed and built in Huntsville.",
    question: "Which state designed and built the Saturn V rockets that carried Apollo astronauts to the Moon in Huntsville?",
  },
  "US-AK": {
    fact: "The northernmost, westernmost, and easternmost U.S. state—the Aleutian Islands cross the 180th meridian into the Eastern Hemisphere.",
    question: "Which state is the northernmost, westernmost, and easternmost in the U.S., with Aleutian Islands crossing the 180th meridian?",
  },
  "US-AZ": {
    fact: "The Grand Canyon exposes nearly two billion years of geology in its colorful layered walls.",
    question: "Which state is home to the Grand Canyon, exposing nearly two billion years of geology?",
  },
  "US-AR": {
    fact: "Hot Springs National Park predates Yellowstone and was the first U.S. federal reserve.",
    question: "Which state has Hot Springs National Park, the first U.S. federal reserve, predating Yellowstone?",
  },
  "US-CA": {
    fact: "The economy here is larger than that of most countries—if it were independent, it would rank among the world's biggest.",
    question: "Which state's economy is larger than that of most countries and would rank among the world's biggest if independent?",
  },
  "US-CO": {
    fact: "Denver sits exactly one mile above sea level, giving the capital its 'Mile High City' nickname.",
    question: "Which state's capital Denver sits exactly one mile above sea level, earning the 'Mile High City' nickname?",
  },
  "US-CT": {
    fact: "The Fundamental Orders, adopted in 1639, are often called the first written constitution in the Americas.",
    question: "Which state's Fundamental Orders of 1639 are often called the first written constitution in the Americas?",
  },
  "US-DE": {
    fact: "The first to ratify the U.S. Constitution on December 7, 1787.",
    question: "Which state was the first to ratify the U.S. Constitution on December 7, 1787?",
  },
  "US-FL": {
    fact: "More coastline than any U.S. state except Alaska and the only one bordering both the Atlantic and Gulf.",
    question: "Which state has more coastline than any except Alaska and borders both the Atlantic and Gulf?",
  },
  "US-GA": {
    fact: "Coca-Cola was invented by a pharmacist in Atlanta in 1886 and first sold at a local drugstore.",
    question: "Which state is where Coca-Cola was invented by a pharmacist in Atlanta in 1886?",
  },
  "US-HI": {
    fact: "The only U.S. state that grows coffee commercially and sits 2,400 miles from the mainland.",
    question: "Which state is the only one that grows coffee commercially and sits 2,400 miles from the mainland?",
  },
  "US-ID": {
    fact: "Produces about one-third of all potatoes grown in the United States.",
    question: "Which state produces about one-third of all potatoes grown in the United States?",
  },
  "US-IL": {
    fact: "Chicago reversed the flow of its river in 1900 so wastewater would drain away from Lake Michigan.",
    question: "Which state saw Chicago reverse the flow of its river in 1900 to drain wastewater away from Lake Michigan?",
  },
  "US-IN": {
    fact: "The Indianapolis 500, first held in 1911, is one of the oldest and most famous car races in the world.",
    question: "Which state hosts the Indianapolis 500, first held in 1911, one of the world's most famous car races?",
  },
  "US-IA": {
    fact: "Leads the nation in corn production and raises more pigs than any other state.",
    question: "Which state leads the nation in corn production and raises more pigs than any other?",
  },
  "US-KS": {
    fact: "The geographic center of the contiguous United States lies near Lebanon.",
    question: "Which state contains the geographic center of the contiguous United States near Lebanon?",
  },
  "US-KY": {
    fact: "Produces about 95% of the world's bourbon and has more barrels of aging whiskey than people.",
    question: "Which state produces about 95% of the world's bourbon and has more whiskey barrels than people?",
  },
  "US-LA": {
    fact: "New Orleans sits largely below sea level and relies on levees, pumps, and Mississippi River silt to stay dry.",
    question: "Which state has New Orleans sitting largely below sea level, relying on levees and pumps to stay dry?",
  },
  "US-ME": {
    fact: "Supplies roughly 90% of the United States' lobster catch.",
    question: "Which state supplies roughly 90% of the United States' lobster catch?",
  },
  "US-MD": {
    fact: "The Star-Spangled Banner was written during the 1814 Battle of Baltimore at Fort McHenry.",
    question: "Which state is where the Star-Spangled Banner was written during the 1814 Battle of Baltimore?",
  },
  "US-MA": {
    fact: "The first subway system in the Americas opened in Boston in 1897.",
    question: "Which state opened the first subway system in the Americas in Boston in 1897?",
  },
  "US-MI": {
    fact: "Touches four of the five Great Lakes and has more freshwater shoreline than any other state.",
    question: "Which state touches four of the five Great Lakes and has more freshwater shoreline than any other?",
  },
  "US-MN": {
    fact: "More than 11,000 lakes and the birthplace of water skiing and the Mall of America.",
    question: "Which state has more than 11,000 lakes and is the birthplace of water skiing and the Mall of America?",
  },
  "US-MS": {
    fact: "A great river forms most of the western border and inspired the state's name.",
    question: "Which state has a namesake river forming most of its western border?",
  },
  "US-MO": {
    fact: "The Gateway Arch in St. Louis is 630 feet tall—the tallest monument in the United States.",
    question: "Which state is home to the 630-foot Gateway Arch in St. Louis, the tallest U.S. monument?",
  },
  "US-MT": {
    fact: "The name comes from the Spanish word montaña, though it is not the most mountainous U.S. state.",
    question: "Which state's name comes from the Spanish word montaña, though it is not the most mountainous?",
  },
  "US-NE": {
    fact: "Carhenge in Alliance is a full-scale replica of England's Stonehenge built from vintage American cars.",
    question: "Which state has Carhenge in Alliance, a full-scale Stonehenge replica built from vintage cars?",
  },
  "US-NV": {
    fact: "About three-quarters of the population lives in the Las Vegas metro area.",
    question: "Which state has about three-quarters of its population living in the Las Vegas metro area?",
  },
  "US-NH": {
    fact: "License plates carry the bold motto 'Live Free or Die.'",
    question: "Which state's license plates carry the bold motto 'Live Free or Die'?",
  },
  "US-NJ": {
    fact: "Thomas Edison developed the practical light bulb, phonograph, and motion picture in his Menlo Park laboratory.",
    question: "Which state is where Thomas Edison developed the light bulb, phonograph, and motion picture in Menlo Park?",
  },
  "US-NM": {
    fact: "Roswell became synonymous with UFO lore after a 1947 incident that still fuels conspiracy theories.",
    question: "Which state's Roswell became synonymous with UFO lore after a 1947 incident?",
  },
  "US-NY": {
    fact: "More people live in the largest city here than in all but a handful of U.S. states.",
    question: "Which state has a largest city with more people than all but a handful of other U.S. states?",
  },
  "US-NC": {
    fact: "The Wright brothers achieved the first powered airplane flight at Kitty Hawk in 1903.",
    question: "Which state is where the Wright brothers achieved the first powered airplane flight at Kitty Hawk in 1903?",
  },
  "US-ND": {
    fact: "Theodore Roosevelt National Park preserves the badlands where the future president ranched and found inspiration.",
    question: "Which state has Theodore Roosevelt National Park, preserving badlands where the future president ranched?",
  },
  "US-OH": {
    fact: "Seven U.S. presidents were born here—more than any state except Virginia.",
    question: "Which state was the birthplace of seven U.S. presidents—more than any except Virginia?",
  },
  "US-OK": {
    fact: "The capital lies close to the geographic center of the contiguous United States.",
    question: "Which state's capital lies close to the geographic center of the contiguous United States?",
  },
  "US-OR": {
    fact: "Crater Lake is the deepest lake in the United States, formed when a volcano collapsed about 7,700 years ago.",
    question: "Which state is home to Crater Lake, the deepest lake in the United States?",
  },
  "US-PA": {
    fact: "Independence Hall in Philadelphia is where the Declaration of Independence and U.S. Constitution were signed.",
    question: "Which state is home to Independence Hall, where the Declaration of Independence and Constitution were signed?",
  },
  "US-RI": {
    fact: "The smallest U.S. state but with over 400 miles of coastline.",
    question: "Which state is the smallest in the U.S. but has over 400 miles of coastline?",
  },
  "US-SC": {
    fact: "The first shots of the Civil War were fired at Fort Sumter in Charleston Harbor in 1861.",
    question: "Which state is where the first shots of the Civil War were fired at Fort Sumter in 1861?",
  },
  "US-SD": {
    fact: "Mount Rushmore's 60-foot presidential faces were carved into the Black Hills over 14 years.",
    question: "Which state is home to Mount Rushmore, with 60-foot presidential faces carved over 14 years?",
  },
  "US-TN": {
    fact: "Memphis is a cradle of blues and rock and roll—Elvis Presley's Graceland draws visitors from around the world.",
    question: "Which state has Memphis as a cradle of blues and rock and roll, home to Elvis Presley's Graceland?",
  },
  "US-TX": {
    fact: "Was an independent republic for nearly ten years before joining the United States in 1845.",
    question: "Which state was an independent republic for nearly ten years before joining the United States in 1845?",
  },
  "US-UT": {
    fact: "The Great Salt Lake is saltier than the ocean, so swimmers float effortlessly on its surface.",
    question: "Which state is home to the Great Salt Lake, saltier than the ocean so swimmers float effortlessly?",
  },
  "US-VT": {
    fact: "Ben & Jerry's ice cream began in a renovated gas station in Burlington in 1978.",
    question: "Which state is where Ben & Jerry's ice cream began in a renovated gas station in Burlington in 1978?",
  },
  "US-VA": {
    fact: "Eight U.S. presidents were born here—more than any other state.",
    question: "Which state was the birthplace of eight U.S. presidents—more than any other?",
  },
  "US-WA": {
    fact: "Mount Rainier is an active volcano towering over Seattle and visible across much of the Puget Sound.",
    question: "Which state has Mount Rainier, an active volcano towering over Seattle and visible across the Puget Sound?",
  },
  "US-WV": {
    fact: "Split from Virginia during the Civil War and joined the Union as its own state in 1863.",
    question: "Which state split from Virginia during the Civil War and joined the Union in 1863?",
  },
  "US-WI": {
    fact: "Produces more cheese than any other U.S. state and hosts the Green Bay Packers' Lambeau Field.",
    question: "Which state produces more cheese than any other and hosts the Green Bay Packers' Lambeau Field?",
  },
  "US-WY": {
    fact: "Yellowstone National Park—mostly within these borders—was the world's first national park, established in 1872.",
    question: "Which state contains most of Yellowstone, the world's first national park, established in 1872?",
  },
};

export function getCountryFact(code3: string): string | undefined {
  return COUNTRY_FACTS[code3.toUpperCase()]?.fact;
}

export function getCountryFactQuestion(code3: string): string | undefined {
  return COUNTRY_FACTS[code3.toUpperCase()]?.question;
}

export function getStateFact(code: string): string | undefined {
  return STATE_FACTS[code.toUpperCase()]?.fact;
}

export function getStateFactQuestion(code: string): string | undefined {
  return STATE_FACTS[code.toUpperCase()]?.question;
}
