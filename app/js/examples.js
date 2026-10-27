// Batch Book's example recipes: what a new Batch Book starts with, a showcase of Mat's own recipes.
// Only added when asked (Mat, 1.50.02): the button in an empty book (recipes.js) or Settings > Batch Book.
import * as store from './store.js';
import { signedIn } from './sync.js';
import * as att from './attachments.js';
import { parseRecipes } from './batchbook.js';

export const EXAMPLE_BOOKS = [
  { name: 'Cooking', emoji: '🍳', colour: '#3f8a5c', readings: false, fields: ['Serves', 'Time'] },
  { name: 'Soups', emoji: '🥣', colour: '#b5452e', readings: false, fields: ['Serves', 'Time'] },
  { name: 'Baking', emoji: '🥖', colour: '#b0663f', readings: false, fields: ['Makes', 'Time', 'Oven'] },
  { name: 'Cocktails', emoji: '🍸', colour: '#2f7f9b', readings: false, fields: ['Glass', 'Serves'] },
  { name: 'Fermentations', emoji: '🍷', colour: '#9b2f52', readings: true, reading_types: ['Gravity'], fields: ['Batch volume', 'ABV goal', 'Sweetness goal'] },
];

// The showcase: a handful of Mat's own recipes (only ones with his photos), in the import format (batchbook.js), with his photos (app/examples/).
const SHOWCASE = `
# Borscht
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
### The broth (the day before, give it time)
1. Fill a big pan with {water|3.5 to 4.2 L of water} (make the pan full) and put it on a high heat.
2. While it heats: peel {3/4 carrots} and cut them in half. Peel {3/4 medium onions} and cut them in half.
3. Put the carrots, onions, {pork butt or pork ribs|3 lb pork meat and bones}, {3/4 whole peppercorns} and {bay leaves} into the pan. When it bubbles, turn the heat right down so it only just bubbles, lid half on. Look now and then that it isn't boiling over. Set a timer for 2 hours.
4. After the broth has simmered 2 hours (up to 3 is fine): lift out the meat, shred it and keep it in the fridge. Pour the broth through the {cheesecloth|cloth} into a big bowl and put that in the fridge too.
### The borscht (next day)
5. Prep all the veg first, taking your time (it takes a while):
   - {medium beets|3 to 4 medium beets}: peel and cut into thin matchsticks (optional: 2 more beets in large chunks)
   - {3/4 small onions}: peel, halve through the root, then slice into thin half moons
   - {medium carrots|3 carrots}: peel and cut into thin matchsticks
   - {parsley root}: peel and grate (if using)
   - {medium potatoes|3 small potatoes or more}: peel, cut into 2 to 3 cm pieces and keep them in a bowl of cold water
   - {cabbage|half a cabbage}: shred thinly
   - {garlic}: peel and finely chop
   - {lemon|1 lemon}: cut in half and squeeze out the juice
6. Put the broth on a high heat, lid on, to come to the boil.
7. Meanwhile, in a large frying pan on a medium heat: {1/8 vegetable oil} (or spray), the beets and the lemon juice. Fry, stirring now and then, for 5 mins.
8. Add the onions, carrots and parsley root to the frying pan. Fry, stirring now and then, for 10 mins. When the broth boils, add {sea salt|salt} and {freshly ground pepper|pepper} to taste, drain the potatoes and add them, and turn it down to a gentle bubble.
9. Add {3/4 tomato paste}, {3/4 vinegar} (apple, white wine, pickle juice or lemon), {2/3 sugar} and 1.5 cups of hot broth from the big pan to the frying pan. Keep stirring for 10 mins.
10. Tip everything in the frying pan into the broth, with the shredded meat. Boil. Set a timer for 5 mins.
11. After 5 mins of boiling, add the cabbage and garlic. Cook for another 2 to 5 mins, until the cabbage is just soft.
12. Taste: more {sea salt|salt} or {freshly ground pepper|pepper}? Turn off the heat and leave it to sit. Set a timer for 20 mins (or don't wait).
13. While it sits, make the garnish plate: finely chop the {fresh dill|dill}, {fresh parsley|parsley} and {spring onions}, and add a big spoon of {sour cream}.
14. After it has sat 20 mins, serve with the garnishes.

# Hot Toddy
Book: Cocktails
Tags: cocktail, whisky, hot
Glass: Mug
Serves: 1

Is it a cocktail? Is it medicine? Who knows, but it tastes like winter in the Highlands.

## Ingredients
- 1 lemon, juiced
- 50 ml whisky (a double shot)
- 1 tbsp honey (a good glug)
- 1 lemon wedge
- 3 cloves
- 1 cinnamon stick (optional)
- 200 ml hot water, to top up

## Method
1. Boil the kettle.
2. While it boils: squeeze the juice from the {lemon}, and push the {cloves} into the skin of the {lemon wedge}.
3. Into a mug: the lemon juice, the {whisky} and the {honey}. Stir until the honey melts in.
4. Add the clove-studded lemon wedge and the {cinnamon stick}.
5. When the kettle has boiled, top up with {hot water} and stir.

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
1. Prep first: cut the {chicken thighs|chicken} into bite-size pieces (if they aren't already). Grate the {palm sugar}. Tear the {kaffir lime leaves|lime leaves} a bit and scrunch them to bruise. Cut the {large red chilli|chilli} into big angled pieces, about ½ cm. Drain the {bamboo shoots}. Measure out the {chicken stock|stock}.
2. Pound the {green curry paste|curry paste} with {Thai basil|a few basil leaves}.
3. In a wok or deep pan on a medium heat, stir {3/7 full-fat coconut milk|¾ cup coconut milk} until it's thick and a bit brown round the edges, lining the bottom of the pan and separating (if not, don't worry).
4. Add the curry paste and mix, mix, mix until the oil bubbles round the edges.
5. Add the chicken. Once it's all mixed in, add {4/7 full-fat coconut milk|1 cup coconut milk} and the stock.
6. Add the palm sugar, {fish sauce} and lime leaves.
7. Put the {jasmine rice|rice} on now (it takes about as long as the curry). Turn the curry down so it gently bubbles, lid off. Set a timer for 10 mins.
8. After the curry has simmered 10 mins, check the chicken is fork-tender (if not, a few more mins). Add the bamboo shoots and bring back to the boil.
9. Add the chilli and {Thai basil|1 cup Thai basil}, then turn off the heat. Taste: a little more {fish sauce} if it's flat.

# Pampushki
Book: Baking
Tags: ukrainian, bread
Makes: 9
Oven: 180 °C

Ukrainian garlic bread rolls, the ones to have with borscht. Mat's own recipe.

## Ingredients
### Dough
- 400 g plain flour
- 225 g warm water (40 °C)
- 35 g honey
- 21 g vegetable oil
- 5 g salt
- 5 g lemon juice
- 9 g dried yeast
- flour, for shaping
- oil, for the tin
### Egg wash
- 1 egg
### Garlic sauce
- 3 cloves garlic, pressed
- ½ tsp kosher salt
- 2 tbsp more vegetable oil
- 3 tbsp cold water
- 2 tbsp chopped herbs (parsley, coriander)

## Method
1. Warm the {warm water|water} to 40 °C (warm to the touch, not hot). Pour it into a mixing bowl with the {dried yeast|yeast} and {honey} and stir. Set a timer for 10 mins.
2. After 10 mins (it should be a bit frothy), add the {vegetable oil}, {salt}, {lemon juice} and {plain flour|flour}. Mix into a dough. Set a timer for 20 mins.
3. After the dough has rested 20 mins, knead it in the bowl for 2 mins. Too dry? A splash more water. Too sticky? Leave it another 10 mins, then knead again.
4. Cover the bowl with a damp cloth or cling film and put it somewhere warm. Set a timer for 1 hour (longer, up to an hour and a half, is fine).
5. After the dough has risen 1 hour: grease a round tin with {oil}. Split the dough into 9 equal pieces and roll them into balls, with a little {flour} if too sticky. Spread them out in the tin, cover and put somewhere warm. Set a timer for 40 mins.
6. Now turn the oven on to 180 °C.
7. While the rolls rise, make the garlic sauce: peel and press the {garlic} into a small bowl. Finely chop the {chopped herbs|herbs}. Add the herbs, {kosher salt|salt}, {more vegetable oil|vegetable oil} and {cold water|water}, and stir.
8. After the rolls have risen 40 mins, whisk the {egg} and brush it all over them. Use the whole egg: yolk alone burns!
9. Put the tin in the oven. Set a timer for 15 mins.
10. After 15 mins of baking, put a bowl of water in the bottom of the oven so the crust doesn't go hard. Set a timer for 10 mins more (15 if they're still pale).
11. After 25 to 30 mins of baking in all, take the bread out when it's golden. Drizzle the garlic sauce over it in the tin and leave a few mins to soak in. Serve.

# Christmas Cake
Book: Baking
Tags: christmas, cake
Makes: one 8 inch cake
Time: 3 hours, plus an overnight soak
Oven: 140 °C fan

Anna's recipe. A very moist, dense cake, gooey from the low flour and high fruit (1.5 kg of it), a bit like a Christmas pudding. How to line the tin: amummytoo.co.uk/idiots-guide-to-lining-a-christmas-cake-tin

## Ingredients
### Fruit
- 600 g glacé cherries (3 punnets, halved)
- 400 g jumbo raisins
- 200 g dried cranberries
- 100 g sultanas
- 50 g dried apricots
- 1 orange, zested
- 1 lemon, zested
- 250 ml cherry brandy (or brandy, or any alcohol you like; 250 ml at least)
### Cake
- 250 g salted butter
- 220 g brown sugar (dark and light mixed)
- 3 tbsp molasses (or golden syrup)
- ½ tsp salt
- 1 tsp allspice
- 1 tsp cinnamon
- 1 tsp nutmeg
- 1 tsp baking powder (flat)
- 5 eggs
- 185 g plain flour
- whole almonds (a handful or two)
### To finish
- 500 g white marzipan
- 500 g golden marzipan (or morello marzipan)
- white ready-to-roll icing
- silver balls
- fresh cherries
- icing sugar, for dusting

## Method
### The night before
1. Cut the {glacé cherries} in half (3 punnets: this takes a while). Grate the zest from the {orange} and {lemon}.
2. Put the cherries, {jumbo raisins}, {dried cranberries}, {sultanas}, {dried apricots} and the zest into a large bowl. Pour over the {cherry brandy}, stir, cover and leave overnight. Quicker: heat it all gently in a large pan instead. It makes the kitchen smell delicious!
### Baking day
3. Turn the oven on to 140 °C fan.
4. While it heats, double line an 8 inch loose-bottomed tin with baking parchment. Wrap several layers of brown paper or parchment round the outside and tie with string.
5. In a large bowl, beat the {salted butter|butter} and {brown sugar|sugar} together. Beat in the {molasses}, then the {salt}, {allspice}, {cinnamon}, {nutmeg} and {baking powder}.
6. Beat in the {eggs} one at a time.
7. Stir in the {plain flour|flour}, then the boozy fruit, then the {whole almonds|almonds}.
8. Spoon into the tin, then drop the tin onto the worktop from about 10 cm so the mix fills the air pockets.
9. Put it in the oven. Set a timer for 2.5 hours.
10. After 2.5 hours of baking, look at the top: if it's getting too brown, cover it with foil (Anna never has to). Set a timer for 30 mins more.
11. After 3 hours of baking in all, take it out and leave it in the tin until completely cool.
### Decorating (once cool)
12. Cover with a layer of {white marzipan}, then {golden marzipan}, then the {white ready-to-roll icing|white icing}.
13. Score the sides in diamonds like a quilt (slightly uneven is fine), with {silver balls|a silver ball} where the lines cross.
14. Pile {fresh cherries} on top and dust with {icing sugar}.

## Notes
Anna's Simnel cake is the same cake with a 2 mm layer of golden marzipan in the middle, a thick marzipan top with wavy edges, and 11 marzipan balls (about 20 g each) brushed with egg yolk and browned with a blowtorch or under a low grill.

# Cranberry Sauce
Book: Cooking
Tags: christmas, sauce
Serves: 6
Time: 15 mins

Serve it hot, the flavours are brighter.

## Ingredients
- 250 g fresh cranberries
- 100 ml white wine
- 2 tbsp port (a splash)
- 100 g caster sugar
- 1 orange (a couple of long strips of zest)

## Method
1. Cut a couple of long strips of zest from the {orange} and slice them into thin shreds.
2. Put the {fresh cranberries|cranberries}, {white wine}, {port} and {caster sugar} into a pan on a high heat.
3. When it boils, stir in the orange shreds and turn it down so it gently bubbles. Set a timer for 10 mins.
4. After 10 mins of simmering (the berries start to burst), take it off the heat and beat lightly with a spoon, so some of the berries break up. Serve hot.

`;
const PHOTOS = { 'Borscht': ['borscht-1.jpg', 'borscht-2.jpg'], 'Chicken Green Curry': ['green-curry-2.jpg'], 'Hot Toddy': ['hot-toddy-1.jpg', 'hot-toddy-2.jpg'], 'Pampushki': ['pampushki-1.jpg', 'pampushki-2.jpg', 'pampushki-3.jpg'], 'Christmas Cake': ['christmas-cake-1.jpg'], 'Cranberry Sauce': ['cranberry-sauce-1.jpg'] };
// Goes up when photos or recipes are added to the showcase, so books that already have it get the new ones.
const PHOTOS_VERSION = 11;   // 11 (1.61.68): methods rewritten in One thing at a time (housestyles.js), see addShowcase
// Taken out of the showcase later: a book that got one and hasn't changed it or made a batch of it loses it once.
const DROPPED = ['Coloured Sticky Rice with Mango'];   // 1.49.14, Mat asked

