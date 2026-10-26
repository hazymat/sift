// House styles: how an AI chat writes the recipes it turns into Batch Book's import format (batchbook.js).
// Two are built in; your own are in settings.house_styles ({ id, name, rules }), made and changed in Settings > Batch Book.
// The one picked last on the Import sheet is settings.import_style.
import * as store from './store.js';
import { IMPORT_EXAMPLE } from './batchbook.js';
import { toast, undoable } from './toast.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const BUILT_IN = [
  { id: 'as-written', name: 'Exactly as written', about: 'The recipe as it is, word for word: only put into Sift\'s format. For family recipes you don\'t want changed.',
    rules: `- Keep every recipe, and every amount, step and word of the method, as written. Don't leave anything out, reorder it, tidy it away or "improve" it.
- Only change what the format needs: the curly brackets round ingredients, and one step per line.` },
  { id: 'one-thing', name: 'One thing at a time', about: 'The method rewritten so you can do each step and move on without keeping anything in your head: prep hidden in the ingredients becomes steps, timers are set where a wait starts and the next step says "After 2 hours…", and things cooking at the same time are named so you know what to come back to. The AI lists what it changed.',
    rules: `Rewrite the method so a cook who finds it hard to keep track can do each step exactly as it says, then move on, with nothing to remember or work out. Keep every ingredient, amount, temperature and time.
1. Say what to do, not just the goal: "Put the lid on and turn the heat down until it just bubbles; look now and then that it isn't boiling over", not "simmer".
2. Waits you can walk away from (simmering, baking, proving, chilling, soaking): the step that starts it ends with "Set a timer for 2 hours." and says no other waiting time. The step for when it's done starts with how long it's been: "After 2 hours of simmering, ...". Cooking you stay with (frying, stirring, whisking) keeps its time in its own step: "Fry, stirring, until soft and see-through, about 10 mins."
3. Things on the go at the same time: give each a short name when it starts ("the broth", "the dough") and use that name when it comes back: "After the broth has simmered 2 hours, ...". Put that step where the wait really ends, with the steps that fit inside the wait before it. Start the longest things first.
4. No prep hidden in the ingredient list. Anything written there (peeled, finely chopped, grated, melted, softened, at room temperature, soaked, juiced, zested) gets its own step before the ingredient is needed. Do it at the start, or while waiting for something (water heating, the oven warming, a simmer) when there's clearly time. The cook is slow at peeling and chopping: allow 3 minutes an onion, 1 minute a garlic clove, 2 minutes a carrot or potato; if it won't fit in the wait, do it first. Keep those words in the ingredient list too, for shopping.
5. Ovens, big pans of water and anything slow to heat go on first, as their own step, as soon as it makes sense.
6. Say what done looks like where the recipe does ("until golden", "until a knife slides in easily").
7. Keep steps short: one job each, or a few things done in the same moment.
Before you reply, check each recipe: every prep word in the ingredients has a step; only "Set a timer" steps mention a wait you walk away from; every "After" step names what it's waiting for; every ingredient is still used.` },
];

export const stylesOf = settings => BUILT_IN.concat((settings?.house_styles || []).filter(style => style.name?.trim() || style.rules?.trim()));
export const styleOf = (settings, id) => stylesOf(settings).find(style => style.id === id) || BUILT_IN[0];

