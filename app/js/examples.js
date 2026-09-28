// Batch Book's example recipes: what a new Batch Book starts with, a showcase of Mat's own recipes.
// Added once, to a book that has never had a recipe, on a device not signed in or signed up as a new account
// (so no existing account gets them); an empty book offers them with a button too (recipes.js).
import * as store from './store.js';
import * as att from './attachments.js';
import { parseRecipes } from './batchbook.js';

export const EXAMPLE_BOOKS = [
  { name: 'Cooking', emoji: '🍳', colour: '#3f8a5c', readings: false, fields: ['Serves', 'Time'] },
  { name: 'Soups', emoji: '🥣', colour: '#b5452e', readings: false, fields: ['Serves', 'Time'] },
  { name: 'Baking', emoji: '🥖', colour: '#b0663f', readings: false, fields: ['Makes', 'Time', 'Oven'] },
  { name: 'Cocktails', emoji: '🍸', colour: '#2f7f9b', readings: false, fields: ['Glass', 'Serves'] },
  { name: 'Fermentations', emoji: '🍷', colour: '#9b2f52', readings: true, reading_types: ['Gravity'], fields: ['Batch volume', 'ABV goal', 'Sweetness goal'] },
];

// The showcase: a handful of Mat's own recipes, in the import format (batchbook.js), with his photos (app/examples/).
const SHOWCASE = `
# Borsch
Book: Soups
Tags: ukrainian, soup

Based on an online recipe (cravingtasty.com/borsch-recipe) and a chat with Irena. Makes a LARGE amount, as it keeps. Make the broth the day before. Use pork shoulder with fat on, on the bone if possible (ribs: 2 packs of about 750 g from Sainsbury's).

## Ingredients
- 4 medium beets
- ½ cabbage (savoy is good, white cabbage ok)
- 2 medium carrots (get 5)
- 4 medium potatoes
- ⅔ cup parsley root (grated, optional)
- 2 small onions, diced (get 4)
- 4 tbsp tomato paste
- 3 tbsp sugar
- 2 tbsp vinegar
- 8 tbsp vegetable oil (or olive oil)
- 4 cloves garlic, minced
- sea salt (to taste)
- freshly ground pepper (to taste)
- lemon (get 4 if making pampushki)
### For the broth
- 20 cup water
- 1.5 kg pork butt or pork ribs (1.5 to 2 kg or more is ok; or include oxtail)
- 6 bay leaves
- 20 whole peppercorns
- 2 carrots (peeled and cut in half)
- 2 medium onions (peeled and cut in half)
### Garnish
- sour cream (smetana)
- fresh dill
- fresh parsley
- spring onions
### Also
- cheesecloth, for filtering

## Method
### Broth (the day before, give it time)
1. Heat {water|3.5 to 4.2 L of water} in a pan (make the pan full), and add {3/4 whole peppercorns}, {bay leaves} and {pork butt or pork ribs|3 lb pork meat and bones}.
2. Peel {3/4 carrots}, cut in half, add. Peel {3/4 medium onions}, cut in half, add. LOW HEAT.
3. After 2 to 3 hours: remove the meat, shred it and keep in the fridge. Filter the broth through the {cheesecloth|cloth} and fridge it.
### Make the borsch
4. Bring the broth to the boil, add {sea salt|salt} and {freshly ground pepper|pepper} to taste.
5. Prep the veg:
   - {medium beets|3 to 4 medium beets}: peel and julienne (optional: 2 more beets in large chunks)
   - {3/4 small onions}: halve through the root, then cut into half moons for a fine slice
   - julienne {medium carrots|3 carrots}
6. Cook the {medium beets|beets} in {1/8 vegetable oil} (or spray) and the juice of {lemon|1 lemon}.
   - +5 mins: add the {small onions|onions} and {medium carrots|carrots}
   - +10 more mins: add {3/4 tomato paste}, {3/4 vinegar} (apple, white wine, pickle juice or lemon), {2/3 sugar} and 1.5 cups of hot broth. Set a timer for 10 mins and keep stirring.
7. Peel and dice {medium potatoes|3 small potatoes or more} (1 inch pieces) and add them to the broth.
8. When the beet timer finishes: beets and veg into the broth, meat into the broth, boil for 5 mins more.
   - Meanwhile: shred {cabbage|half a cabbage}, mince {garlic}, add them.
9. Cook for another 2 to 5 mins. Taste: more {sea salt|salt} or {freshly ground pepper|pepper}?
10. Let sit for 20 mins (or don't). Meanwhile prep the garnishes onto a plate: finely chopped {fresh dill|dill}, {fresh parsley|parsley}, {spring onions}, and {sour cream}.

# Ukrainian Smoked Salmon Pirozhki
Book: Baking
Tags: ukrainian

No-yeast kefir dough.

## Ingredients
### Dough
- 4 cup plain flour (+170 g)
- 1 tsp salt
- 1 tsp baking soda
- 1 cup kefir
- 1 egg
- 2 tbsp sunflower oil (any oil)
- ¼ cup water, if needed
### Filling
- dill (a LOT)
- 4 spring onions
- parmesan
- 1 tub mascarpone
- smoked salmon (ideally a fillet, any soft salmon)
- filling salt (not much)
- pepper
### To finish
- 1 beaten egg, for egg wash

## Method
1. Dough in a big bowl: {plain flour|flour}, {salt}, {baking soda}, {kefir}, crack in the {egg}, {sunflower oil|oil}. Mix, maybe add {water}. Cover with a shower cap and rest 20 mins.
2. Filling in a mixing bowl: chop {dill|a LOT of dill} and the {spring onions}, grate in {parmesan}, {mascarpone|the whole tub of mascarpone}, flake in the {smoked salmon|salmon}, {filling salt|a bit of salt}, {pepper}. Rough mix, improvise.
3. Roll out a quarter of the dough at a time. Split into 8 discs, then flatten into 100 mm circles with a rolling pin.
4. Add filling, press up to the top, make the end like a fish and push fins into it.
5. {beaten egg|Egg wash} and into the oven, 180 °C for 20 to 25 mins.

# Aviation
Book: Cocktails
Tags: cocktail, gin

Mat's favourite. From Difford's Guide.

## Ingredients
- 105 ml gin (Sipsmith)
- 30 ml Luxardo maraschino
- 20 ml violette liqueur
- 35 ml lemon juice
- ice

## Method
1. Shake the {gin}, {Luxardo maraschino}, {violette liqueur} and {lemon juice} long and hard with {ice}. Strain into a chilled coupe.

## Notes
Also tried: 100 Sipsmith, 34 maraschino, 25 violette. Can swap a third of the gin for rum.

# Disaronno Sour (adult)
Book: Cocktails
Tags: cocktail, whisky

This was silky and amazing, Mat liked it more than Anna.

## Ingredients
- 70 ml Disaronno
- 40 ml whisky
- 40 ml lemon juice
- 2 tsp sugar syrup
- 1 egg white
- ice, for shaking
- lemon twists, to serve
- cherries, to serve
- clean ice, to serve

## Method
1. Shake the {Disaronno}, {whisky}, {lemon juice}, {sugar syrup} and {egg white} with NO ice.
2. Shake WITH {ice}.
3. Serve over {clean ice} with {lemon twists} and {cherries}.

## Notes
Next try: 100 Disaronno, 60 ml lemon, 28.5 whisky, egg white. Shake without then with ice. Serve with 2 cherries, a lemon twist and fresh ice.

# Pad Kra Pao (basil stir fry)
Book: Cooking
Tags: thai

Serve with a fried egg, prik nam pla and jasmine rice.

## Ingredients
- protein (anything: raw or cooked meat, even veg)
- 1 tsp fish sauce, to marinate
- 4 hot red chillies
- 2 non-hot red chillies
- 5 cloves garlic
- ¼ medium onion
- basil (holy is best, Thai or even Italian; as much as the rest of the food)
- veg oil
- eggs (optional)
- jasmine rice
### Sauce (don't double it)
- 1 tbsp oyster sauce
- 1 tbsp soy sauce
- 2 tbsp water
- 2 tsp sauce fish sauce
- ½ tsp dark soy (or black Thai soy)
- 1.5 tsp sugar (palm)
### Prik nam pla
- small Thai chillies, chopped (loads, different colours ok)
- prik nam pla fish sauce (3 parts)
- lime juice (1 part)
- prik nam pla garlic, finely sliced

## Method
1. Prik nam pla: cover the chopped {small Thai chillies|chillies} and {prik nam pla garlic|garlic} with {prik nam pla fish sauce|fish sauce} and {lime juice}, 3 parts fish sauce to 1 part lime.
2. Cut the {protein} into bite-sized chunks, smaller than a normal stir fry (chicken: nice and small or long). Marinate with {fish sauce}.
3. Combine the sauce: {oyster sauce}, {soy sauce}, {water}, {sauce fish sauce|fish sauce}, {dark soy} and {sugar}.
4. Chop and POUND the chillies ({hot red chillies} and {non-hot red chillies}) and {garlic} to a pulp. Chop the {medium onion|onion}.
5. Wok on MEDIUM-high: {veg oil|oil}, then the chilli garlic mix until the garlic goes golden (2 mins). Add the {medium onion|onion} for 30 seconds.
6. Get the wok to HIGH heat first!!! Add the protein and sauce, toss for 30 seconds.
7. Turn off the heat, add the {basil} (lots!) and toss to wilt.
8. Serve with a fried {eggs|egg} and {jasmine rice}.

# Chicken Green Curry
Book: Cooking
Tags: thai, curry, chicken

From Hot Thai Kitchen. Fish sauce: check the ingredients are anchovies, water, salt, sugar and NOTHING more (aim for 70%+ anchovy). Palm sugar: the fudge-like balls, ideally pure. Rice: Thai jasmine (green Thai logo).

## Ingredients
- chicken thighs
- 50 g green curry paste (Maeploy, Aroy-D or Namjai)
- Thai basil (a few leaves + 1 cup)
- 1 cup chicken stock
- 1.75 cup full-fat coconut milk (Aroy-D carton)
- 2 tbsp palm sugar, grated
- 1 tbsp fish sauce
- 4 kaffir lime leaves (3 to 4)
- 1.5 cup bamboo shoots (tinned, ideally thick like chips)
- 1 large red chilli (or any red pepper)
- jasmine rice

## Method
1. Pound {green curry paste|the paste} with {Thai basil|a few basil leaves}. Prep {chicken stock|the stock}.
2. Reduce {3/7 full-fat coconut milk|¾ cup coconut milk} until thick and a bit brown round the edges, lining the bottom of the pan and separating (if not, don't worry).
3. Add the {green curry paste|curry paste} and mix, mix, mix until the oil bubbles round the edges.
4. Add the {chicken thighs|chicken}; once fully mixed, add {4/7 full-fat coconut milk|1 cup coconut milk} AND {chicken stock}.
5. Add {palm sugar}, {fish sauce} and the {kaffir lime leaves|lime leaves}, torn a bit and bruised.
6. {jasmine rice|RICE} ON!
7. Simmer 10 mins until the chicken is fork-tender.
8. Add {bamboo shoots} and bring back to the boil.
9. Add the {large red chilli|chilli} (big angled cuts, about ½ cm) and {Thai basil|1 cup Thai basil}, and stop the heat. More {fish sauce|fish sauce} if flat.

# Quick Baguette
Book: Baking
Tags: bread

No kneading. Start 10 hours ahead.

## Ingredients
- 900 g flour
- 2 tsp salt
- ¾ tsp dried yeast
- 730 ml bottled water (room temperature)
- dusting flour

## Method
1. Into a bowl: {flour}, {salt}, {dried yeast|yeast}, {bottled water|water}. Mix with the back of a wooden spoon for a minute, that's all. Make sure there's no unmixed flour at the bottom.
2. Cover with a lid and leave 8 to 10 hours at room temperature.
3. LOTS of {dusting flour|flour} on the surface. Scrape the dough carefully out onto it; don't press, keep the air in! Loads of {dusting flour|flour} on top.
4. Form a slightly elongated shape and cut carefully into 4 without losing the air.
5. Roll each carefully in {dusting flour|flour}, stretch and place on baking paper.
6. Oven 250 °C for 25 mins.

# Bun Cha
Book: Cooking
Tags: vietnamese, pork

Hanoi grilled pork. First made 2013; made again in 2023 (bought meat pre-minced). Not a quick meal: start at 5pm and you'll still be slightly stressed at 8.30. More relaxed: first prep the vermicelli and leave in cold water all day (20 mins: soak 10, cook, then blanch in cold water), then the broth, then the meatballs (not quick at all!). Pickle the veg in advance too.

## Ingredients
### Meatballs
- 450 g pork (cubes to mince, or pre-minced)
- 2 stalks lemongrass
- 2 cloves garlic
- 1 large shallot
- 1 red chilli
- 2 tbsp honey
- 2 tbsp olive oil
- 2 tbsp brown sugar
- 1 tbsp fish sauce
- 1 tsp salt
- 1 tsp pepper (freshly ground)
- oil (for the griddle)
### Broth
- 400 ml water
- 6 cloves broth garlic
- 1 broth red chilli (or 3 bird's eye)
- 2 tbsp broth fish sauce
- 1 tbsp rice vinegar
- 3 tsp broth brown sugar
- 1 green papaya (or kohlrabi)
- 1 carrot
- ½ lime
- extra salt (for the papaya and carrot)
### To serve
- 350 g vermicelli (0.8 goes gloopy, 1.2 is quite thick)
- 2 heads little gem lettuce (or other crisp lettuce)
- 1 bunch mint
- 1 bunch coriander
- cold water

## Method
1. Thinly slice the {green papaya|papaya} and {carrot}, toss with {extra salt|salt} and leave to stand. (Or pickle: peel, julienne, pour over hot water, sugar, vinegar and salt, no boil, cover and leave 30+ mins.)
2. Wash the {little gem lettuce|lettuce}, {mint} and {coriander} and leave to soak.
3. Finely chop the meatball {lemongrass}, {garlic}, {large shallot|shallot} and {red chilli|chilli}.
4. Mix the {pork} with the above, {honey}, {olive oil|oil}, {brown sugar}, {fish sauce}, {salt} and {pepper}. Stand 10 mins.
5. Chop the {broth garlic} and {broth red chilli|chilli} and set aside.
6. Make about 10 meatballs, flattened slightly to make frying easier.
7. Put the {water} on to boil.
8. Meanwhile {oil|oil} a griddle and fry the meatballs, in batches if needed. Give it about 20 mins, but carry on.
9. Meanwhile drain the {little gem lettuce|lettuce} and herbs onto a serving plate.
10. Once the {water|water} boils, add the {broth garlic|garlic} and {broth red chilli|chilli}, {broth fish sauce|fish sauce}, {rice vinegar} and {broth brown sugar|brown sugar}. STIR until the {broth brown sugar|sugar} dissolves. Wash the {extra salt|salt} off the {green papaya|papaya} and {carrot|carrot} and add them with the {lime|lime juice}.
11. Cook the {vermicelli} per the packet (2 mins?), then blanch in {cold water}.
12. Mat's way: broth in bowls, then a little greens, a little {vermicelli|vermicelli} and some meatballs (not all). The rest on small plates to share.
`;
const PHOTOS = {};
// The examples from 1.47.00 to 1.48.00, which the showcase replaces.
const OLD = ['Aviation', 'Espresso martini', 'Borscht', 'Red lentil and tomato soup', 'Spaghetti carbonara', 'Chicken fajitas', 'Banana bread', 'Rustic white loaf', 'Chocolate chip cookies'];

