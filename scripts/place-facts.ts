/** Curated trivia for library detail pages and game mode — two remarkable facts per place.
 *  Questions must describe a place without naming it, its capital, or its cities.
 */

export type PlaceFactEntry = {
  fact: string;
  question: string;
};

export type PlaceFactPair = readonly [PlaceFactEntry, PlaceFactEntry];

export const COUNTRY_FACTS: Record<string, PlaceFactPair> = {
  AFG: [
    {
      fact: "The Buddhas of Bamiyan were two giant cliff carvings—among the largest in the world before their destruction in 2001.",
      question: "Which country was home to the Buddhas of Bamiyan, two giant cliff carvings destroyed in 2001?",
    },
    {
      fact: "The Sar-e Sang mines have supplied lapis lazuli for more than 6,000 years, including pigment used in ancient artworks.",
      question: "Which country has some of the world's oldest lapis lazuli mines?",
    },
  ],
  ALA: [
    {
      fact: "An autonomous, Swedish-speaking archipelago that belongs to Finland but has its own parliament and flag.",
      question: "Which autonomous Swedish-speaking archipelago has its own parliament and flag while remaining part of a nearby Nordic country?",
    },
    {
      fact: "These Baltic islands have been demilitarized since 1856, meaning no military forces or fortifications are allowed there.",
      question: "Which country consists of Baltic islands that have been demilitarized for more than a century?",
    },
  ],
  ALB: [
    {
      fact: "During the Cold War, hundreds of thousands of concrete bunkers were built here—more per person than anywhere else on Earth.",
      question: "Which country built more concrete bunkers per person during the Cold War than anywhere else on Earth?",
    },
    {
      fact: "Its national language forms its own independent branch of the Indo-European language family.",
      question: "Which country speaks a language that belongs to its own branch of the Indo-European family?",
    },
  ],
  DZA: [
    {
      fact: "About 90% of the land is covered by the Sahara, yet most people live along the Mediterranean coast.",
      question: "Which country is about 90% Sahara desert, with most of its population living along the Mediterranean coast?",
    },
    {
      fact: "The Tassili n'Ajjer plateau contains thousands of prehistoric rock paintings, some showing people swimming in what is now desert.",
      question: "Which country contains Saharan rock art depicting ancient swimmers?",
    },
  ],
  ASM: [
    {
      fact: "The only U.S. territory south of the equator, famous for NFL players and the tuna industry.",
      question: "Which country is the only U.S. territory south of the equator, known for NFL players and tuna?",
    },
    {
      fact: "The National Park of American Samoa is the only U.S. national park south of the equator.",
      question: "Which country is home to the only U.S. national park south of the equator?",
    },
  ],
  AND: [
    {
      fact: "There is no airport or railway—visitors arrive by road through mountain passes from France or Spain.",
      question: "Which country has no airport or railway, with visitors arriving only by road through mountain passes?",
    },
    {
      fact: "It has two heads of state: the elected president of France and the Bishop of Urgell in Spain.",
      question: "Which country is jointly led by a French president and a Spanish bishop?",
    },
  ],
  AGO: [
    {
      fact: "Kalandula Falls are among the largest and most powerful waterfalls in Africa.",
      question: "Which country is home to Kalandula Falls, among the largest and most powerful waterfalls in Africa?",
    },
    {
      fact: "The giant sable antelope, once feared extinct, survives only in this country's woodlands.",
      question: "Which country is the only wild home of the giant sable antelope?",
    },
  ],
  AIA: [
    {
      fact: "Beaches here are so prized that the island has repeatedly voted against full independence to keep ties with Britain.",
      question: "Which country has repeatedly voted against full independence to preserve ties with Britain because of its prized beaches?",
    },
    {
      fact: "Its capital, The Valley, is one of the smallest capital settlements in the Caribbean.",
      question: "Which country has one of the smallest capital settlements in the Caribbean?",
    },
  ],
  ATA: [
    {
      fact: "Holds about 90% of the world's ice and roughly 70% of its fresh water.",
      question: "Which country holds about 90% of the world's ice and roughly 70% of its fresh water?",
    },
    {
      fact: "This is the coldest, driest, and windiest continent, even though it is covered in ice.",
      question: "Which country is the coldest, driest, and windiest continent?",
    },
  ],
  ATG: [
    {
      fact: "Locals claim 365 beaches—one for every day of the year.",
      question: "Which country claims 365 beaches—one for every day of the year?",
    },
    {
      fact: "Barbuda shelters one of the Caribbean's largest frigatebird colonies, where males inflate bright red throat pouches to attract mates.",
      question: "Which country includes an island with a huge colony of red-throated frigatebirds?",
    },
  ],
  ARG: [
    {
      fact: "The Perito Moreno Glacier is one of the few major glaciers in the world that is still advancing.",
      question: "Which country is home to the Perito Moreno Glacier, one of the few major glaciers in the world that is still advancing?",
    },
    {
      fact: "The tango developed in the working-class neighborhoods around the Río de la Plata before becoming a global dance.",
      question: "Which country is widely regarded as the birthplace of tango?",
    },
  ],
  ARM: [
    {
      fact: "Mount Ararat, visible from much of the territory, is a national symbol though it lies just across the border in Türkiye.",
      question: "Which country counts Mount Ararat—a peak visible across the border in Türkiye—as a national symbol?",
    },
    {
      fact: "It became the first state in the world to adopt Christianity as its official religion, traditionally dated to 301 CE.",
      question: "Which country was the first state to adopt Christianity as an official religion?",
    },
  ],
  ABW: [
    {
      fact: "Sits outside the Caribbean hurricane belt, giving it reliably sunny weather year-round.",
      question: "Which country sits outside the Caribbean hurricane belt with reliably sunny weather year-round?",
    },
    {
      fact: "Divi-divi trees are bent permanently in one direction by the island's steady trade winds.",
      question: "Which country is known for wind-sculpted divi-divi trees?",
    },
  ],
  AUS: [
    {
      fact: "More venomous snakes live here than anywhere else—and most wildlife is found nowhere else on Earth.",
      question: "Which country has more venomous snakes than anywhere else, with wildlife found nowhere else on Earth?",
    },
    {
      fact: "The Great Barrier Reef, the world's largest coral reef system, stretches for more than 2,300 kilometers off its coast.",
      question: "Which country is home to the Great Barrier Reef?",
    },
  ],
  AUT: [
    {
      fact: "Vienna ranked among Europe's great imperial capitals; Mozart, Beethoven, and Strauss all made their mark here.",
      question: "Which country is where Mozart, Beethoven, and Strauss all made their mark?",
    },
    {
      fact: "The world's oldest zoo still in operation opened at Vienna's Schönbrunn Palace in 1752.",
      question: "Which country has the world's oldest continuously operating zoo?",
    },
  ],
  AZE: [
    {
      fact: "Nearly half of the land lies below sea level thanks to the Caspian shoreline and the low-lying Kura plain.",
      question: "Which country has nearly half its land below sea level due to the Caspian shoreline and the Kura plain?",
    },
    {
      fact: "Nearly half of the world's mud volcanoes bubble and erupt here, sometimes shooting flames high into the air.",
      question: "Which country has nearly half of the world's mud volcanoes?",
    },
  ],
  BHS: [
    {
      fact: "More than 700 islands and cays spread across clear turquoise shallows.",
      question: "Which country has more than 700 islands and cays spread across clear turquoise shallows?",
    },
    {
      fact: "On Big Major Cay, feral pigs famously paddle into the turquoise water to greet visiting boats.",
      question: "Which country is known for an island where swimming pigs greet visitors?",
    },
  ],
  BHR: [
    {
      fact: "The Tree of Life is a lone mesquite tree thriving in the desert with no obvious water source for centuries.",
      question: "Which country is home to the Tree of Life, a lone mesquite tree thriving in the desert with no obvious water source?",
    },
    {
      fact: "Ancient burial mounds from the Dilmun civilization dot the landscape, with thousands still visible today.",
      question: "Which country is scattered with thousands of ancient Dilmun burial mounds?",
    },
  ],
  BGD: [
    {
      fact: "More than 170 million people live in a delta the size of Iowa—one of the densest populations on Earth.",
      question: "Which country crams more than 170 million people into a delta the size of Iowa?",
    },
    {
      fact: "The Sundarbans, the world's largest mangrove forest, is shared with India and is home to Bengal tigers.",
      question: "Which country shares the world's largest mangrove forest with India?",
    },
  ],
  BRB: [
    {
      fact: "The easternmost island of the Caribbean, once a major center of British sugar production.",
      question: "Which country is the easternmost island of the Caribbean and was once a major center of British sugar production?",
    },
    {
      fact: "Mount Gay has been producing rum since 1703, making it one of the world's oldest commercial rum distilleries.",
      question: "Which country is home to one of the world's oldest rum distilleries?",
    },
  ],
  BLR: [
    {
      fact: "About 40% of the land is forested, earning the nickname 'the lungs of Europe.'",
      question: "Which country is about 40% forested and nicknamed 'the lungs of Europe'?",
    },
    {
      fact: "Belovezhskaya Pushcha protects European bison, the continent's heaviest land animal.",
      question: "Which country protects European bison in the ancient Belovezhskaya forest?",
    },
  ],
  BEL: [
    {
      fact: "More than 1,500 varieties of beer are produced here, with centuries of brewing tradition.",
      question: "Which country produces more than 1,500 varieties of beer with centuries of brewing tradition?",
    },
    {
      fact: "French fries are widely claimed here as a local invention, traditionally served in paper cones with sauces.",
      question: "Which country is widely associated with the invention of French fries?",
    },
  ],
  BLZ: [
    {
      fact: "The Great Blue Hole, a perfect circular sinkhole visible from space, lies off the coast.",
      question: "Which country is home to the Great Blue Hole, a circular sinkhole visible from space?",
    },
    {
      fact: "It is the only Central American country where English is the official language.",
      question: "Which country is the only one in Central America with English as its official language?",
    },
  ],
  BEN: [
    {
      fact: "Once the powerful Kingdom of Dahomey, whose all-female warrior units inspired the Dora Milaje in Black Panther.",
      question: "Which country was once the Kingdom of Dahomey, whose all-female warriors inspired the Dora Milaje?",
    },
    {
      fact: "The annual Voodoo festival in Ouidah draws practitioners and visitors to ceremonies honoring ancestors and spirits.",
      question: "Which country hosts a major annual Voodoo festival in a historic coastal city?",
    },
  ],
  BMU: [
    {
      fact: "Pink-sand beaches get their color from crushed coral and shell fragments mixed with white sand.",
      question: "Which country has pink-sand beaches colored by crushed coral and shell fragments?",
    },
    {
      fact: "Its reefs have caused hundreds of shipwrecks, helping create one of the Atlantic's richest underwater wreck-diving regions.",
      question: "Which country is renowned for Atlantic shipwreck diving among coral reefs?",
    },
  ],
  BTN: [
    {
      fact: "Progress is measured with Gross National Happiness instead of focusing only on economic output.",
      question: "Which country measures progress with Gross National Happiness instead of focusing only on economic output?",
    },
    {
      fact: "The takin, its unusual national animal, looks like a cross between a goat and a moose.",
      question: "Which country has the takin as its national animal?",
    },
  ],
  BOL: [
    {
      fact: "Two capital cities serve the nation: La Paz is the administrative seat and Sucre the constitutional capital.",
      question: "Which country has two capitals—one administrative and one constitutional?",
    },
    {
      fact: "Salar de Uyuni becomes the world's largest natural mirror after rain covers its vast salt flat with a thin layer of water.",
      question: "Which country contains the salt flat that becomes the world's largest natural mirror after rain?",
    },
  ],
  BIH: [
    {
      fact: "Mostar's Ottoman-era Stari Most bridge was destroyed in 1993 and painstakingly rebuilt stone by stone.",
      question: "Which country is home to a famous Ottoman-era stone bridge destroyed in 1993 and rebuilt stone by stone?",
    },
    {
      fact: "Sarajevo hosted the 1984 Winter Olympics, the first ever held in a socialist country.",
      question: "Which country hosted the 1984 Winter Olympics?",
    },
  ],
  BWA: [
    {
      fact: "The Okavango Delta is one of the world's largest inland deltas—a desert oasis teeming with wildlife.",
      question: "Which country contains the Okavango Delta, one of the world's largest inland deltas?",
    },
    {
      fact: "The country is one of the world's leading diamond producers and contains the enormous Jwaneng mine.",
      question: "Which country is home to the giant Jwaneng diamond mine?",
    },
  ],
  BVT: [
    {
      fact: "One of the most remote uninhabited islands on Earth, more than 1,000 miles from Antarctica.",
      question: "Which country includes one of the most remote uninhabited islands on Earth, over 1,000 miles from Antarctica?",
    },
    {
      fact: "Almost the entire island is covered by glaciers, while sheer cliffs make landing on it exceptionally difficult.",
      question: "Which country is a remote, glacier-covered island with almost no accessible shoreline?",
    },
  ],
  BRA: [
    {
      fact: "About 60% of the Amazon rainforest—the largest tropical forest on the planet—lies within these borders.",
      question: "Which country contains about 60% of the Amazon rainforest, the largest tropical forest on the planet?",
    },
    {
      fact: "Rio de Janeiro's Christ the Redeemer statue stands 30 meters tall atop Corcovado Mountain.",
      question: "Which country is home to the Christ the Redeemer statue overlooking a harbor from a peak?",
    },
  ],
  IOT: [
    {
      fact: "The Chagos Archipelago includes Diego Garcia, a strategically vital U.S.–U.K. military base in the Indian Ocean.",
      question: "Which country includes a strategically vital U.S.–U.K. military base on a remote coral atoll?",
    },
    {
      fact: "Coral atolls here ring some of the clearest lagoons in the Indian Ocean, far from any continental coastline.",
      question: "Which country consists of remote coral atolls and lagoons far from any continent?",
    },
  ],
  VGB: [
    {
      fact: "A sailing paradise with dozens of sheltered bays and reef-protected waters.",
      question: "Which country is a sailing paradise with dozens of sheltered bays and reef-protected waters?",
    },
    {
      fact: "The Baths are a maze of enormous granite boulders, sea pools, and caves along the shore of one of its islands.",
      question: "Which country is home to The Baths, a shoreline maze of giant granite boulders and sea pools?",
    },
  ],
  BRN: [
    {
      fact: "One of the world's richest nations per capita, built largely on offshore oil and gas.",
      question: "Which country is one of the world's richest nations per capita, built largely on offshore oil and gas?",
    },
    {
      fact: "Kampong Ayer is a vast water village near the capital, with homes, schools, and mosques built on stilts above the river.",
      question: "Which country is home to Kampong Ayer, a large stilt village on a river?",
    },
  ],
  BGR: [
    {
      fact: "One of the world's oldest countries, still using the Cyrillic alphabet invented by local saints.",
      question: "Which country is one of the world's oldest nations and still uses the Cyrillic alphabet invented by local saints?",
    },
    {
      fact: "The Rose Valley produces much of the world's prized rose oil, distilled from millions of petals each spring.",
      question: "Which country is famous for the Rose Valley and its rose-oil harvest?",
    },
  ],
  BFA: [
    {
      fact: "The name means 'land of upright people' in Mossi and Dioula.",
      question: "Which country's name means 'land of upright people' in Mossi and Dioula?",
    },
    {
      fact: "Ouagadougou hosts FESPACO, Africa's largest film festival, every two years.",
      question: "Which country hosts Africa's largest film festival?",
    },
  ],
  BDI: [
    {
      fact: "This nation and Rwanda were once a single kingdom before European colonization split them.",
      question: "Which country was once a single kingdom with Rwanda before European colonization split them?",
    },
    {
      fact: "Royal drummers perform on huge sacred drums in a tradition recognized by UNESCO as intangible cultural heritage.",
      question: "Which country is known for its UNESCO-recognized royal drumming tradition?",
    },
  ],
  KHM: [
    {
      fact: "Angkor Wat is the largest religious monument in the world by land area.",
      question: "Which country is home to Angkor Wat, the largest religious monument in the world by land area?",
    },
    {
      fact: "Tonlé Sap Lake reverses the direction of its river flow during the monsoon, expanding dramatically into a seasonal inland sea.",
      question: "Which country has a lake whose river reverses direction during the monsoon?",
    },
  ],
  CMR: [
    {
      fact: "Nicknamed 'Africa in miniature' for its coast, rainforest, savanna, and volcanic highlands in one nation.",
      question: "Which country is nicknamed 'Africa in miniature' for its coast, rainforest, savanna, and volcanic highlands?",
    },
    {
      fact: "Mount Cameroon rises directly from the Gulf of Guinea and is one of Africa's most active volcanoes.",
      question: "Which country is home to an active volcano that rises from the Gulf of Guinea coast?",
    },
  ],
  CAN: [
    {
      fact: "More lakes are found here than in the rest of the world's countries combined.",
      question: "Which country has more lakes than the rest of the world's countries combined?",
    },
    {
      fact: "The Bay of Fundy has the world's highest tides, with seawater rising and falling by as much as 16 meters.",
      question: "Which country contains the Bay of Fundy, known for the world's highest tides?",
    },
  ],
  CPV: [
    {
      fact: "Morna music from these islands has influenced styles across the Atlantic world.",
      question: "Which country's morna music has influenced styles across the Atlantic world?",
    },
    {
      fact: "Pico do Fogo is an active volcano whose black lava slopes rise from the middle of Fogo Island.",
      question: "Which country includes an inhabited volcanic island with a crater-floor village and an active peak?",
    },
  ],
  BES: [
    {
      fact: "Bonaire, Sint Eustatius, and Saba are Caribbean municipalities of the Netherlands known for diving and reefs.",
      question: "Which country consists of three Dutch municipalities known for diving and reefs?",
    },
    {
      fact: "Saba's Mount Scenery is the highest point in the entire Kingdom of the Netherlands.",
      question: "Which country includes Mount Scenery, the highest peak in its European kingdom?",
    },
  ],
  CYM: [
    {
      fact: "A global financial hub with more registered companies than residents.",
      question: "Which country is a global financial hub with more registered companies than residents?",
    },
    {
      fact: "Stingray City is a shallow sandbar where southern stingrays gather around snorkelers in clear water.",
      question: "Which country is known for Stingray City, where visitors can meet wild stingrays in shallow water?",
    },
  ],
  CAF: [
    {
      fact: "Sits near the continent's geographic center, largely covered in rainforest.",
      question: "Which country sits near Africa's geographic center, largely covered in rainforest?",
    },
    {
      fact: "Dzanga Bai is a rainforest clearing where hundreds of forest elephants gather to drink mineral-rich water.",
      question: "Which country contains Dzanga Bai, a rainforest clearing visited by forest elephants?",
    },
  ],
  TCD: [
    {
      fact: "A major lake in the region has shrunk dramatically since the 1960s—an environmental crisis for the entire Sahel.",
      question: "Which country lies in a region where a major lake has shrunk dramatically since the 1960s?",
    },
    {
      fact: "The Ennedi Plateau is filled with sandstone arches, rock towers, and prehistoric paintings in the eastern Sahara.",
      question: "Which country contains the Sahara's dramatic Ennedi sandstone arches and rock art?",
    },
  ],
  CHL: [
    {
      fact: "More than 4,000 km long but averages only about 177 km wide—one of the world's most stretched countries.",
      question: "Which country is more than 4,000 km long but averages only about 177 km wide?",
    },
    {
      fact: "The Atacama Desert is so dry that parts of it have gone years without measurable rain.",
      question: "Which country contains the exceptionally dry Atacama Desert?",
    },
  ],
  CHN: [
    {
      fact: "The Great Wall isn't one continuous wall—it's a network of fortifications built over many centuries.",
      question: "Which country built the Great Wall—a network of fortifications constructed over many centuries?",
    },
    {
      fact: "Thousands of life-size terracotta soldiers were buried near the tomb of the first emperor more than 2,000 years ago.",
      question: "Which country is home to the Terracotta Army?",
    },
  ],
  CXR: [
    {
      fact: "Famous for the annual red crab migration, when millions of crabs cross roads and beaches.",
      question: "Which country is famous for an annual red crab migration when millions of crabs cross roads and beaches?",
    },
    {
      fact: "More than 60% of the island is protected as national park, preserving rainforest and rare seabirds.",
      question: "Which country protects most of its remote Indian Ocean island as a national park?",
    },
  ],
  CCK: [
    {
      fact: "A remote coral atoll group in the Indian Ocean with a population under 600.",
      question: "Which country is a remote coral atoll group in the Indian Ocean with a population under 600?",
    },
    {
      fact: "Pulu Keeling National Park protects nesting seabirds, coconut crabs, and a rare coral atoll ecosystem.",
      question: "Which country protects a remote Indian Ocean atoll park known for seabirds and coconut crabs?",
    },
  ],
  COL: [
    {
      fact: "More emeralds are produced here than anywhere else, and it ranks among the world's top coffee exporters.",
      question: "Which country produces more emeralds than anywhere else and ranks among the world's top coffee exporters?",
    },
    {
      fact: "Caño Cristales is nicknamed the 'River of Five Colors' because aquatic plants turn its waters red, yellow, green, blue, and black.",
      question: "Which country is home to the River of Five Colors?",
    },
  ],
  COM: [
    {
      fact: "One of the world's largest producers of ylang-ylang, a flower essential to many perfumes.",
      question: "Which country is one of the world's largest producers of ylang-ylang, essential to many perfumes?",
    },
    {
      fact: "Mount Karthala, a massive shield volcano, dominates the largest island and has one of the world's biggest volcanic calderas.",
      question: "Which country is dominated by the active volcano Mount Karthala?",
    },
  ],
  COG: [
    {
      fact: "The Congo Basin rainforest here is the world's second-largest tropical forest after the Amazon.",
      question: "Which country contains part of the world's second-largest tropical rainforest, after the Amazon?",
    },
    {
      fact: "Its capital faces Kinshasa across the Congo River, making the two cities the world's closest pair of national capitals.",
      question: "Which country has a capital directly across a river from Kinshasa?",
    },
  ],
  COK: [
    {
      fact: "Residents carry New Zealand passports but govern themselves in free association with Wellington.",
      question: "Which country's residents carry New Zealand passports but govern themselves in free association with a nearby country?",
    },
    {
      fact: "Aitutaki's turquoise lagoon is ringed by tiny motus, or coral islets, and is often considered one of the Pacific's most beautiful lagoons.",
      question: "Which country includes a triangular lagoon dotted with coral islets?",
    },
  ],
  CRI: [
    {
      fact: "The army was abolished in 1948 and military spending was redirected to education and health care.",
      question: "Which country abolished its army in 1948 and redirected military spending to education and health care?",
    },
    {
      fact: "Despite covering only about 0.03% of Earth's surface, it contains an estimated 5% of the planet's biodiversity.",
      question: "Which country contains an estimated 5% of Earth's biodiversity despite its small size?",
    },
  ],
  HRV: [
    {
      fact: "Dubrovnik's medieval walls became a filming location for King's Landing in Game of Thrones.",
      question: "Which country is home to medieval city walls that served as a filming location for King's Landing in Game of Thrones?",
    },
    {
      fact: "The necktie takes its name from the cravat, inspired by the scarves worn by Croatian soldiers in 17th-century France.",
      question: "Which country gave the world the word behind the cravat and necktie?",
    },
  ],
  CUB: [
    {
      fact: "Classic 1950s American cars are still on the road thanks to decades of ingenious local repair.",
      question: "Which country still has classic 1950s American cars on the road thanks to decades of ingenious local repair?",
    },
    {
      fact: "The bee hummingbird, the world's smallest bird, lives here; it is only about five centimeters long.",
      question: "Which country is home to the tiny bee hummingbird?",
    },
  ],
  CUW: [
    {
      fact: "Handelskade waterfront is lined with pastel Dutch colonial buildings overlooking the harbor.",
      question: "Which country has a Handelskade waterfront lined with pastel Dutch colonial buildings?",
    },
    {
      fact: "A famous blue liqueur is flavored with the bitter peel of the laraha, a citrus fruit that grows only on this island.",
      question: "Which country grows the rare laraha citrus used to flavor a famous blue liqueur?",
    },
  ],
  CYP: [
    {
      fact: "Legend holds this is the birthplace of Aphrodite, the Greek goddess of love.",
      question: "Which country is legendary birthplace of Aphrodite, the Greek goddess of love?",
    },
    {
      fact: "Commandaria, a sweet wine made in the Troodos foothills, is often described as one of the world's oldest named wines still produced.",
      question: "Which country is known for the ancient sweet wine Commandaria?",
    },
  ],
  CZE: [
    {
      fact: "Prague's Astronomical Clock has been keeping time since 1410—one of the oldest still working.",
      question: "Which country is home to a medieval astronomical clock that has kept time since 1410?",
    },
    {
      fact: "In 1618, officials were thrown from a Prague castle window in an event called the Defenestration of Prague, helping ignite the Thirty Years' War.",
      question: "Which country was the setting for a famous defenestration that helped start the Thirty Years' War?",
    },
  ],
  DNK: [
    {
      fact: "LEGO bricks were invented in Billund, where the original LEGOLAND theme park still stands.",
      question: "Which country invented LEGO bricks and is home to the original LEGOLAND theme park?",
    },
    {
      fact: "The Dannebrog, its red flag with a white cross, is widely regarded as the world's oldest continuously used national flag.",
      question: "Which country uses the Dannebrog, often called the world's oldest national flag?",
    },
  ],
  DJI: [
    {
      fact: "Sits on the Afar Triple Junction where three tectonic plates pull apart—creating dramatic rift landscapes.",
      question: "Which country sits on the Afar Triple Junction where three tectonic plates pull apart?",
    },
    {
      fact: "Lake Assal is Africa's lowest point and so salty that people can float easily in its water.",
      question: "Which country contains Lake Assal, Africa's lowest point?",
    },
  ],
  DMA: [
    {
      fact: "Boiling Lake is the world's second-largest hot spring and steams like a giant cauldron.",
      question: "Which country is home to Boiling Lake, the world's second-largest hot spring?",
    },
    {
      fact: "Its flag features the Sisserou parrot, making it the only national flag with the color purple in its design.",
      question: "Which country has a flag featuring a Sisserou parrot and the color purple?",
    },
  ],
  DOM: [
    {
      fact: "Shares Hispaniola with Haiti—the only island split between two nations in the Caribbean.",
      question: "Which country shares Hispaniola with Haiti—the only Caribbean island split between two nations?",
    },
    {
      fact: "Larimar, a rare sky-blue gemstone found only in one small area, is mined here.",
      question: "Which country is the only source of the blue gemstone larimar?",
    },
  ],
  COD: [
    {
      fact: "The Congo River is the world's deepest river and second-largest by discharge, cutting through rainforests.",
      question: "Which country is home to the world's deepest river, also the second-largest by discharge?",
    },
    {
      fact: "Bonobos, great apes closely related to chimpanzees, live naturally only in the forests south of the Congo River.",
      question: "Which country is the wild home of the bonobo?",
    },
  ],
  ECU: [
    {
      fact: "Named for the equator, which runs through the nation—and the Galápagos Islands belong to it.",
      question: "Which country is named for the equator and includes the Galápagos Islands?",
    },
    {
      fact: "Because Earth bulges at the equator, the summit of Chimborazo is the point on Earth's surface farthest from the planet's center.",
      question: "Which country contains Chimborazo, Earth's farthest surface point from its center?",
    },
  ],
  EGY: [
    {
      fact: "The Great Pyramid of Giza was the tallest human-made structure in the world for nearly 4,000 years.",
      question: "Which country is home to a great pyramid that was the tallest human-made structure for nearly 4,000 years?",
    },
    {
      fact: "In the 1960s, the temples of Abu Simbel were cut into enormous blocks and moved uphill to save them from a rising reservoir.",
      question: "Which country relocated the ancient temples of Abu Simbel block by block?",
    },
  ],
  SLV: [
    {
      fact: "The smallest and most densely populated country in Central America.",
      question: "Which country is the smallest and most densely populated in Central America?",
    },
    {
      fact: "Pupusas—thick corn cakes stuffed with ingredients such as cheese, beans, or pork—are so central to local food culture that they have a national day.",
      question: "Which country is famous for pupusas, stuffed corn cakes?",
    },
  ],
  GNQ: [
    {
      fact: "The only African country with Spanish as an official language.",
      question: "Which country is the only African nation with Spanish as an official language?",
    },
    {
      fact: "The capital, Malabo, sits on Bioko Island rather than on the mainland, separated from it by the Gulf of Guinea.",
      question: "Which country has its capital on an island off the African mainland?",
    },
  ],
  ERI: [
    {
      fact: "The capital Asmara has one of the world's finest collections of Art Deco and Modernist architecture.",
      question: "Which country's capital has one of the world's finest collections of Art Deco architecture?",
    },
    {
      fact: "The Dahlak Archipelago in the Red Sea contains more than 200 islands and is known for exceptionally clear coral reefs.",
      question: "Which country includes the Dahlak Archipelago in the Red Sea?",
    },
  ],
  EST: [
    {
      fact: "One of the world's most digital societies—citizens can vote, sign documents, and file taxes online.",
      question: "Which country is one of the world's most digital societies, where citizens vote and file taxes online?",
    },
    {
      fact: "The Kaali meteorite crater field on Saaremaa was formed when a meteor broke apart and struck the island thousands of years ago.",
      question: "Which country contains meteorite craters on a Baltic island?",
    },
  ],
  SWZ: [
    {
      fact: "One of the world's last absolute monarchies in Africa.",
      question: "Which country is one of the world's last absolute monarchies in Africa?",
    },
    {
      fact: "The annual Umhlanga, or Reed Dance, brings thousands of young women together in a major cultural ceremony.",
      question: "Which country hosts the annual Umhlanga Reed Dance?",
    },
  ],
  ETH: [
    {
      fact: "Follows its own calendar—about seven to eight years behind the Gregorian calendar most of the world uses.",
      question: "Which country follows its own calendar, about seven to eight years behind the Gregorian calendar?",
    },
    {
      fact: "Coffee is traditionally traced to the forests of Kaffa, where the coffee plant grows wild and ceremonies still honor its preparation.",
      question: "Which country is traditionally regarded as coffee's birthplace?",
    },
  ],
  FLK: [
    {
      fact: "These islands were the setting of a brief but intense war between Britain and Argentina in 1982.",
      question: "Which country was the setting of a brief but intense war between Britain and Argentina in 1982?",
    },
    {
      fact: "Five species of penguin breed on these windswept islands, including king, gentoo, and rockhopper penguins.",
      question: "Which country is home to breeding colonies of five penguin species in the South Atlantic?",
    },
  ],
  FRO: [
    {
      fact: "Residents drive through tunnels between islands and generate much of their power from wind and hydro.",
      question: "Which country has tunnels connecting its islands and generates much of its power from wind and hydro?",
    },
    {
      fact: "Many homes have turf roofs, a centuries-old building tradition that helps insulate houses against North Atlantic weather.",
      question: "Which country is known for traditional homes with grass-covered roofs?",
    },
  ],
  FJI: [
    {
      fact: "Straddles the International Date Line, among the first countries to greet each new day.",
      question: "Which country straddles the International Date Line and is among the first to greet each new day?",
    },
    {
      fact: "Kava, a mildly sedating drink made from a pepper-family root, is shared from a communal bowl in an important welcome ritual.",
      question: "Which country has a traditional welcome ceremony centered on sharing kava?",
    },
  ],
  FIN: [
    {
      fact: "More saunas than cars—roughly one sauna for every two people.",
      question: "Which country has more saunas than cars—roughly one sauna for every two people?",
    },
    {
      fact: "It has roughly 188,000 lakes, including Lake Saimaa, where the rare Saimaa ringed seal survives.",
      question: "Which country has about 188,000 lakes and the endangered Saimaa ringed seal?",
    },
  ],
  FRA: [
    {
      fact: "The most visited nation on Earth, drawing more international tourists than any other.",
      question: "Which country is the most visited on Earth, drawing more international tourists than any other?",
    },
    {
      fact: "The first public screening of motion pictures by the Lumière brothers took place in Paris in 1895.",
      question: "Which country hosted the Lumière brothers' first public film screening?",
    },
  ],
  GUF: [
    {
      fact: "Europe's main spaceport at Kourou launches rockets from South America under a European flag.",
      question: "Which country hosts Europe's main spaceport, launching rockets from South America?",
    },
    {
      fact: "Although it lies in South America, it is part of the European Union and uses the euro.",
      question: "Which country is in South America yet uses the euro as part of the European Union?",
    },
  ],
  PYF: [
    {
      fact: "Bora Bora and Tahiti helped define the world's image of a tropical paradise.",
      question: "Which country includes lagoon islands that helped define the image of a tropical paradise?",
    },
    {
      fact: "Teahupo'o is famous for a powerful wave that breaks over an extremely shallow coral reef, producing a strikingly hollow barrel.",
      question: "Which country includes the surf break Teahupo'o?",
    },
  ],
  ATF: [
    {
      fact: "Remote sub-Antarctic islands with no permanent human population.",
      question: "Which country includes remote southern-ocean islands with no permanent human population?",
    },
    {
      fact: "The Crozet Islands host huge colonies of king penguins, albatrosses, and elephant seals in the southern Indian Ocean.",
      question: "Which country includes the Crozet Islands' vast penguin and albatross colonies?",
    },
  ],
  GAB: [
    {
      fact: "About 11% of the land is preserved in national parks—among the highest proportions in the world.",
      question: "Which country preserves about 11% of its land in national parks—among the highest proportions worldwide?",
    },
    {
      fact: "At Loango National Park, forest elephants can sometimes be seen walking along Atlantic beaches.",
      question: "Which country is home to Loango National Park, where elephants can walk on beaches?",
    },
  ],
  GMB: [
    {
      fact: "A narrow strip of land along a major river, surrounded on three sides by Senegal.",
      question: "Which country is a narrow strip of land along a river, surrounded on three sides by Senegal?",
    },
    {
      fact: "Kunta Kinteh Island, a small river island, preserves a former slave-trading site and is a UNESCO World Heritage Site.",
      question: "Which country contains the UNESCO-listed Kunta Kinteh Island?",
    },
  ],
  GEO: [
    {
      fact: "Archaeologists found 8,000-year-old winemaking evidence here, supporting a claim as wine's birthplace.",
      question: "Which country has 8,000-year-old winemaking evidence supporting a claim as wine's birthplace?",
    },
    {
      fact: "Its distinctive alphabet has 33 letters and a flowing script unlike any other writing system in Europe.",
      question: "Which country uses a unique 33-letter alphabet with its own distinctive script?",
    },
  ],
  DEU: [
    {
      fact: "The Autobahn famously has long stretches with no official speed limit for cars.",
      question: "Which country has an Autobahn with long stretches and no official speed limit for cars?",
    },
    {
      fact: "More than 1,300 breweries operate here, and the Oktoberfest celebration began in Munich as a royal wedding party in 1810.",
      question: "Which country began Oktoberfest and has more than 1,300 breweries?",
    },
  ],
  GHA: [
    {
      fact: "The first sub-Saharan African country to gain independence from colonial rule, in 1957.",
      question: "Which country was the first sub-Saharan African nation to gain independence from colonial rule, in 1957?",
    },
    {
      fact: "Lake Volta is one of the world's largest artificial lakes by surface area, created when the Akosombo Dam was built.",
      question: "Which country contains the vast artificial Lake Volta?",
    },
  ],
  GIB: [
    {
      fact: "The Rock is a limestone promontory guarded by wild Barbary macaques—the only wild monkeys in Europe.",
      question: "Which country is guarded by wild Barbary macaques—the only wild monkeys in Europe?",
    },
    {
      fact: "Its airport runway crosses the main road into the territory, so road traffic stops whenever aircraft land or take off.",
      question: "Which country has an airport runway that crosses its main road?",
    },
  ],
  GRC: [
    {
      fact: "Thousands of islands dot the seas here, though only a few hundred are inhabited.",
      question: "Which country has thousands of islands, though only a few hundred are inhabited?",
    },
    {
      fact: "The first ancient Olympic Games were held at Olympia in 776 BCE, honoring the god Zeus.",
      question: "Which country was the birthplace of the ancient Olympic Games?",
    },
  ],
  GRL: [
    {
      fact: "The world's largest island, covered by an ice sheet up to three kilometers thick.",
      question: "Which country is the world's largest island, covered by an ice sheet up to three kilometers thick?",
    },
    {
      fact: "Northeast Greenland National Park is the world's largest national park, covering an area larger than many countries.",
      question: "Which country contains the world's largest national park?",
    },
  ],
  GRD: [
    {
      fact: "Known as the 'Spice Isle' for nutmeg, mace, and cinnamon exports.",
      question: "Which country is known as the 'Spice Isle' for nutmeg, mace, and cinnamon exports?",
    },
    {
      fact: "The Molinière Underwater Sculpture Park, installed beneath the sea in 2006, was the world's first underwater sculpture park.",
      question: "Which country pioneered an underwater sculpture park at Molinière?",
    },
  ],
  GLP: [
    {
      fact: "La Soufrière volcano last erupted in 1976, forcing the evacuation of 73,000 people.",
      question: "Which country saw La Soufrière volcano erupt in 1976, forcing the evacuation of 73,000 people?",
    },
    {
      fact: "Its two main islands form the shape of a butterfly when viewed from above, separated by a narrow channel called the Rivière Salée.",
      question: "Which country is shaped like a butterfly when its two main islands are viewed from above?",
    },
  ],
  GUM: [
    {
      fact: "The westernmost U.S. territory and a key military hub in the Pacific.",
      question: "Which country is the westernmost U.S. territory and a key military hub in the Pacific?",
    },
    {
      fact: "Ancient Chamorro people built distinctive latte stone pillars, whose capstones supported raised homes.",
      question: "Which country is known for ancient Chamorro latte stone pillars?",
    },
  ],
  GTM: [
    {
      fact: "Tikal ruins were a major Maya city—its temples rise above the Petén jungle canopy.",
      question: "Which country is home to the Tikal ruins, a major Maya city rising above the jungle?",
    },
    {
      fact: "The quetzal, a brilliantly colored bird sacred to the Maya, gives its name to the national currency.",
      question: "Which country names its currency after the sacred quetzal bird?",
    },
  ],
  GGY: [
    {
      fact: "The famous dairy cows take their name from this Channel Island.",
      question: "Which country gives its name to a famous breed of dairy cows from the Channel Islands?",
    },
    {
      fact: "Victor Hugo wrote much of Les Misérables while living in exile on the island.",
      question: "Which country was Victor Hugo's island home while he wrote much of Les Misérables?",
    },
  ],
  GIN: [
    {
      fact: "About one-third of the world's bauxite—the ore used to make aluminum—is found here.",
      question: "Which country holds about one-third of the world's bauxite, the ore used to make aluminum?",
    },
    {
      fact: "The Fouta Djallon highlands are the source region for the Niger, Senegal, and Gambia rivers.",
      question: "Which country contains the highlands where the Niger, Senegal, and Gambia rivers rise?",
    },
  ],
  GNB: [
    {
      fact: "The Bijagós Archipelago is a UNESCO biosphere reserve of mangroves and rare sea turtles.",
      question: "Which country contains the Bijagós Archipelago, a UNESCO biosphere reserve of mangroves and sea turtles?",
    },
    {
      fact: "Cashews are so important that their harvest is the country's leading agricultural export.",
      question: "Which country relies heavily on cashews as its leading agricultural export?",
    },
  ],
  GUY: [
    {
      fact: "About 80% of the land is covered by pristine Amazon rainforest—one of the highest percentages in South America.",
      question: "Which country has about 80% of its land covered by pristine Amazon rainforest?",
    },
    {
      fact: "Kaieteur Falls plunges 226 meters in a single drop—nearly five times the height of Niagara Falls.",
      question: "Which country contains the towering single-drop Kaieteur Falls?",
    },
  ],
  HTI: [
    {
      fact: "The first nation founded by formerly enslaved people who won independence, in 1804.",
      question: "Which country was the first nation founded by formerly enslaved people who won independence, in 1804?",
    },
    {
      fact: "Citadelle Laferrière is a mountaintop fortress built after independence and is one of the largest fortresses in the Americas.",
      question: "Which country contains the mountaintop Citadelle Laferrière fortress?",
    },
  ],
  HMD: [
    {
      fact: "Among the most remote places on Earth, near Antarctica.",
      question: "Which country includes islands among the most remote places on Earth, near Antarctica?",
    },
    {
      fact: "Big Ben is an active volcano rising more than 2,700 meters above the southern Indian Ocean on this remote island.",
      question: "Which country includes the remote active volcano nicknamed Big Ben in the southern Indian Ocean?",
    },
  ],
  HND: [
    {
      fact: "Copán ruins feature some of the finest Maya stone carving in Central America.",
      question: "Which country is home to the Copán ruins, featuring some of the finest Maya stone carving in Central America?",
    },
    {
      fact: "The Bay Islands lie beside the Mesoamerican Barrier Reef, the second-largest coral reef system in the world.",
      question: "Which country includes the Bay Islands beside the Mesoamerican Barrier Reef?",
    },
  ],
  HKG: [
    {
      fact: "More skyscrapers rise here than in any other city in the world—well over 500 buildings above 150 meters.",
      question: "Which country has more skyscrapers than any other city—well over 500 buildings above 150 meters?",
    },
    {
      fact: "The Star Ferry has crossed Victoria Harbour since 1888, offering one of the world's most iconic short urban boat rides.",
      question: "Which country is home to a historic harbor ferry that has shuttled passengers between island and peninsula for more than a century?",
    },
  ],
  HUN: [
    {
      fact: "Budapest was formed by merging three cities and sits atop more than 100 thermal springs.",
      question: "Which country is home to a capital formed by merging three cities atop more than 100 thermal springs?",
    },
    {
      fact: "Rubik’s Cube was invented in Budapest in 1974 by architecture professor Ernő Rubik.",
      question: "Which country gave the world the Rubik’s Cube?",
    },
  ],
  ISL: [
    {
      fact: "Runs almost entirely on renewable energy and sits atop the Mid-Atlantic Ridge, splitting two continents.",
      question: "Which country runs almost entirely on renewable energy and sits atop the Mid-Atlantic Ridge?",
    },
    {
      fact: "Its language has changed so little since medieval times that many people can still read the old Norse sagas with relatively little help.",
      question: "Which country has preserved a language close to that of the medieval Norse sagas?",
    },
  ],
  IND: [
    {
      fact: "22 official languages are spoken, and the population is on track to become the world's largest.",
      question: "Which country has 22 official languages and is on track to become the world's most populous nation?",
    },
    {
      fact: "The living root bridges of Meghalaya are grown, not built: villagers guide the aerial roots of rubber fig trees across streams for generations.",
      question: "Which country is home to bridges grown from the roots of living trees?",
    },
  ],
  IDN: [
    {
      fact: "The world's largest archipelago—more than 17,000 islands spanning three time zones.",
      question: "Which country is the world's largest archipelago, with more than 17,000 islands spanning three time zones?",
    },
    {
      fact: "Komodo dragons, the world’s largest lizards, survive naturally on only a handful of islands here.",
      question: "Which country is the natural home of Komodo dragons?",
    },
  ],
  IRN: [
    {
      fact: "Persian carpets are so prized that fine antique rugs can sell for millions of dollars.",
      question: "Which country produces Persian carpets so prized that fine antique rugs sell for millions?",
    },
    {
      fact: "An ancient network of underground channels called qanats has carried water from mountain aquifers to desert settlements for thousands of years.",
      question: "Which country is known for ancient underground water channels called qanats?",
    },
  ],
  IRQ: [
    {
      fact: "Mesopotamia—'the land between the rivers'—is where writing, the wheel, and cities first emerged.",
      question: "Which country contains Mesopotamia, where writing, the wheel, and cities first emerged?",
    },
    {
      fact: "The ancient city of Ur, traditionally associated with Abraham, once stood near the Euphrates and had a towering stepped ziggurat.",
      question: "Which country contains the ancient Mesopotamian city of Ur?",
    },
  ],
  IRL: [
    {
      fact: "Lush green countryside shaped by Gulf Stream rains covers much of the landscape.",
      question: "Which country has lush green countryside shaped by Gulf Stream rains?",
    },
    {
      fact: "Newgrange, a 5,000-year-old passage tomb, is aligned so the rising winter-solstice sun lights its inner chamber.",
      question: "Which country has a prehistoric tomb illuminated by the winter-solstice sunrise?",
    },
  ],
  IMN: [
    {
      fact: "A self-governing Crown dependency famous for the TT motorcycle races since 1907.",
      question: "Which country is a self-governing Crown dependency famous for the TT motorcycle races since 1907?",
    },
    {
      fact: "The native Manx cat is famous for having little or no tail, a trait linked to a genetic mutation on this island.",
      question: "Which country is the namesake of the tailless Manx cat?",
    },
  ],
  ISR: [
    {
      fact: "The Dead Sea shoreline is the lowest dry land on Earth—about 430 meters below sea level.",
      question: "Which country contains the Dead Sea shoreline, the lowest dry land on Earth?",
    },
    {
      fact: "The ancient fortress of Masada stands on an isolated desert plateau above the Dead Sea.",
      question: "Which country contains the desert plateau fortress of Masada?",
    },
  ],
  ITA: [
    {
      fact: "More UNESCO World Heritage Sites than any other country—58 and counting.",
      question: "Which country has more UNESCO World Heritage Sites than any other—58 and counting?",
    },
    {
      fact: "Venice is built across more than 100 small islands, with canals serving as streets and boats as everyday transport.",
      question: "Which country is home to a canal city built on more than 100 islands?",
    },
  ],
  CIV: [
    {
      fact: "About 40% of the world's cocoa is produced here, making it the top chocolate ingredient supplier.",
      question: "Which country produces about 40% of the world's cocoa, making it the top chocolate ingredient supplier?",
    },
    {
      fact: "The Basilica of Our Lady of Peace has a dome inspired by St. Peter’s in Rome and is among the world’s largest churches by area.",
      question: "Which country contains the enormous Basilica of Our Lady of Peace?",
    },
  ],
  JAM: [
    {
      fact: "Reggae originated here—Bob Marley's music turned a small island sound into a global movement.",
      question: "Which country gave the world reggae, turning a small island sound into a global movement?",
    },
    {
      fact: "The Blue Mountains produce prized coffee beans that grow slowly in cool, misty highlands.",
      question: "Which country is known for coffee grown in the misty Blue Mountains?",
    },
  ],
  JPN: [
    {
      fact: "More than 6,800 islands and a location on the Pacific Ring of Fire with over 100 active volcanoes.",
      question: "Which country has more than 6,800 islands and over 100 active volcanoes on the Pacific Ring of Fire?",
    },
    {
      fact: "The world’s oldest continuously operating hotel, Nishiyama Onsen Keiunkan, has welcomed guests since 705.",
      question: "Which country is home to a hotel that has operated since the year 705?",
    },
  ],
  JEY: [
    {
      fact: "The tidal range is among the largest in the world—at low tide, the island nearly doubles in size.",
      question: "Which country has one of the world's largest tidal ranges—at low tide the island nearly doubles in size?",
    },
    {
      fact: "A dairy cattle breed known for rich, high-butterfat milk originated on this Channel Island.",
      question: "Which country is the origin of a famous Channel Island dairy cattle breed prized for rich milk?",
    },
  ],
  JOR: [
    {
      fact: "Petra is a rose-red city carved into sandstone cliffs by the Nabataeans over 2,000 years ago.",
      question: "Which country is home to a rose-red ancient site carved into sandstone cliffs by the Nabataeans?",
    },
    {
      fact: "The vast desert landscape of Wadi Rum, with towering sandstone cliffs and natural arches, is often called the Valley of the Moon.",
      question: "Which country contains the desert landscape known as Wadi Rum?",
    },
  ],
  KAZ: [
    {
      fact: "The world's largest landlocked country and the last Soviet republic to declare independence.",
      question: "Which country is the world's largest landlocked nation and the last Soviet republic to declare independence?",
    },
    {
      fact: "Baikonur Cosmodrome, the launch site for Sputnik 1 and Yuri Gagarin’s first spaceflight, lies on its steppe.",
      question: "Which country contains the launch site of the first satellite and first human spaceflight?",
    },
  ],
  KEN: [
    {
      fact: "Great Rift Valley lakes draw millions of flamingos, turning shores pink during migration.",
      question: "Which country's Great Rift Valley lakes draw millions of flamingos, turning shores pink?",
    },
    {
      fact: "Lake Turkana is the world’s largest permanent desert lake and has yielded major discoveries about early human ancestors.",
      question: "Which country contains Lake Turkana, a key site for early human fossil discoveries?",
    },
  ],
  KIR: [
    {
      fact: "One of the first countries likely to lose land to rising seas—some islands sit just two meters above water.",
      question: "Which country is among the first likely to lose land to rising seas, with islands just two meters above water?",
    },
    {
      fact: "Its easternmost islands use a time zone of UTC+14, putting them among the first inhabited places to enter a new calendar day.",
      question: "Which country includes islands among the first inhabited places to see each new day?",
    },
  ],
  UNK: [
    {
      fact: "Pristina's 'Newborn' monument is stripped and repainted in a new design every year on Independence Day.",
      question: "Which country has a 'Newborn' monument in its capital that is repainted in a new design every year on Independence Day?",
    },
    {
      fact: "The medieval Visoki Dečani monastery preserves one of the Balkans’ richest collections of Byzantine frescoes.",
      question: "Which country contains the medieval Visoki Dečani monastery?",
    },
  ],
  KWT: [
    {
      fact: "The Liberation Tower was named after the 1991 Gulf War that ended the Iraqi occupation.",
      question: "Which country named its Liberation Tower after the 1991 Gulf War that ended Iraqi occupation?",
    },
    {
      fact: "Traditional pearl divers once supplied prized natural pearls from the warm waters of the Persian Gulf.",
      question: "Which country had a historic economy built around pearl diving in the Persian Gulf?",
    },
  ],
  KGZ: [
    {
      fact: "Over 90% mountainous—the Tian Shan range dominates the landscape.",
      question: "Which country is over 90% mountainous, dominated by the Tian Shan range?",
    },
    {
      fact: "Issyk-Kul, one of the world’s largest high-altitude lakes, never freezes despite its snowy mountain setting.",
      question: "Which country contains the high-altitude lake Issyk-Kul, which rarely freezes?",
    },
  ],
  LAO: [
    {
      fact: "The most heavily bombed country per capita in history due to the Secret War during the Vietnam era.",
      question: "Which country is the most heavily bombed per capita in history due to the Secret War during the Vietnam era?",
    },
    {
      fact: "The Plain of Jars is scattered with thousands of enormous ancient stone vessels, some weighing several tons.",
      question: "Which country contains the mysterious archaeological Plain of Jars?",
    },
  ],
  LVA: [
    {
      fact: "Riga has one of Europe's largest collections of Art Nouveau architecture.",
      question: "Which country's capital has one of Europe's largest collections of Art Nouveau architecture?",
    },
    {
      fact: "A song and dance festival held every five years brings together tens of thousands of performers in a huge national choir.",
      question: "Which country hosts a song festival with a choir of tens of thousands of performers?",
    },
  ],
  LBN: [
    {
      fact: "Cedars on the flag were prized by ancient Egyptians and Phoenicians for shipbuilding.",
      question: "Which country features cedars on its flag that were prized by ancient Egyptians and Phoenicians?",
    },
    {
      fact: "Byblos is one of the world’s oldest continuously inhabited cities and gave its name to the Greek word behind “Bible.”",
      question: "Which country is home to the ancient city of Byblos?",
    },
  ],
  LSO: [
    {
      fact: "Entirely surrounded by South Africa and the only country in the world that lies entirely above 1,000 meters.",
      question: "Which country is entirely surrounded by South Africa and lies entirely above 1,000 meters?",
    },
    {
      fact: "Traditional Basotho blankets are worn like cloaks and have become a distinctive national symbol.",
      question: "Which country is known for the traditional Basotho blanket worn as a cloak?",
    },
  ],
  LBR: [
    {
      fact: "Founded in the 19th century by freed American slaves—the flag echoes the U.S. stars and stripes.",
      question: "Which country was founded in the 19th century by freed American slaves with a flag echoing U.S. stars and stripes?",
    },
    {
      fact: "Its capital was named for U.S. President James Monroe and is one of the few national capitals founded by formerly enslaved settlers from America.",
      question: "Which country has a capital named after U.S. President James Monroe?",
    },
  ],
  LBY: [
    {
      fact: "Much of the land lies within the Sahara, including the ancient Roman ruins of Leptis Magna on the coast.",
      question: "Which country has ancient Roman ruins of Leptis Magna on its coast within the Sahara?",
    },
    {
      fact: "The ancient Greek city of Cyrene was built on a fertile plateau above the Mediterranean and became a major classical center.",
      question: "Which country contains the ancient Greek city of Cyrene?",
    },
  ],
  LIE: [
    {
      fact: "One of only two doubly landlocked countries—surrounded by landlocked nations.",
      question: "Which country is one of only two doubly landlocked nations, surrounded by landlocked countries?",
    },
    {
      fact: "Its national army was disbanded in 1868 after sending 80 soldiers to a war and reportedly returning with 81.",
      question: "Which country is linked to the tale of an army that returned from war with one extra man?",
    },
  ],
  LTU: [
    {
      fact: "The last European nation to abandon paganism and the first Soviet republic to declare independence.",
      question: "Which country was the last European nation to abandon paganism and the first Soviet republic to declare independence?",
    },
    {
      fact: "The Hill of Crosses is covered with tens of thousands of crosses placed by pilgrims over generations.",
      question: "Which country is home to the pilgrimage site known as the Hill of Crosses?",
    },
  ],
  LUX: [
    {
      fact: "The highest GDP per capita in the world and a founding member of the European Union.",
      question: "Which country has the highest GDP per capita in the world and is a founding EU member?",
    },
    {
      fact: "Despite its tiny size, it ranks among the world's top financial centers and is home to several major European Union institutions.",
      question: "Which country hosts several major European Union institutions despite being one of Europe's smallest states?",
    },
  ],
  MAC: [
    {
      fact: "A Portuguese colony for 400 years before returning to China in 1999—it rivals Las Vegas for gambling revenue.",
      question: "Which country was a Portuguese colony for 400 years and rivals Las Vegas for gambling revenue?",
    },
    {
      fact: "Its historic center blends Portuguese tiled squares, Catholic churches, and Chinese temples in a compact former trading port.",
      question: "Which country has a historic center blending Portuguese colonial architecture with Chinese temples?",
    },
  ],
  MDG: [
    {
      fact: "Broke away from Africa 88 million years ago—about 90% of wildlife is found nowhere else.",
      question: "Which country broke away from Africa 88 million years ago, with 90% of wildlife found nowhere else?",
    },
    {
      fact: "Baobab trees line a famous dirt road in the west, their giant trunks creating one of Africa’s most recognizable landscapes.",
      question: "Which country is home to the famous Avenue of the Baobabs?",
    },
  ],
  MWI: [
    {
      fact: "Lake Malawi contains more species of fish than any other lake on Earth—hundreds of colorful cichlids.",
      question: "Which country contains a great African lake with more fish species than any other lake on Earth?",
    },
    {
      fact: "Mount Mulanje rises abruptly from the surrounding plains, with granite peaks and one of central Africa’s largest rock faces.",
      question: "Which country contains the dramatic granite massif of Mount Mulanje?",
    },
  ],
  MYS: [
    {
      fact: "Petronas Towers in Kuala Lumpur were the world's tallest buildings from 1998 to 2004.",
      question: "Which country is home to the Petronas Towers, the world's tallest buildings from 1998 to 2004?",
    },
    {
      fact: "The Rafflesia, the world’s largest individual flower, blooms in its rainforests and can reach about a meter across.",
      question: "Which country is one of the natural homes of the world’s largest flower, Rafflesia?",
    },
  ],
  MDV: [
    {
      fact: "The world's lowest country—the highest natural point is only about 2.4 meters above sea level.",
      question: "Which country is the world's lowest, with a highest natural point of only about 2.4 meters above sea level?",
    },
    {
      fact: "Many beaches glow blue at night when bioluminescent plankton are stirred by waves.",
      question: "Which country is known for beaches that can glow blue at night from bioluminescent plankton?",
    },
  ],
  MLI: [
    {
      fact: "Timbuktu was once a legendary center of Islamic learning and trans-Saharan trade.",
      question: "Which country is home to a legendary desert city once a center of Islamic learning and trans-Saharan trade?",
    },
    {
      fact: "The Great Mosque of Djenné is the world’s largest mud-brick building and is replastered each year by the community.",
      question: "Which country contains the world’s largest mud-brick building?",
    },
  ],
  MLT: [
    {
      fact: "Megalithic Temples here are older than Stonehenge and the Egyptian pyramids.",
      question: "Which country has Megalithic Temples older than Stonehenge and the Egyptian pyramids?",
    },
    {
      fact: "The island nation’s official language is a Semitic language written with the Latin alphabet.",
      question: "Which country has a Semitic official language written in the Latin alphabet?",
    },
  ],
  MHL: [
    {
      fact: "Bikini Atoll, where U.S. nuclear tests in the 1940s–50s forced entire communities to relocate.",
      question: "Which country includes Bikini Atoll, where U.S. nuclear tests forced entire communities to relocate?",
    },
    {
      fact: "Traditional navigators used stick charts made from palm ribs and shells to map ocean swells and island positions.",
      question: "Which country developed traditional stick charts for navigating ocean swells?",
    },
  ],
  MTQ: [
    {
      fact: "Mount Pelée erupted in 1902, destroying the city of Saint-Pierre in minutes.",
      question: "Which country saw a volcano erupt in 1902, destroying a coastal city in minutes?",
    },
    {
      fact: "Its national flower, the red heliconia, is called the “balisier” and appears on local symbols and designs.",
      question: "Which country is associated with the red heliconia flower called the balisier?",
    },
  ],
  MRT: [
    {
      fact: "The Richat Structure—a giant bull's-eye in the Sahara—is visible from space and was once thought to be an impact crater.",
      question: "Which country is home to the Richat Structure, a giant bull's-eye in the Sahara visible from space?",
    },
    {
      fact: "The Iron Ore Train can stretch for more than two kilometers as it carries ore across the Sahara to the Atlantic coast.",
      question: "Which country is crossed by one of the world’s longest freight trains through the Sahara?",
    },
  ],
  MUS: [
    {
      fact: "The only known home of the dodo before the flightless bird was hunted to extinction by the 1680s.",
      question: "Which country was the only known home of the dodo before it was hunted to extinction by the 1680s?",
    },
    {
      fact: "Its multicolored “seven-colored earth” dunes are formed by volcanic ash weathering into distinct bands.",
      question: "Which country is home to the unusual Seven Colored Earths dunes?",
    },
  ],
  MYT: [
    {
      fact: "Sits in the Comoros archipelago but chose to remain French—a source of ongoing regional tension.",
      question: "Which country sits in the Comoros archipelago but chose to remain French?",
    },
    {
      fact: "A vast coral lagoon surrounds the main island, sheltering sea turtles, dolphins, and mangrove ecosystems.",
      question: "Which country is surrounded by one of the world’s largest enclosed coral lagoons?",
    },
  ],
  MEX: [
    {
      fact: "The capital was built on the ruins of Tenochtitlán, the Aztec capital that once floated on a lake.",
      question: "Which country's capital was built on the ruins of Tenochtitlán, the Aztec capital that once floated on a lake?",
    },
    {
      fact: "The monarch butterflies that winter in central Mexico migrate thousands of kilometers from Canada and the United States each year.",
      question: "Which country hosts millions of monarch butterflies during their winter migration?",
    },
  ],
  FSM: [
    {
      fact: "Spans more than 2.7 million square kilometers of ocean but has a land area smaller than Rhode Island.",
      question: "Which country spans more than 2.7 million square kilometers of ocean but has land smaller than Rhode Island?",
    },
    {
      fact: "Nan Madol is an ancient ceremonial city built on dozens of artificial islets from massive basalt columns.",
      question: "Which country contains the ancient artificial-island city of Nan Madol?",
    },
  ],
  MDA: [
    {
      fact: "Mileștii Mici holds one of the world's largest wine cellars—over 200 km of underground tunnels.",
      question: "Which country is home to Mileștii Mici, one of the world's largest wine cellars with over 200 km of tunnels?",
    },
    {
      fact: "The traditional Mărțișor festival welcomes spring with red-and-white cords worn for good luck.",
      question: "Which country celebrates spring with red-and-white Mărțișor cords?",
    },
  ],
  MCO: [
    {
      fact: "Smaller than Central Park in New York yet packs luxury casinos, a Grand Prix, and a royal palace.",
      question: "Which country is smaller than Central Park yet has luxury casinos, a Grand Prix, and a royal palace?",
    },
    {
      fact: "The Oceanographic Museum, founded by Prince Albert I, is built dramatically into a cliff above the Mediterranean.",
      question: "Which country has a cliffside oceanographic museum founded by a prince?",
    },
  ],
  MNG: [
    {
      fact: "Genghis Khan's empire began on the steppe—the nation still celebrates him as a founding father.",
      question: "Which country is where Genghis Khan's empire began on the steppe?",
    },
    {
      fact: "The Gobi Desert contains the Flaming Cliffs, where the first scientifically recognized dinosaur eggs were discovered in 1923.",
      question: "Which country contains the Flaming Cliffs, where dinosaur eggs were first scientifically identified?",
    },
  ],
  MNE: [
    {
      fact: "The name means 'Black Mountain' in Venetian Italian, named for the dark forests on Mount Lovćen.",
      question: "Which country's name means 'Black Mountain' in Venetian Italian, for the dark forests on Mount Lovćen?",
    },
    {
      fact: "The Bay of Kotor is a winding Adriatic inlet surrounded by steep mountains and medieval towns.",
      question: "Which country contains a dramatic Adriatic inlet ringed by medieval fortified towns?",
    },
  ],
  MSR: [
    {
      fact: "Soufrière Hills volcano erupted in 1995, burying the capital Plymouth in ash and forcing evacuation.",
      question: "Which country saw Soufrière Hills volcano erupt in 1995, burying its capital in ash?",
    },
    {
      fact: "Its volcanic soil helps produce exceptionally lush tropical vegetation, earning it the nickname “the Emerald Isle of the Caribbean.”",
      question: "Which country is nicknamed the Emerald Isle of the Caribbean for its lush volcanic landscape?",
    },
  ],
  MAR: [
    {
      fact: "Chefchaouen is famous for buildings painted in shades of blue.",
      question: "Which country is home to a mountain town famous for buildings painted in shades of blue?",
    },
    {
      fact: "Fez contains one of the world’s oldest continually operating universities, founded in 859 at al-Qarawiyyin.",
      question: "Which country is home to al-Qarawiyyin, one of the world’s oldest operating universities?",
    },
  ],
  MOZ: [
    {
      fact: "The Bazaruto Archipelago protects dugongs—rare sea cows once mistaken for mermaids by sailors.",
      question: "Which country's Bazaruto Archipelago protects dugongs, rare sea cows once mistaken for mermaids?",
    },
    {
      fact: "Ilha de Moçambique, linked to the mainland by a narrow bridge, preserves centuries of Swahili, Portuguese, and Arab-influenced architecture.",
      question: "Which country contains a historic coral-stone island city once used as an Indian Ocean trading capital?",
    },
  ],
  MMR: [
    {
      fact: "Shwedagon Pagoda in Yangon is covered in gold leaf and topped with thousands of diamonds and rubies.",
      question: "Which country is home to the Shwedagon Pagoda, covered in gold leaf and topped with thousands of gems?",
    },
    {
      fact: "The ancient city of Bagan contains more than 2,000 surviving Buddhist temples and pagodas spread across a vast plain.",
      question: "Which country is home to a plain studded with thousands of ancient temples?",
    },
  ],
  NAM: [
    {
      fact: "A coastal desert here is considered the world's oldest—some dunes are millions of years old.",
      question: "Which country has a coastal desert considered the world's oldest, with dunes millions of years old?",
    },
    {
      fact: "Welwitschia, a strange desert plant with just two ever-growing leaves, can survive for more than a thousand years here.",
      question: "Which country is home to the ancient Welwitschia plant?",
    },
  ],
  NRU: [
    {
      fact: "Once among the richest countries per capita thanks to phosphate mining—but the deposits are nearly gone.",
      question: "Which country was once among the richest per capita thanks to phosphate mining, but deposits are nearly gone?",
    },
    {
      fact: "This island nation has no official capital; government offices are concentrated in the district of Yaren.",
      question: "Which country has no official capital city?",
    },
  ],
  NPL: [
    {
      fact: "Mount Everest's summit sits on the border with China—the world's highest point at 8,849 meters.",
      question: "Which country shares the world's highest mountain on its border?",
    },
    {
      fact: "The Kumari, a young girl chosen to embody a living goddess, is a celebrated tradition in the Kathmandu Valley.",
      question: "Which country maintains the tradition of the living goddess Kumari?",
    },
  ],
  NLD: [
    {
      fact: "About a quarter of the land lies below sea level, protected by an elaborate system of dikes and pumps.",
      question: "Which country has about a quarter of its land below sea level, protected by dikes and pumps?",
    },
    {
      fact: "Rotterdam's port is Europe's largest, handling enormous volumes of cargo where the Rhine meets the North Sea.",
      question: "Which country is home to Europe's largest port?",
    },
  ],
  NCL: [
    {
      fact: "The world's largest lagoon, surrounded by the world's second-longest barrier reef.",
      question: "Which country has the world's largest lagoon, surrounded by the second-longest barrier reef?",
    },
    {
      fact: "The kagu, a pale gray bird with striped wings and a distinctive crest, is found nowhere else on Earth.",
      question: "Which country is the only native home of the rare kagu bird?",
    },
  ],
  NZL: [
    {
      fact: "The first country to give women the right to vote, in 1893.",
      question: "Which country was the first to give women the right to vote, in 1893?",
    },
    {
      fact: "Glowworms illuminate the limestone caves of Waitomo, making their ceilings look like a star-filled night sky.",
      question: "Which country is famous for caves lit by glowworms?",
    },
  ],
  NIC: [
    {
      fact: "The two largest freshwater lakes in Central America lie here—Lake Nicaragua even has freshwater sharks.",
      question: "Which country has the two largest freshwater lakes in Central America, one with freshwater sharks?",
    },
    {
      fact: "Masaya Volcano has a crater so active that visitors can sometimes see a glowing lava lake from its rim.",
      question: "Which country is home to the active lava lake at Masaya Volcano?",
    },
  ],
  NER: [
    {
      fact: "The Sahara covers most of the land, with a great river arcing through the southwest corner.",
      question: "Which country is mostly Sahara desert, with a great river arcing through its southwest corner?",
    },
    {
      fact: "This landlocked country is one of the world's leading producers of uranium, a metal used for nuclear energy.",
      question: "Which country is a major global producer of uranium?",
    },
  ],
  NGA: [
    {
      fact: "Africa's largest population and Nollywood produces more films than Hollywood by volume.",
      question: "Which country has Africa's largest population and a film industry that produces more films than Hollywood?",
    },
    {
      fact: "The Osun-Osogbo Sacred Grove protects one of the last remaining sacred forests of the Yoruba people, filled with shrines and sculptures.",
      question: "Which country contains the Osun-Osogbo Sacred Grove?",
    },
  ],
  NIU: [
    {
      fact: "One of the world's largest raised coral atolls and uses New Zealand currency.",
      question: "Which country is one of the world's largest raised coral atolls and uses New Zealand currency?",
    },
    {
      fact: "With no rivers or lakes, this coral island depends almost entirely on rainwater stored in underground limestone reservoirs.",
      question: "Which country has no rivers or lakes and relies on rainwater stored underground?",
    },
  ],
  NFK: [
    {
      fact: "Settled by descendants of the Bounty mutineers after they left Pitcairn.",
      question: "Which country was settled by descendants of the Bounty mutineers after they left Pitcairn?",
    },
    {
      fact: "A tall, symmetrical pine native only here is now planted as an ornamental tree around the world.",
      question: "Which country is the native home of a tall ornamental pine planted worldwide?",
    },
  ],
  PRK: [
    {
      fact: "Still technically at war with its southern neighbor—the 1953 armistice never became a peace treaty.",
      question: "Which country is still technically at war with its southern neighbor since a 1953 armistice never became peace?",
    },
    {
      fact: "Mount Paektu, an active volcano with a crater lake at its summit, is the highest peak on its peninsula.",
      question: "Which country contains Mount Paektu, an active volcano with a crater lake at its summit?",
    },
  ],
  MKD: [
    {
      fact: "Lake Ohrid is one of Europe's oldest and deepest lakes, home to species found nowhere else.",
      question: "Which country contains one of Europe's oldest and deepest lakes, shared with a neighbor?",
    },
    {
      fact: "Mother Teresa was born in Skopje in 1910, long before she became known worldwide for her humanitarian work.",
      question: "Which country is the birthplace of Mother Teresa?",
    },
  ],
  MNP: [
    {
      fact: "The Mariana Trench nearby is the deepest point in the ocean—almost 11 km down.",
      question: "Which country is near the deepest point in the ocean, almost 11 km down?",
    },
    {
      fact: "Tinian's North Field was the World War II departure point for the two aircraft that dropped atomic bombs on Japan.",
      question: "Which country includes a World War II airfield from which the first atomic bombing mission departed?",
    },
  ],
  NOR: [
    {
      fact: "Fjords were carved by Ice Age glaciers and the coastline would stretch halfway around the equator if straightened.",
      question: "Which country has fjords carved by Ice Age glaciers and a coastline that would stretch halfway around the equator?",
    },
    {
      fact: "For centuries, fishing villages in Lofoten have dried cod on vast wooden racks to make stockfish without salt.",
      question: "Which country is known for Arctic fishing islands lined with traditional stockfish-drying racks?",
    },
  ],
  OMN: [
    {
      fact: "Sultan Qaboos transformed the nation from an isolated sultanate into a modern state over his 50-year reign.",
      question: "Which country was transformed from an isolated sultanate into a modern state over Sultan Qaboos's 50-year reign?",
    },
    {
      fact: "Frankincense trees grow in the Dhofar region, where their fragrant resin powered an ancient trade route across Arabia and the Mediterranean.",
      question: "Which country is famed for frankincense trees in a southern monsoon region?",
    },
  ],
  PAK: [
    {
      fact: "K2, the world's second-highest mountain—harder to climb than Everest and nicknamed the Savage Mountain.",
      question: "Which country is home to K2, the world's second-highest mountain nicknamed the Savage Mountain?",
    },
    {
      fact: "The ruins of Mohenjo-daro reveal a 4,500-year-old planned city of the Indus Valley civilization, complete with brick streets and drainage.",
      question: "Which country contains the ancient city of Mohenjo-daro?",
    },
  ],
  PLW: [
    {
      fact: "Jellyfish Lake lets swimmers snorkel among millions of harmless golden jellyfish.",
      question: "Which country has a Jellyfish Lake where swimmers snorkel among millions of harmless golden jellyfish?",
    },
    {
      fact: "In 2009, this island nation created the world's first national shark sanctuary, protecting its surrounding waters from commercial shark fishing.",
      question: "Which country created the world's first national shark sanctuary?",
    },
  ],
  PSE: [
    {
      fact: "Jericho is one of the oldest continuously inhabited cities in the world.",
      question: "Which country is home to one of the oldest continuously inhabited cities in the world, in a desert oasis below sea level?",
    },
    {
      fact: "Bethlehem's Church of the Nativity stands above the traditional site of Jesus's birth and has welcomed pilgrims for centuries.",
      question: "Which country contains the Church of the Nativity, built over the traditional birthplace of Jesus?",
    },
  ],
  PAN: [
    {
      fact: "The canal saves ships a 13,000-km journey around South America by cutting through the isthmus.",
      question: "Which country has a canal that saves ships a 13,000-km journey around South America?",
    },
    {
      fact: "On a clear day from the summit of Volcán Barú, it is possible to see both the Caribbean Sea and the Pacific Ocean.",
      question: "Which country has a volcano from whose summit both the Caribbean and Pacific can sometimes be seen?",
    },
  ],
  PNG: [
    {
      fact: "More than 800 living languages are spoken—more than any other country.",
      question: "Which country has more than 800 living languages—more than any other nation?",
    },
    {
      fact: "At Kuk Swamp, archaeologists found evidence of farming and drainage systems dating back at least 7,000 years.",
      question: "Which country contains the ancient agricultural site of Kuk Swamp?",
    },
  ],
  PRY: [
    {
      fact: "Guaraní is one of the few indigenous American languages with official status alongside Spanish.",
      question: "Which country gives Guaraní official status alongside Spanish?",
    },
    {
      fact: "Its flag is one of the few national flags with different designs on its front and back.",
      question: "Which country has a national flag with different emblems on each side?",
    },
  ],
  PER: [
    {
      fact: "Machu Picchu is a 15th-century Inca citadel perched 2,430 meters above sea level in the Andes.",
      question: "Which country is home to Machu Picchu, a 15th-century Inca citadel perched in the Andes?",
    },
    {
      fact: "The Nazca Lines are enormous figures etched into desert ground, including a hummingbird, monkey, and spider best seen from above.",
      question: "Which country is home to the mysterious Nazca Lines?",
    },
  ],
  PHL: [
    {
      fact: "About 7,641 islands make up the archipelago, and it is the world's top exporter of nurses.",
      question: "Which country has about 7,641 islands and is the world's top exporter of nurses?",
    },
    {
      fact: "The Banaue Rice Terraces were carved into mountain slopes by hand more than 2,000 years ago and are still farmed today.",
      question: "Which country is home to ancient rice terraces carved into steep mountain slopes?",
    },
  ],
  PCN: [
    {
      fact: "Settled by mutineers from HMS Bounty—today fewer than 50 people live there.",
      question: "Which country was settled by mutineers from HMS Bounty, with fewer than 50 people living there today?",
    },
    {
      fact: "With no airstrip, this remote island group is reached by ship, and its tiny main settlement is called Adamstown.",
      question: "Which country has only one inhabited settlement?",
    },
  ],
  POL: [
    {
      fact: "Wieliczka Salt Mine has chapels, sculptures, and chandeliers carved entirely from salt.",
      question: "Which country is home to a salt mine with chapels and chandeliers carved from salt?",
    },
    {
      fact: "Białowieża Forest shelters European bison, the continent's heaviest land animal, in one of Europe's last primeval forests.",
      question: "Which country shares Białowieża Forest, home to European bison?",
    },
  ],
  PRT: [
    {
      fact: "Explorers from here opened sea routes to India, Brazil, and Japan—shaping the first global age of trade.",
      question: "Which country's explorers opened sea routes to India, Brazil, and Japan, shaping the first global age of trade?",
    },
    {
      fact: "This country produces about half of the world's cork, harvested from oak trees without cutting them down.",
      question: "Which country produces roughly half of the world's cork?",
    },
  ],
  PRI: [
    {
      fact: "Bioluminescent bays glow blue at night when microscopic organisms are disturbed in the water.",
      question: "Which country has bioluminescent bays that glow blue at night when organisms are disturbed in the water?",
    },
    {
      fact: "El Yunque is the only tropical rainforest in the U.S. National Forest System, with waterfalls, tree frogs, and lush mountain trails.",
      question: "Which country contains El Yunque, the only tropical rainforest in the U.S. National Forest System?",
    },
  ],
  QAT: [
    {
      fact: "Hosted a FIFA World Cup where every stadium was within about an hour's drive of each other.",
      question: "Which country hosted a FIFA World Cup where every stadium was within about an hour's drive of each other?",
    },
    {
      fact: "Khor Al Adaid, known as the Inland Sea, is a rare desert inlet where tidal water reaches deep into the dunes.",
      question: "Which country contains the desert inlet known as the Inland Sea?",
    },
  ],
  REU: [
    {
      fact: "Piton de la Fournaise is one of the world's most active volcanoes, erupting dozens of times since 2000.",
      question: "Which country is home to Piton de la Fournaise, one of the world's most active volcanoes?",
    },
    {
      fact: "The cirque of Mafate contains mountain villages with no road access; many supplies arrive by foot or helicopter.",
      question: "Which country includes roadless mountain villages reachable only on foot or by helicopter?",
    },
  ],
  ROU: [
    {
      fact: "Transylvania inspired Bram Stoker's Dracula—though Vlad the Impaler never lived in Bran Castle.",
      question: "Which country's Transylvania region inspired Bram Stoker's Dracula?",
    },
    {
      fact: "The Merry Cemetery in Săpânța uses brightly painted wooden crosses and humorous epitaphs to tell the stories of the dead.",
      question: "Which country is home to a colorful cemetery where carved wooden crosses tell the life stories of the dead?",
    },
  ],
  RUS: [
    {
      fact: "Spans 11 time zones and crosses both Europe and Asia—it is the largest country on Earth by area.",
      question: "Which country spans 11 time zones and is the largest on Earth by area?",
    },
    {
      fact: "Lake Baikal is the world's deepest lake and holds about one-fifth of Earth's unfrozen surface fresh water.",
      question: "Which country contains Lake Baikal, the world's deepest lake?",
    },
  ],
  RWA: [
    {
      fact: "Plastic bags were banned nationwide in 2008 and a monthly community cleanup called Umuganda is held.",
      question: "Which country banned plastic bags nationwide in 2008 and holds a monthly cleanup called Umuganda?",
    },
    {
      fact: "Imigongo is a traditional art form that creates striking geometric designs using painted cow dung on wooden panels.",
      question: "Which country is known for the geometric folk art called imigongo?",
    },
  ],
  BLM: [
    {
      fact: "A glamorous Caribbean island popular with yachts and celebrities.",
      question: "Which country is a glamorous Caribbean island popular with yachts and celebrities?",
    },
    {
      fact: "Its harbor town, Gustavia, is named after a Swedish king, recalling the island's period under Swedish rule in the 1800s.",
      question: "Which country has a harbor town named for a Swedish king?",
    },
  ],
  SHN: [
    {
      fact: "Napoleon was exiled here after Waterloo—it took ships weeks to reach from Europe.",
      question: "Which country was where Napoleon was exiled after Waterloo?",
    },
    {
      fact: "Tristan da Cunha, part of this territory, is often called the world's most remote inhabited archipelago.",
      question: "Which country includes one of the world's most remote inhabited islands, reachable only by a long sea voyage?",
    },
  ],
  KNA: [
    {
      fact: "The smallest sovereign country in the Western Hemisphere by both area and population.",
      question: "Which country is the smallest sovereign nation in the Western Hemisphere by area and population?",
    },
    {
      fact: "Brimstone Hill Fortress is a massive 17th-century stronghold nicknamed the Gibraltar of the West Indies.",
      question: "Which country is home to Brimstone Hill Fortress?",
    },
  ],
  LCA: [
    {
      fact: "Twin Pitons—volcanic spires rising from the sea—are a UNESCO World Heritage Site.",
      question: "Which country has twin Pitons—volcanic spires rising from the sea—as a UNESCO World Heritage Site?",
    },
    {
      fact: "Sulphur Springs lets visitors see steaming vents, bubbling mud pools, and a volcanic crater reached by road.",
      question: "Which country has the drive-in volcanic area called Sulphur Springs?",
    },
  ],
  MAF: [
    {
      fact: "Split between France and the Netherlands—the smallest landmass shared by two nations.",
      question: "Which country is split between France and the Netherlands—the smallest landmass shared by two nations?",
    },
    {
      fact: "Marigot, its main town, grew around a French fort built to watch over the island's sheltered bay.",
      question: "Which country has its main town on a Caribbean lagoon, on an island split with another nation?",
    },
  ],
  SPM: [
    {
      fact: "French islands off Canada's coast—residents use the euro just 25 km from Newfoundland.",
      question: "Which country has French islands off Canada's coast where residents use the euro 25 km from Newfoundland?",
    },
    {
      fact: "During Prohibition in the United States, these islands became a major base for smuggling liquor across nearby waters.",
      question: "Which country became a liquor-smuggling hub during U.S. Prohibition?",
    },
  ],
  VCT: [
    {
      fact: "La Soufrière volcano erupted in 2021, covering much of the island in ash.",
      question: "Which country saw La Soufrière volcano erupt in 2021, covering much of the island in ash?",
    },
    {
      fact: "Its botanical garden, founded in 1765, is considered one of the oldest in the Western Hemisphere.",
      question: "Which country is home to one of the Western Hemisphere's oldest botanical gardens?",
    },
  ],
  WSM: [
    {
      fact: "Skipped December 30, 2011 entirely when it moved across the International Date Line to align with trading partners.",
      question: "Which country skipped December 30, 2011 entirely when it moved across the International Date Line?",
    },
    {
      fact: "Author Robert Louis Stevenson spent his final years here and is buried on Mount Vaea overlooking the coast.",
      question: "Which country is home to Robert Louis Stevenson's grave on Mount Vaea?",
    },
  ],
  SMR: [
    {
      fact: "Claims to be the world's oldest republic, founded in 301 AD on Mount Titano.",
      question: "Which country claims to be the world's oldest republic, founded in 301 AD on Mount Titano?",
    },
    {
      fact: "Although it is not part of the European Union, this tiny state legally mints its own designs on euro coins.",
      question: "Which country mints its own euro coins despite not belonging to the European Union?",
    },
  ],
  STP: [
    {
      fact: "Cocoa plantations once made this a major chocolate supplier to Europe.",
      question: "Which country's cocoa plantations once made it a major chocolate supplier to Europe?",
    },
    {
      fact: "The equator passes through tiny Rolas Islet, where visitors can stand with one foot in each hemisphere.",
      question: "Which country includes Rolas Islet, crossed by the equator?",
    },
  ],
  SAU: [
    {
      fact: "No permanent rivers—the land is mostly desert, including the vast Empty Quarter.",
      question: "Which country has no permanent rivers and is mostly desert, including the vast Empty Quarter?",
    },
    {
      fact: "Hegra preserves more than 100 monumental tombs carved into sandstone cliffs by the Nabataeans nearly 2,000 years ago.",
      question: "Which country contains the Nabataean rock-cut tombs of Hegra?",
    },
  ],
  SEN: [
    {
      fact: "Lake Retba is bright pink from salt-loving algae and is harvested for salt like the Dead Sea.",
      question: "Which country has Lake Retba, bright pink from salt-loving algae and harvested for salt?",
    },
    {
      fact: "Dakar's African Renaissance Monument rises 49 meters above a hill and is one of Africa's tallest statues.",
      question: "Which country is home to a colossal bronze statue of a family looking out over the Atlantic?",
    },
  ],
  SRB: [
    {
      fact: "Sits at a crossroads of empires—Belgrade is one of Europe's oldest continuously inhabited cities.",
      question: "Which country sits at a crossroads of empires, with a capital among Europe's oldest continuously inhabited cities?",
    },
    {
      fact: "Đavolja Varoš, or Devil's Town, is a hillside filled with more than 200 natural stone pillars capped by dark rocks.",
      question: "Which country contains the unusual stone pillars of Devil's Town?",
    },
  ],
  SYC: [
    {
      fact: "Vallée de Mai preserves the coco de mer, a palm that produces the world's heaviest seed.",
      question: "Which country preserves the coco de mer in Vallée de Mai—a palm with the world's heaviest seed?",
    },
    {
      fact: "Aldabra Atoll supports the world's largest population of giant tortoises, with more than 100,000 animals.",
      question: "Which country includes Aldabra Atoll, home to huge numbers of giant tortoises?",
    },
  ],
  SLE: [
    {
      fact: "The name means 'lion mountains' in Portuguese, though lions no longer live there.",
      question: "Which country's name means 'lion mountains' in Portuguese, though lions no longer live there?",
    },
    {
      fact: "Freetown Harbour is one of the world's largest natural harbors, broad enough to shelter a vast number of ships.",
      question: "Which country is home to one of the world's largest natural harbors on the West African coast?",
    },
  ],
  SGP: [
    {
      fact: "Transformed from a fishing village to a global financial hub in a single generation.",
      question: "Which country transformed from a fishing village to a global financial hub in a single generation?",
    },
    {
      fact: "Singapore's Changi Airport has an indoor waterfall—the 40-meter Rain Vortex, the world's tallest indoor waterfall.",
      question: "Which country is home to an airport with the world's tallest indoor waterfall?",
    },
  ],
  SXM: [
    {
      fact: "Maho Beach is famous for airliners passing just meters overhead on approach to the runway.",
      question: "Which country has a beach where airliners pass just meters overhead on approach to the runway?",
    },
    {
      fact: "This island's Dutch side hosts the world's smallest landmass divided between two countries, shared with France.",
      question: "Which country occupies one side of the world's smallest divided island?",
    },
  ],
  SVK: [
    {
      fact: "More castles and châteaux per capita than almost anywhere else in Europe.",
      question: "Which country has more castles and châteaux per capita than almost anywhere else in Europe?",
    },
    {
      fact: "Bratislava is so close to Austria that the two capitals are only about 60 kilometers apart—the nearest pair of national capitals in Europe.",
      question: "Which country has a capital that is Europe's nearest to another national capital?",
    },
  ],
  SVN: [
    {
      fact: "Postojna Cave holds a unique species of blind salamander called the olm—or 'human fish.'",
      question: "Which country is home to a vast cave system and a blind salamander called the 'human fish'?",
    },
    {
      fact: "Lake Bled has a tiny island with a church whose bell is said to grant wishes when rung three times.",
      question: "Which country is known for an alpine lake with a wish-granting church bell on an island?",
    },
  ],
  SLB: [
    {
      fact: "Residents fought alongside U.S. Marines in World War II's brutal Guadalcanal campaign.",
      question: "Which country's residents fought alongside U.S. Marines in World War II's Guadalcanal campaign?",
    },
    {
      fact: "The waters around these islands contain 'Iron Bottom Sound,' named for the many World War II ships and aircraft resting on its seabed.",
      question: "Which country has waters nicknamed Iron Bottom Sound?",
    },
  ],
  SOM: [
    {
      fact: "The longest coastline on mainland Africa, though piracy has troubled its shores.",
      question: "Which country has the longest coastline on mainland Africa?",
    },
    {
      fact: "A critically endangered wild ass, an ancestor of the domestic donkey, is native to this Horn of Africa region.",
      question: "Which country is home to a critically endangered wild ass native to the Horn of Africa?",
    },
  ],
  ZAF: [
    {
      fact: "Three capital cities—each hosts a different branch of government.",
      question: "Which country has three capital cities, each hosting a different branch of government?",
    },
    {
      fact: "Table Mountain, above Cape Town, is older than the Himalayas and can be covered by a cloud layer locals call the 'tablecloth.'",
      question: "Which country is home to Table Mountain and its famous 'tablecloth' clouds?",
    },
  ],
  SGS: [
    {
      fact: "Grytviken whaling station is where explorer Ernest Shackleton is buried.",
      question: "Which country is where explorer Ernest Shackleton is buried at a former whaling station?",
    },
    {
      fact: "South Georgia supports one of the world's largest king penguin colonies, with hundreds of thousands of breeding pairs at St. Andrews Bay.",
      question: "Which country is home to the enormous king penguin colony at St. Andrews Bay?",
    },
  ],
  KOR: [
    {
      fact: "Hangul alphabet was scientifically designed in 1443 so anyone could learn to read.",
      question: "Which country scientifically designed the Hangul alphabet in 1443 so anyone could learn to read?",
    },
    {
      fact: "Jeju Island's women divers, known as haenyeo, traditionally harvest seafood by free-diving without oxygen tanks.",
      question: "Which country is known for free-diving women who harvest the sea without scuba gear?",
    },
  ],
  SSD: [
    {
      fact: "The world's newest widely recognized country, gaining independence in 2011.",
      question: "Which country is the world's newest widely recognized nation, gaining independence in 2011?",
    },
    {
      fact: "The vast Sudd wetland can expand to an area larger than Switzerland during the rainy season.",
      question: "Which country contains the vast seasonal Sudd wetland?",
    },
  ],
  ESP: [
    {
      fact: "Sagrada Família in Barcelona has been under construction since 1882 and is still not finished.",
      question: "Which country is home to the Sagrada Família, under construction since 1882?",
    },
    {
      fact: "Spain's tomato-throwing festival, La Tomatina, turns the streets of Buñol red with thousands of participants each year.",
      question: "Which country hosts the La Tomatina tomato-throwing festival?",
    },
  ],
  LKA: [
    {
      fact: "Once known by a colonial-era name and produces distinctive highland tea from its plantations.",
      question: "Which country produces distinctive highland tea from plantations and was once known by a colonial-era name?",
    },
    {
      fact: "Sigiriya rises from the central plains as a huge rock fortress, reached by climbing past giant lion paws carved into stone.",
      question: "Which country is home to the rock fortress of Sigiriya?",
    },
  ],
  SDN: [
    {
      fact: "More pyramids than Egypt—ancient Nubian kingdoms left hundreds along the Nile.",
      question: "Which country has more pyramids than Egypt, left by ancient Nubian kingdoms along the Nile?",
    },
    {
      fact: "The Nile's Blue and White branches meet at Khartoum before continuing north as the Nile.",
      question: "Which country contains the confluence of the Blue and White Nile?",
    },
  ],
  SUR: [
    {
      fact: "The smallest independent country in South America and one of the most forested.",
      question: "Which country is the smallest independent nation in South America and one of the most forested?",
    },
    {
      fact: "Its capital, Paramaribo, has a UNESCO-listed historic center of distinctive wooden colonial buildings.",
      question: "Which country has a UNESCO-listed wooden historic center along a river?",
    },
  ],
  SJM: [
    {
      fact: "The Global Seed Vault stores backup copies of crop seeds from around the world in Arctic permafrost.",
      question: "Which country stores backup copies of crop seeds from around the world in an Arctic Global Seed Vault?",
    },
    {
      fact: "On Svalbard, polar bears outnumber people, and visitors outside settlements are required to carry protection against them.",
      question: "Which country or territory requires visitors outside settlements to prepare for polar bears?",
    },
  ],
  SWE: [
    {
      fact: "Nobel Prizes are awarded each year in Stockholm—except Peace, which is given in Oslo.",
      question: "Which country awards Nobel Prizes each year in its capital—except Peace, given in a neighboring country?",
    },
    {
      fact: "The Icehotel in Jukkasjärvi is rebuilt each winter from blocks of ice and snow taken from the nearby Torne River.",
      question: "Which country rebuilds a famous hotel from river ice every winter?",
    },
  ],
  CHE: [
    {
      fact: "Four official languages and no foreign war fought since 1815.",
      question: "Which country has four official languages and has not fought a foreign war since 1815?",
    },
    {
      fact: "The Matterhorn's near-perfect pyramid shape has made it one of the world's most recognizable mountains—and inspired the Toblerone chocolate bar.",
      question: "Which country shares the Matterhorn, the mountain that inspired Toblerone?",
    },
  ],
  SYR: [
    {
      fact: "Damascus is one of the oldest continuously inhabited cities in the world.",
      question: "Which country is home to one of the oldest continuously inhabited cities in the world, long a crossroads of the Levant?",
    },
    {
      fact: "Aleppo soap, traditionally made from olive oil and laurel oil, is considered one of the world's oldest hard soaps.",
      question: "Which country is associated with an ancient olive-and-laurel soap still made by traditional methods?",
    },
  ],
  TWN: [
    {
      fact: "Taipei 101 was the world's tallest building from 2004 to 2010 and is designed to withstand typhoons and earthquakes.",
      question: "Which country is home to a 101-story skyscraper that was the world's tallest building from 2004 to 2010?",
    },
    {
      fact: "Taiwan's night markets are famous for snacks such as bubble tea, which was invented there in the 1980s.",
      question: "Which country is credited with inventing bubble tea?",
    },
  ],
  TJK: [
    {
      fact: "Over 90% mountainous—the Pamir range is nicknamed the 'Roof of the World.'",
      question: "Which country is over 90% mountainous, with the Pamir range nicknamed the 'Roof of the World'?",
    },
    {
      fact: "The Pamir Highway crosses some of the world's highest roads, passing mountain plateaus more than 4,000 meters above sea level.",
      question: "Which country is crossed by the high-altitude Pamir Highway?",
    },
  ],
  TZA: [
    {
      fact: "The Serengeti hosts the largest terrestrial mammal migration on Earth—over a million wildebeest.",
      question: "Which country is home to the Serengeti, hosting the largest terrestrial mammal migration on Earth?",
    },
    {
      fact: "Mount Kilimanjaro is the world's tallest free-standing mountain, rising nearly 5,900 meters above the surrounding plains.",
      question: "Which country is home to the world's tallest free-standing mountain?",
    },
  ],
  THA: [
    {
      fact: "The only Southeast Asian country never colonized by a European power.",
      question: "Which country is the only Southeast Asian nation never colonized by a European power?",
    },
    {
      fact: "Bangkok's ceremonial name is one of the longest place names in the world, with a full version containing more than 160 characters.",
      question: "Which country has a capital with one of the world's longest ceremonial names?",
    },
  ],
  TLS: [
    {
      fact: "One of the world's youngest countries, gaining full independence in 2002 after centuries of occupation.",
      question: "Which country is one of the world's youngest, gaining full independence in 2002?",
    },
    {
      fact: "The traditional woven cloth called tais is made in vivid regional patterns and remains central to ceremonies and daily life.",
      question: "Which country is known for its traditional handwoven tais textiles?",
    },
  ],
  TGO: [
    {
      fact: "One of the world's top producers of phosphates, used in fertilizer.",
      question: "Which country is one of the world's top producers of phosphates used in fertilizer?",
    },
    {
      fact: "Koutammakou is a cultural landscape of distinctive mud tower-houses built by the Batammariba people.",
      question: "Which country contains Koutammakou's distinctive mud tower-houses?",
    },
  ],
  TKL: [
    {
      fact: "One of the first territories to produce more than 100% of its electricity from solar power.",
      question: "Which country was among the first to produce more than 100% of its electricity from solar power?",
    },
    {
      fact: "Tokelau has no airport; the main way to reach its three atolls is a boat journey from Samoa.",
      question: "Which country or territory has no airport and is reached by boat to its three atolls?",
    },
  ],
  TON: [
    {
      fact: "The only Pacific nation that was never fully colonized—it became a constitutional monarchy in 1875.",
      question: "Which country is the only Pacific nation never fully colonized, becoming a constitutional monarchy in 1875?",
    },
    {
      fact: "The Hunga Tonga–Hunga Ha'apai eruption in 2022 produced an atmospheric shock wave detected around the world.",
      question: "Which country experienced the 2022 eruption whose shock wave traveled around the world?",
    },
  ],
  TTO: [
    {
      fact: "The steelpan was invented here—the only acoustic instrument invented in the 20th century.",
      question: "Which country invented the steelpan, the only acoustic instrument created in the 20th century?",
    },
    {
      fact: "Carnival here features elaborate costumes, calypso music, and competitive soca performances before Lent.",
      question: "Which country is famous for Carnival traditions of calypso, soca, and elaborate costumes?",
    },
  ],
  TUN: [
    {
      fact: "Ancient Carthage once rivaled Rome before being destroyed and rebuilt by the Romans.",
      question: "Which country was home to ancient Carthage, which once rivaled Rome?",
    },
    {
      fact: "The island of Djerba has one of Africa's oldest Jewish communities, centered on the ancient El Ghriba synagogue.",
      question: "Which country is home to an ancient synagogue on a Mediterranean island?",
    },
  ],
  TUR: [
    {
      fact: "Istanbul is the only major city spanning two continents—Europe and Asia.",
      question: "Which country is home to the only major city that spans two continents?",
    },
    {
      fact: "Cappadocia's soft volcanic rock was carved into cave homes, underground cities, and rock-cut churches.",
      question: "Which country is known for Cappadocia's cave homes and underground cities?",
    },
  ],
  TKM: [
    {
      fact: "The Darvaza gas crater has burned continuously in the desert since Soviet engineers lit it in 1971.",
      question: "Which country has the Darvaza gas crater, burning continuously in the desert since 1971?",
    },
    {
      fact: "Ashgabat holds world records for its extensive use of white marble, giving much of the city a strikingly pale skyline.",
      question: "Which country has a capital famous for its vast white-marble architecture?",
    },
  ],
  TCA: [
    {
      fact: "Some of the clearest turquoise water in the Caribbean and a thriving conch fishery.",
      question: "Which country has some of the clearest turquoise water in the Caribbean and a thriving conch fishery?",
    },
    {
      fact: "Grand Turk Island is known for a dramatic underwater wall where shallow reefs drop steeply into deep ocean.",
      question: "Which country or territory is known for a dramatic underwater reef wall dropping into deep ocean?",
    },
  ],
  TUV: [
    {
      fact: "Among the world's smallest and most low-lying nations—rising seas threaten its very existence.",
      question: "Which country is among the world's smallest and most low-lying, with rising seas threatening its existence?",
    },
    {
      fact: "Its internet domain, .tv, became valuable worldwide because it is popular with television and streaming companies.",
      question: "Which country owns the valuable .tv internet domain?",
    },
  ],
  UGA: [
    {
      fact: "One of the few places where mountain gorillas live in the wild—about half the world's population is here.",
      question: "Which country is home to about half the world's wild mountain gorilla population?",
    },
    {
      fact: "The source of the White Nile is traditionally marked at Jinja, where water flows out of Lake Victoria.",
      question: "Which country is traditionally associated with the source of the White Nile?",
    },
  ],
  UKR: [
    {
      fact: "One of the world's largest grain exporters—the 'breadbasket of Europe.'",
      question: "Which country is one of the world's largest grain exporters, called the 'breadbasket of Europe'?",
    },
    {
      fact: "The world's deepest metro station, Arsenalna, lies about 105 meters underground in Kyiv.",
      question: "Which country has the world's deepest metro station?",
    },
  ],
  ARE: [
    {
      fact: "The Burj Khalifa, the world's tallest building at 828 meters, rises in Dubai.",
      question: "Which country is home to the Burj Khalifa, the world's tallest building at 828 meters?",
    },
    {
      fact: "Palm Jumeirah is an artificial, palm-tree-shaped island built from sand and rock off Dubai's coast.",
      question: "Which country built the palm-tree-shaped artificial island Palm Jumeirah?",
    },
  ],
  GBR: [
    {
      fact: "Made up of four countries—England, Scotland, Wales, and Northern Ireland.",
      question: "Which country is a union of four historic nations off the northwest coast of Europe?",
    },
    {
      fact: "Stonehenge's largest stones were transported from more than 20 kilometers away, while smaller bluestones came from western Wales.",
      question: "Which country is home to the prehistoric stone circle of Stonehenge?",
    },
  ],
  USA: [
    {
      fact: "The world's largest economy and the third most populous country.",
      question: "Which country has the world's largest economy and is the third most populous?",
    },
    {
      fact: "Yellowstone became the world's first national park in 1872 and sits above a giant volcanic caldera.",
      question: "Which country established the world's first national park?",
    },
  ],
  UMI: [
    {
      fact: "Includes Midway Atoll, site of a pivotal 1942 naval battle in World War II.",
      question: "Which country includes a Pacific atoll that was the site of a pivotal 1942 naval battle?",
    },
    {
      fact: "Johnston Atoll is so remote that it has no permanent residents and is mainly a protected wildlife refuge.",
      question: "Which country or territory includes a remote, uninhabited Pacific atoll once used as a military outpost?",
    },
  ],
  VIR: [
    {
      fact: "Purchased from Denmark in 1917 for $25 million in gold.",
      question: "Which country was purchased from Denmark in 1917 for $25 million in gold?",
    },
    {
      fact: "Saint Thomas's harbor is watched over by the 99 Steps, a steep staircase built from Danish ship ballast bricks.",
      question: "Which country or territory is home to a historic hillside staircase of 99 steps?",
    },
  ],
  URY: [
    {
      fact: "The first country to legalize recreational cannabis nationwide, in 2013.",
      question: "Which country was the first to legalize recreational cannabis nationwide, in 2013?",
    },
    {
      fact: "Montevideo's carnival season can last more than a month, making it one of the longest carnival celebrations in the world.",
      question: "Which country has one of the world's longest carnival seasons?",
    },
  ],
  UZB: [
    {
      fact: "The Registan in Samarkand was a glittering center of the Silk Road trade route.",
      question: "Which country is home to a tiled public square that was a center of the Silk Road trade route?",
    },
    {
      fact: "The walled city of Khiva looks like an open-air museum, with minarets, palaces, and madrasas preserved along the old Silk Road.",
      question: "Which country is home to a walled Silk Road city of mud-brick palaces and minarets?",
    },
  ],
  VUT: [
    {
      fact: "Bungee jumping was inspired by local land divers on Pentecost Island.",
      question: "Which country's land divers on a Pacific island inspired the invention of bungee jumping?",
    },
    {
      fact: "The people of Tanna Island maintain a living tradition of sending messages between villages using elaborate drum rhythms.",
      question: "Which country includes an island known for traditional drum-message systems?",
    },
  ],
  VAT: [
    {
      fact: "The world's smallest independent state—about 44 hectares enclosed within Rome.",
      question: "Which country is the world's smallest independent state, about 44 hectares enclosed within a larger capital?",
    },
    {
      fact: "Michelangelo painted the Sistine Chapel ceiling while standing on scaffolding for four years, completing it in 1512.",
      question: "Which country contains the Sistine Chapel ceiling painted by Michelangelo?",
    },
  ],
  VEN: [
    {
      fact: "Angel Falls is the world's highest uninterrupted waterfall, plunging 979 meters.",
      question: "Which country is home to Angel Falls, the world's highest uninterrupted waterfall?",
    },
    {
      fact: "The Catatumbo region produces lightning on so many nights that it is sometimes called the world's lightning capital.",
      question: "Which country is home to the frequently flashing Catatumbo lightning?",
    },
  ],
  VNM: [
    {
      fact: "Ha Long Bay has thousands of limestone karsts rising from emerald water—a UNESCO World Heritage Site.",
      question: "Which country is home to a bay with thousands of limestone karsts rising from emerald water?",
    },
    {
      fact: "Sơn Đoòng, the world's largest known cave passage by volume, is large enough to contain a forest and its own weather system.",
      question: "Which country is home to Sơn Đoòng, the world's largest known cave passage?",
    },
  ],
  WLF: [
    {
      fact: "One of the last French territories where traditional kings still hold official authority.",
      question: "Which country is one of the last French territories where traditional kings still hold official authority?",
    },
    {
      fact: "Wallis and Futuna preserves Polynesian kingdoms whose customary chiefs still play important roles in local life.",
      question: "Which country or territory preserves Polynesian kingdoms with customary chiefs?",
    },
  ],
  ESH: [
    {
      fact: "One of the most sparsely populated places on Earth—mostly desert with a disputed political status.",
      question: "Which country is one of the most sparsely populated places on Earth, mostly desert with disputed status?",
    },
    {
      fact: "Vast gravel plains called hamadas stretch for long distances here, with bare rock and almost no sand dunes.",
      question: "Which country or territory is covered largely by bare-rock desert plains called hamadas?",
    },
  ],
  YEM: [
    {
      fact: "Old City of Sana'a has distinctive multi-story tower houses decorated with white gypsum patterns.",
      question: "Which country is home to an old city of multi-story tower houses decorated with white gypsum?",
    },
    {
      fact: "Socotra's dragon blood trees have umbrella-shaped crowns and red sap, creating one of Earth's most otherworldly landscapes.",
      question: "Which country includes Socotra, home to dragon blood trees?",
    },
  ],
  ZMB: [
    {
      fact: "Victoria Falls—locally called Mosi-oa-Tunya, 'the smoke that thunders'—is one of the world's largest waterfalls.",
      question: "Which country is home to Victoria Falls, locally called Mosi-oa-Tunya, 'the smoke that thunders'?",
    },
    {
      fact: "The Zambezi River's annual flood transforms Liuwa Plain National Park into a stage for Africa's second-largest wildebeest migration.",
      question: "Which country hosts the wildebeest migration across Liuwa Plain?",
    },
  ],
  ZWE: [
    {
      fact: "Medieval stone ruins here were the capital of a trading empire that exported gold to the Indian Ocean.",
      question: "Which country is home to medieval stone ruins that were the capital of a trading empire exporting gold?",
    },
    {
      fact: "Balancing Rocks near Harare are natural granite formations that became such a national symbol that they appear on banknotes.",
      question: "Which country features its Balancing Rocks on banknotes?",
    },
  ],
};

