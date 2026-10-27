// What's new: after Reload on "A new version of Sift is ready" (or Settings,
// Check for updates), a sheet lists what changed, each with Show me. One update
// (everything published at once) at a time, headed with when it went live;
// ‹ Older and Newer › (or ← / →) step through every update there has been.
// Settings: Show update info (on unless turned off) and What's new (opens on
// the newest update).
//
// Every version bump adds its entry to WHATS_NEW (docs/working-notes.md):
//   'x.y.zz': [{ text, go, open, at, more }]
//   text  one plain line: what changed and where
//   go    the address to go to, e.g. '#/find-things'
//   open  selectors clicked in turn to get there (e.g. open the first box)
//   at    the element that changed: it's scrolled to and pulses
//   more  other places the same change reached, in words (one Show me covers them)
// No `at`: no Show me (a bug fix, a phone gesture).
// PUBLISHED: when each version went live (UTC), filled in by
// tools/published_times.py when publishing; versions with the same time went
// live together and show as one update. None yet: "Not published yet" (the dev page).
import * as store from './store.js';
import { VERSION } from './version.js';
import { flash } from './flash.js';
import { toast } from './toast.js';
import { keys } from './keys.js';
import { track, feature } from './stats.js';

const FIRST_BOX = ['#main .box-card[data-box]'];
export const WHATS_NEW = {
  '1.61.80': [{ text: "Brain Dump, Minimal style: each note is now its own square-edged box with a gap between them, so you can see clearly where one note ends and the next begins.", go: '#/dump', at: '#thoughts > li[data-id]' }],
  '1.61.79': [{ text: "Sharing: when you share a list, note, recipe, project or days, the people you've shared with before show under the email box, by name. One or two show as buttons to tap; with more, a list opens under the box and narrows as you type (↑ ↓ and Enter work too). Pick someone, then Share.", go: '#/lists', open: ['#main .list-card', '#main .project-head .share-menu > summary', '#main [data-act="share-people"]'], at: '.share-sheet .share-to' }],
  '1.61.78': [{ text: "Brain Dump: 👁 now has a Style choice, as in Tasks and Lists. Cards is the look you had; Minimal shows your notes as flat, square-edged rows with thin lines between them, like Minimal in Tasks. In Compact spacing each note is one line.", go: '#/dump', open: ['#main details.view-menu > summary'], at: '#main details.view-menu[open] .skin-opts' }],
  '1.61.77': [{ text: "Brain Dump: notes have no ⠿ handle any more, and the kind pill sits in its place at the top left. Press and hold a note to choose it, then keep your finger down and move to drag it; chosen notes drag from anywhere on them, several at once. With a mouse, just drag a note (a click still edits it).", go: '#/dump', at: '#thoughts > li[data-id]' }],
  '1.61.76': [{ text: "Contacts, Directory: the category tiles can be put in your own order. Press and hold one, then keep your finger down and move it (with a mouse, just drag it).", go: '#/contacts/directory', at: '#main .cat-cards' }],
  '1.61.75': [{ text: "New task is now exactly as tall as the tasks under it, in every style and spacing (Lists' Add items too). A task's note mark is the line drawing from Minimal in every style, and in the Day Planner.", go: '#/tasks/now', at: '#main .task-add-line' }],
  '1.61.74': [{ text: "The text cursor in New task and other lines inside a rounded box no longer has its top and bottom cut off.", go: '#/tasks/now', at: '#main .new-task-line' }],
  '1.61.73': [{ text: "Batch Book: going to another area and coming back lands where you left it: the same book, Recipes or Batches, the recipe or batch you had open, and the same scroll point. Remembered on each device.", go: '#/recipes', at: '#main .bb-mode' }],
  '1.61.72': [{ text: "Tasks, with a keyboard: ↑ from New task now goes up to the section tabs (Task Dump, Now, Next…), which flash yellow so you can see where you are. ← / → switch section there, and ↓ goes back into New task.", go: '#/tasks', at: '#task-views' }],
  '1.61.71': [{ text: "Lists: the Minimal style is here too. Open a list, press 👁 and pick Minimal under Style for flat rows with thin lines between them, like Tasks. An item's notes toolbar is now one bar joined to its notes box, in every style.", go: '#/lists', open: ['#main details.view-menu > summary'], at: '#main details.view-menu[open] .skin-pill' }],
  '1.61.70': [{ text: "iPad: the window's measurements show at the bottom left for 20 seconds when Sift opens or comes back from another app, to help track down buttons not answering taps after Split View. Taps go straight through them." }],
  '1.61.69': [{ text: "Tasks, Compact spacing on iPhone and iPad: opening a task (often a sub-task) no longer drops its name onto a line of its own under the tick box. It stays beside the tick.", go: '#/tasks/now', at: '#main .task-list > li[data-task]' }],
  '1.61.68': [{ text: "Batch Book: the example recipes already in your book are now in the One thing at a time house style too, unless you'd changed their method. So is the example in the instructions for an AI chat.", go: '#/recipes', open: ['#main .bb-card'], at: '#main .bb-steps' }],
  '1.61.67': [{ text: "Settings, This device: a Screen line shows the window's measurements, to help track down iPad buttons not answering taps after Split View.", go: '#/settings', at: '#screen-measure' }],
  '1.61.66': [{ text: "Tasks: task names on iPhone and iPad no longer sit low with their bottoms cut off (the tails of g, p and y showed). In Minimal with Compact spacing, rows are a little taller, a bit more on iPad.", go: '#/tasks/now', at: '#main .task-list > li[data-task]' }],
  '1.61.65': [{ text: "Batch Book, ⋯, Import recipes: a recipe with the same name as one you have now overwrites it, keeping its photos (Already here, under what was found, can leave them as they are instead). Its ingredients, method, notes and details all come from the import; photos on its old steps don't carry over. Undo puts it back.", go: '#/recipes', open: ['#main [data-act="import"]'], at: '.bb-import-sheet textarea' }],
  '1.61.64': [{ text: "Batch Book: recipe cards have no ⠿ handle any more. Press and hold a card to choose it, then keep your finger down and move to drag it; a chosen card drags from anywhere on it. With a mouse, just drag a card (a click still opens it, Ctrl+click chooses). Holding a card on an iPad no longer picks up its picture or link.", go: '#/recipes', at: '#main .bb-card-li', more: "The same on the Lists page's cards, Contacts and Cases, and Find Things' boxes." }],
  '1.61.63': [{ text: "Batch Book: export a single recipe. A recipe card's ⋯ and an open recipe's Share have ⬇ Export recipe, which saves it as a file that Import recipes reads back in.", go: '#/recipes', open: ['#main .bb-card-menu > summary'], at: '#main .bb-card-menu[open] [data-card="export"]' }],
  '1.61.62': [{ text: "Tasks, Minimal style: square corners throughout: an open task's frame, the list and the notes box with its toolbar are no longer rounded.", go: '#/tasks/now', at: '#main .task-list' }],
  '1.61.61': [{ text: "Tasks, Minimal style: dragging a task below the last one (or above the first) no longer cuts it off or makes it vanish; it stays in view and drops back where you want it." }],
  '1.61.60': [{ text: "Tasks, Minimal style: a task's pills and its full panel (More (full), Shift+Enter) are flat and compact to match: small square-ish pills, smaller fields and buttons, and thin lines between the panel's parts instead of boxes. In every style, the notes toolbar is now one square bar joined to the top of the notes box, its buttons side by side.", go: '#/tasks/now', at: '#main .task-list' }],
  '1.61.59': [{ text: "Tasks: the sections are yours now. ⋯ at the end of Task Dump, Now, Next, Later, Done, All opens Task sections: rename, reorder, add or remove sections, and give any of them an icon (line drawings, plain or shaded, or an emoji) and a colour. Removing one moves its tasks to Task Dump. The names moved here from Settings, Dictionary. Contracts' and Scans' reminders go to Later (Task Dump if you remove Later), and they now say so.", go: '#/tasks/now', at: '#main .task-sections-edit' }],
  '1.61.58': [{ text: "Batch Book, ⋯, Import recipes: pick a house style before copying the instructions for an AI chat. Exactly as written keeps a recipe word for word; One thing at a time rewrites the method so you can do each step and move on (prep from the ingredients becomes steps, a timer is set where a wait starts and the next step says After 2 hours…), and the AI lists what it changed. What's this? explains them.", go: '#/recipes', open: ['#main [data-act="import"]'], at: '.bb-import-style',
    more: "Settings, Batch Book, House styles: make your own, or change a copy of a built in one. Batch Book, ⋯, Export recipes saves every recipe as one file that Import recipes reads back in. The example recipes are written in One thing at a time (only ones added from now on). A step starting \"After 2 hours…\" no longer offers a timer: it's on the step before." }],
  '1.61.57': [{ text: "Tasks, Minimal style: the line-drawn 📝 note mark after a task's name sits level with the name instead of a little low, whatever the font." }],
  '1.61.56': [{ text: "Tasks, Minimal style: the tasks are full width again on a computer, and 👁 no longer has Width on a computer.", go: '#/tasks/now', at: '#main .task-list' }],
  '1.61.55': [{ text: "Tasks, Minimal style: on a computer the list of tasks is narrower, so the eye travels less. 👁 has Width on a computer under the Minimal tile: Full, Wide (the usual) or Narrow.", go: '#/tasks/now', open: ['#main details.view-menu > summary'], at: '#main .skin-choice' }],
  '1.61.54': [{ text: "Tasks, Minimal style: closer to Nirvana. In Compact spacing the rows are shorter (33 pixels) with smaller, lighter text, the lines between them are one even pixel, every row's ⠿ grab handle always shows, and the 📝 note mark and the other small marks (📅 📎 ⏱ 🔁 👤 📁) are line drawings instead of coloured emoji.", go: '#/tasks/now', at: '#main .task-list' }],
  '1.61.53': [{ text: "Lists: 👁 stays open when you pick a Style or tick one of its options, as in Tasks, so you can try each one in turn.", go: '#/lists', open: ['#main details.view-menu > summary'], at: '#main .skin-opts' }, { text: "Projects: on an open project, 👁 and ⋯ sit at the far right of the top bar again, not straight after Tasks | Projects.", go: '#/tasks/projects', open: ['#main .project-card'], at: '#main .tasks-head .page-cog' }],
  '1.61.52': [{ text: "Tasks and Lists: 👁 has a Style choice at the top in place of the Lined Paper tick box: Cards (each task in its own box, as before) or Lined paper, which has its own Show margin and Alternate shading. Tasks also has Minimal, flat rows close together like a plain to-do app, with New task a line set apart above them and new tasks always going at the top. Spacing works with every style.", go: '#/tasks/now', open: ['#main details.view-menu > summary'], at: '#main .skin-opts', more: 'Lists: the same Style choice (Cards or Lined paper).' }],
  '1.61.51': [{ text: "Tasks and lists: choosing a task or item with sub-items (its ⠿) now shows its sub-items chosen too, in a lighter shade, because whatever you do to it happens to them as well. Done (or Tick and Untick in a list) now does its sub-items too, as Archive, Delete and Move already did.", go: '#/tasks', at: '#main .task-list', more: "The same wherever rows have sub-rows: an open list, a box's things in Find Things, and the managers for categories and groups." }],
  '1.61.50': [{ text: "Batch Book: on a batch, Add to list puts things on a list you already have under one item named after the batch, with the ingredients as its sub-items, rather than loose among your other items.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-batch-row'], at: '#main .bb-listline' },
    { text: "Batch Book: choosing another list for a batch's shopping removes the list that was made for the batch, once nothing else is on it.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-batch-row'], at: '#main .bb-listline' }],
  '1.61.49': [{ text: "Lists: choose items by their ⠿ and press Cut (X or Ctrl+X) on the bar, then open another list and press 📋 Paste (Ctrl+V). The items move over with their sub-items, ticks, notes and files. They're copied as text too, so they paste into Add items or another app.", go: '#/lists', open: ['#main .list-card'], at: '#main .checklist' },
    { text: "Lists: press and hold two or more lists to choose them, then Combine lists on the bar puts all their items into the first one chosen. The others go to the Bin, and Undo puts them back.", go: '#/lists', at: '#main .list-grid' }],
  '1.61.48': [{ text: "Follow along: tap an ingredient (in the list, or the amber words in a step) to see it in full with its amount in other measures: grams or kilos first, then ounces, pounds, cups, fl oz, pints and so on. Pints, fl oz, quarts, gallons and cups have UK and US buttons to say which the recipe means.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-follow'], at: '.fa-ing-list' }],
  '1.61.47': [{ text: "Follow along: a recipe it can't find on this device for a moment (after an update, or before syncing) keeps its place instead of being dropped, so cooking carries on after Reload.", go: '#/recipes', at: '#main .bb-cooking' }],
  '1.61.46': [{ text: "Batch Book: a recipe's or batch's steps can be put in a new order. Hold a step (or its ⠿) and drag it, or press Shift+Alt+↑ / ↓ while writing one. Tap the ⠿ to choose steps, then D deletes them.", go: '#/recipes', open: ['#main .bb-card'], at: '#main .bb-step-list' }],
  '1.61.45': [{ text: "Batch Book, ⋯, Import recipes: Copy instructions for an AI chat now lists your own books, so the AI puts each recipe in the one it fits best.", go: '#/recipes', open: ['#main [data-act="import"]'], at: '.bb-import-sheet [data-imp="prompt"]' }],
  '1.61.44': [{ text: "Batch Book, ⋯, Import recipes: Copy instructions for an AI chat asks for one box you can copy in one go, a Time detail (signed by the AI when it's a guess, like Time (estimated by Claude)), a Source, buying tips in the description rather than Tasting notes, and [?] for words it can't read in photos.", go: '#/recipes', open: ['#main [data-act="import"]'], at: '.bb-import-sheet [data-imp="prompt"]' }],
  '1.61.43': [{ text: "Batch Book: the scale buttons have ×⅔ too, between ×½ and ×1, on recipes, batches and in Follow along.", go: '#/recipes', open: ['#main .bb-card'], at: '#main .bb-scale' }],
  '1.61.42': [{ text: "Music from other apps keeps playing when you tap around Sift, with or without a timer going. Only a timer's beep stops it.", at: '#timer-dock' }],
  '1.61.41': [{ text: "Day Planner printout (Print, Share as picture or PDF): everything on the day's schedule now shows, ticked ones with a ✓ in front instead of crossed out, and tasks you ticked off show at the time you ticked them. The hours stretch to fit anything planned outside them.", go: '#/planner', open: ['#main .share-menu summary'], at: '[data-print-day]' }],
  '1.61.40': [{ text: "iPad: after a screenshot, Sift should come back full width with Share, 👁 and ⋯ at the top right working again.", go: '#/planner', at: '#main [data-act="today"]' }],
  '1.61.39': [{ text: "Music from other apps (YouTube Music and so on) keeps playing while you use Sift, Follow along and timers included. Only a timer's beep stops it, and Sift lets go again once the beeping stops or you mute it.", at: '#timer-dock' }],
  '1.61.38': [{ text: "Day Planner, Print and Share as picture or PDF: with Google Calendar connected, the preview was a blank white page. It now shows the day sheet, with your calendar events on the schedule.", go: '#/planner', open: ['#main .share-menu summary'], at: '[data-print-day]' }],
  '1.61.37': [{ text: "Print and Share screens on a phone: the preview at the top showed only a blank white page, scrolled off its top. It now shows the whole page, with the choices underneath. Day Planner's Share as picture and Share as PDF open straight in sharing." }],
  '1.61.36': [{ text: "Timers: tap a timer's time, then ⏲ Set to… to pick exactly how long is left on the wheel. ↺ Revert now has Undo too.", at: '#timer-dock' }],
  '1.61.35': [{ text: "Timers: a finished timer beeps on the device that started it, and on any that had Follow along open since. Other devices just show it red. With Sift in the background it beeps for a minute, then stops.", at: '#timer-dock' }],
  '1.61.34': [{ text: "Timers: tap a timer's time. Under it, \"Step 3 · Borscht\" has a Go to step 3 link that opens Follow along on that step. −5 to +5, ↺ Revert and the new ↻ Restart are now one box.", at: '#timer-dock' }],
  '1.61.33': [{ text: "Day Planner printout: Energy shows just the day's ⚡ right after the word (nothing when it isn't set), leaving the line to write on. The day and date, and Sift · Day sheet, stay on one line on every paper size.", go: '#/planner', open: ['#main .share-menu summary'], at: '#main [data-print-day]' }],
  '1.61.32': [{ text: "Photos: a tall (portrait) photo opened full screen, like a Batch Book recipe photo, now shows whole instead of the bottom being cut off." }],
  '1.61.31': [{ text: "Batch Book, Follow along: what you're cooking is the same on all your devices (signed in to sync): the recipes open, the step each is on, ticks, scale and the clock. Start on the iPad and the ▶ Cooking pill shows on your phone too.", go: '#/recipes', at: '#main .bb-cooking' }],
  '1.61.30': [{ text: "Phones: a tap at the very bottom of the bottom bar, just under a button, now opens that area instead of doing nothing." }],
  '1.61.29': [{ text: "Phones: a box that asks you to type something, like Batch Book's + Add a detail, now sits just above the keyboard instead of the page jumping about behind it and the box sometimes vanishing.", go: '#/recipes', open: ['#main .bb-card'], at: '#main .bb-add-field' }],
  '1.61.28': [{ text: "Timers: after changing a timer, its menu has ↺ Revert to 5:00, counting down as if you'd never changed it; tap it to go back to that.", at: '#timer-dock' }],
  '1.61.27': [{ text: "Timers: the top of a timer's menu is a summary: the time, its name and recipe, what it was set for and at what time, and any change with ↺ Revert.", at: '#timer-dock' }],
  '1.61.26': [{ text: "Batch Book, Follow along: ⏱ Start the clock, above the first step, notes when you began. Then the recipe's title shows when it started and how long it's been, and All done uses it for the time taken.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-follow'], at: '.fa-start-clock' }],
  '1.61.25': [{ text: "Timers: the menu's tiles go −5, −1, +1, +5. Once you've changed a timer, under its time it says what it was and the change, with ↺ Revert. A finished timer stays red while its menu is open, and tapping the timer again closes the menu.", at: '#timer-dock' },
    { text: "Timers: the alarm sound is made ready by any tap, so it plays on iPhone and iPad (even with the silent switch on, where supported)." }],
  '1.61.24': [{ text: "Batch Book, Follow along: the All done card is now its own card under the last step, set out like a report: the time taken (✎ to change it), switches for Save it on the recipe and Keep this cook as a batch, and photos with where they go. Nothing is saved until ✓ Finish, which says what it will do, and Undo takes it all back.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-follow'], at: '.fa-drum' }],
  '1.61.23': [{ text: "Batch Book: while something's cooking, the ▶ Cooking pill on the list is green, like Follow along.", go: '#/recipes', at: '#main .bb-cooking' }],
  '1.61.22': [{ text: "Follow along: a timer on the wrong recipe? Tap it, then ➜ Move to another recipe and pick the right one.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-follow'], at: '.fa-top' }],
  '1.61.21': [{ text: "Timers: when one runs out, 🔕 silences it and it stays, still counting how long it's been over; then ✕ removes it (with Undo). Its menu has big +5, +1, −1, −5 tiles, and ↺ Take back +10 min undoes what you added or took off.", at: '#timer-dock' }],
  '1.61.20': [{ text: "Batch Book, Follow along: tick the last step and an All done card shows under it: how long it took (timed for you, change it if you like) to save on the recipe, Add a photo (on the recipe or the batch), Save as a batch, and ✓ Finish.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-follow'], at: '.fa-drum' }],
  '1.61.19': [{ text: "Timers: a countdown that has run out keeps counting how long it's been over, in brackets after 0:00, like 0:00 (+2:35).", at: '#timer-dock' }],
  '1.61.18': [{ text: "Batch Book, Follow along: drag a whole recipe tab sideways to change the order; the others make way round a dotted gap (touch screens: hold a moment first). Tapping another tab now switches recipe.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-follow'], at: '.fa-tabs' }],
  '1.61.17': [{ text: "Batch Book, Follow along: \"A new version of Sift is ready\" shows while cooking too, and Reload brings you straight back to Follow along." },
    { text: "Batch Book, Follow along: ◫ Side by side shows it's on as soon as you tap it on a touch screen." }],
  '1.61.16': [{ text: "Batch Book, Follow along: drag a recipe's tab by its ⠿ (or, side by side, its title) to choose which recipes show side by side and in what order: the first tabs show. Tapping a tab that isn't showing swaps it in.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-follow'], at: '.fa-tabs' },
    { text: "Batch Book, Follow along: a step you've ticked off has a small green ✓ beside its Step number, and ✕ on a recipe's tab has Undo.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-follow'], at: '.fa-cur .fa-num' },
    { text: "Batch Book, Follow along: a recipe or batch changed while it's open (here or on another device) updates straight away, at the same step." },
    { text: "Batch Book: a recipe's top buttons each have their own colour: ▶ Follow along green, 🧪 Make this light blue, Share plain.", go: '#/recipes', open: ['#main .bb-card'], at: '#main .bb-follow' }],
  '1.61.15': [{ text: "Batch Book, Follow along: the green ✓ Done, next pill at the bottom right of the step you're on ticks it off (a big green tick on its left) and rolls on to the next step. ↺ Not done takes it back; on a computer, Enter does it too.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-follow'], at: '.fa-cur .fa-done-btn' },
    { text: "Batch Book, Follow along: it's now a page of its own, so nothing underneath can be scrolled into view or catch taps (the iPad's top right buttons stopped working). Closing it brings you back where you were.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-follow'], at: '.fa-top' },
    { text: "Batch Book, Follow along: ◫ Side by side shows three recipes on an iPad Pro in landscape and four on a big screen. Each has its name big, underlined in its book's colour.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-follow'], at: '.fa-top h1' },
    { text: "Batch Book, Follow along: + Recipe also offers your batches, folded in their own 🧪 Batches panel, newest first. A search opens it when a batch matches.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-follow'], at: '[data-fa=\"add\"]' }],
  '1.61.14': [{ text: "Batch Book: ▶ Follow along is now at the top of a recipe or batch, by Make this. On the main page, a card's ⋯ menu has ▶ Follow along and 🧪 Make at the top instead of the Make pill under each card.", go: '#/recipes', at: '#main .bb-card-menu summary' },
    { text: "Batch Book, Follow along: ✓ Finished cooking no longer asks about timers. It clears the recipes and their timers, and Undo in the message brings them all back.", go: '#/recipes', open: ['#main .bb-card'], at: '#main .bb-follow' },
    { text: "Batch Book, Follow along: a step that mentions more than one time (\"+5 mins … +10 more mins\") has a Start button for each, not just the first.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-follow'], at: '.fa-wait' },
    { text: "Batch Book: a card's ⋯ menu no longer opens underneath the search bar." }],
  '1.61.13': [{ text: "Timers: tapping a timer's time opens a proper list (+5, +1, −1, −5 min, Rename, Remove) that stays open while you add time. Remove has Undo instead of doing nothing, and a step's Start timer button no longer starts a second copy.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-follow'], at: '.fa-add' },
    { text: "Timers: press and hold a timer (or ☑ Choose several in its list) to choose several, then use the bar at the bottom to add or take off time, pause, carry on or remove them all at once.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-follow'], at: '.fa-add' }],
  '1.61.12': [{ text: "Batch Book: ▶ Follow along, by the Steps heading of a recipe or batch, opens it to cook from: one step at a time in big writing with its photo, the steps before and after smaller either side, and the ingredients with the scale (on a phone, folded at the top). Read only, and it keeps the screen on.", go: '#/recipes', open: ['#main .bb-card'], at: '#main .bb-follow' },
    { text: "Batch Book, Follow along: cook several at once. + Recipe adds another as a tab (tap a tab, or swipe on a phone, to switch), ◫ Side by side shows two or three at once on an iPad or computer, and 🍳 Cooking on Batch Book's main page gets you back in. ✓ Finished cooking clears them all.", go: '#/recipes', open: ['#main .bb-card'], at: '#main .bb-follow' },
    { text: "Batch Book, Follow along: ⏲ + Timer starts countdowns and stopwatches, as many as you like. A step that says \"15 minutes\" has a one-tap timer. They're synced, so they keep going if Sift is closed or on another device, and show at the bottom right of every page. A finished one turns red and beeps until you press ✕.", go: '#/recipes', open: ['#main .bb-card'], at: '#main .bb-follow' }],
  '1.61.11': [{ text: "Batch Book: a new recipe goes first in its book, so you can find it again. 👁 has Sort: Your order (drag them), Newest first, Oldest first, A to Z, Most made or Made lately. On a book's tab it sorts that book; on All it sorts every book. Dragging a recipe switches its book back to Your order.", go: '#/recipes', open: ['#main .bb-head .page-cog summary'], at: '#main .bb-sort-opts' }],
  '1.61.10': [{ text: "Batch Book: batch rows are tidier. The ⠿ for choosing sits inside each row, as in Tasks, and Delete is a red pill that always sits at the right end of the row. A new recipe you leave without filling anything in isn't kept.", go: '#/recipes', open: ['#main .bb-card'], at: '#main .bb-paper .bb-batch-list' }],
  '1.61.09': [{ text: "Batch Book: on an open recipe, each batch at the bottom has a Delete pill. Tap a batch's ⠿ (or press and hold it) to choose several, then Delete on the bar. The scale buttons have ×4 too, on recipes and batches.", go: '#/recipes', open: ['#main .bb-card'], at: '#main .bb-paper .bb-batch-list', more: 'A batch\'s scale buttons (×⅓, ×½, ×2, ×4, ×…) change its own amounts, as before.' }],
  '1.61.08': [{ text: "Sharing: every Share menu now has 🖼 Share as picture… and 📄 Share as PDF… under Print…. They open the same screen as Print, so you choose what goes in, then press Share. Printouts with photos (recipes, cases, notes) have a Photo size choice: Small, Medium, Large or Extra large.", go: '#/recipes', open: ['#main .bb-card', '#main .bb-top .share-menu summary'], at: '#main .bb-top [data-page-print="png"]' }],
  '1.61.07': [{ text: "Printing: the Print screen has Share as 🖼 Picture or 📄 PDF. The printout, colour, photos and layout, goes to your phone's share sheet as a file, ready for WhatsApp. On a computer it's saved (a picture is copied too, to paste into WhatsApp Web).", go: '#/recipes', open: ['#main .bb-card', '#main .bb-top .share-menu summary', '#main .bb-top [data-page-print]'], at: '.print-share', more: 'Works for every printout: recipes, labels, day sheets, lists, cases, scans and notes.' }],
  '1.61.06': [{ text: "Batch Book, Tasks, Brain Dump and every area with a bar that stays at the top: the bar no longer slides up a little and jumps back as you start scrolling (or on the way back up). It glides into place.", go: '#/recipes', at: '#main .bb-sticky' }],
  '1.61.05': [{ text: 'Batch Book: tags are a Tags dropdown at the right of the books bar instead of a row of pills, so the recipes start higher up. The ⋯ for editing books is now at the end of the books (also in the page\'s ⋯ menu, as Edit books).', go: '#/recipes', at: '#main .bb-sections-bar' }],
  '1.61.04': [{ text: "Keyboard: the arrow keys work the same in every area. ↓ from the search box stops on the filter row (Scans' kinds, Contracts' Current or Ended, Lists or Templates, Contacts' tabs, Archive and Bin), ← and → switch filter, ↓ again goes to the cards. In Tasks, the Day Planner, an open list and a box, Esc out of a name keeps that row highlighted, so ↑ and ↓ carry on and Enter edits it again.", go: '#/scans', at: '#main .scan-kinds' }],
  '1.61.03': [{ text: "Contacts and Contracts: an open contact or contract has the Share pill top right, with the copies and Print…: a tidy sheet with its details, notes and log (a contact) or note and files (a contract). A contract's reference prints hidden unless you choose it in full.", go: '#/contracts', open: ['#main tr[data-id], #main .contract-card'], at: '#main .project-head .share-menu' }],
  '1.61.02': [{ text: "Brain Dump: a note's ⋯ has Print…: the note with its title big, when it was written, its pictures small or big and lines to write more, in the note's colour or black and white. Its copies now match every Share menu: plain text, rich text, WhatsApp and Markdown.", go: '#/dump', open: ['#thoughts > li[data-id] details.note-more > summary'], at: '#thoughts [data-act="print-note"]' }],
  '1.61.01': [{ text: "Batch Book: an open recipe or batch has a Share pill: Share with someone…, the copies, Print… and 🏷 Print labels…. Print the whole recipe scaled up or down (×½, ×2 or any amount you type), short ones two or three to a page; a batch adds its readings, diary and tasting notes.", go: '#/recipes', open: ['#main .bb-card'], at: '#main .bb-top .share-menu', more: 'Print labels… makes labels for bottles, jars, tins or boxes on the usual A4 label sheets (21, 8 or 4 to a sheet), starting part way down a used sheet.' }],
  '1.61.00': [{ text: "Scans: an open scan has a Share pill top right: Share the file…, Copy the text on it, the copies and Print…. Print in colour, grey or black and white with Contrast and Lightness sliders, one or two to a page, with its title and date, and the text read on it on a page of its own.", go: '#/scans', open: ['#main .scan-card'], at: '#main .project-head .share-menu', more: 'Black and white makes faded receipts and letters crisp and saves ink.' }],
  '1.60.99': [{ text: "Lists: an open list has the Share pill (👥 Share with someone… is in it now) with Print…: the list with round ticks under its name and a line in its colour, in two columns, one column or as pocket cards (four to a page, to cut out), with blank lines to add more.", go: '#/lists', open: ['#main .list-card'], at: '#main .project-head .share-menu', more: "An open project's 👥 Share is now its Share pill too, with Print… for its tasks." }],
  '1.60.98': [{ text: "Contacts and Cases: an open case's Share has Print…: a case report with its details and Timeline, photos as thumbnails, full size at the end, names only or left out, in colour or black and white (lines only, photos in grey).", go: '#/contacts/cases', open: ['#main [data-case-row]', '#main .kase-top .share-menu summary'], at: '#main .kase-top [data-page-print]', more: "Every area's Share menu now ends with Print… (what the page shows, as a tidy list; in Tasks, only the chosen tasks when some are chosen) and has Copy to clipboard – Markdown." }],
  '1.60.97': [{ text: "Batch Book: 👁 Spacing now changes the recipe cards. Tight shows small cards with just the picture and name, so many more fit on the screen. Medium (the usual) shows the picture, name and description, without tags or how often it's been made. Loose shows everything. Every card keeps Make, ★ and ⋯.", go: '#/recipes', open: ['#main details.view-menu > summary'], at: '#main .density-opts' }],
  '1.60.96': [{ text: "Day Planner: Share, Print this day… prints a day sheet to fill in with a pen: the schedule, the day's tasks and blank lines to add more, Day focus and Energy, and a blank Notes space. A5, A4, A3 or Letter, in colour or black and white, one day or a week. It prints an empty day too. Advanced's Share has a Print button for its day report.", go: '#/planner', open: ['#main .share-menu summary'], at: '#main [data-print-day]' }],
  '1.60.95': [{ text: "Batch Book: dragging a recipe straight sideways now moves the recipe next to it out of the way and shows the gap, without having to drag down a little first. A recipe can no longer be dragged above its book's title. The same goes for the Lists page's cards and Brain Dump's notes.", go: '#/recipes', at: '#main .bb-card-li' }],
  '1.60.94': [
    { text: "Contacts and Cases, Cases: the list is now a details table, like a file explorer's. Opened comes first, then the case's name in bold, its status, people, latest entry, when it was last updated, how many entries and files, and its reference. Drag a column's edge to make it wider or narrower, click a heading to sort by it (again for the other way), and its ▾ sorts or filters it, as in a spreadsheet.", go: '#/contacts/cases', at: '#main .dt-wrap, #main .case-cards' },
    { text: "Contacts and Cases, Cases: Open, Closed and All along the top show just the cases you want. 👁 has Show cases as Details or Cards: cards look like Batch Book's, with each case's status, summary or latest entry, people and reference, and they drag into your own order. In All, dropping a card under Closed closes the case.", go: '#/contacts/cases', open: ['#main details.view-menu > summary'], at: '#main [data-case-look]', more: "Hold a card to choose several, then change their status, archive or delete them from the bar at the bottom." },
    { text: "Contacts and Cases, Recent: contact cards drag too. Hold a card's ⠿ and drop it where you want it; contacts you never drag keep to the most recently used first.", go: '#/contacts', at: '#main .recent-list' },
  ],
  '1.60.93': [{ text: "Batch Book: a recipe dragged by its ⠿ handle now stays under the pointer (before, it moved at half the speed and fell behind), the other recipes slide aside, and a dashed outline shows the gap it will drop into, as when dragging a task. The same goes for the Lists page's cards and Brain Dump's notes.", go: '#/recipes', at: '#main .bb-card-li' }],
  '1.60.92': [{ text: "Contacts and Cases: an open case has a whole new look. The case is a card with its status colour down the side, its name as a heading and a big status button (tap it to change Open, Waiting or Closed), with days open, entries and time since the last, and its references and people as chips (tap a reference to copy it). New entry has big kind tiles, Received or Sent, a When button that says Now (tap it to pick another time), 📷 and 📎, all one size. Share and ⋯ are at the top right.", go: '#/contacts/cases', open: ['#main .c-list .c-card a.c-main'], at: '#main .kase-hero' }],
  '1.60.91': [{ text: "Contacts and Cases: the Recent, Directory and Cases tabs under + New stand out now, each with its own colour and emoji (🕘 📇 🗂️), as Batch Book's books do.", go: '#/contacts', at: '#c-tabs' }],
  '1.60.90': [{ text: "Filter bars that scroll sideways (Batch Book's books, Brain Dump's types and the rest) stay where you scrolled them when you tap one, and the one you picked stays in view. Before, Batch Book's books jumped back to the start.", go: '#/recipes', at: '#main .bb-sections' }],
  '1.60.89': [{ text: "Contacts and Cases: an open case has a new look. ‹ Cases is at the top left (no + New case or tabs above it), with the case's name big under it. New entry comes first, then the case's photos and documents, then the Timeline: each event in its own callout, its emoji in a circle on a line down the left, its date first, months marked. Status, summary, references and people are in Details at the bottom.", go: '#/contacts/cases', open: ['#main .c-list .c-card a.c-main'], at: '#main .ctl', more: "An open contact also hides + New contact and the tabs above it." }],
  '1.60.88': [{ text: "Contacts is now called Contacts and Cases. On a case, New entry is a box of its own: pick the kind (Letter, Call, Note…), say what happened, set When, and 📎 Attach photos or documents to that entry, so a letter keeps its date and its place in the Timeline. An entry's files show under it, and ✎ on a saved entry adds or removes them. + Task for this case moved to the bottom of the page.", go: '#/contacts/cases', open: ['#main .c-list .c-card a.c-main'], at: '#main .log-box[data-log-form]', more: "A contact's own Log has the same box and Attach. Files dropped on an entry in the Timeline go on that entry." }],
  '1.60.87': [{ text: "Scans: the scanned look now keeps colour. The paper still comes out white with the shadows gone, but coloured print, logos and stamps keep their colour. For black and white as before, tick 👁, Layout, In black and white (under the scanned look).", go: '#/scans', open: ['#main details.view-menu > summary'], at: '#main [data-layout-set="scan-grey"]' }],
  '1.60.86': [{ text: "Scans: Photos, beside Scan, takes photos you already have (from your photo library or files) and treats them like a new scan: cut to the page's edges, given the scanned look, and their text read. On a scan's page, From photos beside + Page adds one as the next page.", go: '#/scans', at: '#main [data-act="photos"]' }],
  '1.60.85': [{ text: "Contacts, a case: attach photos and documents under Files (Attach photos or documents, or drop them on the case); each shows in the Timeline too. Add note is gone: Log it has a ✎ Note kind for anything else. Every entry's When starts at the time now (Now puts it back) and ✎ beside a saved entry changes its date, time and words.", go: '#/contacts/cases', open: ['#main .c-list .c-card a.c-main'], at: '#main .case-files', more: "A contact's own Log has the same When with Now, and ✎ on each logged call or visit." }],
  '1.60.84': [{ text: "Tasks, Lists, Find Things and the Day Planner: a task or item moved with Shift+Alt+↑ or ↓ gives one quick yellow pulse where it lands (its sub-tasks or sub-items too), so you can see where it went.", go: '#/tasks', at: '#main .task-list > li[data-task] > .task-title' }],
  '1.60.83': [{ text: "Scans, with sync on: choose which scans stay on this device to save space. On a scan's page, untick Keep on this device (by Pages): its pages leave this device once they're on your server, its card shows ☁ Server, and they come back whenever you open them. To keep only the scans you tick, untick 👁, Layout, Keep every scan's pages on this device.", go: '#/scans', open: ['#main details.view-menu > summary'], at: '#main [data-layout-set="keep-all"]', more: "A scan's own Keep on this device is on its page, beside Pages." }],
  '1.60.82': [{ text: "Tasks, Lists, Find Things and the Day Planner: with the cursor in a task's or item's name or note, Shift+Alt+↑ or ↓ moves it up or down the list, its sub-tasks or sub-items going with it. The cursor stays where it was, so you can carry on typing.", go: '#/tasks', at: '#main .task-list > li[data-task] > .task-title', more: "The same in the Day Planner's Tasks, Advanced, an open list and a box's things. A sub-task moves among its parent's sub-tasks, and never out of them." }],
  '1.60.81': [{ text: "Scans and attached files: a PDF now shows a small picture of its first page, marked PDF with its number of pages, instead of a plain file chip; the scan's card shows it too, with the PDF's pages counted. Opening it shows the picture above Open. Its text shows under Text on it and is searched (a PDF that's only pictures of pages has its first page read).", go: '#/scans', at: '#main .scan-grid', more: 'Every area with attached files: Brain Dump, Tasks, the Day Planner, lists, Find Things, Contracts.' }],
  '1.60.80': [
    { text: "Scans: a page photographed with Scan on a phone is now cut to the edges of the paper and straightened, so the table around it goes and a page shot at a slant comes out square. If the edges can't be found clearly, the whole photo is kept.", go: '#/scans', open: ['#main details.view-menu > summary'], at: '#main [data-layout-set="scan-edges"]' },
    { text: "Scans: the text on photographed pages is read, on your device (nothing is sent anywhere), and shows under Pages as Text on it, with Copy. Searching Scans finds words in it. The first time, Sift fetches its reader (about 7 MB) from its own site.", go: '#/scans', open: ['#main .scan-card'], at: '#main .scan-text-sec', more: 'Switch either off in 👁, Layout.' },
  ],
  '1.60.79': [{ text: "Scans: a page photographed with Scan on a phone now looks scanned: grey, with the paper white and the writing dark, and the shadows and yellow light taken out. Untick it in 👁, Layout to keep photos in colour.", go: '#/scans', open: ['#main details.view-menu > summary'], at: '#main [data-layout-set="scan-look"]' }],
  '1.60.78': [{ text: "Day Planner, Advanced: Shift with ↑ or ↓ in Add a comment (or a task's name) no longer starts choosing tasks; it selects the typed text to the start or end, as anywhere else. Tasks are chosen only from the ⠿ grab bars on the left, and Esc lets go of the chosen tasks, as in Tasks.", go: '#/planner/today/advanced', at: '#main .adv-row .drag-handle' }],
  '1.60.77': [{ text: "Keyboard browsing: going back up with the ↑ arrow no longer leaves the outlined box, note or card hidden under the bar at the top of the page (Find Things, and every other area with a bar that stays put)." }],
  '1.60.76': [{ text: "Day Planner: clicking into a task in the Tasks list beside the schedule no longer squeezes its name into a narrow strip. Its More button there is smaller (no Shift and Enter key boxes), so the name keeps most of the column.", go: '#/planner', at: '#main .pile-paper' }],
  '1.60.75': [{ text: "Pictures and files: the viewer that opens when you press an attached photo or file now has a Share button at the top left. On an iPhone it opens the share sheet with the picture or file itself (Messages, Mail, Save Image and so on); on Windows, Windows' Share. Where a browser can't share files (Firefox on a computer), the same button saves a copy instead.", go: '#/dump', open: ['#main .att-open, #main .att-count'], at: '.att-view .av-share', more: 'The same viewer, and its Share button, opens from Tasks, the Day Planner, lists, Find Things and Scans.' }],
  '1.60.74': [{ text: "iPhone: the bar of areas at the bottom, tabs and buttons can no longer be selected as text. A bit of selected text left on the page also no longer stops you dragging a task onto another one to make it a sub-task." }],
  '1.60.73': [{ text: "Tasks on iPhone: holding your finger on the list no longer starts a text selection that covers the rows in blue blocks. Typing in a task's name or note selects text as before." }],
  '1.60.72': [{ text: "Tasks: New task now writes like a pad. Type a task and press Enter: it goes in just under the New task line and the cursor carries on in a fresh line under it, so tasks go down the page in the order you type them. Tab makes the next line a sub-task, Shift+Tab brings it back; Esc or clicking away finishes. Advanced's New task keeps them in typed order too. To go back to how it was, untick 👁, Layout, Write like a pad.", go: '#/tasks', at: '#task-new' }],
  '1.60.71': [{ text: "Tasks and Projects: a task you tick off now stays gone after it fades away, instead of coming back into the list for a minute. Show done brings it back." }],
  '1.60.70': [{ text: "Lists and Find Things: opening or closing a card just as you switch away from the tab or app no longer causes a hidden error. Nothing else changes." }],
  '1.60.69': [{ text: "Lists, Tasks: on a phone, an item dragged onto another one now goes inside it when you let go, as its dashed outline showed, rather than landing underneath it.", go: '#/lists', at: '#main .list-card' }],
  '1.60.68': [{ text: "View case now looks like Advanced's ticket queue: an Open or Closed label by the name with ✓ Mark case done beside it, tiles for working time, open time, opened and closed, then cards for the description and Add a comment, the history (grouped by day, comments marked in amber, opened in blue, closed in green) and the details as a list.", go: '#/planner/today/advanced', open: ['#main .adv-row .adv-case-chip'], at: '.case-page .case-stats' }],
  '1.60.67': [{ text: "Day Planner, Advanced: laid out like an IT ticket queue. Counts at the top (To do, Done, Updates today, Scheduled), then one card with column heads (Status, Task, Latest update, Updated), To do and Done group bars, and a compact row per task with its status badge and when it was last updated. The schedule is a card on the right. Everything works as before: ticks, dragging, comments, View case, ⋯, Share and the Selections bar.", go: '#/planner', at: '#main .advanced-link' }],
  '1.60.66': [
    { text: "View case: Working time (from the first comment to closed) and Open time (from when the task was made to closed) show beside its status; while it's open, the time so far.", go: '#/planner/today/advanced', open: ['#main .adv-row .adv-case-chip'], at: '.case-page .case-grid' },
    { text: "Advanced, Share: choose Time taken on each case (Working time, Open time, Both or None), and Copy as rich text now gives a smart report: a dark header with the date, shaded section headings, each case with an Open or Closed label, its times on the right and its comments underneath. It pastes into Outlook, Word and Teams.", go: '#/planner/today/advanced', at: '#main [data-act=\"share\"]' },
  ],
  '1.60.65': [{ text: "View case: Add a comment (and 📎) is now at the top, under the task's name and note, and the history runs newest first just below, so a new comment shows straight away.", go: '#/planner/today/advanced', open: ['#main .adv-row .adv-case-chip'], at: '.case-page .case-add' }],
  '1.60.64': [{ text: "Day Planner, Advanced, Share: a new Order choice, Not done first (as before) or Done first. Sift remembers it for next time.", go: '#/planner', at: '#main .advanced-link' }],
  '1.60.63': [{ text: "Day Planner, Advanced: View case beside each task's name (where More was) opens the task on a screen of its own: its name, note and status first, with ✓ Mark case done; then its whole history; then the rest of its details. ‹ Back or Esc goes back to Advanced. The full panel is still on ⋯ or Shift+Enter, and View case is in it too (and in Tasks and the Day Planner).", go: '#/planner/today/advanced', at: '#main .adv-row .adv-case-chip' }],
  '1.60.62': [{ text: "Tasks, the Day Planner and Advanced: Open as case shows one task full screen, like a support case: its details first (status, when it was opened and closed, project, day, owner, people and the rest, each with when it last changed), its note and files, then its whole history in time order: opened, put on a day, ticked and unticked, every comment with its photos and files, let go or archived, and the edits made on this device. Add a comment or a photo at the bottom, or close it as done. ‹ Back or Esc goes back. It's at the bottom of a task's full panel (More) in Advanced, the Day Planner and Tasks.", go: '#/planner/today/advanced', open: ['#main .adv-row .adv-more'], at: '#main .adv-panel-li [data-act="open-case"]', more: "The Day Planner and Tasks: Open as case at the bottom of a task's full panel." }],
  '1.60.61': [{ text: "Day Planner, Advanced: More beside a task's name (or its ⋯, or Shift+Enter while editing its name) opens the same full panel as in the Day Planner, under its row: estimated time, move to another day, energy, note, files, comments, and Let go, → Tasks, Make unique, Archive and Delete. Esc or ✓ Close puts it away.", go: '#/planner', at: '#main .advanced-link' }],
  '1.60.60': [{ text: "Day Planner and Advanced: Make unique is on the Selections bar (and Advanced's ⋯). Choose tasks brought in from Tasks or a project and Make unique keeps only the day's copy: the original leaves Tasks or its project, and its comments and files move onto the day's copy. Brain Dump notes are never touched.", go: '#/planner', at: '#main .advanced-link' }],
  '1.60.59': [
    { text: "Day Planner: Advanced, the link under the day's tasks, shows the day's tasks as cases, one row each: its tick, its name with the note beside it, and its latest comments on the right with a line to add one. Click the comments for all of them, to add, edit or remove. 📎 adds photos or files as a comment with its time. To do sits above Done, and the day's schedule is a list on the right. Share copies the day as rich or plain text, with choices of what goes in (comments, notes, files added, times, the schedule; comments without their times to start with).", go: '#/planner', at: '#main .advanced-link', more: "Advanced's ⋯ and Selections bar: Let go, → Tasks, Make unique (takes the original out of Tasks or its project, so only the day's copy stays), Archive and Delete." },
    { text: "Day Planner and Advanced: ticked-off tasks drag too, to put them in order among the done ones, or back up into the tasks to untick them; drag a task down among the done ones to tick it off. Done ones can be chosen for the Selections bar too, which offers Not done for them.", go: '#/planner', at: '#main #pile-done' },
    { text: "Day Planner, ↓ Bring items in, From Tasks: Move, don't copy. Ticked, tasks you claim leave Tasks and their project and live only on that day.", go: '#/planner', at: '#main [data-act="bring-in"]' },
    { text: "Deleting a task that has a copy on the Day Planner (or a Day Planner task brought in from Tasks or a project) now asks whether to delete it everywhere or only where you are. Taking a task out of a project shared with someone always asks again, in red, first.", more: 'Tasks, projects, the Day Planner and Advanced: the ⋯ Delete, the Selections bar, swiping and emptying a name.' },
  ],
  '1.60.58': [{ text: "Day Planner: a task ticked off in the Tasks list now also shows on the schedule, crossed out, at the time it was ticked, so the schedule shows what you actually did. Several can share one hour; one ticked during a longer item shows under that item's name. Switch it off in 👁, Layout.", go: '#/planner', open: ['#main details.view-menu > summary'], at: '#main [data-layout-set="done-on-plan"]' }],
  '1.60.57': [{ text: "Day Planner and Tasks, New task: type a time in a new task's name (Lavender 11.55, 11.55-12.30, 1155h, 11:55 -> 12:30, 3-4pm) and Sift asks, in the message at the bottom, whether to set it as the task's time: Set time puts it in the schedule (from Tasks, on its planned day's Day Planner, else today's) and takes the time out of the name.", go: '#/planner', at: '#main .pile-new' }],
  '1.60.56': [{ text: "Tasks, New task: Shift+Enter to add a note no longer puts a line between the name and the note; the line sits under the note and pills, as when editing a task. In every spacing.", go: '#/tasks/now', at: '#task-entry' }],
  '1.60.55': [{ text: "Day Planner, Compact spacing: a task's 📝 stays on its line at the far right, with the name wrapping before it, so each task takes less height. On a laptop, More takes its place while you point at the task.", go: '#/planner', at: '#main .pile-paper' }],
  '1.60.54': [{ text: "Tasks, projects, Lists and the Day Planner: in Medium and Extended spacing (👁) every task shows its whole name and note, wrapping onto as many lines as they need. Compact still keeps each task on one line.", go: '#/tasks/now', at: '#main .task-list > li[data-task] > .task-title' }],
  '1.60.53': [{ text: "Projects: dragging a milestone's name now moves the milestone with all its tasks, and it can only be dropped between milestones, never in among another milestone's tasks (which made those tasks look as if they'd changed milestone).", go: '#/tasks', open: ['#main [data-mode="projects"]'], at: '#main .project-grid .project-card' }],
  '1.60.52': [{ text: "Projects: tapping a milestone's name no longer opens its menu; its ⋯ does." }],
  '1.60.51': [{ text: "Selections bars: Assign to… (in a shared project) and Move ▸ Project… open a small list just above the button, one choice per line, instead of a second row of pills under the bar.", go: '#/tasks', open: ['#main [data-mode="projects"]'], at: '#main .project-grid .project-card' }],
  '1.60.50': [{ text: "Tasks, project tasks and Lists: tap a long task or item and its whole name shows, wrapping onto as many lines as it needs (on a phone it was cut off, even in quick edit). In the list it stays on one line.", go: '#/tasks/now', at: '#main .task-list > li[data-task] > .task-title' }],
  '1.60.49': [{ text: "Selections bars: the ✕ that clears a selection is now at the start of the bar, before \"1 selected\", and every new selection shows the bar from its start rather than wherever it was last scrolled to.", more: 'Every Selections bar: Tasks, projects, lists, Brain Dump, Find Things, Contacts, Batch Book and the Day Planner.' }],
  '1.60.48': [{ text: "Projects: the Selections bar inside a project no longer has Move ▸ (to a list or another project): tasks stay in their project. A task that's in the wrong one moves from its panel's List or Project choice.", go: '#/tasks', open: ['#main [data-mode="projects"]'], at: '#main .project-grid .project-card' }],
  '1.60.47': [{ text: "Projects: in a shared project, choose several tasks (press their ⠿) and the Selections bar has Assign to…, which gives them all to one person sharing the project, or to nobody.", go: '#/tasks', open: ['#main [data-mode="projects"]'], at: '#main .project-grid .project-card' }],
  '1.60.46': [{ text: "Projects: in compact spacing, and on a phone, a task's 👤 owner pill always shows the person's whole name; Waiting on shortens first when the line is tight.", go: '#/tasks', open: ['#main [data-mode="projects"]'], at: '#main .project-grid .project-card' }],
  '1.60.45': [{ text: "Projects: a shared project has views of its own. Under its name, Everyone, Mine, each person's, and Nobody's show just those tasks. The 👁 menu adds This project: order (Mine first, or someone else's first) and group by (Milestones, or People: drop a task under a name to give it to them). Each person's choices are their own.", go: '#/tasks', open: ['#main [data-mode="projects"]'], at: '#main .project-grid .project-card', more: "Clicking into a task in a shared project, then More, now shows a 👤 Who pill to set its owner where Energy was; Energy is still in the task's full panel and in Tasks." }],
  '1.60.44': [{ text: "Sharing: you can set your name (first name, last name and a username no one else on your server has, all optional) so people you share with see it instead of the start of your email. Sift asks for it the first time you share something or accept an invitation; skip it and they see your email's first part as before.", go: '#/settings', at: '#main .sync-name', more: "Settings, Sync: Your name, to set or change it any time. The name shows everywhere people show on shared things: the Shared with pill and sheet, invitations, the Owner choice and owner pills on shared project tasks, and the Day Planner's sharing note. If two people sharing with you have the same first name, their last names show too." }],
  '1.60.43': [{ text: "Projects: a task in a shared project has an Owner (anyone sharing it, or nobody, meaning anyone can do it) and a Waiting on (Other: any name you type, like HMRC or the plumber). Both show as pills on the task's line, in compact spacing too. When someone else gives you a task, a notice in that project says so until you dismiss it.", go: '#/tasks', open: ['#main [data-mode="projects"]'], at: '#main .project-grid .project-card', more: "Owner and Waiting on are under More in a task's panel. Waiting on works for every task, not just shared ones. This replaces the People choice's 'Sharing this project' list from 1.60.40." }],
  '1.60.42': [{ text: "Projects: the 👁 view menu at the top of an open project no longer slips behind the project's name bar (and its Shared with pill). It now always sits on top.", go: '#/tasks', open: ['#main [data-mode="projects"]', '#main .project-grid .project-card', '#main details.view-menu > summary'], at: '#main details.view-menu > .menu', more: 'The same fix covers every menu opened from a page\'s top bar while another bar sits below it, in every area.' }],
  '1.60.41': [{ text: "Settings: a hidden error when the browser filled in a saved password or address (seen in Chrome on Windows) no longer happens. Nothing else changes." }],
  '1.60.40': [{ text: "Projects: in a shared project, a task's People choice (More in its panel) lists everyone sharing the project first, so you can give a task to them (or to yourself, as Me), then your contacts. Whoever it's given to shows as 👥 and their name under the task, for everyone sharing it.", go: '#/tasks', open: ['#main [data-mode="projects"]'], at: '#main .project-grid .project-card' }],
  '1.60.35': [{ text: "Tours on a phone: steps where you type (Add a task, Empty your head, Day focus) no longer open the keyboard for you, so it doesn't cover the tour card. Read the card, then tap the box to type; once you're done the keyboard goes and the card is there again.", go: '#/settings', at: '#main [data-act="tour"]', more: 'Settings, Take the tour: the typing steps in each tour.' }],
  '1.60.34': [{ text: "Tours: the tour card sits as low as it can on every step, just above where the Selections bar goes, so the page shows above it. Only when it would cover an open View or ⋯ menu does it move up beside what it points at.", go: '#/settings', at: '#main [data-act="tour"]', more: 'Settings, Take the tour: every tour.' }],
  '1.60.33': [{ text: "Tours: the View steps (Tasks, Brain Dump, Day Planner) no longer open the View menu for you: the card points at the View button (the eye) and you tap it yourself, and the Tasks spacing step now explains the three spacings. The card keeps clear of an open View or ⋯ menu instead of covering it.", go: '#/settings', at: '#main [data-act="tour"]', more: 'Settings, Take the tour, then Get your life in order: the View settings and Triple Dot menu steps.' }],
  '1.60.32': [{ text: "Tasks tour: the Done step's yellow outline fits snugly round the Done tab, and the tab row scrolls it into view if it's off to the side. The last step (Projects) sits at the bottom of the screen so the page stays visible, and every tour's buttons are proper buttons: Back and End tour early side by side, with Save for later and Skip on their own row.", go: '#/settings', at: '#main [data-act="tour"]', more: 'Settings, Take the tour, then Get your life in order: the last two steps.' }],
  '1.60.31': [{ text: "Tasks tour, Sort a couple and Tidy up: the tour card sits low, just above the Selections bar, so the list shows above it. Once you choose a task the Selections bar is outlined in yellow and labelled, the card says the bar scrolls sideways, and it shows one thing to do at a time.", go: '#/settings', at: '#main [data-act="tour"]', more: 'Settings, Take the tour, then Get your life in order: steps 4 and 5.' }],
  '1.60.30': [{ text: "Selection bars: pressing Move ▸ (Tasks, Brain Dump) now puts Move and the choices it opens (Now, Next, Later...) together in one shaded pill, so it's clear where they came from; on a phone the bar slides along to show them all.", more: 'Batch Book\'s Move to ▸ and Status ▸ open the same way.' }],
  '1.60.29': [{ text: "Tasks tour: the step on a task's green More says it only appears once you tap (or point at) a task. The repeating tasks step has gone; the Tips step explains repeating tasks instead, with Put the bins out as the example.", go: '#/settings', at: '#main [data-act="tour"]', more: 'Settings, Take the tour, then Get your life in order.' }],
  '1.60.28': [{ text: "Tours: drag a tour card by its top row to move it out of the way. On a phone, the Tasks tour opens the keyboard for you and says which key to tap. A tour you save for later says where it went (your Next list) and that you can move it." }],
  '1.60.17': [
    { text: "Tasks: ticked-off tasks move to the Archive by themselves after 30 days, so Done only shows the last month. Change how long in Settings → Tasks.", go: '#/settings', at: '#main #tasks-settings' },
    { text: "Tasks: a new task always gets highlighted, and on a computer the cursor is always in New task when you arrive, so those two 👁 switches have gone. Tasks starts on Tight spacing; 👁 → Spacing shows more." },
  ],
  '1.60.14': [{ text: 'The tour starts with a choice: Get your life in order (Tasks), Write it all down (Brain Dump), Plan your day on paper (Day Planner), or quick tours of the rest. Every step is a line or two, and while a tour runs Sift is filled with example things (cleared away when it ends) and it shows the 👁 and ⋯ menus.', go: '#/settings', at: '#main [data-act="tour"]', more: 'Settings, Take the tour opens the choice of tours.' }],
  '1.60.13': [{ text: 'Settings, Sync: signing in lets your browser offer to save your email and password (and fill them in next time), and Enter in the password box signs in.' }],
  '1.60.12': [{ text: 'Settings: the erase button names the web address it erases ("Erase everything stored at hazymat.github.io/sift") and says plainly that Sift at any other address, browser or device keeps its data.', go: '#/settings', at: '#main [data-erase="all"]' }],
  '1.60.11': [{ text: 'Day Planner: Achievements no longer ends with a full stop ("Five and counting").' }],
  '1.60.10': [{ text: "Updates download less: the big app icons aren't fetched again with every update." }],
  '1.60.09': [{ text: "Day Planner, Bring items in: ticking calendars on and off keeps the events showing (faded) while they're fetched again, so nothing jumps about." }],
  '1.60.08': [{ text: "Alt+Enter opens a note full screen wherever its ⤢ shows Alt Enter, even when the cursor isn't in the note (a task's name, a button, nowhere); the hint only shows when the key will do that." }],
  '1.60.07': [{ text: 'Pages with attached photos and files redraw a little faster.' }],
  '1.60.06': [{ text: "What's new: each update shows the date and time it went live, and ‹ Older and Newer › (or ← / →) step back and forward through every update there has been.", go: '#/settings', at: '#main [data-act="whats-new"]', more: 'Settings, What\'s new opens on the newest update.' }],
  '1.60.05': [{ text: "Day Planner: ↓ Bring items in gathers what's waiting for the day in one sheet: your tasks, anything unfinished from earlier days and Google Calendar (now from several calendars). The boxes above the schedule are gone; Not today sets anything aside.", go: '#/planner', at: '#main .bring-link', more: "A calendar event goes onto the schedule at its time or into the day's tasks. Connect Google Calendar and choose its calendars in the sheet's Google Calendar tab." }],
  '1.60.04': [{ text: "Day Planner: Esc closes a task's full panel, however it was opened." }],
  '1.60.03': [{ text: 'Day Planner: a task on the schedule has Time and Until in its full panel (More, then More (full)), to set an exact start and end.', go: '#/planner', at: '#main #lines' }],
  '1.60.02': [{ text: "Windows: the key labels on buttons (Alt Enter on a note's ⤢, Ctrl Enter on Save, Esc on ‹ Back and ✓ Close, the selection bar's keys) sit in the middle of the button instead of low.", go: '#/dump', at: '#main button[data-act="save"]', more: "The same fix covers every button that shows its key." }],
  '1.60.01': [{ text: 'Day Planner: typing a new task on the schedule shows More at the right straight away, as in Tasks; it adds the task and shows its note and pills. More now sits in the middle of the line.', go: '#/planner', at: '#main #lines', more: 'The New task line under Tasks shows More too, which adds it and opens its full panel.' }],
  '1.60.00': [{ text: 'Lists: press and hold a list or template card to choose it (then tap more), hold its ⠿ to drag it into place, and opening a list zooms out of its card as Find Things\' boxes do.', go: '#/lists', at: '#main .list-grid', more: 'The Templates tab works the same; shared lists zoom open too.' }],
  '1.59.03': [{ text: "New app icon: a hand sifting golden sand under a rainbow. On an iPhone, remove Sift from the Home Screen and add it again to see it (sync first: removing it clears that copy).", go: '#/settings', at: '#main a[href="about.html"]', more: 'The browser tab and the About and Privacy pages show it too.' }],
  '1.59.02': [{ text: "iPhone, Find Things: Share, 👁 and ⋯ stay on the first line with + New box; the other + New buttons slide sideways.", go: '#/find-things', at: '#main .find-new' }],
  '1.59.01': [{ text: 'Lists: Lists and Templates are underlined tabs at the top instead of plain headings, and + New makes whichever the tab shows.', go: '#/lists', at: '#main #list-tabs' }, { text: "iPhone: Scans' and Contracts' 👁 and ⋯ stay on the first line with Scan or + New, the search under them; Lists' ⋯ stays up too." }],
  '1.59.00': [{ text: "What's new: after an update, this list shows what changed, each with Show me. Turn it off in Settings, Show update info.", go: '#/settings', at: '#main label:has(#show-update-info)' }],
  '1.58.15': [{ text: "Day Planner, Tight spacing: a task's pills stay together beside its name or all under it, no lone 📝 on its own line." }],
  '1.58.14': [{ text: 'Brain Dump: pressing and holding a note selects it without starting text selection, and a chosen note has a clear ring.', go: '#/dump', at: '#main li.thought', more: 'Contacts, Find Things boxes and Recipes cards behave the same.' }],
  '1.58.13': [{ text: 'Brain Dump: a note starting with a link no longer shows part of the link as raw text under its title.' }],
  '1.58.12': [{ text: '"A new version of Sift is ready" now sits above a selection bar, and toasts sit above both.' }],
  '1.58.11': [{ text: 'Day Planner: More no longer covers the time or 📝 pill on a task with a note.' }],
  '1.58.10': [{ text: 'Contacts: Recent, Directory and Cases are underlined tabs, like the filters in Tasks and Brain Dump.', go: '#/contacts', at: '#main .dump-filter-row', more: "Scans' kinds, Contracts' views and Tidied's areas are the same tabs." }],
  '1.58.09': [{ text: 'Day Planner schedule: a task edits as in Tasks. More shows its note and pills, then More (full) opens the full panel.', go: '#/planner', at: '#main #lines' }],
  '1.58.08': [{ text: 'iPhone: typing near the bottom of a long page no longer slides the top off the screen, and the bottom tabs hide while the keyboard is up.' }],
  '1.58.07': [{ text: "Find Things: an open box's lid no longer slides under the search bar or turns darker when scrolling on a phone." }],
  '1.58.06': [{ text: "Day Planner: More on a task goes straight to its full panel, which no longer has start and end times.", go: '#/planner', at: '#main .pile-paper' }],
  '1.58.05': [{ text: 'Find Things: a box\'s Notes example reads "e.g. Clear 9-litre box".' }],
  '1.58.04': [{ text: "Find Things: things in an open box move as tasks do (press, hold and drag, drop onto another to put it inside), and a thing's quantity sits before its name.", go: '#/find-things', open: FIRST_BOX, at: '#main .box-page .item-list' }],
  '1.58.03': [{ text: 'Tasks: the top of the page (+ New, the tabs, 👁 and ⋯) stays in view while scrolling.', go: '#/tasks', at: '#main .tasks-head', more: 'Projects and Contacts do the same.' }],
  '1.58.02': [{ text: "Find Things: an open box keeps its whole lid in view while its things scroll, with + Add note and + Add photo on the lid.", go: '#/find-things', open: FIRST_BOX, at: '#main .box-lid', more: "A project's top (name, progress, + Milestone) stays in view too." }],
  '1.58.01': [{ text: "Find Things: box cards list what's inside as running text, 👁 Spacing makes boxes smaller or bigger, and + Add item is always there.", go: '#/find-things', at: '#main .box-card[data-box]', more: 'The dashed + New box tiles are gone (use + New box at the top), and the whole top of the page stays in view.' }],
  '1.58.00': [{ text: 'Find Things: the ⋯ at the end of the life areas opens one Life areas / groups sheet, groups indented under their life area, moved by holding and dragging.', go: '#/find-things', at: '#main .area-more' }],
  '1.57.09': [{ text: 'Find Things: scrolling a long box keeps the back button, the search and the lid at the top.', go: '#/find-things', open: FIRST_BOX, at: '#main .box-page-bar' }],
  '1.57.08': [{ text: 'Find Things: the line at the top of an open box just says Add, with a faint cube, in line with the things.', go: '#/find-things', open: FIRST_BOX, at: '#main .box-page :has(> #new-items)', more: 'This covers 1.57.06 and 1.57.07 too: the add line moved to the top and became a single line.' }],
  '1.57.05': [{ text: 'Phone: swiping sideways on an open box, list, contact, case, recipe, batch, scan or contract goes back.' }],
  '1.57.04': [{ text: 'Find Things: each box card has its ⠿ in the top left corner (on hover on a computer, always on a phone).', go: '#/find-things', at: '#main .box-card[data-box]', more: 'Contacts cards have it in the same place.' }],
  '1.57.02': [{ text: 'Key hints on buttons (Alt Enter, Ctrl Enter, Esc) sit centred in their pill everywhere.' }],
  '1.57.01': [{ text: "Find Things: the life areas are underlined tabs, like Brain Dump's and Tasks' filters; ← / → switch between them.", go: '#/find-things', at: '#main .find-areas' }],
  '1.57.00': [{ text: "Brain Dump: a note's → Task, Plan it and → Find Things are in its ⋯ menu; with notes chosen (press and hold), the bar's Move ▸ has them for all.", go: '#/dump', at: '#main li.thought .note-more > summary', more: 'Find Things boxes show a ⠿ to choose them.' }],
};

export const PUBLISHED = {
  '1.61.80': '2026-10-27T15:28:43Z',
  '1.61.79': '2026-10-27T14:46:05Z',
  '1.61.78': '2026-10-27T12:34:57Z',
  '1.61.77': '2026-10-27T12:30:22Z',
  '1.61.76': '2026-10-27T11:35:37Z',
  '1.61.75': '2026-10-27T11:19:49Z',
  '1.61.74': '2026-10-27T10:26:29Z',
  '1.61.73': '2026-10-27T10:24:59Z',
  '1.61.72': '2026-10-27T10:24:00Z',
  '1.61.71': '2026-10-27T00:47:26Z',
  '1.61.70': '2026-10-27T00:28:27Z',
  '1.61.69': '2026-10-27T00:25:18Z',
  '1.61.68': '2026-10-27T00:19:35Z',
  '1.61.67': '2026-10-27T00:13:02Z',
  '1.61.66': '2026-10-27T00:10:21Z',
  '1.61.65': '2026-10-27T00:06:21Z',
  '1.61.64': '2026-10-26T23:59:11Z',
  '1.61.63': '2026-10-26T23:47:32Z',
  '1.61.62': '2026-10-26T23:41:18Z',
  '1.61.61': '2026-10-26T23:34:01Z',
  '1.61.60': '2026-10-26T20:57:14Z',
  '1.61.59': '2026-10-26T20:54:46Z',
  '1.61.58': '2026-10-26T20:53:02Z',
  '1.61.57': '2026-10-26T20:49:22Z',
  '1.61.56': '2026-10-26T20:34:57Z',
  '1.61.55': '2026-10-26T19:42:57Z',
  '1.61.54': '2026-10-26T19:34:37Z',
  '1.61.53': '2026-10-26T19:27:03Z',
  '1.61.52': '2026-10-26T19:20:52Z',
  '1.61.51': '2026-10-26T18:31:10Z',
  '1.61.50': '2026-10-26T18:27:16Z',
  '1.61.49': '2026-10-26T18:24:20Z',
  '1.61.48': '2026-10-26T16:56:21Z',
  '1.61.47': '2026-10-25T20:52:14Z',
  '1.61.46': '2026-10-25T19:52:27Z',
  '1.61.45': '2026-10-25T14:37:13Z',
  '1.61.44': '2026-10-25T13:46:38Z',
  '1.61.43': '2026-10-25T13:39:43Z',
  '1.61.42': '2026-10-25T13:23:15Z',
  '1.61.41': '2026-10-25T13:22:28Z',
  '1.61.40': '2026-10-25T13:17:34Z',
  '1.61.39': '2026-10-25T13:12:09Z',
  '1.61.38': '2026-10-25T13:10:29Z',
  '1.61.37': '2026-10-25T12:55:17Z',
  '1.61.36': '2026-10-25T12:52:27Z',
  '1.61.35': '2026-10-25T12:20:28Z',
  '1.61.34': '2026-10-25T12:09:36Z',
  '1.61.33': '2026-10-25T12:02:00Z',
  '1.61.32': '2026-10-25T11:54:06Z',
  '1.61.31': '2026-10-25T11:45:24Z',
  '1.61.30': '2026-10-25T07:01:01Z',
  '1.61.29': '2026-10-25T01:50:01Z',
  '1.61.28': '2026-10-25T01:39:05Z',
  '1.61.27': '2026-10-25T01:35:11Z',
  '1.61.26': '2026-10-25T01:32:09Z',
  '1.61.25': '2026-10-25T01:25:42Z',
  '1.61.24': '2026-10-25T01:22:39Z',
  '1.61.23': '2026-10-25T01:15:35Z',
  '1.61.22': '2026-10-25T01:13:55Z',
  '1.61.21': '2026-10-25T01:09:33Z',
  '1.61.20': '2026-10-25T00:57:12Z',
  '1.61.19': '2026-10-25T00:51:54Z',
  '1.61.18': '2026-10-25T00:15:12Z',
  '1.61.17': '2026-10-25T00:09:44Z',
  '1.61.16': '2026-10-25T00:00:02Z',
  '1.61.15': '2026-10-24T23:01:33Z',
  '1.61.14': '2026-10-24T22:55:26Z',
  '1.61.13': '2026-10-24T22:45:21Z',
  '1.61.12': '2026-10-24T22:26:19Z',
  '1.61.11': '2026-10-24T22:15:34Z',
  '1.61.10': '2026-10-24T22:12:50Z',
  '1.61.09': '2026-10-24T21:54:53Z',
  '1.61.08': '2026-10-24T21:22:15Z',
  '1.61.07': '2026-10-24T20:45:20Z',
  '1.61.06': '2026-10-24T20:34:52Z',
  '1.61.05': '2026-10-24T20:33:43Z',
  '1.61.04': '2026-10-24T02:36:10Z',
  '1.61.03': '2026-10-23T13:24:23Z',
  '1.61.02': '2026-10-23T13:20:29Z',
  '1.61.01': '2026-10-23T13:16:50Z',
  '1.61.00': '2026-10-23T13:11:01Z',
  '1.60.99': '2026-10-23T13:07:07Z',
  '1.60.98': '2026-10-23T13:01:20Z',
  '1.60.97': '2026-10-23T12:59:25Z',
  '1.60.96': '2026-10-23T12:56:09Z',
  '1.60.95': '2026-10-23T12:46:24Z',
  '1.60.94': '2026-10-23T12:20:22Z',
  '1.60.93': '2026-10-23T12:10:28Z',
  '1.60.92': '2026-10-23T12:10:04Z',
  '1.60.91': '2026-10-23T12:03:00Z',
  '1.60.90': '2026-10-23T09:20:44Z',
  '1.60.89': '2026-10-23T09:10:11Z',
  '1.60.88': '2026-10-23T08:59:08Z',
  '1.60.87': '2026-10-21T22:27:57Z',
  '1.60.86': '2026-10-21T22:18:25Z',
  '1.60.85': '2026-10-21T16:27:54Z',
  '1.60.84': '2026-10-21T13:58:34Z',
  '1.60.83': '2026-10-21T13:21:57Z',
  '1.60.82': '2026-10-21T13:19:11Z',
  '1.60.81': '2026-10-21T13:16:10Z',
  '1.60.80': '2026-10-21T13:11:42Z',
  '1.60.79': '2026-10-21T13:04:08Z',
  '1.60.78': '2026-10-21T13:02:04Z',
  '1.60.77': '2026-10-21T12:38:56Z',
  '1.60.76': '2026-10-21T12:36:51Z',
  '1.60.75': '2026-10-18T16:27:05Z',
  '1.60.74': '2026-10-16T23:15:54Z',
  '1.60.73': '2026-10-16T23:13:21Z',
  '1.60.72': '2026-10-16T22:03:12Z',
  '1.60.71': '2026-10-15T19:14:13Z',
  '1.60.70': '2026-10-15T06:00:09Z',
  '1.60.69': '2026-10-12T20:47:57Z',
  '1.60.68': '2026-10-05T15:19:45Z',
  '1.60.67': '2026-10-05T15:15:07Z',
  '1.60.66': '2026-10-05T15:13:04Z',
  '1.60.65': '2026-10-05T15:07:31Z',
  '1.60.64': '2026-10-05T14:57:10Z',
  '1.60.63': '2026-10-05T14:53:35Z',
  '1.60.62': '2026-10-05T14:44:38Z',
  '1.60.61': '2026-10-05T14:35:22Z',
  '1.60.60': '2026-10-05T14:29:08Z',
  '1.60.59': '2026-10-05T14:20:53Z',
  '1.60.58': '2026-10-05T09:42:55Z',
  '1.60.57': '2026-10-05T09:39:56Z',
  '1.60.56': '2026-10-05T06:49:21Z',
  '1.60.55': '2026-10-05T06:44:49Z',
  '1.60.54': '2026-10-05T00:54:39Z',
  '1.60.53': '2026-10-03T17:18:39Z',
  '1.60.52': '2026-10-02T00:55:36Z',
  '1.60.51': '2026-10-02T00:52:24Z',
  '1.60.50': '2026-10-02T00:49:58Z',
  '1.60.49': '2026-10-02T00:48:48Z',
  '1.60.48': '2026-10-02T00:45:52Z',
  '1.60.47': '2026-10-02T00:41:20Z',
  '1.60.46': '2026-10-01T21:30:49Z',
  '1.60.45': '2026-10-01T20:29:19Z',
  '1.60.44': '2026-10-01T20:24:30Z',
  '1.60.43': '2026-10-01T20:12:35Z',
  '1.60.42': '2026-10-01T20:07:56Z',
  '1.60.41': '2026-10-01T19:56:34Z',
  '1.60.40': '2026-10-01T17:27:56Z',
  '1.60.35': '2026-10-01T10:03:58Z',
  '1.60.34': '2026-10-01T09:31:24Z',
  '1.60.33': '2026-09-30T22:23:23Z',
  '1.60.32': '2026-09-30T22:18:00Z',
  '1.60.31': '2026-09-30T22:16:54Z',
  '1.60.30': '2026-09-30T22:15:12Z',
  '1.60.29': '2026-09-30T22:12:22Z',
  '1.60.28': '2026-09-30T21:20:55Z',
  '1.60.17': '2026-09-30T21:03:13Z',
  '1.60.14': '2026-09-30T21:03:13Z',
  '1.60.13': '2026-09-30T21:03:13Z',
  '1.60.12': '2026-09-30T14:51:11Z',
  '1.60.11': '2026-09-30T14:34:35Z',
  '1.60.10': '2026-09-30T14:34:35Z',
  '1.60.09': '2026-09-30T14:34:35Z',
  '1.60.08': '2026-09-30T14:34:35Z',
  '1.60.07': '2026-09-30T14:34:35Z',
  '1.60.06': '2026-09-30T11:36:07Z',
  '1.60.05': '2026-09-30T11:36:07Z',
  '1.60.04': '2026-09-30T08:33:37Z',
  '1.60.03': '2026-09-30T08:31:00Z',
  '1.60.02': '2026-09-30T08:28:16Z',
  '1.60.01': '2026-09-30T08:25:57Z',
  '1.60.00': '2026-09-29T23:28:05Z',
  '1.59.03': '2026-09-29T23:23:37Z',
  '1.59.02': '2026-09-29T22:24:12Z',
  '1.59.01': '2026-09-29T22:19:27Z',
  '1.59.00': '2026-09-29T22:17:44Z',
  '1.58.15': '2026-09-29T22:14:31Z',
  '1.58.14': '2026-09-29T22:13:03Z',
  '1.58.13': '2026-09-29T22:11:53Z',
  '1.58.12': '2026-09-29T22:11:04Z',
  '1.58.11': '2026-09-29T22:09:04Z',
  '1.58.10': '2026-09-29T22:04:48Z',
  '1.58.09': '2026-09-29T22:02:55Z',
  '1.58.08': '2026-09-29T22:00:08Z',
  '1.58.07': '2026-09-29T21:55:43Z',
  '1.58.06': '2026-09-29T21:51:27Z',
  '1.58.05': '2026-09-29T21:45:40Z',
  '1.58.04': '2026-09-29T21:45:03Z',
  '1.58.03': '2026-09-29T21:44:04Z',
  '1.58.02': '2026-09-29T21:42:45Z',
  '1.58.01': '2026-09-29T21:41:25Z',
  '1.58.00': '2026-09-29T21:39:18Z',
  '1.57.09': '2026-09-29T21:35:35Z',
  '1.57.08': '2026-09-29T21:31:01Z',
  '1.57.05': '2026-09-29T21:12:53Z',
  '1.57.04': '2026-09-29T21:07:17Z',
  '1.57.02': '2026-09-29T20:21:40Z',
  '1.57.01': '2026-09-29T20:20:08Z',
  '1.57.00': '2026-09-29T20:17:41Z',
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = v => v.split('.').map(Number).reduce((sum, part) => sum * 1000 + part, 0);
// Entries newer than `from`, up to this version, newest first.
const since = from => Object.keys(WHATS_NEW).filter(v => num(v) > num(from) && num(v) <= num(VERSION)).sort((a, b) => num(b) - num(a)).flatMap(v => WHATS_NEW[v].map(entry => ({ version: v, entry })));
// Every update up to this version, newest first: { at (ISO time, or null: not published yet), versions, rows }.
function updates() {
  const out = [];
  for (const v of Object.keys(WHATS_NEW).filter(x => num(x) <= num(VERSION)).sort((a, b) => num(b) - num(a))) {
    const at = PUBLISHED[v] || null;
    const last = out.at(-1);
    if (last && last.at === at) last.versions.push(v);
    else out.push({ at, versions: [v] });
  }
  for (const u of out) u.rows = u.versions.flatMap(v => WHATS_NEW[v].map(entry => ({ version: v, entry })));
  return out;
}
const whenText = at => (at ? new Date(at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not published yet');

// Called just before an update reloads: remember which version this was.
export async function markUpdating() {
  await store.updateDeviceSettings({ whatsnew_from: VERSION });
}

// After the reload: the sheet, once, if there's something to show and it's wanted.
export async function afterUpdate() {
  const device = await store.getDeviceSettings();
  const from = device.whatsnew_from;
  if (!from) return;
  await store.updateDeviceSettings({ whatsnew_from: null, whatsnew_last: from });
  track('updated', { from, to: VERSION });
  if ((await store.getSettings()).show_update_info === false) return;
  if (since(from).length) showWhatsNew(from);
}

// Settings' What's new: the newest update, and ‹ Older from there.
export async function lastWhatsNew() {
  const device = await store.getDeviceSettings();
  showWhatsNew(device.whatsnew_last || VERSION);
}

// `from`: the version this device had (how many updates it missed); `page`: which update, 0 the newest.
export function showWhatsNew(from, page = 0) {
  feature('whats_new');
  const all = updates();
  if (!all.length) return;
  const missed = all.filter(u => u.versions.some(v => num(v) > num(from))).length;
  const dlg = document.createElement('dialog');
  dlg.className = 'sheet whatsnew-sheet';
  let rows = [];
  const draw = () => {
    const u = all[page];
    rows = u.rows;
    dlg.innerHTML = `<div class="sheet-handle"></div>
    <div class="whatsnew-head"><h2>What's new in Sift</h2><button type="button" class="entry-chip close-top" data-act="close">✓ Close${keys('Esc')}</button></div>
    <div class="whatsnew-nav">
      <button type="button" class="pill-act" data-step="1"${page >= all.length - 1 ? ' disabled' : ''} title="The update before this one">‹ Older</button>
      <span class="whatsnew-when"><b>${esc(whenText(u.at))}</b><span class="muted"> · ${esc(u.versions.length > 1 ? `${u.versions.at(-1)} to ${u.versions[0]}` : u.versions[0])}</span></span>
      <button type="button" class="pill-act" data-step="-1"${page <= 0 ? ' disabled' : ''} title="The update after this one">Newer ›</button>
    </div>
    ${page === 0 && missed > 1 ? `<p class="muted">${missed} updates since you last looked: ‹ Older for the others.</p>` : ''}
    <ul class="whatsnew-list">${rows.map(({ version, entry }, n) => `<li>
      <div class="whatsnew-text">${esc(entry.text)}${entry.more ? `<span class="muted whatsnew-more">${esc(entry.more)}</span>` : ''}${u.versions.length > 1 ? `<span class="muted whatsnew-v">${esc(version)}</span>` : ''}</div>
      ${entry.at ? `<button type="button" class="pill-act" data-show="${n}">Show me</button>` : ''}</li>`).join('')}</ul>
    <div class="sheet-actions"><button type="button" data-act="dump">Save to Brain Dump</button></div>`;
  };
  const step = by => { const next = page + by; if (next < 0 || next >= all.length) return; page = next; draw(); dlg.querySelector(`[data-step="${by}"]:not([disabled])`)?.focus(); };
  draw();
  document.body.append(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); step(1); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); step(-1); }
  });
  dlg.addEventListener('click', async ev => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    if (btn.dataset.act === 'close') return dlg.close();
    if (btn.dataset.step) return step(Number(btn.dataset.step));
    if (btn.dataset.show) { feature('show_me'); dlg.close(); return showMe(rows[btn.dataset.show].entry, from, page); }
    if (btn.dataset.act === 'dump') {
      dlg.close();
      const u = all[page];
      const body = [`What's new in Sift (${whenText(u.at)}, ${u.versions[0]})`, ...rows.map(({ entry }) => `- ${entry.text}${entry.more ? ` ${entry.more}` : ''}`)].join('\n');
      const { addNote } = await import('./views/dump.js');
      const note = await addNote(body);
      if (location.hash.startsWith('#/dump')) dispatchEvent(new Event('sift:refresh'));
      const { pointTo } = await import('./flash.js');
      toast("✓ Saved to Brain Dump", { action: 'Show me', onAction: () => { pointTo('thoughts', note.id); location.hash = '#/dump'; } });
    }
  });
  dlg.showModal();
  if (!matchMedia('(pointer: coarse)').matches) dlg.querySelector('[data-show], [data-act="dump"]')?.focus(); // keys ready on a computer
}

// Wait for something to be drawn (views draw a moment after the address changes).
function drawn(sel, ms = 4000) {
  const until = Date.now() + ms;
  return new Promise(done => {
    const look = () => {
      const el = [...document.querySelectorAll(sel)].find(e => e.getClientRects().length);
      if (el || Date.now() > until) return done(el || null);
      setTimeout(look, 120);
    };
    look();
  });
}

async function showMe(entry, from, page = 0) {
  if (entry.go && location.hash !== entry.go) location.hash = entry.go;
  for (const sel of entry.open || []) {
    const el = await drawn(sel);
    if (!el) return toast("Couldn't find it here (there may be nothing to open yet)", { action: "‹ What's new", onAction: () => showWhatsNew(from, page) });
    el.click();
  }
  let el = await drawn(entry.at);
  await new Promise(done => setTimeout(done, 350));
  if (el && !el.isConnected) el = await drawn(entry.at); // the page drew itself again (Contacts picks its tab)
  if (!el) return toast("Couldn't find it here (there may be nothing to show yet)", { action: "‹ What's new", onAction: () => showWhatsNew(from, page) });
  flash(el, { pulses: 3 });
  toast('Here it is', { action: "‹ What's new", onAction: () => showWhatsNew(from), ms: 9000 });
}