async function addPhotos(recipe) {
  const files = [];
  for (const name of PHOTOS[recipe.title] || []) {
    try { const res = await fetch(`examples/${name}`); if (res.ok) files.push(new File([await res.blob()], name, { type: 'image/jpeg' })); } catch { /* offline: the recipe comes without its photos */ }
  }
  if (files.length) await att.addFiles({ collection: 'recipes', id: recipe.id }, files);
}

// The example books (any not set up yet) and recipes (any not there yet, by name), in the current space.
export async function addExamples(settings) {
  const books = settings.batch_sections || [];
  const missing = EXAMPLE_BOOKS.filter(x => !books.some(b => b.name === x.name));
  if (missing.length || !settings.batch_sections) await store.updateSettings({ batch_sections: books.concat(missing) });
  const have = (await store.list('recipes')).map(r => r.title.toLowerCase());
  for (const r of parseRecipes(SHOWCASE)) if (!have.includes(r.title.toLowerCase())) await addPhotos(await store.create('recipes', Object.assign(r, { colour: null })));
  await store.updateSettings({ batch_examples: true, batch_examples_reset: true, batch_showcase: true });
}

// Once (1.48.00, Mat asked: his and Anna's Batch Books had nothing in yet): the books go back to the example
// ones and the example recipes are added. A book of their own with recipes in it stays, after them.
export async function resetToExamples(settings) {
  const recipes = await store.list('recipes');
  const kept = (settings.batch_sections || []).filter(b => !EXAMPLE_BOOKS.some(x => x.name === b.name) && recipes.some(r => r.type === b.name));
  await store.updateSettings({ batch_sections: EXAMPLE_BOOKS.concat(kept) });
  await addExamples(await store.getSettings());
}

// Once (1.49.00): a Batch Book that got the earlier examples swaps them for the showcase. An earlier example that
// has batches, or was renamed, stays.
export async function swapForShowcase(settings) {
  const makes = await store.list('recipe_makes');
  for (const r of await store.list('recipes')) if (OLD.includes(r.title) && !makes.some(m => m.recipe_id === r.id)) await store.remove('recipes', r.id);
  await addExamples(settings);
}

// A brand new Batch Book: never had a recipe, on a device not signed in or signed up here as a new account
// (an account that already existed is only ever signed in to, so it never gets them).
export async function isBrandNew(settings, signedIn) {
  if (settings.batch_examples || (signedIn && !(await store.metaGet('new_account')))) return false;
  return !(await store.list('recipes', { includeDeleted: true })).length;
}