// What "Copy instructions for an AI chat" copies: the format, your books, and the house style's rules.
export function importPrompt(books, style) {
  const strict = style.id === 'as-written';
  return `Turn the recipes I give you (typed, pasted, from a web page, or photos of cards, books or handwriting) into text for my recipe app.

HOW TO REPLY
- Put all the recipes together in ONE Markdown code block (three backticks on the line before and after), so I can copy it in one go and paste it straight into the app. Inside the block use only the format below: no bold, no extra headings, no chat.
- Outside the block, write nothing, or one short line about anything you couldn't read, had to guess or added.${strict ? '' : `
- If the house style below made you change a method, say so outside the block, before it: a short "What I changed" list per recipe (for example "Moved the garlic chopping into step 2, while the water heats"), so I know it isn't word for word.`}

THE FORMAT (an example is at the end)
- "# " and the recipe's name starts each recipe.
- Straight under the name, one detail per line as "Name: value":
  - Book: ${books.length ? `the one it fits best out of my books: ${books.join(', ')}. Only if none fits, a new one named like those.` : 'a sensible one, for example Cooking, Soups, Baking or Cocktails.'}
  - Tags: a few words to find it by, with commas between.
  - Serves: and any other details the recipe gives (Makes, Oven, Tin size and so on).
  - Source: where it came from: the book, the website address, or for example "Granny's handwritten card".
  - Time: how long it takes from starting to eating, waiting included (proving, marinating, chilling overnight), with the hands-on part in brackets when that's useful, like "Time: 1 hr 30 mins (25 mins hands-on)". If the recipe says, write "Time:". If it doesn't, work it out from the steps as a real home cook would take, not a TV chef, and sign it with your own name as an AI: "Time (estimated by Claude): 45 mins", "Time (estimated by ChatGPT): 45 mins" and so on. Sign any other detail you had to guess the same way, like "Serves (estimated by Gemini): 4".${strict ? '' : `
  - Method: only when you changed the method for the house style, signed the same way: "Method: rewritten by Claude (${style.name})".`}
- A blank line, then the description: what it is in a line or two, then anything useful to know before cooking: which ingredients to buy and where, swaps, equipment, making ahead, keeping and freezing, the story behind it.
- "## Ingredients": one per line, amount and unit first ("250 g plain flour", "2 tbsp olive oil", "1 pinch salt"), anything more after a comma ("2 onions, finely chopped", "500 g chicken thighs, skin on"). A line like "### For the sauce" groups the ones under it. Keep the recipe's own units and amounts. Make sure every ingredient the method uses is in the list.
- "## Method": numbered steps. Write each ingredient as its name from the list in curly brackets, without its amount: {flour} for all of it, {1/2 flour} for half (any fraction or percentage), or {flour|sifted flour} for your own words (the app puts the amount in front; own words that already say how much, like {flour|a little flour}, show as written). The app shows the amounts and scales them. Use the brackets where an ingredient goes in or is first prepared; after that, just say "the chopped onion". Keep times and temperatures in the steps ("Bake at 200°C (180°C fan) for 25 mins").
- "## Tasting notes": only what the recipe or I say about how it tastes or turns out, or what it should taste like. Never shopping advice, tips or method: those go in the description. Leave this section out when there's nothing.

HOUSE STYLE: ${style.name}
${style.rules.trim()}

GETTING IT RIGHT
- From a photo or handwriting: copy what you can read, put [?] straight after any word or amount you're not sure of, and never make up a line you can't see.
- Write the recipe in the same language as the source.

${IMPORT_EXAMPLE}`;
}

// Settings > Batch Book: the house styles, built in ones to read or copy, your own to change.
export async function drawStyles(box) {
  const settings = await store.getSettings();
  const own = settings.house_styles || [];
  const save = list => store.updateSettings({ house_styles: list });
  box.innerHTML = `${BUILT_IN.map(style => `<details class="hs-style" data-id="${style.id}"><summary><b>${esc(style.name)}</b> <span class="muted">built in</span></summary>
      <p class="muted">${esc(style.about)}</p><pre class="hs-rules">${esc(style.rules)}</pre>
      <div class="sheet-actions"><button type="button" data-hs="copy">Make a copy to change</button></div></details>`).join('')}
    ${own.map(style => `<details class="hs-style" data-id="${style.id}"${style.id === box.dataset.open ? ' open' : ''}><summary><b>${esc(style.name || 'Untitled style')}</b></summary>
      <label>Name<input data-hs-field="name" value="${esc(style.name || '')}" placeholder="What to call it"></label>
      <label>Rules for the AI<textarea class="hs-rules no-inline" data-hs-field="rules" rows="8" placeholder="How the AI should write the method, in plain words">${esc(style.rules || '')}</textarea></label>
      <div class="sheet-actions"><span class="spacer"></span><button type="button" class="danger" data-hs="delete">Delete</button></div></details>`).join('')}
    <button type="button" data-hs="new">+ New house style</button>`;
  box.onchange = ev => {
    const field = ev.target.dataset.hsField, id = ev.target.closest('.hs-style')?.dataset.id;
    if (!field) return;
    save(own.map(style => style.id === id ? Object.assign({}, style, { [field]: ev.target.value }) : style)).then(() => { toast('✓ Saved'); if (field === 'name') { box.dataset.open = id; drawStyles(box); } });
  };
  box.onclick = async ev => {
    const act = ev.target.closest('[data-hs]')?.dataset.hs;
    if (!act) return;
    const id = ev.target.closest('.hs-style')?.dataset.id, from = BUILT_IN.find(style => style.id === id);
    if (act === 'new' || act === 'copy') {
      const made = { id: store.uuidv7(), name: from ? `${from.name} (my version)` : '', rules: from ? from.rules : '' };
      await save(own.concat(made)); box.dataset.open = made.id; return drawStyles(box);
    }
    if (act === 'delete') {
      const gone = own.find(style => style.id === id);
      await save(own.filter(style => style.id !== id)); drawStyles(box);
      undoable(`Deleted "${gone.name || 'Untitled style'}"`, async () => { await save((await store.getSettings()).house_styles.concat(gone)); drawStyles(box); });
    }
  };
}