export const STATE_FACTS: Record<string, PlaceFactPair> = {
  "US-AL": [
    {
      fact: "The Saturn V rockets that carried Apollo astronauts to the Moon were designed and built in Huntsville.",
      question: "Which state designed and built the Saturn V rockets that carried Apollo astronauts to the Moon?",
    },
    {
      fact: "The first 911 emergency call in the United States was made in Haleyville in 1968.",
      question: "Which state was first to place a 911 emergency call?",
    },
  ],
  "US-AK": [
    {
      fact: "The northernmost, westernmost, and easternmost U.S. state—the Aleutian Islands cross the 180th meridian into the Eastern Hemisphere.",
      question: "Which state is the northernmost, westernmost, and easternmost in the U.S., with Aleutian Islands crossing the 180th meridian?",
    },
    {
      fact: "A 13-year-old orphan named Benny Benson designed the blue flag with eight gold stars in 1927.",
      question: "Which state chose a flag design created by a 13-year-old?",
    },
  ],
  "US-AZ": [
    {
      fact: "The Grand Canyon exposes nearly two billion years of geology in its colorful layered walls.",
      question: "Which state is home to the Grand Canyon, exposing nearly two billion years of geology?",
    },
    {
      fact: "London Bridge was dismantled in England, shipped across the Atlantic, and rebuilt in Lake Havasu City in 1971.",
      question: "Which state has a historic London bridge reconstructed beside a desert lake?",
    },
  ],
  "US-AR": [
    {
      fact: "Hot Springs National Park predates Yellowstone and was the first U.S. federal reserve.",
      question: "Which state has the first U.S. federal reserve, a thermal-spring park that predates Yellowstone?",
    },
    {
      fact: "Crater of Diamonds State Park is the only diamond-producing site in the world where visitors can search for gems and keep what they find.",
      question: "Which state lets visitors keep diamonds they discover in a public park?",
    },
  ],
  "US-CA": [
    {
      fact: "The economy here is larger than that of most countries—if it were independent, it would rank among the world's biggest.",
      question: "Which state's economy is larger than that of most countries and would rank among the world's biggest if independent?",
    },
    {
      fact: "The White Mountains shelter bristlecone pines, including some of the oldest known living nonclonal trees on Earth.",
      question: "Which state is home to ancient bristlecone pines thousands of years old?",
    },
  ],
  "US-CO": [
    {
      fact: "Denver sits exactly one mile above sea level, giving the capital its 'Mile High City' nickname.",
      question: "Which state's capital sits exactly one mile above sea level, earning the 'Mile High City' nickname?",
    },
    {
      fact: "At Four Corners, one marker is the only place in the United States where four states meet at a single point.",
      question: "Which state touches three others at the nation's unique four-state corner?",
    },
  ],
  "US-CT": [
    {
      fact: "The Fundamental Orders, adopted in 1639, are often called the first written constitution in the Americas.",
      question: "Which state's Fundamental Orders of 1639 are often called the first written constitution in the Americas?",
    },
    {
      fact: "The USS Nautilus, the world's first nuclear-powered submarine, was launched in Groton in 1954.",
      question: "Which state launched the world's first nuclear-powered submarine?",
    },
  ],
  "US-DE": [
    {
      fact: "The first to ratify the U.S. Constitution on December 7, 1787.",
      question: "Which state was the first to ratify the U.S. Constitution on December 7, 1787?",
    },
    {
      fact: "More businesses are incorporated here than there are residents, drawn by the state's influential corporate-law system.",
      question: "Which state has more incorporated businesses than residents?",
    },
  ],
  "US-FL": [
    {
      fact: "More coastline than any U.S. state except Alaska and the only one bordering both the Atlantic and Gulf.",
      question: "Which state has more coastline than any except Alaska and borders both the Atlantic and Gulf?",
    },
    {
      fact: "It is the only place in the United States where American alligators and American crocodiles live side by side in the wild.",
      question: "Which state is home to both wild alligators and wild crocodiles?",
    },
  ],
  "US-GA": [
    {
      fact: "Coca-Cola was invented by a pharmacist in Atlanta in 1886 and first sold at a local drugstore.",
      question: "Which state is where Coca-Cola was invented by a pharmacist in 1886?",
    },
    {
      fact: "The Vidalia onion, famous for its sweetness, can be grown commercially only in a legally defined region of this state.",
      question: "Which state is the only place where a famous sweet onion variety can be grown?",
    },
  ],
  "US-HI": [
    {
      fact: "The only U.S. state that grows coffee commercially and sits 2,400 miles from the mainland.",
      question: "Which state is the only one that grows coffee commercially and sits 2,400 miles from the mainland?",
    },
    {
      fact: "Mauna Kea rises more than 33,000 feet from its base on the Pacific Ocean floor, making it taller than Everest when measured that way.",
      question: "Which state has a mountain taller than Everest when measured from its underwater base?",
    },
  ],
  "US-ID": [
    {
      fact: "Produces about one-third of all potatoes grown in the United States.",
      question: "Which state produces about one-third of all potatoes grown in the United States?",
    },
    {
      fact: "Shoshone Falls on the Snake River is 212 feet high—about 45 feet taller than Niagara Falls.",
      question: "Which state has a waterfall taller than Niagara Falls?",
    },
  ],
  "US-IL": [
    {
      fact: "Chicago reversed the flow of its river in 1900 so wastewater would drain away from Lake Michigan.",
      question: "Which state saw a major city reverse the flow of its river in 1900 to drain wastewater away from a Great Lake?",
    },
    {
      fact: "Chicago's Home Insurance Building, completed in 1885, is widely considered the world's first skyscraper because of its metal-frame construction.",
      question: "Which state is associated with the world's first skyscraper?",
    },
  ],
  "US-IN": [
    {
      fact: "The Indianapolis 500, first held in 1911, is one of the oldest and most famous car races in the world.",
      question: "Which state hosts a 500-mile car race first held in 1911, one of the world's most famous?",
    },
    {
      fact: "Every December, the post office in the town of Santa Claus receives thousands of letters addressed to the famous gift giver.",
      question: "Which state has a town whose post office answers letters to Santa?",
    },
  ],
  "US-IA": [
    {
      fact: "Leads the nation in corn production and raises more pigs than any other state.",
      question: "Which state leads the nation in corn production and raises more pigs than any other?",
    },
    {
      fact: "The first commercial loaf of pre-sliced bread was sold in Chillicothe in 1928 using a machine invented by an Iowa native, Otto Rohwedder.",
      question: "Which state was home to the inventor of the bread-slicing machine?",
    },
  ],
  "US-KS": [
    {
      fact: "The geographic center of the contiguous United States lies near Lebanon.",
      question: "Which state contains the geographic center of the contiguous United States?",
    },
    {
      fact: "The first Pizza Hut opened in Wichita in 1958, in a building so small its sign could fit only eight letters.",
      question: "Which state is where the first Pizza Hut opened?",
    },
  ],
  "US-KY": [
    {
      fact: "Produces about 95% of the world's bourbon and has more barrels of aging whiskey than people.",
      question: "Which state produces about 95% of the world's bourbon and has more whiskey barrels than people?",
    },
    {
      fact: "Mammoth Cave is the world's longest known cave system, with more than 420 miles of surveyed passageways.",
      question: "Which state contains the world's longest known cave system?",
    },
  ],
  "US-LA": [
    {
      fact: "New Orleans sits largely below sea level and relies on levees, pumps, and Mississippi River silt to stay dry.",
      question: "Which state has a historic river-delta city sitting largely below sea level, relying on levees and pumps to stay dry?",
    },
    {
      fact: "The state capitol in Baton Rouge stands 450 feet tall, making it the tallest state capitol building in the United States.",
      question: "Which state has the tallest state capitol building in the country?",
    },
  ],
  "US-ME": [
    {
      fact: "Supplies roughly 90% of the United States' lobster catch.",
      question: "Which state supplies roughly 90% of the United States' lobster catch?",
    },
    {
      fact: "The Desert of Maine is a 40-acre expanse of glacial sand dunes created when farming practices exposed a buried sand deposit.",
      question: "Which state has a small desert created from exposed glacial sand?",
    },
  ],
  "US-MD": [
    {
      fact: "The Star-Spangled Banner was written during the 1814 Battle of Baltimore at Fort McHenry.",
      question: "Which state is where the Star-Spangled Banner was written during a War of 1812 harbor battle?",
    },
    {
      fact: "The Baltimore and Ohio Railroad began service in 1830 as the first commercial railroad in the United States.",
      question: "Which state was home to the nation's first commercial railroad?",
    },
  ],
  "US-MA": [
    {
      fact: "The first subway system in the Americas opened in Boston in 1897.",
      question: "Which state opened the first subway system in the Americas in 1897?",
    },
    {
      fact: "James Naismith invented basketball in Springfield in 1891 using a soccer ball and two peach baskets.",
      question: "Which state is where basketball was invented with peach baskets?",
    },
  ],
  "US-MI": [
    {
      fact: "Touches four of the five Great Lakes and has more freshwater shoreline than any other state.",
      question: "Which state touches four of the five Great Lakes and has more freshwater shoreline than any other?",
    },
    {
      fact: "The Mackinac Bridge spans nearly five miles between the state's two peninsulas and is one of the world's longest suspension bridges.",
      question: "Which state is linked by a nearly five-mile suspension bridge between two peninsulas?",
    },
  ],
  "US-MN": [
    {
      fact: "More than 11,000 lakes and the birthplace of water skiing and the Mall of America.",
      question: "Which state has more than 11,000 lakes and is the birthplace of water skiing and the Mall of America?",
    },
    {
      fact: "A failed super-strong adhesive developed at a Minnesota laboratory became the removable glue used on Post-it Notes.",
      question: "Which state helped turn a weak adhesive into Post-it Notes?",
    },
  ],
  "US-MS": [
    {
      fact: "A great river forms most of the western border and inspired the state's name.",
      question: "Which state has a great river forming most of its western border?",
    },
    {
      fact: "Elvis Presley was born in a two-room house in Tupelo in 1935 before becoming known worldwide as the King of Rock and Roll.",
      question: "Which state is the birthplace of Elvis Presley?",
    },
  ],
  "US-MO": [
    {
      fact: "The Gateway Arch in St. Louis is 630 feet tall—the tallest monument in the United States.",
      question: "Which state is home to a 630-foot gateway arch, the tallest U.S. monument?",
    },
    {
      fact: "Albert Berry made the first successful parachute jump from an airplane over St. Louis in 1912.",
      question: "Which state hosted the first successful parachute jump from an airplane?",
    },
  ],
  "US-MT": [
    {
      fact: "The name comes from the Spanish word montaña, though it is not the most mountainous U.S. state.",
      question: "Which state contains Glacier National Park, where sharp peaks rise above northern high plains?",
    },
    {
      fact: "The Berkeley Pit, an open-pit copper mine near Butte, filled with acidic water after mining stopped and became one of the nation's largest Superfund sites.",
      question: "Which state has a vast former copper mine known as the Berkeley Pit?",
    },
  ],
  "US-NE": [
    {
      fact: "Carhenge in Alliance is a full-scale replica of England's Stonehenge built from vintage American cars.",
      question: "Which state has a full-scale Stonehenge replica built from vintage cars?",
    },
    {
      fact: "Kool-Aid was invented in Hastings in 1927 by Edwin Perkins, who figured out how to turn a liquid drink concentrate into powder.",
      question: "Which state is where Kool-Aid was invented?",
    },
  ],
  "US-NV": [
    {
      fact: "About three-quarters of the population lives in the Las Vegas metro area.",
      question: "Which state has about three-quarters of its population living in a single desert metro known for casinos and neon?",
    },
    {
      fact: "Nevada legalized casino gambling statewide in 1931, helping transform a desert railroad stop into a global entertainment center.",
      question: "Which state legalized casino gambling statewide in 1931?",
    },
  ],
  "US-NH": [
    {
      fact: "License plates carry the bold motto 'Live Free or Die.'",
      question: "Which state's license plates carry the bold motto 'Live Free or Die'?",
    },
    {
      fact: "Peterborough opened the first free public library in the United States in 1833, funded by local taxes.",
      question: "Which state opened the nation's first free public library?",
    },
  ],
  "US-NJ": [
    {
      fact: "Thomas Edison developed the practical light bulb, phonograph, and motion picture in his Menlo Park laboratory.",
      question: "Which state is where Thomas Edison developed the light bulb, phonograph, and motion picture?",
    },
    {
      fact: "Atlantic City built the first boardwalk in the United States in 1870 to keep beach sand out of hotels and railroad cars.",
      question: "Which state built the nation's first boardwalk?",
    },
  ],
  "US-NM": [
    {
      fact: "Roswell became synonymous with UFO lore after a 1947 incident that still fuels conspiracy theories.",
      question: "Which state became synonymous with UFO lore after a 1947 ranch incident?",
    },
    {
      fact: "Santa Fe, founded in 1610, is the oldest capital city in the United States.",
      question: "Which state has the oldest capital city in the United States?",
    },
  ],
  "US-NY": [
    {
      fact: "More people live in the largest city here than in all but a handful of U.S. states.",
      question: "Which state has a largest city with more people than all but a handful of other U.S. states?",
    },
    {
      fact: "The Adirondack Park covers more land than Yellowstone, Yosemite, Grand Canyon, Glacier, and Great Smoky Mountains national parks combined.",
      question: "Which state contains a protected park larger than those five national parks combined?",
    },
  ],
  "US-NC": [
    {
      fact: "The Wright brothers achieved the first powered airplane flight at Kitty Hawk in 1903.",
      question: "Which state is where the Wright brothers achieved the first powered airplane flight in 1903?",
    },
    {
      fact: "The Biltmore Estate in Asheville has 250 rooms and remains the largest privately owned house in the United States.",
      question: "Which state is home to the largest privately owned house in the country?",
    },
  ],
  "US-ND": [
    {
      fact: "Theodore Roosevelt National Park preserves the badlands where the future president ranched and found inspiration.",
      question: "Which state has Theodore Roosevelt National Park, preserving badlands where the future president ranched?",
    },
    {
      fact: "The International Peace Garden straddles the Canadian border and has celebrated friendship between the two countries since 1932.",
      question: "Which state shares an international garden dedicated to friendship with Canada?",
    },
  ],
  "US-OH": [
    {
      fact: "Seven U.S. presidents were born here—more than any state except Virginia.",
      question: "Which state was the birthplace of seven U.S. presidents—more than any except Virginia?",
    },
    {
      fact: "The first electric traffic signal in the United States was installed at a busy Cleveland intersection in 1914.",
      question: "Which state installed the nation's first electric traffic signal?",
    },
  ],
  "US-OK": [
    {
      fact: "The capital lies close to the geographic center of the contiguous United States.",
      question: "Which state's capital lies close to the geographic center of the contiguous United States?",
    },
    {
      fact: "The Port of Catoosa, connected to the Gulf of Mexico by inland waterways, is one of the farthest inland seaports in the United States.",
      question: "Which state has one of the nation's farthest inland seaports?",
    },
  ],
  "US-OR": [
    {
      fact: "Crater Lake is the deepest lake in the United States, formed when a volcano collapsed about 7,700 years ago.",
      question: "Which state is home to Crater Lake, the deepest lake in the United States?",
    },
    {
      fact: "A honey fungus in the Blue Mountains covers more than 2,000 acres, making it one of the largest known organisms on Earth.",
      question: "Which state is home to a giant underground fungus spanning thousands of acres?",
    },
  ],
  "US-PA": [
    {
      fact: "Independence Hall in Philadelphia is where the Declaration of Independence and U.S. Constitution were signed.",
      question: "Which state is home to Independence Hall, where the Declaration of Independence and Constitution were signed?",
    },
    {
      fact: "Milton Hershey built an entire town around his chocolate factory, including schools, parks, and affordable housing for workers.",
      question: "Which state has a town founded around a famous chocolate factory?",
    },
  ],
  "US-RI": [
    {
      fact: "The smallest U.S. state but with over 400 miles of coastline.",
      question: "Which state is the smallest in the U.S. but has over 400 miles of coastline?",
    },
    {
      fact: "Newport's Touro Synagogue, dedicated in 1763, is the oldest surviving synagogue building in the United States.",
      question: "Which state has the oldest surviving synagogue building in the country?",
    },
  ],
  "US-SC": [
    {
      fact: "The first shots of the Civil War were fired at Fort Sumter in Charleston Harbor in 1861.",
      question: "Which state is where the first shots of the Civil War were fired at Fort Sumter in 1861?",
    },
    {
      fact: "The Angel Oak near Charleston is estimated to be hundreds of years old and spreads its limbs across more than 17,000 square feet.",
      question: "Which state is home to the sprawling Angel Oak tree?",
    },
  ],
  "US-SD": [
    {
      fact: "Mount Rushmore's 60-foot presidential faces were carved into the Black Hills over 14 years.",
      question: "Which state is home to Mount Rushmore, with 60-foot presidential faces carved over 14 years?",
    },
    {
      fact: "Jewel Cave has more than 220 mapped miles of passageways, making it one of the world's longest cave systems.",
      question: "Which state contains Jewel Cave, one of the world's longest cave systems?",
    },
  ],
  "US-TN": [
    {
      fact: "Memphis is a cradle of blues and rock and roll—Elvis Presley's Graceland draws visitors from around the world.",
      question: "Which state was a cradle of blues and rock and roll, home to Elvis Presley's Graceland?",
    },
    {
      fact: "Great Smoky Mountains National Park is the most visited national park in the United States.",
      question: "Which state shares the nation's most visited national park?",
    },
  ],
  "US-TX": [
    {
      fact: "Was an independent republic for nearly ten years before joining the United States in 1845.",
      question: "Which state was an independent republic for nearly ten years before joining the United States in 1845?",
    },
    {
      fact: "The King Ranch covers about 825,000 acres—larger than the entire state of Rhode Island.",
      question: "Which state has a ranch larger than Rhode Island?",
    },
  ],
  "US-UT": [
    {
      fact: "The Great Salt Lake is saltier than the ocean, so swimmers float effortlessly on its surface.",
      question: "Which state is home to a huge inland lake saltier than the ocean, so swimmers float effortlessly?",
    },
    {
      fact: "Artist Robert Smithson created Spiral Jetty in 1970, a 1,500-foot earthwork of basalt rock that curls into a salty lake.",
      question: "Which state has the famous Spiral Jetty earthwork in a salty lake?",
    },
  ],
  "US-VT": [
    {
      fact: "Ben & Jerry's ice cream began in a renovated gas station in Burlington in 1978.",
      question: "Which state is where Ben & Jerry's ice cream began in a renovated gas station in 1978?",
    },
    {
      fact: "The first ski tow in the United States began operating in Woodstock in 1934, pulling skiers uphill with a rope powered by a car engine.",
      question: "Which state operated the nation's first ski tow?",
    },
  ],
  "US-VA": [
    {
      fact: "Eight U.S. presidents were born here—more than any other state.",
      question: "Which state was the birthplace of eight U.S. presidents—more than any other?",
    },
    {
      fact: "Jamestown, founded in 1607, was the first permanent English settlement in North America.",
      question: "Which state contains the first permanent English settlement in North America?",
    },
  ],
  "US-WA": [
    {
      fact: "Mount Rainier is an active volcano towering over Seattle and visible across much of the Puget Sound.",
      question: "Which state has an active volcano towering over its largest city and visible across a long inland sound?",
    },
    {
      fact: "The first Starbucks store opened near Seattle's Pike Place Market in 1971.",
      question: "Which state is where the first Starbucks store opened?",
    },
  ],
  "US-WV": [
    {
      fact: "Split from Virginia during the Civil War and joined the Union as its own state in 1863.",
      question: "Which state was formed during the Civil War when its mountain counties broke away and joined the Union in 1863?",
    },
    {
      fact: "The Green Bank Telescope is the world's largest fully steerable radio telescope and sits in a protected area with very limited radio signals.",
      question: "Which state has the world's largest fully steerable radio telescope?",
    },
  ],
  "US-WI": [
    {
      fact: "Produces more cheese than any other U.S. state and hosts the Green Bay Packers' Lambeau Field.",
      question: "Which state produces more cheese than any other and hosts a storied NFL team in a historic outdoor stadium?",
    },
    {
      fact: "The first kindergarten in the United States opened in Watertown in 1856, founded by German educator Margarethe Schurz.",
      question: "Which state opened the nation's first kindergarten?",
    },
  ],
  "US-WY": [
    {
      fact: "Yellowstone National Park—mostly within these borders—was the world's first national park, established in 1872.",
      question: "Which state contains most of Yellowstone, the world's first national park, established in 1872?",
    },
    {
      fact: "Nellie Tayloe Ross became the first woman to serve as a U.S. state governor when she took office in 1925.",
      question: "Which state elected the first woman to serve as a governor?",
    },
  ],
};