// Showcase recipes and photos get ids made from the account and their name, the same on every device and every
// run, so two devices (or two quick renders on one) adding them at once make one copy that sync merges, not three
// (1.49.11: Mat's and Anna's books had them tripled).
async function fixedId(name) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${signedIn()?.user_id || 'local'}|${name}`)));
  const hex = Array.from(hash.slice(0, 16), byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// One seeding at a time on this device.
let seeding = Promise.resolve();
const serial = job => (seeding = seeding.then(job, job));

async function addPhotos(recipe, names = PHOTOS[recipe.title] || []) {
  const files = [], ids = [];
  for (const name of names) {
    try { const res = await fetch(`examples/${name}`); if (res.ok) { files.push(new File([await res.blob()], name, { type: 'image/jpeg' })); ids.push(await fixedId(`photo|${recipe.title}|${name}`)); } } catch { /* offline: the recipe comes without its photos */ }
  }
  if (files.length) await att.addFiles({ collection: 'recipes', id: recipe.id }, files, ids);
}

// The showcase recipes not there yet (by name), and the photos each is missing (by file name).
async function addShowcase(fresh = false) {
  const makes = await store.list('recipe_makes'), atts = await att.byParent();
  for (const title of DROPPED) {
    const r = await store.get('recipes', await fixedId(`recipe|${title}`));
    if (r && r.updated_at === r.created_at && !makes.some(m => m.recipe_id === r.id)) { for (const a of atts.get(r.id) || []) await store.remove('attachments', a.id); await store.remove('recipes', r.id); }
  }
  const have = (await store.list('recipes')).map(r => r.title.toLowerCase());
  const ever = (await store.list('recipes', { includeDeleted: true })).filter(r => r.deleted_at).map(r => r.id);   // one deleted since it was added stays deleted
  for (const r of parseRecipes(SHOWCASE)) { const id = await fixedId(`recipe|${r.title}`); if (!have.includes(r.title.toLowerCase()) && (fresh || !ever.includes(id))) await store.create('recipes', Object.assign(r, { id, colour: null })); }
  // A showcase recipe whose method was never changed here gets the method as it is now (1.61.68: One thing at a time).
  // Not one with a photo on a step, as new steps would lose it.
  for (const r of parseRecipes(SHOWCASE)) {
    const mine = await store.get('recipes', await fixedId(`recipe|${r.title}`)), clocks = mine?._field_clocks || {};
    if (!mine || mine.deleted_at || clocks.steps !== clocks.created_at || (mine.steps || []).some(step => atts.has(step.id))) continue;
    if ((mine.steps || []).map(step => step.text).join('\n') !== r.steps.map(step => step.text).join('\n')) await store.update('recipes', mine.id, { steps: r.steps });
  }
  const photos = await att.byParent();
  for (const r of await store.list('recipes')) if (PHOTOS[r.title]) { const names = (photos.get(r.id) || []).map(a => a.name); await addPhotos(r, PHOTOS[r.title].filter(n => !names.includes(n))); }
  await store.updateSettings({ batch_examples: true, batch_wipe: 1, batch_showcase_photos: PHOTOS_VERSION });
}

// The example books not set up yet; with the showcase too when asked for (again brings back any deleted, never a second copy).
const addBooks = async () => {
  const settings = await store.getSettings(), books = settings.batch_sections || [];
  const missing = EXAMPLE_BOOKS.filter(x => !books.some(b => b.name === x.name));
  await store.updateSettings({ batch_sections: books.concat(missing), batch_wipe: 1, batch_books: 1 });
};
export const setUpBooks = () => serial(addBooks);
export const addExamples = () => serial(async () => { await addBooks(); await addShowcase(true); });

// Once per account (1.49.11, Mat asked: the starters had been added three times): every recipe, batch, diary entry
// and their photos go, the books go back to the example ones, and the showcase is added fresh. batch_wipe is an
// account setting, so a second device that has synced sees it and leaves the book alone.
export const needsWipe = settings => !settings.batch_wipe;
export const wipeBook = () => serial(async () => {
  const gone = ['recipes', 'recipe_makes', 'recipe_entries'];
  for (const a of await store.list('attachments')) if (gone.includes(a.parent_collection)) await store.remove('attachments', a.id);
  for (const c of gone) for (const r of await store.list(c)) await store.remove(c, r.id);
  await store.updateSettings({ batch_sections: EXAMPLE_BOOKS, batch_wipe: 1 });
  await addShowcase(true);
});

// Recipes and photos added to the showcase since this book got it.
export const addNewPhotos = () => serial(addShowcase);
export const photosBehind = settings => settings.batch_examples && (settings.batch_showcase_photos || 0) < PHOTOS_VERSION;

// A brand new Batch Book: never set up, never had a recipe, on a device not signed in or signed up here as a new
// account (an account that already existed is only ever signed in to). It gets the books; the recipes wait for the button.
export async function isBrandNew(settings, signedIn) {
  if (settings.batch_examples || settings.batch_books || (signedIn && !(await store.metaGet('new_account')))) return false;
  return !(await store.list('recipes', { includeDeleted: true })).length;
}
