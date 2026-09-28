// Batch Book's example recipes: what a new Batch Book starts with, from things in UK supermarkets (metric).
// Added once, to a book that has never had a recipe, on a device not signed in or signed up as a new account
// (so no existing account gets them); an empty book offers them with a button too (recipes.js).
import * as store from './store.js';
import { parseLine } from './batchbook.js';

export const EXAMPLE_BOOKS = [
  { name: 'Cooking', emoji: '🍳', colour: '#3f8a5c', readings: false, fields: ['Serves', 'Time'] },
  { name: 'Soups', emoji: '🥣', colour: '#b5452e', readings: false, fields: ['Serves', 'Time'] },
  { name: 'Baking', emoji: '🥖', colour: '#b0663f', readings: false, fields: ['Makes', 'Time', 'Oven'] },
  { name: 'Cocktails', emoji: '🍸', colour: '#2f7f9b', readings: false, fields: ['Glass', 'Serves'] },
  { name: 'Fermentations', emoji: '🍷', colour: '#9b2f52', readings: true, reading_types: ['Gravity'], fields: ['Batch volume', 'ABV goal', 'Sweetness goal'] },
];

// [book, title, description, tags, details, ingredients (one per line), steps ({item} shows it with its amount)]
const RECIPES = [
  ['Cocktails', 'Aviation', 'A gin sour with a violet blush: sharp, floral and pale sky blue.', [], { Glass: 'Coupe', Serves: '1' },
    ['50ml gin', '15ml maraschino liqueur', '7.5ml crème de violette', '20ml lemon juice, freshly squeezed', '1 cocktail cherry, to garnish'],
    ['Chill a coupe with ice and water.', 'Shake the {gin}, {maraschino liqueur}, {crème de violette} and {lemon juice} hard with plenty of ice for 15 seconds.', 'Empty the coupe, then double strain the drink into it.', 'Drop in the {cocktail cherry}.']],
  ['Cocktails', 'Espresso martini', 'Strong coffee, vodka and a thick crema on top.', [], { Glass: 'Coupe or martini glass', Serves: '1' },
    ['50ml vodka', '25ml coffee liqueur, e.g. Kahlúa', '25ml espresso, freshly made and cooled a little', '10ml sugar syrup', '3 coffee beans, to garnish'],
    ['Make the {espresso} and let it cool for a minute.', 'Shake the {vodka}, {coffee liqueur}, {espresso} and {sugar syrup} very hard with ice, to get a good foam.', 'Strain into a chilled glass and float the {coffee beans} on top.']],
  ['Soups', 'Borscht', 'Deep red beetroot soup with a swirl of soured cream and dill.', ['vegetarian'], { Serves: '4', Time: '1 hour' },
    ['500g raw beetroot, peeled and grated', '1 onion, finely chopped', '2 carrots, grated', '2 potatoes, peeled and diced', '¼ white cabbage, finely shredded', '2 garlic cloves, crushed', '2 tbsp tomato purée', '1.2 L vegetable stock', '2 tbsp red wine vinegar', '1 tbsp sunflower oil', '150ml soured cream, to serve', '1 bunch dill, chopped'],
    ['Soften the {onion} in the {sunflower oil} in a large pan for 5 minutes.', 'Add the {carrots}, {raw beetroot} and {garlic cloves} and cook for 5 minutes more, stirring.', 'Stir in the {tomato purée}, then pour in the {vegetable stock} and add the {potatoes}. Simmer for 20 minutes.', 'Add the {white cabbage} and simmer for 10 minutes, until everything is tender.', 'Stir in the {red wine vinegar} and season with salt and pepper.', 'Serve with a spoonful of {soured cream} and the {dill} on top.']],
  ['Soups', 'Red lentil and tomato soup', 'Cheap, filling and ready in half an hour.', ['vegan', 'quick'], { Serves: '4', Time: '30 minutes' },
    ['200g red lentils, rinsed', '1 onion, chopped', '2 garlic cloves, crushed', '1 tsp ground cumin', '400g chopped tomatoes (a tin)', '1 L vegetable stock', '1 tbsp olive oil', '½ lemon, juiced'],
    ['Soften the {onion} in the {olive oil} for 5 minutes, then add the {garlic cloves} and {ground cumin} for a minute.', 'Add the {red lentils}, {chopped tomatoes} and {vegetable stock}. Simmer for 20 minutes, until the lentils fall apart.', 'Blend until smooth, stir in the {lemon} and season.']],
  ['Cooking', 'Spaghetti carbonara', 'Silky egg and cheese sauce, no cream.', ['quick'], { Serves: '2', Time: '20 minutes' },
    ['200g spaghetti', '100g smoked pancetta cubes', '2 eggs', '50g parmesan, finely grated', '1 garlic clove, peeled and squashed', 'black pepper'],
    ['Cook the {spaghetti} in well salted boiling water.', 'Fry the {smoked pancetta cubes} with the {garlic clove} until crisp, then take out the garlic.', 'Beat the {eggs} with most of the {parmesan} and lots of {black pepper}.', 'Take the pan off the heat. Add the drained spaghetti and a splash of its water, then the egg mix, and toss quickly until creamy.', 'Serve with the rest of the parmesan.']],
  ['Cooking', 'Chicken fajitas', 'Smoky peppers and chicken, wrapped at the table.', [], { Serves: '4', Time: '30 minutes' },
    ['500g chicken breast fillets, cut into strips', '3 peppers, mixed colours, sliced', '1 red onion, sliced', '1 tsp smoked paprika', '1 tsp ground cumin', '1 lime, juiced', '1 tbsp olive oil', '8 tortilla wraps', '150g soured cream', '1 pack guacamole'],
    ['Toss the {chicken breast fillets} with the {smoked paprika}, {ground cumin}, half the {lime} and the {olive oil}.', 'Fry the chicken in a hot pan for 6 to 8 minutes until cooked through. Lift out.', 'Fry the {peppers} and {red onion} for 5 minutes, then put the chicken back with the rest of the lime.', 'Warm the {tortilla wraps} and serve with the {soured cream} and {guacamole}.']],
  ['Baking', 'Banana bread', 'The best use for black bananas.', ['vegetarian'], { Makes: '1 loaf', Time: '1 hour 15 minutes', Oven: '180°C (160°C fan), gas 4' },
    ['3 ripe bananas', '100g unsalted butter, melted', '150g light brown soft sugar', '2 eggs', '225g self-raising flour', '1 tsp baking powder', '1 tsp ground cinnamon', '50g walnuts, chopped'],
    ['Heat the oven and line a 900g (2 lb) loaf tin.', 'Mash the {ripe bananas}, then mix in the {unsalted butter}, {light brown soft sugar} and {eggs}.', 'Fold in the {self-raising flour}, {baking powder}, {ground cinnamon} and {walnuts}.', 'Bake for 50 to 60 minutes, until a skewer comes out clean. Cool in the tin for 10 minutes.']],
  ['Baking', 'Rustic white loaf', 'A crusty, open loaf with no kneading: mix it the night before, bake it in the morning.', ['vegetarian'], { Makes: '1 loaf', Time: '30 minutes, plus 12 to 18 hours rising', Oven: '230°C (210°C fan), gas 8' },
    ['500g strong white bread flour', '10g salt', '¼ tsp fast action dried yeast', '375ml lukewarm water', '1 tbsp olive oil, for the bowl'],
    ['In a big bowl, mix the {strong white bread flour}, {salt} and {fast action dried yeast}, then stir in the {lukewarm water} until there is no dry flour. It will be sticky.', 'Cover and leave at room temperature for 12 to 18 hours, until bubbly and more than doubled.', 'Tip onto a floured worktop and fold the edges into the middle a few times to make a round. Put it seam side down in a bowl rubbed with the {olive oil}, dusted with flour, and leave for 1 to 2 hours.', 'Meanwhile heat the oven with a lidded casserole dish inside for 30 minutes.', 'Turn the dough into the hot dish, slash the top, cover and bake for 30 minutes. Take the lid off and bake for 15 to 20 minutes more, until deep brown and hollow sounding underneath.', 'Cool on a rack for at least an hour before slicing.']],
  ['Baking', 'Chocolate chip cookies', 'Crisp edges, chewy middles.', ['vegetarian'], { Makes: '16', Time: '30 minutes', Oven: '190°C (170°C fan), gas 5' },
    ['125g unsalted butter, softened', '100g light brown soft sugar', '75g caster sugar', '1 egg', '1 tsp vanilla extract', '200g plain flour', '½ tsp bicarbonate of soda', '¼ tsp salt', '150g dark chocolate chips'],
    ['Heat the oven and line two baking trays.', 'Beat the {unsalted butter}, {light brown soft sugar} and {caster sugar} until pale, then beat in the {egg} and {vanilla extract}.', 'Mix in the {plain flour}, {bicarbonate of soda} and {salt}, then the {dark chocolate chips}.', 'Roll into 16 balls, space them well apart and bake for 10 to 12 minutes. Leave on the trays for 5 minutes to firm up.']],
];

// The example books (any not set up yet) and recipes, in the current space.
export async function addExamples(settings) {
  const books = settings.batch_sections || [];
  const missing = EXAMPLE_BOOKS.filter(x => !books.some(b => b.name === x.name));
  if (missing.length || !settings.batch_sections) await store.updateSettings({ batch_sections: books.concat(missing) });
  for (const [type, title, description, tags, fields, lines, steps] of RECIPES) {
    await store.create('recipes', { title, type, tags, description, fields, ingredients: lines.map(parseLine), steps: steps.map(text => ({ id: store.uuidv7(), text })), colour: null });
  }
  await store.updateSettings({ batch_examples: true });
}

// A brand new Batch Book: never had a recipe, on a device not signed in or signed up here as a new account
// (an account that already existed is only ever signed in to, so it never gets them).
export async function isBrandNew(settings, signedIn) {
  if (settings.batch_examples || (signedIn && !(await store.metaGet('new_account')))) return false;
  return !(await store.list('recipes', { includeDeleted: true })).length;
}