export function getCountryFacts(code3: string): PlaceFactPair | undefined {
  return COUNTRY_FACTS[code3.toUpperCase()];
}

export function getCountryFact(code3: string): string | undefined {
  return COUNTRY_FACTS[code3.toUpperCase()]?.[0]?.fact;
}

export function getCountryFactQuestion(code3: string): string | undefined {
  return COUNTRY_FACTS[code3.toUpperCase()]?.[0]?.question;
}

export function getCountryFact2(code3: string): string | undefined {
  return COUNTRY_FACTS[code3.toUpperCase()]?.[1]?.fact;
}

export function getCountryFactQuestion2(code3: string): string | undefined {
  return COUNTRY_FACTS[code3.toUpperCase()]?.[1]?.question;
}

export function getStateFacts(code: string): PlaceFactPair | undefined {
  return STATE_FACTS[code.toUpperCase()];
}

export function getStateFact(code: string): string | undefined {
  return STATE_FACTS[code.toUpperCase()]?.[0]?.fact;
}

export function getStateFactQuestion(code: string): string | undefined {
  return STATE_FACTS[code.toUpperCase()]?.[0]?.question;
}

export function getStateFact2(code: string): string | undefined {
  return STATE_FACTS[code.toUpperCase()]?.[1]?.fact;
}

export function getStateFactQuestion2(code: string): string | undefined {
  return STATE_FACTS[code.toUpperCase()]?.[1]?.question;
}
