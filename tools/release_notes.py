# Release notes by version, for tools/release.py. Add NOTES['x.y.zz'] = [F(...), B(...)] for each new version.
# Feature: a short sentence, then how to find it or how it works. Bug: how it showed; " Fixed." is added.
F = lambda s: f'- **Feature** {s}'
B = lambda s: f'- **Bug** {s} Fixed.'

NOTES = {
'1.0.00': [
  F('First numbered version. Everything built before this point is included: Brain Dump (quick notes that can become tasks, plans, contacts or stored things while staying linked), Tasks (Now, Next, Later, projects, energy levels, estimates), the Day Planner (a paper-style day with a timed schedule, tasks and notes), Lists with templates, Find Things (places, boxes and things with photos), Contacts and Cases, one notes editor everywhere, History with undo for any change, Archive and Bin, backups, and end-to-end encrypted sync through a self-hosted server.'),
  F('The version number shows at the top of Settings and at the end of the laptop top bar.'),
],
'1.0.01': [F('Sheets on touch screens have no close button and a thicker handle: pull the handle down, tap outside or press Esc to close.')],
'1.0.02': [F('The view menu button is an eye (👁) rather than a cog.')],
'1.0.03': [F('The version shows quietly at the end of the laptop top bar instead of inside the sync status.')],
'1.0.04': [B('On an empty Tasks page the + sat off-centre in its circle.')],
'1.0.05': [F('The Inbox list in Tasks is called Task Dump by default. It can be renamed in Settings → Your words → Dictionary.')],
'1.1.00': [F('The Dictionary covers phrases too: hints, prompts and explanations, one line each, with a reset. Settings → Your words → Dictionary.')],
'1.1.01': [F('Each Dictionary entry shows its hint in small grey text under it.')],
'1.1.02': [F("Backups include this device's own preferences (text size, spacing, looks)."), F('The Dictionary has an introduction at the top and its hints are in italics.')],
'1.1.03': [F('The blue theme is called Glass. Settings → Appearance.')],
'1.1.04': [F('No sheet has a close button any more; every sheet closes the same way (handle, tap outside, Esc).')],
'1.1.05': [F('Settings → Appearance → Text size: each choice is shown at its own size.')],
'1.1.06': [F('Tasks: "Add note" appears under a task while editing it in place; the list tabs fit on one line.')],
'1.1.07': [F('Notes line up with their titles; titles and notes are edited in place in plain style.')],
'1.1.08': [F('Updates install fresh files, are checked for when the app comes back to the screen, and can be checked by hand: Settings → Check for updates.')],
'1.1.09': [F('Day Planner: empty lines are plain typing lines, with no placeholder dots or rounded boxes.')],
'1.1.10': [F('Day Planner: an empty slot lights up when hovered instead of showing a +.')],
'1.1.11': [F('Glass theme: task notes are in italics, slightly smaller and fainter.')],
'1.1.12': [F('Ctrl+Enter (⌘+Enter) closes a full-screen note, the same as Done.')],
'1.1.13': [B('Settings: time fields overflowed their column on iPhone and fields had different heights.')],
'1.1.14': [B('The Day Planner item panel did not fit on iPhone.'), F('Resize bars on touch screens appear only when an item is open; tick boxes are drawn by the app so they look the same everywhere.')],
'1.1.15': [F('"Estimated time" is one name for a task\'s estimate in both Tasks and the Day Planner.')],
'1.1.17': [F('Day Planner: a scheduled item grows while it is being edited. Notes look the same in every area.')],
'1.2.00': [F("Brain Dump notes can be shared (the note's ⋯ → Share / Copy)."), F("Task notes show according to the page's spacing (Compact, Medium, Expanded).")],
'1.2.01': [F('Wide Day Planner: more room between and beside its two columns.')],
'1.2.02': [F('Day Planner: more room under the section headings.')],
'1.2.03': [B('The iPhone bottom bar sat too high.')],
'1.3.00': [F('Search everything: one box over notes, tasks, plan items, contacts, cases, things, boxes and lists. In the laptop top bar (Ctrl+K or /), and at the top of More on a phone.')],
'1.3.01': [F('Day Planner: Day focus and Energy share one line, with hand-drawn double underlines.')],
'1.3.02': [F('Energy lines up with the Tasks column on wide screens and wraps to the left on phones.')],
'1.3.03': [F("Day Planner Tasks use schedule-style ruled lines with hover, plus empty lines to write on.")],
'1.3.05': [F("Day Planner: tick boxes sit in the margin; the day's Notes have no box and show their toolbar only while writing.")],
'1.3.06': [F('Day Planner: drag handles are hidden until the line is hovered.')],
'1.3.07': [F("The day's Notes are written on ruled lines.")],
'1.3.08': [F('Ctrl+Enter leaves any note, saving it.')],
'1.3.09': [F('Top bar: a round search button that opens on click; the areas refit around it.')],
'1.3.10': [F('Opening search in the top bar makes room for it instead of covering the areas.')],
'1.3.11': [F('Day Planner: the "New task" hint is much fainter.')],
'1.3.12': [F('"Add note" appears under new and edited lines everywhere; the Tasks page is on ruled lines.')],
'1.3.13': [F('Tasks page: the ruled lines start where the text starts.')],
'1.3.14': [F('Tasks page: ruled paper runs through the tasks too, so everything lines up.')],
'1.3.15': [F('"New task" hints are italic and faint.')],
'1.3.16': [F('Ticking and unticking are recorded in History; the Tasks panel is set in to line up with the text.')],
'1.3.17': [B("The cursor jumped while writing notes: arrow keys changed the day, notes were replaced mid-typing, and a note could be lost when changing day.")],
'1.3.18': [F('Day Planner: done items are equally faint, and housekeeping links sit in a footer. Tasks: the lists are plain text tabs.')],
'1.3.19': [B("Day Planner: \"Add note\" and the pills didn't line up with the item's text.")],
'1.3.20': [F('The link pull-down (📞 / 📝 in a note) follows the Glass and Dark themes.')],
'1.3.21': [B('The ↗ Make menu in a note stayed open after leaving the note.')],
'1.3.22': [F("The ↗ Make menu uses the toolbar's shade.")],
'1.3.23': [F('Hover and writing shades are fainter and the same on every ruled line.')],
'1.3.24': [F('One ⚡ energy picker everywhere, with ✕ to clear; the small ⚡ pill in the Day Planner opens it.')],
'1.4.00': [F("The day's Energy shows only the chosen level plus a few words about how you feel; 👁 sits on the right on phones.")],
'1.4.01': [B('Day Planner: Housekeeping was not at the bottom on a wide screen.')],
'1.4.02': [F('Tasks: Esc on an empty "New task" line closes it.')],
'1.4.03': [F("The day's Energy chooser is boxed like the Tasks pop-up and floats under the words.")],
'1.4.04': [F('Day Planner: the "New task" line has "Add note" and pills like the Tasks page; More opens the full panel.')],
'1.4.05': [F('Day Planner Tasks: an open task and its panel form one rounded box, as on the Tasks page.')],
'1.4.06': [F('Every drag handle is ⠿ and shows when the pointer is anywhere on its line.')],
'1.4.07': [B("Day Planner Tasks: the red margin line stopped at an open panel.")],
'1.5.00': [F('Glass-style dropdown lists, joined to their pill, for every dropdown on a laptop.')],
'1.5.01': [B("Day focus and Energy didn't line up on a narrow screen.")],
'1.5.02': [F("Energy moves under Day focus when the two don't fit side by side.")],
'1.5.03': [F('Wide screen: Day focus and Energy take half the width each.')],
'1.5.04': [F('⋯ buttons show only on hover; each thing in Find Things has a cube in front of it.')],
'1.5.05': [B("Panel buttons didn't wrap at some widths.")],
'1.5.06': [F("Find Things: a thing's cube is its drag handle.")],
'1.5.07': [F("Find Things: a thing's panel is one tidy box.")],
'1.5.08': [F("Moving a task brought into the Day Planner to another day moves its Plan for day too.")],
'1.5.09': [F("Day Planner: the Day pill is gone; \"Move to another day\" is in the item's panel.")],
'1.5.10': [F('Brain Dump cards: main actions as buttons (→ Task, Plan it, → Find Things), the rest under ⋯.')],
'1.5.11': [B('Tasks page: the "New task" line was spaced differently from the other lines.')],
'1.5.12': [F('Day Planner Tasks: pills line up; tabbing away closes them.')],
'1.5.13': [F('Day Planner Tasks: the tick box sits further from the red line.')],
'1.5.14': [F('Day Planner: "Bring in from tasks" is quiet text in the Tasks heading.')],
'1.5.15': [F('Tasks: a 📝 marks a note in Compact spacing; otherwise the note shows under the pills.')],
'1.5.16': [F('Day Planner notes follow the spacing setting; Brain Dump note text is smaller.')],
'1.5.17': [B('Day Planner: ‹ and › were not centred in their round buttons.'), F('"Bring in from tasks" has a green arrow.')],
'1.5.18': [F('Tasks lists can be reordered; compact line heights; Settings → Appearance → Show hints (off at first).')],
'1.5.19': [F('Very wide screens: Day focus and Energy sit beside the date.')],
'1.5.20': [F('Brain Dump: search and the type filters stay at the top while scrolling through notes.')],
'1.5.21': [F('Brain Dump: each note has a soft pastel tint.')],
'1.6.00': [F('👁 → Look: Original, Multicolour or Alternate shading, per page on each device. Brain Dump notes can be given a colour (⋯ → Colour…).')],
'1.6.01': [F('Alternate shading Look on Tasks and the Day Planner.')],
'1.6.02': [F('Find Things: Look options and colours for boxes and things.')],
'1.6.03': [F('Lists: Look options and a colour per list.')],
'1.6.04': [F('Contacts: a grid of cards with spacing, colours and shading options.')],
'1.6.05': [F("Brain Dump cards carry on from where the title stops instead of repeating it.")],
'1.6.06': [F('After a sync, the page updates in place, keeping what is open and where it was scrolled to. Looks are included in backups.')],
'1.6.07': [B('Phones: the Energy prompt was cut off and the Tasks tabs did not fit.')],
'1.6.08': [F("Every item panel has the same row of actions: Close … Colour, Archive, Delete.")],
'1.6.09': [F('Manual ordering merges cleanly across devices: reordering on two devices at once keeps both.')],
'1.7.00': [F('Sync sends text ahead of files, so a big photo never holds up the plan; a file still on its way shows "still arriving" with its size.'), F('Settings → Sync shows the sync state, what is waiting, when it last tried and finished, the server connection, and a three-word Data code for comparing devices (same words, same data).')],
'1.7.01': [F('Sync runs every 30 seconds while the app is on screen, retries soon after a failure, and gives up on a stuck request after 20 seconds. Settings shows the connection quality and a green ✓ when everything is on the server.')],
'1.8.00': [F("Task comments: any task can collect dated comments about what happened. \"Add a comment…\" in the task's panel; each comment's ⋯ has Edit and Delete. A task and its Day Planner copy share comments. Search finds tasks by their comments.")],
'1.8.01': [F("A comment's ⋯ can turn it into a sub-task or a plan for today, attach files, or set a day to check back (the task comes back on the Day Planner that day)."), F('After ticking a task, the Done message has a Comment button for a closing comment.'), F("Brain Dump: a note's ⋯ can add it to a task as a comment. Contacts: a logged call can also go on one of the contact's open tasks. A case's timeline shows its tasks' comments.")],
'1.8.02': [F("The notes toolbar shows what's on where the cursor is (bold, italic, cross out, lists look pressed)."), F('Five text sizes in notes: smaller, normal, a bit bigger, big and biggest (Aa for the full toolbar, then A⁻ / A⁺, which grey out at the ends).')],
'1.8.03': [B('Pop-up menus (colours, energy, a comment\'s ⋯) opened off the bottom of the screen, e.g. the colour picker from the selection bar.')],
'1.8.04': [F('Dragging a file over the app shows where it can be dropped; dropping it somewhere that can\'t take it says so. Day Planner rows accept dropped files.')],
'1.8.05': [B('A Brain Dump card showed an empty line under the title when the title was the whole first line.')],
'1.8.06': [B('Typing "- " sometimes stayed a dash instead of becoming a bullet when typed quickly or by a phone keyboard, and a note could show two text sizes after lines were joined.')],
'1.8.07': [B('After a sync, the Brain Dump page did not update while the cursor was in the New note box, so a note made on another device only appeared after refreshing.')],
'1.8.08': [F('Settings → Brain Dump types can be reordered by dragging their grips.')],
'1.8.09': [F('Emptying a note or an item\'s name (e.g. select all and cut) and leaving it asks "Did you mean to save an empty note?": Yes deletes it with Undo, No keeps it. List, box, project and case names are put back instead.')],
'1.8.10': [B("A comment's ⋯ menu squashed its words into round pills.")],
'1.8.11': [F('"Aim to finish" is called Target end date.'), B("Plan for day and Target end date picked from the pills under a task were not always saved, and Target end date in the task's panel never saved.")],
'1.8.12': [F("Setting a task's Plan for day puts it on that day in the Day Planner; changing the date moves it, removing the date takes it off. \"Add to today\" and \"Remove date\" sit under Plan for day in the panel; \"Put on today's plan\" is gone."), F('Moving a task to another list says "Transferred to Next" (or Now, Later…).')],
'1.8.13': [F('Sub-tasks show under their task in Now, Next and Later (indented, ↳, smaller), travel with it when dragged, and a ticked sub-task stays until its task is ticked; then the family goes to Done together.')],
'1.8.14': [F('Ctrl+Enter in the "Add note" line under a task or plan item saves it and closes the pills.')],
'1.8.15': [F('Spacing (👁): Medium shows one line of a task\'s note; Expanded shows the whole note, dates and time in words, and small pictures of attached photos.')],
'1.8.16': [F("The pills under a task only show what's set; clicking one opens the task's editing pills.")],
'1.8.17': [B('On the New task line, picking a Plan for day or Target end date did not light up the pill or show the date.')],
'1.8.18': [F("Brain Dump: a note's ⋯ has \"Add as comment to task…\" and \"Append to task note…\", both with a task picker (search, grouped by list, in Tasks order, Cancel).")],
'1.8.19': [B("Brain Dump cards didn't show crossed-out, bold or italic text in the title or in Compact spacing. Every place that shows a note now draws it the same way.")],
'1.8.20': [B("Day Planner: the day's Notes drifted off the ruled lines after bullet lines.")],
'1.8.21': [B('Brain Dump (Compact spacing): pressing → Task, Plan it or → Find Things while writing in a note closed it without doing anything.')],
'1.8.22': [B('Inside Brain Dump cards and task panels, typing "- " never became a bullet.')],
'1.8.23': [F('Pasting a screenshot or file into a note attaches it to the note, like dropping it on.')],
'1.8.24': [B('⋯ menus near the bottom of the screen (e.g. on a Brain Dump card) opened off screen.')],
'1.8.25': [F('Brain Dump: every note has an Archive button beside its ⋯; Delete stays in the ⋯.')],
'1.9.00': [F('Themes: Settings → Appearance is a dropdown with a preview of each theme. Glass – Default (plain fonts, handwriting kept for the Day Planner title and labels), Glass – Fancy (handwriting throughout), Dark, Light and Auto.')],
'1.9.01': [F('Brain Dump: 👁 and ⋯ sit on the search line, which stays at the top when scrolling. Every page\'s ⋯ says "Show Archive" / "Show Bin".')],
'1.9.02': [B('Dragging a file over a Day Planner item spanning several slots outlined only its first slot.')],
'1.9.03': [F('The Brain Dump New note box shows its toolbar only once you click or type in it. In full-screen writing the toolbar always shows.')],
'1.10.00': [F('Recurring tasks: "Repeats" in a task\'s panel (every day, weekday, week, 2 weeks, month, year, or every N days, weeks, months or years). Ticking one makes the next, with its sub-tasks unticked; unticking takes it back. Settings → Day Planner → "Recurring tasks go on the Day Planner on their day" (on at first).')],
'1.10.01': [F('Settings → Navigation has its drag grips on the left, like every other list.')],
'1.10.02': [F("Settings → Brain Dump types: grips show only when a row is hovered.")],
'1.11.00': [F("Undo that remembers: in any note, Ctrl+Z steps back through this visit's changes and then through the note's earlier saved versions, even ones made days ago or on another device; Ctrl+Y goes forward. 🕘 in the full toolbar (Aa) lists earlier versions to restore one. Settings → Notes → Keep note history for (30 days, 90 days, 1 year or forever).")],
'1.11.01': [F("Tasks: dragging a task over the middle of another previews it indented under that task; letting go makes it a sub-task at the end. Sub-tasks can be reordered by dragging.")],
}
NOTES['1.11.02'] = [B("A comment's ⋯ menu had a box round every item and could sit under the page's scrollbar; it now looks like the glass dropdown lists.")]
NOTES['1.11.03'] = [
  F('Tasks (Now, Next, Later): drag a sub-task out between two tasks and it becomes a task of its own; drag a task among another task\'s sub-tasks, onto a task, or sideways to the right to make it a sub-task.'),
  B("The sub-task arrow sat above the middle of the text, and Alternate shading ran into the margin past the ruled lines."),
]
NOTES['1.11.04'] = [
  B('While writing a new Brain Dump note, clicking a "This is a:" type only brought the page back from dimmed; a second click was needed to pick it.'),
  F('Brain Dump: "+ New" at the end of "This is a:" adds a type of note and picks it. The ⋯ at the end of the type filters (under "Your notes") opens Brain Dump types to add, rename, reorder or remove them, the same as Settings → Your words.'),
]
NOTES['1.11.05'] = [
  F("Day Planner: a scheduled item's open panel and the item form one rounded box, like the Tasks page's."),
  F('Day Planner with 👁 → Look → Alternate shading: an item spanning several slots has one even shade instead of stripes.'),
]
NOTES['1.11.06'] = [
  B('A task could end up on two days in the Day Planner (after changing its Plan for day, or bringing it in from another day).'),
  B('⋯ menus near the bottom of the screen flashed open downwards before moving above their button.'),
  F('Sub-tasks go three levels deep at most (a task, its sub-tasks, and theirs); dragging deeper says so.'),
]
NOTES['1.11.07'] = [
  F('Tasks: sub-tasks hang from their task by fine lines (down from under its tick box and across), and every row keeps its drag grip in the same column, so selecting by swiping down the grips works across tasks and sub-tasks.'),
  F('Tasks: sub-tasks are the same size as tasks, and the New task line is as tall as a task row, in every spacing.'),
  B('Pressing Esc on a half-typed new task threw the text away; it now adds the task and stops editing.'),
  B('Dragging a task sideways drew a thin blue line with a hidden "sub-item" label through it; with Alternate shading, a sub-task\'s shading started above its ruled line.'),
]
NOTES['1.11.08'] = [F("Tasks: clicking a task's note edits it right there, under the title (it saves as you type; Esc or clicking away finishes). The full panel is still under ⋯ / More.")]
NOTES['1.11.09'] = [
  B('Tasks: a task with sub-tasks sat slightly further right than the tasks around it.'),
  B('Tasks: drifting right while dragging a task towards another, and just missing it, still made it a sub-task. Dropping onto the middle of a task (the dotted outline) does that; sideways now takes a clear move.'),
  B('Brain Dump in Compact spacing: Plan it and → Find Things squeezed their choices into the small square; the note now fills the page while they are open (Esc or clicking outside goes back).'),
  B("Brain Dump: a note's Plan it choices stayed attached after going back into the note."),
]
NOTES['1.11.10'] = [
  B('Picking a task (Add as comment to task…, Append to task note…) listed Task Dump last instead of first, as on the Tasks page.'),
  B("Pressing a note's attached picture while writing in the note closed the note, and a picture opened in a new tab. It now opens over the page (click or Esc to close) and the note stays open."),
]
NOTES['1.12.00'] = [F('Tasks: ticking a task off a list no longer makes it vanish at once. It stays, crossed out, fading away while the "Done" message (with Undo) shows, then the tasks below slide up into its place.')]
NOTES['1.13.00'] = [
  F('Brain Dump: saving a new note (Save or Ctrl+Enter) makes it pulse in the list below for a few seconds, while you carry on writing the next one.'),
  B("Brain Dump: pressing a note's ⋯ while writing in it closed the note instead of opening the menu."),
]
NOTES['1.14.00'] = [
  F("Brain Dump: Plan it and → Find Things open a small pop-up by the button. The note stays as it is, still open for writing if it was; Esc or clicking elsewhere closes the pop-up."),
  F("Day Planner: clicking an item's note edits it right there, under the title, instead of opening the item's panel."),
  B('Day Planner with Alternate shading: the line next to an item spanning several slots could have the same shade as the item.'),
]
NOTES['1.14.01'] = [B("Tasks: ticking a task with sub-tasks faded the task but its sub-tasks vanished at the end instead of fading with it.")]
NOTES['1.15.00'] = [
  F("Tasks: pressing Enter while editing a task's name saves it and opens a new line just below, at the same level: a new sub-task under the same task, or a new task. Enter again adds it and opens the next; Esc or leaving it empty drops the line."),
  F("Tasks: a sub-task's ruled line, Alternate shading, and its pills and \"Add note\" line while editing start where its text starts, clear of the lines joining it to its task. Those lines are fainter."),
]
NOTES['1.15.01'] = [B('Tasks: the "New sub-task" line opened by Enter was drawn out of place (tick box on its own line, text at the far left).')]
NOTES['1.15.02'] = [
  B("Tasks (and Lists): Tab in an item's name sometimes indented it and sometimes jumped to its note. It now always indents (Shift+Tab outdents), and says why when it can't; the cursor stays where it was in the name."),
  F("Tasks: Shift+Tab in a task's note (under its name) goes back to the name; Tab moves on as usual."),
]
NOTES['1.15.03'] = [B('Tasks: in a narrower window, the pills and "Add note" line under a task being edited (and under the New task line) started to the left of the task\'s text. They now line up with it at any width, sub-tasks included.')]
NOTES['1.16.00'] = [
  B("Clicking away from a half-typed New task line (Tasks and the Day Planner) kept the text but didn't add the task. It's now added, as Enter would."),
  F('Tasks: on a New task line (at the bottom, or the one Enter opens under a task), "- " at the start makes it a sub-task straight away (with Undo), and Tab / Shift+Tab move it in and out a level. ↑ / ↓ move between its name and its "Add note" line.'),
  F("Tasks: task text sits a little in from the edge of its Alternate-shading band, with its pills and \"Add note\" lined up; the highlight while editing a name starts where the band does."),
  B("Tasks in Expanded spacing: a ruled line ran along the top edge of an open task's panel."),
]
NOTES['1.17.00'] = [
  F("Attached files open in a viewer over the page, with a ✕ to close (or Esc, or a click on the dark background). With several files, ← / → (the arrows at the sides, or a swipe on a phone) move between them, stopping at the first and last. A PDF or text file shows as a document card with Open, which opens it in a new page."),
  F("Brain Dump in Compact spacing: pressing a note's 📎 count opens the viewer, and a note open for writing shows its files. Tasks: the small pictures in Expanded spacing and the 📎 pill open the viewer too."),
  B("Pressing a note's 📎 count in Compact spacing did nothing, and while writing in the note it closed the note."),
]
NOTES['1.17.01'] = [
  F("Item panels have visible structure: Comments and Details each sit in a light box with a heading, More is a bar with an arrow that is plainly clickable, and Close, Archive, Delete sit in a shaded footer along the bottom. Tasks, the Day Planner, Lists and Find Things panels all match."),
  B("Tasks: in a task's panel, Plan for day sat higher than the fields beside it because Add to today / Remove date hung underneath it. They are now small Today and ✕ buttons on the label line."),
]
NOTES['1.17.02'] = [
  F("Tasks: the pills under a task show just their values in every spacing (📅 Tue 8 Jan, ⏱ 60 min); the icons say what they are, and hovering gives the words."),
  F("Tasks in Compact spacing: on a laptop-wide window the pills sit at the far right of the task's line; on a phone or a narrow window only the task's text shows (plus the ▾ that folds its sub-tasks)."),
]
NOTES['1.17.03'] = [
  F("Item panels (Tasks, Day Planner, Lists, Find Things) stay open when you click elsewhere on the page; they close with Close, ⋯ again or Esc. Close is a green pill with a tick."),
  F("Phones: an open task's full panel uses the whole width of the screen, still in place among the tasks."),
]
NOTES['1.17.04'] = [
  F("With rows selected by their ⠿ (the selection bar showing), the Delete or Backspace key does what the bar's Delete does, with Undo in the message. It works in Tasks, Lists, Find Things, Brain Dump, Contacts, the Day Planner and the Archive; never while typing, and never \"Delete forever\"."),
]
NOTES['1.17.05'] = [
  F("Tasks: when the New task line at the bottom becomes a sub-task (\"- \" or Tab), the faint L joining it to its task is drawn straight away, carried down from the rows above; Shift+Tab or Undo takes it away again."),
]
NOTES['1.17.06'] = [
  F("Tasks and the Day Planner: ↑ / ↓ while editing walk through the list. In a name, ↓ goes to its end, then into its note (or \"Add note\"); from the note's last line, ↓ goes to the next task's name, and on down to the New task line and its note. ↑ walks back the same way (note → end of the name → start of the name → the task above's note). Moving saves what you leave, as clicking away does. In the Day Planner this works within the Schedule, and within the Tasks down to its New task line."),
]
NOTES['1.18.00'] = [
  F("Keyboard: ← / → move between a page's tabs (Tasks: Task Dump, Now, Next, Later, Done; Contacts: Recent, Directory, Cases; Find Things' life areas; Archive / Bin), and Ctrl+← / Ctrl+→ move between areas in the navigation's order, Settings last. Only when nothing is being typed and no menu, pop-up or panel is open; the Day Planner keeps ← / → for its days, and Alt+← / → stay the browser's Back and Forward."),
]
NOTES['1.18.01'] = [
  B("Full-screen writing: clicking the note's header (or its frame) took the cursor out of the note, so the writing area turned darker until the pointer went back over it."),
]
NOTES['1.18.02'] = [
  B("A task repeating every month (or year) from the 29th, 30th or 31st moved to the 28th after February and stayed there. It now falls on the last day of shorter months and goes back to its own day after; moving one's date by hand makes the new day the one it keeps."),
]
NOTES['1.18.03'] = [
  B("Day Planner: at some window widths the browser logged a \"ResizeObserver loop\" notice (nothing visible went wrong)."),
]
NOTES['1.19.00'] = [
  F("Task comments link like notes: typing 📞 or 📝 (or pressing the small 📞 📝 that show beside the box while you write a comment) opens the same search and puts a link in; phone numbers and emails become links to contacts when the comment is saved (Undo takes them back); web addresses in a comment can be clicked."),
]
NOTES['1.20.00'] = [
  F("Scans: the Scans area works. Scan takes a photo on a phone (or picks photos and PDFs on a laptop, or drop them on the page) and saves it straight away as e.g. \"Receipt 26 Sep 14:32\"; big photos are made smaller to save space. Each scan opens to set its kind (receipt, warranty, letter, ID, other), expiry date, a letter's date and what it says, a note, more pages, and a contact, case or task it's filed with. Scans show newest first as cards, with kind filters and search; an expiry date coming up is highlighted, and \"Remind me 3 months before it expires\" adds a task. Scans are in search, Archive & Bin, a case's timeline and a contact's Connected list, and sync and back up like attached files."),
]
NOTES['1.21.00'] = [
  F("Contracts: the Contracts area works. On a laptop, a table of your contracts (click a heading to sort) with what each costs, what that comes to in a year, and when it renews (orange within 60 days, red if it's passed), plus the year's total for everything current, by kind; on a phone, cards by kind. Current / Renewing soon / Ended / All along the top, and search. Each contract has its status, kind, provider, reference (hidden as dots until you tap it, with a copy button), what it covers, cost and how often, how it's paid, start, renewal and end dates, notice, whether it renews by itself, the provider's phone (tap to call), website and contact, your own extra details (e.g. Excess), files, a note, and \"Remind me N days before it renews\", which adds a task. \"Renew or switch…\" ends it and starts the next one from its renewal date, keeping the history."),
  F("Scans: → Contract starts a contract from a scan (e.g. a warranty) and files the scan with it."),
]
NOTES['1.21.01'] = [
  F("Scans: an ID (passport, driving licence) shows blurred on its card and page until you tap it, for anyone looking over your shoulder."),
]
NOTES['1.21.02'] = [
  F("Brain Dump: a note's colour can only be picked while 👁 → Look is Multicolour (the only Look that shows it): the dot on a card, ⋯ → Colour…, the colour swatch on the writing toolbar and the selection bar's Colour… are hidden otherwise."),
]
NOTES['1.21.03'] = [
  B("iPhone: pasting a screenshot into a note (e.g. a task's) left the page dimmed with nothing tappable, not even the message, until the app was closed and reopened. The note now stays open while its files row shows the picture, and messages (with their Undo) show above a full-screen note."),
]
NOTES['1.21.04'] = [
  B("Accepting a new version (\"A new version of Sift is ready · Reload\") while writing in a full-screen note reloaded the page before the note was saved, losing what had been typed. The reload now waits for the note to save."),
  B("In a full-screen note, ↓ at the end of the text moved the cursor out of the note to the next task or item. It now stays in the note."),
]
NOTES['1.21.05'] = [
  F("Day Planner: a scheduled item's note saves as you type, like Brain Dump notes (before, only when you left it), and Esc keeps what you typed instead of throwing it away."),
]
NOTES['1.21.06'] = [
  F("Every note (Lists, Find Things, Contacts, Scans and Contracts too) saves as you type, and at once when you leave it, change page or switch away from the app."),
]
NOTES['1.21.07'] = [
  F("Esc always leaves what you're working on and keeps it, one step per press: a name, field or note is saved (\"Saved · Undo\") and left, and the next Esc closes the panel around it; a list, contact, case, scan or contract page goes back to its list; ⋯ and 👁 menus close. Brain Dump's New note: Esc stops writing and the page is no longer dimmed."),
  B("Esc threw typing away in several places: the Day Planner's New task line and an empty Schedule line, a Brain Dump note being edited, a half-written comment, and a note under a task being edited."),
]
NOTES['1.22.00'] = [
  F("Browsing with the keyboard. With nothing being edited, ↓ and Enter get going: in Tasks and the Day Planner ↓ edits the first entry and Enter starts a new one. In Brain Dump, Lists, Find Things, Contacts, Scans and Contracts ↓ goes into the search box, then onto the items: the one you're on is outlined, ← / → go to the previous / next, ↑ / ↓ to the one above / below, Enter opens it (a note opens for editing, cursor at the end), and Esc steps back out, one level at a time."),
]
NOTES['1.22.01'] = [
  F("Archive and Bin is in the navigation, called Tidied (rename it in Settings → Your words → Dictionary), just before Settings; move it like any other area in Settings → Navigation. It's no longer a card in Settings."),
  F("↓ on an empty list (e.g. an empty Tasks tab) starts a new entry, as Enter does."),
]
NOTES['1.22.02'] = [
  F("Brain Dump: from Search your notes, ↑ goes up into New note."),
]
NOTES['1.22.03'] = [
  F("The outline showing which item you're on when browsing with the keyboard sits inside the item, clear of its neighbours."),
]
NOTES['1.22.04'] = [
  F("Alt+Enter goes one level in: while writing in any note it opens it full screen (Esc comes back out), and when browsing, Alt+Enter opens the outlined note straight into full screen."),
]
NOTES['1.22.05'] = [
  F("Esc takes the cursor off a button, link or filter reached with Tab (the browser's outline goes), so ↓ and the arrows work on the page again."),
]
NOTES['1.22.06'] = [
  F("Brain Dump, browsing with the keyboard: the filter bar (All, Thought, Idea…) is a stop between Search your notes and the notes. ↓ from the search box highlights the filter showing, ← / → switch filter straight away (at either end the filter flashes and nothing changes), ↓ goes on to the notes and ↑ from their top row comes back to the filters. With nothing selected, ← / → go straight to the filters. Esc in Search your notes goes back to having nothing selected."),
]
NOTES['1.22.07'] = [
  F("A new app icon: a prism splitting light. An iPhone keeps the old picture on the Home Screen: open Sift in Safari, Share → Add to Home Screen, turn sync on in the new one (Settings → Sync, your Data code) and let everything arrive, then remove the old one. Android and laptop installs pick up the new icon by themselves within a day or so."),
]
NOTES['1.22.08'] = [
  F("A file still arriving through sync is labelled \"name (size) · still arriving on this device through sync\"."),
]
NOTES['1.22.09'] = [
  B("Day Planner: just after it opened, the page's spacing changed and its paper could show yellow for a moment before turning to the chosen paper."),
]
NOTES['1.22.11'] = [
  F("Esc in Search your notes leaves the box and keeps the search; a second Esc clears it and all the notes show again. The same in the other areas' search boxes."),
]
NOTES['1.22.12'] = [
  B("Brain Dump: on a phone, the ⋯ at the end of the note types under Your notes (to add, rename or remove types) could sit off the right-hand edge of the screen."),
]
NOTES['1.23.00'] = [
  F("Brain Dump: keys for the note outlined while browsing with the keyboard. C colour (← / → and Enter to pick), T make it a task, P Plan it, A archive, D delete (Undo in the message), * pin or unpin. Ctrl+V attaches a picture or file from the clipboard; Ctrl+C copies the whole note with formatting, with Copy markdown instead in the message."),
]
NOTES['1.23.01'] = [
  F('An empty value in History and the Quantity box in Find Things show a plain dash.'),
]
NOTES['1.23.02'] = [
  F('The server guide (server/README.md) starts with how accounts and passwords work: creating the first account, adding another person, changing or recovering a password, and removing an account.'),
]
NOTES['1.23.03'] = [
  F('Settings, Sync: the server address and email typed in stay on this device, even before signing in, until they are cleared.'),
  F('Settings, Sync: says whether the server was found, whether it is taking new accounts (the only time Create account shows), and if it can\'t be reached, the likely reasons.'),
  F('Settings, Sync: one Get the certificate button. In the iPhone Home Screen app it copies the address to paste into Safari, instead of opening a blank page. The steps say that the certificate has to be switched on under Certificate Trust Settings.'),
]
NOTES['1.23.04'] = [
  B("Brain Dump: in Plan it on a laptop, picking an Estimated time closed the pop-up without planning."),
  F("Brain Dump: Plan it brings the rest of the note (everything after its first line) into the planned item's note."),
]
NOTES['1.23.05'] = [
  B('Batch Book: its page said "Coming in phase 1, step 9", which only made sense in the build plan. It now says "Coming soon."'),
]
NOTES['1.23.06'] = [
  B('Dates: September was "Sept" in some places and "Sep" in others, and some dates were in the browser\'s order (Sep 27) rather than the app\'s (27 Sep). Every short date now reads the same way, e.g. "Sun 27 Sep".'),
]
NOTES['1.23.07'] = [
  B('Scans and Contracts: dragging a file over the page showed the hint meant for notes ("Drop onto a note or item to attach it"). On Scans it now says the file will be saved as a new scan (or added as pages to the scan that is open); on a contract\'s page it says it will be added to the contract\'s files, and dropping there does that.'),
]
NOTES['1.23.08'] = [
  B('Task comments: a contact or note linked with 📞 or 📝 while writing a comment showed as [name](sift:...) in the box until the comment was saved. It now shows just its name while writing, and is still a link once saved.'),
]
NOTES['1.23.09'] = [
  B('Sync server: one request with a badly written address could stop the server until it restarted.'),
  B('Sync server: the limit of 10 wrong sign-in tries per address could be dodged behind Apache by sending a made-up address header. It now uses the address the web server adds, and old failed tries are cleared.'),
  F('Sync server: sign-in and account requests are limited to 64 KB, and a wrong email takes as long to answer as a wrong password.'),
  F('Sync server: `install.sh proxy` installs the server without Caddy, for a machine that already runs Apache, nginx or ISPConfig. server/README.md explains the web server settings.'),
]
NOTES['1.23.10'] = [
  F("The page check (development only) goes through the Scans and Contracts filters and opens the first scan's and contract's own page. What it couldn't try because there was nothing there yet is listed under skipped."),
]
NOTES['1.23.11'] = [
  B('An app several versions behind showed "A new version of Sift is ready" again straight after Reload was pressed, once for each version in between. One press now goes straight to the newest version.'),
]
NOTES['1.23.12'] = [
  B('Tasks: editing a task\'s note in place (clicking it, or ↓ from the task\'s name) opened the full notes editor with its toolbar, and in Compact spacing as a dimmed panel on the right. It is now plain text under the task\'s name, the same in every spacing and at any width; ↓ on its last line goes on to the next task, ↑ on its first line back to the name, and Alt+Enter opens the task\'s panel.'),
  B('Tasks: in Medium and Expanded spacing a task\'s note started a little left of the task\'s name.'),
]
NOTES['1.23.13'] = [
  F("Tasks: a task's note edited in place (click it, or ↓ from the task's name) keeps the notes editor's keys again: Ctrl+B, Ctrl+I, \"- \" for a bullet, Alt+Enter for full screen, Ctrl+Enter or Esc to finish. It still has no toolbar and doesn't dim the page, in every spacing and on a phone."),
]
NOTES['1.23.14'] = [
  B('Sync: moving a device from one sync server to another (Settings → Sync, create an account or sign in on the new server) uploaded nothing, because the new server stopped at the old server\'s record numbers. Everything on the device is now uploaded to the new server.'),
]
NOTES['1.23.15'] = [
  B('Sync: after creating an account, the notes already on the device were uploaded only once "Start syncing" was pressed under the recovery code. Leaving that screen another way meant they never went up. Everything on the device is now queued for upload as soon as the account is made (or on signing in).'),
]
NOTES['1.24.00'] = [
  F('Ctrl+. (⌘+. on a Mac) makes the line the cursor is on a bullet, or plain text again if it already is one, from anywhere in the line: the same as typing "- " at its start. In any note, full screen or not, and in the Markdown view.'),
]
NOTES['1.25.00'] = [
  F('Day Planner: when a day (today or later) has more planned than it holds, a note under the date says so, e.g. "That\'s 11h of plan for a 10h day." Timed items count their time, the rest their estimated time; done and let-go items don\'t count. It can be turned off in Settings, Day Planner.'),
]
NOTES['1.26.00'] = [
  F('Day Planner: once a day is over (an earlier day, or today after the day\'s end), a line under the date says what got done, e.g. "You did 6 things today." It counts what was done, never what wasn\'t. It can be turned off in Settings, Day Planner, Nudges.'),
]
NOTES['1.26.01'] = [
  B('Tasks: a note typed before the task was added (the New task line\'s "Add note"), or in "Add note" under a task that had none, was plain text: "- " didn\'t make a bullet until the note was opened again, and Ctrl+B and the other note keys did nothing. They are the notes editor now, as a task\'s note is. In the New task line\'s note, Enter is a new line and Ctrl+Enter adds the task.'),
  B("Tasks: a task's note being edited looked the same as the task's name. It now looks as it does when not being edited: smaller and fainter (in italics in the Glass look)."),
]
NOTES['1.26.02'] = [
  F('Settings, Sync: the server is checked again on leaving the Server field, with Check again, and every 12 seconds while it can\'t be reached or isn\'t taking new accounts, so Create account appears once new accounts are allowed.'),
]
NOTES['1.26.03'] = [
  B('On a phone, opening More put the cursor in Search everything, so the keyboard came up and covered the bottom of the list. Tap the box to search.'),
]

NOTES['1.26.04'] = [
  B('On an iPhone, tapping into a note or a small text box zoomed the page in. Text you type into is now big enough on touch screens that the page stays put.'),
]

NOTES['1.26.05'] = [
  B('On a phone, the page no longer zooms with two fingers, like an app. For bigger text, use Text size in Settings.'),
]

NOTES['1.26.06'] = [
  F('Tasks in Compact spacing: the 📝 and the pills sit just after the task\'s name, not at the far right. A long name ends in "…" so they still show.'),
]

NOTES['1.26.07'] = [
  F('Tasks: a note being written in place (no toolbar) has a small "Note editor" button under it, which opens the note full screen with its toolbar. ↑ and ↓ go past it as before.'),
  B('Tasks: a note opened full screen from being written in place (Alt+Enter) was pushed to the right on a phone and kept its small italic text.'),
]

NOTES['1.26.08'] = [
  B('On an iPhone, tapping Plan for day opened the date picker and it closed at once, planning the task for today. Dates are now saved when the picker is closed.'),
  B('A task\'s Plan for day couldn\'t be removed on an iPhone. There is now a Remove button next to it (in the pills and in the task\'s panel), and Reset in the iPhone picker empties it.'),
  B('On a laptop, Clear in a date picker in Tasks wasn\'t saved until you left the date, so it still showed Today.'),
]

NOTES['1.26.09'] = [
  F('Tasks: the New task line shows "Add note" and the pills only once you start typing the task\'s name, and puts them away again if the name is emptied.'),
]

NOTES['1.26.10'] = [
  F('Tasks: the button under a note written in place is now a real button, "Fullscreen note editor", on its own line at the right.'),
]

NOTES['1.27.00'] = [
  F('Tasks: a Layout section in the 👁 view menu, with four switches for trying out layouts (all off keeps Tasks as it was): New task line at the top (↓ and Enter at the top of the page then start typing a new task), Start typing a new task on arriving, New tasks added at the top, and Show margin (a red margin like the Day Planner\'s, every tick box in it, sub-tasks indented to its right and joined to their task by the ruled lines).'),
]

NOTES['1.27.01'] = [
  F('Tasks: 👁 → Layout → Highlight item when added. When on, a task just added pulses yellow, as a task you were sent to by a link does.'),
]

NOTES['1.27.02'] = [
  F('Tasks: with 👁 → Layout → Highlight item when added, a new task pulses once in a soft blue (not the bright yellow used to point something out), and the list scrolls to it if it was added out of view.'),
]

NOTES['1.27.03'] = [
  F('Tasks with 👁 → Layout → Show margin: the margin and the tasks right of it sit a little further right (more on a laptop than on a phone).'),
]

NOTES['1.27.04'] = [
  F('Tasks: 👁 → Layout → Hide pills behind More. While editing a task, or typing a new one, only a small More pill shows, at the right of the name, so the line doesn\'t grow; More shows Add note and the pills (and More…, for the whole panel). "More goes straight to the full panel" (with it on) opens the panel at once instead.'),
  F('Tasks: 👁 → Layout → Show additional lines when list is empty (on to start with). Untick it and an empty list shows just the New task line, without the ruled lines under it.'),
]

NOTES['1.28.00'] = [
  F('Tasks: 👁 → Layout → Lined paper layout (on to start with). Untick it for the look of earlier versions: New task a rounded box at the top with an Add button (Enter adds), and each task a shaded rounded card, its sub-tasks inside the same card. The keyboard works as with the lined paper. Without it, New task line at the top, Show margin and the extra lines under an empty list don\'t apply (greyed out).'),
  F('Tasks: the pulse on a task just added (Highlight item when added) is a thinner, deeper blue.'),
]

NOTES['1.28.01'] = [
  B('Tasks with Hide pills behind More: after pressing More on a task, leaving it and coming back still showed its pills instead of just More.'),
]

NOTES['1.28.02'] = [
  F('Tasks without the lined paper: a small gap under each task card, in Compact spacing too.'),
]

NOTES['1.29.00'] = [
  F('Tasks, 👁 → Layout: switches that go with another (New task line at the top, Show margin and the extra lines under Lined Paper; More goes straight to the full panel under Hide pills behind More) show under it, joined by a line, only while it is ticked. Renamed: Lined Paper, New tasks appear at top, Highlight task when added.'),
  F('Tasks: new starting choices (on a device where the Layout switches were never changed): no lined paper, start typing a new task on arriving, new tasks at the top, highlight a task when added, pills behind More.'),
  F('Tasks: a task\'s sub-tasks slide open and closed when its ▾ 1/2 is pressed.'),
  F('Tasks: a task ticked off shows "⏳ Transferring to Done list" while it fades (untick it to keep it).'),
  F('Tasks: Shift+Enter presses More (with Hide pills behind More), shown on the pill.'),
]

NOTES['1.30.00'] = [
  F('A Share pill (like the Day Planner\'s) on Brain Dump, Tasks, Lists, Places, Contacts, Scans and Contracts, left of 👁 and ⋯: copies what the page shows as plain text, rich text or for WhatsApp.'),
  F('Keys with nothing picked and nothing being typed in: V opens 👁, S opens Share, . (full stop) opens the page\'s ⋯. Esc closes it again.'),
  F('Ctrl+Space ticks or unticks the item being edited or picked (tasks, list items, the Day Planner).'),
  F('Day Planner: 👁 moves up, right of Share. The down-day line ("Sunday is a down day...") sits under Day Focus and Energy.'),
  F('Tasks with Hide pills behind More: More (Shift+Enter) also shows the task\'s note, and Enter in the name then goes into it (or into Add note).'),
  F('Tasks: ↑ / ↓ in a task\'s name go straight to the task above / below.'),
  F('Tasks: Add note keeps its size and its faint "Add note" once clicked, until you type.'),
  B('Tasks in Compact spacing: going into a note squashed the task\'s name to nothing.'),
]

NOTES['1.30.01'] = [
  F('Tasks without the lined paper: 15px between the New task box and the tasks under it.'),
]

NOTES['1.30.02'] = [
  F('Date pills (Plan for day, Target end date and others): no Remove pill after a set date; the date picker clears it.'),
]

NOTES['1.30.03'] = [
  B('Day Planner on a wide screen: the down-day line ("Sunday is a down day...") dropped to the bottom, under the schedule.'),
]

NOTES['1.31.00'] = [
  F('Sharing between accounts on the same sync server. A list (👥 Share on the list), a note (⋯ → Share with someone) or the Day Planner (Share menu: this day, this week or the whole diary) can be shared by the other person\'s sign-in email. They get an invitation and accept it in the same area; after that you both see and change it. Things shared with you stay apart from your own: Lists has a Shared with me section, Brain Dump a filter for each person, and the Day Planner\'s Share menu shows their day, with a note saying whose it is. The person who shared can remove someone or stop sharing (it stays theirs); anyone it\'s shared with can leave. Needs the updated server.'),
]

NOTES['1.32.00'] = [
  F('Day Planner 👁 menu, Layout: switches for Achievements, Day focus and Energy (all on to start with). Achievements is a line under Day focus and Energy, labelled the same way, once anything is done: "Three and counting", then bigger praise from 6 and from 11, and it says so when everything is done. It replaces "You did 6 things".'),
  F('Day Planner nudges (the ▶ at the current time, the evening section, reminders) moved from Settings to the Day Planner 👁 menu.'),
  F('👁 view settings on every page sync between devices of the same kind: phones with phones, computers with computers. The latest change wins. "Keep this device\'s view separate", at the bottom of each 👁 menu, keeps one device to itself.'),
]

NOTES['1.32.01'] = [
  F('Day Planner 👁 menu, Layout: "Show \"Today\" or \"In 5 days\" under the date" (on to start with).'),
]

NOTES['1.32.02'] = [
  F('Day Planner 👁 menu, Layout: Achievements starts switched off.'),
]

NOTES['1.32.03'] = [
  B('Day Planner: the "unfinished from earlier days" box sat a little indented, not lined up with the down-day box above it.'),
]

NOTES['1.32.04'] = [
  F('Sharing keeps one copy: something shared lives only in its share on the server, not in your own records as well, and goes back into your own records if you stop sharing it.'),
]

NOTES['1.32.05'] = [
  F('Day Planner 👁 menu, Layout: "Show unfinished items from earlier days" (off to start with).'),
]
NOTES['1.32.06'] = [
  B('On a laptop, the top bar\'s More menu stayed open after clicking somewhere else on the page, and was half greyed out when Brain Dump dimmed the page.'),
]

NOTES['1.32.07'] = [
  F('Brain Dump: the New note box stays while you look at notes someone shares with you. What you write there is your own note: saving it goes back to All and lights the new note up.'),
]

NOTES['1.32.08'] = [
  F('Day Planner, Glass paper on the blue and dark themes: the Schedule, Tasks and Notes titles are pastel yellow again, as in the older build.'),
]

NOTES['1.32.09'] = [
  F('Day Planner, Glass themes (Default and Fancy): the Schedule times are in the handwriting again, as in the older build.'),
]

NOTES['1.33.00'] = [
  F('Custom theme: choose Custom in Settings → Appearance to set your own fonts and colours, section by section (Whole app, Top and bottom bars, Brain Dump, Tasks, Day Planner, Lists and the rest). It starts from the theme you were using, so nothing changes until you pick something. Fonts include the handwriting used for Schedule times on the Sift test site. "Change fonts and colours" under the theme opens it again.'),
]
NOTES['1.34.00'] = [
  F('Custom theme is a visual editor: each section (Whole app, the bars, Brain Dump, Tasks, the Day Planner and the rest) is shown as a sample page. Point at anything and it is outlined; press it to change its colour or font. Everything is also listed under "Everything in …".'),
  F('Custom theme colours can be see-through, and the Whole app background sets how frosted the panels look.'),
  F('Custom theme font lists show each font in its own lettering.'),
  F('Custom theme: a colour that would make writing hard to read is put back, with a message saying which colour it went back to.'),
]
NOTES['1.34.01'] = [
  F('Ctrl+Z (⌘Z on a Mac) does what Undo on the message at the bottom does, while it shows. The Undo button says so. Once something is typed after it, Ctrl+Z undoes the typing instead.'),
]
NOTES['1.35.00'] = [
  F('A welcome the first time Sift is opened: see the tour now, put it on your to do list (a task with a ▶ Start the tour pill, ticked off when the tour is finished), or just use the app.'),
  F('The tour: a walk round Sift that has you try things for real (writing a note, turning it into a task, adding a task, getting around), and shows sharing, the Day Planner, lists, search and undo. Laptops get the keyboard shortcuts; phones get taps. Settings → Take the tour starts it again.'),
]
NOTES['1.35.01'] = [
  F('The tour carries on where it was left, and has End tour early on every step: the "Take the tour of Sift" task then waits on Now, highlighted, and its ▶ pill carries on. N and B go to the next and previous steps on a keyboard. Settings → Take the tour opens the welcome page; Reset the tour starts it from the beginning next time.'),
  F('The tour has more to say: keeping notes in order, choosing and moving several tasks with the actions bar, energy levels, dragging tasks onto a time, the day\'s notes, everything in 👁, copying and sharing a day (and switching to someone else\'s), transient and stored contacts, and themes. Keys are drawn as separate keys, and the page\'s place in the navigation is outlined.'),
]
NOTES['1.35.02'] = [
  F('"⤢ Fullscreen note editor" under a note shows its key, Alt+Enter.'),
]
NOTES['1.35.03'] = [
  F("Tasks: Shift+Enter in a task's name, or in New task, opens More and puts the cursor in the task's note, ready to write."),
]
NOTES['1.35.04'] = [
  F("The tour's note steps say what's different about notes in Sift: action buttons, formatting (or plain text), phone numbers and emails picked out as contacts, attaching screenshots and PDFs, undo back through earlier versions, and a new step: nothing typed is ever lost, even a note not saved yet."),
]
NOTES['1.35.05'] = [
  F("The tour's first step owns up: Tasks and the Day Planner are the best part (with an ice cream 🍦 on offer)."),
]
NOTES['1.35.06'] = [
  F("The tour covers sub-tasks and projects (drag a task onto another, or start it with \"- \"), says sharing a day literally lets you see someone else's Day Planner, and has a few Friends moments."),
]
NOTES['1.35.07'] = [
  F('On a phone, a sideways swipe does what ← and → do on a keyboard: Now, Next and Later in Tasks, the next or previous day in the Day Planner, the filters in Brain Dump. It no longer takes the browser back or forward a page (in Safari, from the screen\'s edge too).'),
  F('Settings: Navigation comes third, after Appearance.'),
]
NOTES['1.35.08'] = [
  F('The tour\'s "Never lose a note" step: when the rain starts to pour, and a lost cookie recipe.'),
]
NOTES['1.35.09'] = [
  F('The tour is a step shorter: "Tidy without filing" is gone.'),
]
NOTES['1.35.10'] = [
  F('The tour\'s "Never lose a note" step ends without the cookie recipe.'),
]
NOTES['1.35.11'] = [
  F("On a phone, a sideways swipe slides the page like a phone's own screens: the page slides away and the next list or day slides in (iOS 18 and later; before that the next one just slides in). With nothing further to go to, the page gives a small nudge."),
]
NOTES['1.35.12'] = [
  F("On a phone, swipe a task sideways, as in a phone's mail app: left shows ✓ Done and ⋯ More, right shows Delete. A swipe elsewhere on the page still changes list."),
]
NOTES['1.35.13'] = [
  F("On a phone, swipe an item in the Day Planner (in the plan or the day's tasks) as in Tasks: left for ✓ Done and ⋯ More, right for Delete."),
  F("Brain Dump: choosing a filter slides the notes across to it. On a phone, a side swipe no longer changes filter; the page just nudges."),
]
NOTES['1.35.14'] = [
  B("On a phone, closing a swiped task or Day Planner item (tapping it, or swiping it back) could start editing its name."),
]
NOTES['1.35.15'] = [
  B("Day Planner: Bring in from tasks (and Unfinished from earlier days) went off the side of the screen when a task's note had a long web address in it."),
]
NOTES['1.35.16'] = [
  F("Sliding to the next list or day moves only what changes: in Tasks the list (New task and the tabs stay), in Brain Dump the notes (the box, search and filters stay), in the Day Planner the day (its buttons stay). The underline under the tab or filter glides across to the new one."),
]
NOTES['1.35.17'] = [
  B("Swiping a task or a Day Planner item sideways: the whole block moves and its buttons fill the gap beside it, instead of showing under the text. In the Day Planner the time stays where it is, and Delete sits to the right of it."),
]
NOTES['1.35.18'] = [
  B("Swiping a task or a Day Planner item: its rounded corners go square next to the buttons, and the buttons are exactly as tall as it, so they meet edge to edge."),
]
NOTES['1.35.19'] = [
  B("Swiping a task or a Day Planner item: the item stays where it is, with its name still readable, and the buttons slide in over it from the side. In the Day Planner they never cover the time, and a day's task's tick box no longer jumps over its name."),
]
NOTES['1.35.20'] = [
  B("Sliding to the next list in Tasks: the underline under the tabs no longer flashes; it glides across, and the new tab pulses once, light blue (Brain Dump's filters too)."),
  B("Phones: a side swipe that starts on the bar of areas at the bottom no longer changes page."),
]
NOTES['1.35.21'] = [
  B("Day Planner on a phone: the day's buttons stay on one line on every paper (Share shows as its icon when there's no room for the word), so the 👁 menu no longer jumps down a line, or off the screen, when you change paper."),
]
NOTES['1.35.22'] = [
  B("Swiping a task or a Day Planner item: the buttons slide in over it, and once they reach its name the name moves along with them, so you can always see what you're about to delete or tick off."),
]
NOTES['1.35.23'] = [
  B("Swiping a task right: Delete opens right up to its name, over the grab bar, tick box and a sub-task's lines, then moves the name along."),
]
NOTES['1.35.24'] = [
  B("Sliding between lists in Tasks: the tab bar scrolls to keep the chosen tab (and the one past it) in view."),
  B("The tab you land on now rings once with a crisp thin light blue border instead of a glow, and swiping again quickly stops the last ring, so it never rings the wrong tab."),
]
NOTES['1.35.25'] = [
  B("Tasks, compact spacing: beside a task's name only its note (📝) shows, not its other pills, so there's room for the name; and while you edit a task, only its editing pills show, not the small ones as well."),
]
NOTES['1.35.26'] = [
  B("The tab you land on in Tasks, and the filter in Brain Dump, now flash once with a see-through yellow instead of a ring."),
]
NOTES['1.35.27'] = [
  B("The yellow flash on a tab or filter keeps its underline straight (only its top corners round)."),
]
NOTES['1.35.28'] = [
  B("The yellow flash on a tab or filter is a little brighter and quicker."),
]
NOTES['1.35.29'] = [
  B("Tasks: the fade at the right of the tab bar goes once it's scrolled to the last tab, so Done is shown clearly."),
]
NOTES['1.35.30'] = [
  B("Phones: the page no longer bounces up or down past its ends, so the top and bottom bars always stay put; and a sideways swipe to change page no longer moves the page up or down with it."),
]
NOTES['1.35.31'] = [
  F("Day Planner on a phone: tap an item once to get it ready. Drag it by any part of it to another time, or drag the bar at its bottom down to make it longer; tap it again to edit it. Stretching an item no longer opens it for editing instead."),
]
NOTES['1.35.32'] = [
  F("Tasks and the Day Planner: Ctrl+Enter (⌘+Enter on a Mac) in a task's or item's name ticks it done, and again unticks it. On a wide screen a ✓ Done chip beside More shows it."),
  B("Shortcuts shown on buttons draw each key in its own box (Shift, Enter), not one box for both."),
]
NOTES['1.35.33'] = [
  F("Day Planner tasks: the New task line is at the top; done tasks stay in view at the bottom, crossed out, after an empty line, instead of folding away under Done."),
]
NOTES['1.35.34'] = [
  F("The tour shows the ways to use tasks: one big list brought into each day, small things just for today, or both, or the Day Planner alone."),
]
NOTES['1.35.35'] = [
  B("Day Planner tasks: the empty line before the done tasks no longer shows a faint tick box."),
]
NOTES['1.35.36'] = [
  B("The tour's step on the day's tasks now makes clear they're this day's own list, separate from your main Tasks list, which it outlines in the bar."),
]
NOTES['1.35.37'] = [
  B("Day Planner tasks: the New task line is back under the tasks still to do (above the done ones)."),
]
NOTES['1.35.38'] = [
  B("Tasks: while you type a task's note in place, its pills (energy, time, dates, list) stay open instead of flashing and going."),
  B("On a computer, the Fullscreen note editor button sits on the note's own line."),
  F("Tasks on a computer: Shift+↑ / ↓ in a task's name stops editing and selects it and the task above / below; again, the selection grows or shrinks."),
  F("The selection bar says \"2 selected\", shows each button's keys, which work while things are selected (Ctrl+Enter Done, A Archive, D Delete, Tab / Shift+Tab Indent / Outdent), and only shows Indent or Outdent when some of the selection can go that way."),
  F("Tasks: Now, Next and Later sit behind one Move button that opens sideways (without the list you're looking at)."),
]
NOTES['1.35.39'] = [
  F("Tasks: press and hold anywhere on a task (finger or mouse) to drag it: a ripple spreads from where you press, then it lifts. Drag up or down (the others slide out of the way), onto another task to make it a sub-task, or sideways to indent or outdent (a bar shows where it will land). Holding a task no longer opens its panel. The ⠿ grab handle still selects several."),
]
NOTES['1.35.40'] = [
  B("Tasks, press and hold to drag: letting go on an iPhone no longer brings the keyboard up; holding while editing a task leaves the editing and drags it; dragging a task with sub-tasks shows their names (not \"on\")."),
  B("Tasks: dragging sideways no longer indents (drop onto a task to make a sub-task). A sub-task dragged down off the bottom of its group comes out of it: while dragging, the group closes off above it and it shows as a task of its own."),
  B("Tasks on a phone: tapping an empty part of the page no longer opens the New task line and the keyboard."),
  B("Phones: a swipe on a task can start on one of its small pills (e.g. the tour's ▶)."),
]
NOTES['1.35.41'] = [
  B("Tasks, press and hold to drag: the shading spreads from your finger to the edges of the task as it lifts, and stays until you let go."),
  B("Tasks on an iPhone: holding a task to drag it no longer brings the keyboard up (which also shifted the page under your finger); and arriving on Tasks no longer puts the cursor in New task on a phone."),
]
NOTES['1.35.42'] = [
  F("Tasks: while dragging a task, a blue dashed outline shows the gap it will drop into (as it does on a task it would drop onto), and the task has a slight twist, as in the Day Planner."),
  F("Day Planner: press and hold anywhere on an item (finger or mouse) to pick it up and drag it, with the same shading as Tasks. On a phone, a quick tap still gets an item ready to stretch."),
  B("The shading on a held task no longer pulses again each time the drop place changes."),
  F("Tasks: several marked done at once fade out with the \"Transferring to Done list\" note (one on each run of them), as one does."),
  B("The selection bar's ✕ shows Esc; choosing tasks with ⠿ takes the cursor out of New task, so the bar's keys work straight away."),
]
NOTES['1.35.43'] = [
  F("Ctrl+Z (⌘Z) when you're not typing undoes the last thing you did, even after its message has gone, and says what it undid. Ctrl+Y or Ctrl+Shift+Z (⌘⇧Z) redoes it. In a note or field, the keys are still its own."),
]
NOTES['1.35.44'] = [
  F("Day Planner: Google Calendar (👁 Show Google Calendar). Connect once; what's on shows above the schedule. Today and the next 7 days load by themselves, further days with Load, and Refresh fetches them again. Only your main calendar, only the days you look at, kept on this device. + Add to plan puts an event in the plan at its time (all-day ones in the day's tasks), its description as the note."),
  B("Tasks: dragging a sub-task out of its group shows the gap it will drop into as a separate rounded box again."),
]
NOTES['1.35.45'] = [
  B("Day Planner, Google Calendar: on a very wide screen it sits beside the date, focus and energy, above Tasks (while each line fits); otherwise it takes its own full-width row."),
  F("The tour shows Google Calendar in the Day Planner, with a made-up example day, and where to turn it on or off (👁)."),
]
NOTES['1.35.46'] = [
  B("Day Planner, Google Calendar: delete (or undo) an event you added to the plan and it shows + Add to plan again straight away, without reloading."),
]
NOTES['1.35.47'] = [
  B("Day Planner, Google Calendar: ↻ Refresh is a text link like Disconnect, which now has its own icon."),
]
NOTES['1.35.48'] = [
  B("The browser's password manager no longer fills your email into the search box: Sync's sign-in and password boxes are now forms of their own, so it fills those instead."),
]
NOTES['1.35.49'] = [
  F("Day Planner: the name of the section after the day ends (Evening plans) is in the same font as the Schedule times, in every theme, including a custom theme's Schedule times font."),
]
NOTES['1.35.50'] = [
  B("iPhone: pressing Done in a full-screen note showed the note's small inline editor for a moment before going back to the list."),
]
NOTES['1.36.00'] = [
  F('Batch Book: a recipe book that keeps every batch made from it. Recipes are grouped by type (Mead, Winemaking, Breadmaking, Cooking and your own), like chapters, with a filter per type and a search; turn the pages with the arrows, ← / → or a side swipe. A recipe has a type, details that depend on it (Batch volume for Mead or Winemaking, Serves for Cooking), photos, ingredients, a method and tasting notes. Ingredients can be typed one per line ("3268g honey, Asda Orange Blossom", "½ onion", "5 UK gallon water"); amounts use units grouped by weight, volume and count, with UK and US cups, pints and gallons, and scale ×½ to ×3. In the method, {salt} shows the salt with its amount, {1/2 salt} half of it and {salt|a pinch} your own words.'),
  F('Batch Book: Make this starts a batch (Batch #5 and so on) with its own summary, goals and final ABV worked out from the gravity readings, a gravity log with a chart, the recipe as made, a diary and a tasting diary, each entry with photos. It starts with a stock check: one ingredient at a time, got it or need to buy, then what is needed goes on a new list for the batch or on a list you already have.'),
]
NOTES['1.37.00'] = [
  F('Batch Book: recipes and batches are written on the Day Planner\'s papers (Notebook, Techie, Dot journal, Minimal, Glass), with ruled lines and a margin: amounts, step numbers and dates sit in the margin. 👁 picks the paper and turns the lines and margin on or off.'),
  F('Batch Book: your own sections instead of fixed types, with two to start from. ✎ beside the sections (or Edit sections) names them and sets each one\'s emoji, colour, the details its recipes start with and whether its batches have gravity readings. Tags on a recipe sort it further; the sections switch with ← / → like other areas.'),
  F('Batch Book: the method is now steps, written straight on the lines (Enter starts the next one), each with its own photos. Result photos: the first is the recipe\'s picture, shown at the top and on its card.'),
  F('Batch Book: Make this makes the batch its own copy of the recipe, step photos included, to scale (×½, ×2 or any amount), change or swap ingredients and change steps without touching the recipe. The stock check waits until you press Check stock on the batch.'),
]

NOTES['1.38.00'] = [
  F('Batch Book: sections are now books, one tab each, switched with ← / →, a side swipe, or the keyboard browsing other areas have (↓ from the search box onto the tabs, then onto the recipes).'),
  F('Batch Book: drag recipe cards around like Brain Dump notes (hold ⠿). Dropped under another book\'s heading, a recipe moves to that book; select several and Move to sends them to a book at once.'),
  F('Batch Book: Make this is at the top of a recipe. The batch opens straight away, and each ingredient has ✓ In stock and 🛒 Add to list. The first Add to list makes a list for the batch, or pick a list you have; pressing again takes it back off.'),
  F('Batch Book is in the tour.'),
]

NOTES['1.39.00'] = [
  F('Batch Book: the books are a filter bar like Brain Dump\'s, on one line that scrolls sideways, each with its emoji and colour. The bar at the top stays put while you scroll, and each book\'s name and line stay at the top while you scroll through its recipes (with one book picked too).'),
  F('Batch Book: each recipe card has Make and a More menu: copy to clipboard, share, duplicate, print, its own colour, move to another book, archive and delete.'),
  F('Batch Book: share a recipe with someone on your sync server, the same way as lists and notes (by sign-in email; they accept; it shows under Shared with me). Its batches, diary and readings are shared too; photos aren\'t yet.'),
  F('Batch Book: the batches list filters by status (planned, on the go, done), and its rows look like Tasks\' (see-through glass, each in its batch\'s colour).'),
  F('Phones: a side swipe in Batch Book slides only the recipes or batches, and at the first or last book it gives a nudge instead of sliding to the same page.'),
]

NOTES['1.40.00'] = [
  F('Batch Book: pin recipes like Brain Dump notes (☆ on a card, or select several): pinned ones come first in their book, and ★ Pinned in the bar shows them all.'),
  F('Batch Book: ⋯ at the end of the books bar adds, renames, reorders and removes books, as in Brain Dump.'),
]

NOTES['1.40.01'] = [
  B('Batch Book: scrolling down, the next book\'s heading slid over the one above it instead of pushing it up and out, and headings had a background even when not stuck at the top (now see-through, with glass only while stuck).'),
]

NOTES['1.40.02'] = [
  F('Batch Book: press and hold a recipe card to select it; the bar comes up, and then a single press on other cards adds them or takes them out. Esc (or ✕) ends it.'),
]

NOTES['1.41.00'] = [
  F('Batch Book: the batches list is spaced like Tasks, and batches drag into your own order (hold ⠿), or select several to change their status or delete them.'),
  F('Batch Book: a sort menu beside All / Planned / On the go / Done: newest first, oldest first, by name, or Custom, which it switches to by itself when you drag a batch.'),
]

NOTES['1.41.01'] = [
  F('Batch Book: on a phone, press and hold anywhere on a batch to drag it, as with tasks: the others move out of the way and the dotted space shows where it will go.'),
]

NOTES['1.41.02'] = [
  F('Batch Book: in the batches list, press a batch\'s status (Planned, On the go, Done) to change it there and then.'),
]

NOTES['1.41.03'] = [
  B('Batch Book: a batch opened from the batches list now goes back to the batches list with Esc or the back button, not to its recipe.'),
]

NOTES['1.42.00'] = [
  F('Batch Book: a new batch is named after its recipe and the day it was started (like "Mead 28 Sep 2026") instead of "Batch #2". Change the whole name at the top of the batch. Older batches show their recipe and date until you rename them.'),
  B('Batch Book: recipe and batch names at the top of the page are big again on phones.'),
]

NOTES['1.42.01'] = [
  B('Batch Book: a batch\'s recipe heading now just says "Recipe".'),
]

NOTES['1.43.00'] = [
  F('Batch Book: ingredients are written straight on the lines. Press an amount or an ingredient to change it (put a note after a comma, like "honey, local"), type a new one on the last line, or empty one to remove it. Edit still offers units, reordering and pasting a whole list.'),
  F('Batch Book: the ingredients margin is wider, so amounts and units fit.'),
]

NOTES['1.43.01'] = [
  F('Batch Book: no more Edit button for ingredients: change them right on the lines. Type a unit with the amount (like "2 tsp"), and paste a whole list on the last line to add every ingredient at once.'),
]

NOTES['1.43.02'] = [
  F('Batch Book: scale a recipe or a batch to a third (×⅓) as well as a half.'),
]

NOTES['1.44.00'] = [
  F('Batch Book: tasting notes live on each batch (its tasting diary), not on the recipe. A recipe\'s old tasting notes move to its latest batch, or to the first batch you make.'),
]

NOTES['1.44.01'] = [
  F('Batch Book: new batches are named "Recipe - date" (like "Mead - 28 Sep 2026"), and batches named earlier today get the dash too.'),
  F('Batch Book: the first Add to list on a batch creates its shopping list, named after the batch, and says so. Next to the list: "Open the shopping list" and Share, to share it with another sift user.'),
]

NOTES['1.44.02'] = [
  B('Batch Book: the Planned / On the go / Done menu on a batch uses the normal font instead of squashed letters.'),
]

NOTES['1.44.03'] = [
  F('Batch Book: batch statuses have little pictures: 📝 Planned, 🫧 On the go, ✅ Done.'),
]

NOTES['1.45.00'] = [
  F('Batch Book: the Batches button is now a Recipes | Batches switch at the right of the books bar, just before ⋯.'),
]

NOTES['1.45.01'] = [
  B('Batch Book: a book\'s heading stuck at the top now joins the glass bar above it (same glass, no gap, a thin line in the book\'s colour) instead of sitting in its own dark block.'),
]

NOTES['1.45.02'] = [
  B('Batch Book: ingredients and steps share one margin down the page. It moves right a little when an amount needs the room, but only so far.'),
]

NOTES['1.46.00'] = [
  F('Batch Book: import recipes as text. ⋯ → Import recipes, then paste or choose a text file: each recipe starts with "# Name", then Book, Tags and details, its ingredients and its method. Recipes kept elsewhere (notes, photos of cards, websites) can be turned into that text by any AI chat: "Copy instructions for an AI chat" copies what to ask it. Books not set up yet are added.'),
]

NOTES['1.46.01'] = [
  F('Batch Book: in the books editor (Edit books), drag a book by the ⠿ on its left to change the order; the books bar follows once saved.'),
]

NOTES['1.46.02'] = [
  F('Batch Book: "Batches have readings" in the books editor, with the kinds of reading that book\'s batches take (like Gravity, Temperature). On a batch, Readings has a + button for each kind; gravity keeps its OG/SG/FG, chart and ABV, other kinds take what you type (like 21°C). Existing readings stay as gravity.'),
]

NOTES['1.47.00'] = [
  F('Batch Book: a brand new Batch Book starts with books for Cooking, Baking, Cocktails, Soups and Brewing, and eight example recipes to try or delete, including the Aviation and borscht. An empty Batch Book also offers "Add some example recipes". Nothing is added to a book that already has recipes.'),
]

NOTES['1.47.01'] = [
  F('Batch Book: the example recipes include a crusty no-knead white loaf in Baking.'),
]

NOTES['1.47.02'] = [
  F('Batch Book: the Recipes | Batches switch looks like the rest of the books bar (tabs, not pills).'),
  F('Batch Book: a brand new account made on this device gets the example recipes too. Accounts that already existed never do.'),
]

NOTES['1.47.03'] = [
  F('Batch Book: a new Batch Book\'s books are 🍳 Cooking, 🥣 Soups, 🥖 Baking, 🍸 Cocktails and 🍷 Fermentations (with gravity readings), in that order.'),
]

NOTES['1.48.00'] = [
  F('Batch Book: once, on each account, the books go back to 🍳 Cooking, 🥣 Soups, 🥖 Baking, 🍸 Cocktails and 🍷 Fermentations and the example recipes are added (a book of your own with recipes in it stays). It waits until the device has synced, so they only arrive once.'),
]
NOTES['1.49.00'] = [
  F("Batch Book: the starter recipes are now eight of Mat's own (Borscht, Pad Kra Pao, Chicken Green Curry, Bun Cha, Smoked Salmon Pirozhki, Quick Baguette, Aviation, Disaronno Sour). Books that had the earlier examples swap them over once; an example you've made a batch of stays."),
  F('Batch Book import: steps can point at ingredients in curly brackets, e.g. {1/2 butter}, and one not in the list is added to it. Recipes already in the book are skipped. The AI instructions ask for this too.'),
]
NOTES['1.49.01'] = [F("Batch Book: the Borscht starter has Mat's own photo. Books that already had the starters get it too.")]
NOTES['1.49.02'] = [F("Batch Book: Borscht (now spelt that way) has a second photo, of the broth being made.")]
NOTES['1.49.03'] = [F("Batch Book: the Chicken Green Curry starter has Mat's own photo.")]
NOTES['1.49.04'] = [F("Batch Book: two new starters with Mat's photos, Hot Toddy in Cocktails and Pampushki (garlic bread rolls) in Baking. Books that already have the starters get them too.")]
NOTES['1.49.05'] = [F("Batch Book: a new starter, Mat's Coloured Sticky Rice with Mango, with his photo.")]
NOTES['1.49.06'] = [F("Batch Book: a new starter, Anna's Christmas Cake, in Baking with her photo.")]
NOTES['1.49.07'] = [F("Batch Book: a new starter, Mat's Cranberry Sauce (with a splash of port), in Cooking with his photo.")]
NOTES['1.49.08'] = [F("Batch Book: a new photo for the Chicken Green Curry starter.")]
NOTES['1.49.09'] = [F("Batch Book: new books start with the 7 starter recipes that have photos: Borscht, Chicken Green Curry, Pampushki, Christmas Cake, Coloured Sticky Rice with Mango, Cranberry Sauce and Hot Toddy.")]
NOTES['1.49.10'] = [F('Batch Book: while recipes or batches are selected, Shift and click selects every one from the last one you picked to this one (e.g. to delete a run of them).')]
NOTES['1.49.11'] = [
  B("Batch Book: the starter recipes could be added more than once (each device added its own copy before syncing). They now have fixed ids, so extra adds merge into one."),
  F("Batch Book: once per account, the whole book is cleared (recipes, batches, diary entries and their photos) and starts again with the 7 starters, as Mat asked."),
]
NOTES['1.49.12'] = [B('Batch Book: an ingredient like "3 cloves" on its own was read as 3 of the unit clove with no ingredient. It is now 3 cloves (the spice); "3 cloves garlic" still means garlic. Recipes and batches that already had it are fixed once.')]
NOTES['1.49.13'] = [F('Batch Book: no big photo across the top of a recipe or batch. The first result photo is still its picture on the cards, and all of them are under Result photos.')]
NOTES['1.49.14'] = [F("Batch Book: Coloured Sticky Rice with Mango is no longer a starter recipe. A book that got it and hasn't changed it or made a batch of it loses it once.")]
NOTES['1.49.15'] = [F('Batch Book: a recipe\'s or batch\'s photos are a strip across the top, with Add photos and × to remove right there. The first is its picture on the cards.')]
NOTES['1.49.16'] = [F('Tasks: the New task line is always at the top of the list. The 👁 "New task line at the top" switch is gone.'), B('Tasks: a task carried by press and hold showed the tasks under it through itself, and dropped onto another task it covered that task\'s name. It now hides what it passes over, and over a task it shows where it will go: just under that task and its sub-tasks, with room made for it. Aiming at a task\'s name, even one with pills under it, now drops onto it.')]
NOTES['1.49.17'] = [F('Tasks: More… is always the way to a task\'s full panel. On the New task line too: More, then More… adds the task and opens its panel, as for a task already there. The pills under a task being edited, and under New task, are one tidy row (just icons on a phone until something is set), and full screen for a note is a small ⤢ at the right of its line.')]
NOTES['1.49.18'] = [B('Batch Book: the grey hint words in empty lines (Next step, Another ingredient and the rest) were white on the Notebook, Dot journal and Minimal papers with a dark theme. They now follow the paper\'s own ink, as do the status pills. Every Batch Book text colour was checked on every paper and theme.')]
NOTES['1.50.00'] = [F('Lists: an open list works like Tasks. Press and hold an item to move it (the others slide out of the way); drop it onto another item to make it a sub-item, or drag a sub-item down off the end of its group to take it out. On a phone, swipe an item left for More and Tick, right for Delete. Items are cards, or lined paper with 👁 → Lined Paper (and Show margin), with sub-items joined by fine lines and ▾ to fold them away. The new item line is at the top; Enter in an item\'s name opens a new line under it, ↑ / ↓ move between items, Shift+Enter goes into its note. The name, progress, Reset ticks and Hide ticked stay at the top while the items scroll, and with ticked items hidden, one ticked fades away.'), B('Lists: emptying an item\'s name gave an error instead of asking whether to delete it.')]
NOTES['1.50.01'] = [B('Batch Book: an ingredient written with your own words in a step, like {hot chicken stock|hot stock}, showed only the words and not the amount. It now shows "200ml hot stock", scaled with the recipe; own words that already say how much, like "a bit of salt" or "3 small potatoes", show as written.'), B('Batch Book: counted amounts said "3 clove garlic"; they now say "3 cloves garlic".')]
NOTES['1.50.02'] = [F('Batch Book: a new Batch Book starts empty, with just its books. The example recipes (with photos) are added only when asked: Add some example recipes in an empty book, Add example recipes in the ⋯ menu, or Settings > Batch Book. Adding them again never makes a second copy, and brings back any you deleted.')]
NOTES['1.50.03'] = [B('Batch Book: an empty step (from Enter, then leaving it) stayed as "Empty step" and could not be removed. Leaving a step empty now removes it, and Backspace in an empty step removes it and goes back to the step above.')]
NOTES['1.51.00'] = [F('Batch Book: a batch\'s tasting notes are one note on the lined paper, like the Day Planner\'s notes: the toolbar shows once you tap into it, the rest of the page dims, and on a phone it opens full screen. Earlier dated tastings join the note with their dates, and their photos go to the batch\'s photos.')]
NOTES['1.51.01'] = [F('Batch Book: photos are added and removed in Photos at the bottom of a recipe or batch again. At the top they only show small, to look at, and nothing shows there when there are none.')]
NOTES['1.51.02'] = [F('Batch Book: ↑ and ↓ move from line to line in a recipe or batch, as in Tasks and the Day Planner: name, description, details, ingredients, steps (line by line in a long one), readings and diary. Enter moves on from an amount to its ingredient and then to the next line, and Backspace in an empty last line goes up. The line being written in has no box around it, just a light tint, like writing on the paper.'), F('Tasks, Lists and Day Planner: ↑ and ↓ in a note that wraps onto several lines now move line by line before going to the next item.')]
NOTES['1.51.03'] = [B('Tasks and Lists, lined paper: the new task (or new item) line is always the height of one plain line, even when the tasks under it have notes or pills.')]
NOTES['1.51.04'] = [B('The blue background\'s light in the top corners now fades out smoothly, with no visible edge where it ends. It is just as bright at the corner as before.')]
NOTES['1.51.05'] = [B('Tasks and Lists, lined paper: editing a task or item lights its whole line once, the same as the new task line, instead of the line plus a second shade on the name.')]
NOTES['1.51.06'] = [F('Tasks, lined paper: the extra empty ruled lines under an empty list are gone, and so is their option (Show additional lines when list is empty).')]
NOTES['1.51.07'] = [F('Tasks and Lists: dragging an item with sub-items (or several selected) carries the real rows, tick boxes and all, as one pane of frosted glass instead of plain coloured blocks. Cards get a faint light along their top edge, and on lined paper the rows of an open list now touch like Tasks rows.')]
NOTES['1.51.08'] = [B('Tasks and Lists: a drag could get stuck after lifting (the dashed box stayed and the row did not follow until the next touch). A lifted row now follows the finger wherever its touch goes, and a drag whose end never arrived is put down before the next one starts.')]
NOTES['1.51.09'] = [B('Tasks and Lists: dragging an item up onto another one (to make it a sub-item) stopped following the finger and jumped back below it. The item now always follows the finger, and the item it will go under gets a dashed outline.')]
NOTES['1.51.10'] = [F('Tasks and Lists, lined paper: the ruled lines run the full width, as on real paper, past the margin and under the tick boxes.')]
NOTES['1.51.11'] = [B('Tasks and Lists: dragging is back to how it placed items before 1.49.16 (the middle third of an item means "under it"), and while an item is over another one to go under it, no empty gap is left in the list: the dashed outline is the only thing saying where it goes.'), B('Ctrl+Z undoes the last thing done even with the cursor in the New task line (or any box nothing has been typed in yet); before, it did nothing there.'), F('The ripple when pressing and holding an item starts only once the press is a hold, fading in as it spreads, so a quick tap into an item shows nothing.')]
NOTES['1.51.12'] = [F("Tasks, a task's full panel: the details that have been filled in (time needed, dates, repeats, priority and so on) look switched on, lit up like a chosen pill, so what's set stands out from what isn't.")]
NOTES['1.51.13'] = [B('Notes: a note whose title is shortened from a long first line no longer shows a capital second letter ("Ruby class" showed as "RUby class"). Only the first letter is made a capital, as intended.')]
NOTES['1.51.14'] = [B('Tasks and Lists: the first press and hold after opening the page works again. A sync arriving just then redrew the list under the finger; now it waits until the item is let go.'), B('Dragging an item back down after holding it over another no longer makes the item below jump down and back up.'), F('Carried items, alone or in a group, are see-through glass: what they pass over shows through, lightly frosted, and in Chrome slightly bent as through real glass.'), F('The press and hold ripple starts straight away again, as in 1.36.')]
NOTES['1.51.15'] = [F('Pressing and holding an item sends rings out from your finger like ripples on water, each with a bright crest, bending what they pass over (most in Chrome). The shading under them is lighter.')]
NOTES['1.51.16'] = [F('Carried items are the see-through blue of 1.36 again, now frosted (and in Chrome still slightly bent), and the press and hold shading is that same colour. The water rings are faint and soft.')]
NOTES['1.51.17'] = [F('Carried items are a little more see-through, and lines under them stay straight: the glass only frosts and, in Chrome, splits colours a little at edges. A carried group is one block of glass with one edge round the outside. The water rings are softer and fainter.')]
NOTES['1.51.18'] = [F('A lifted item turns its slight tilt in smoothly, and when let go it glides into its place and straightens, rather than snapping.')]
NOTES['1.51.19'] = [B('Tasks and Lists: an item dragged and put back where it was no longer says "Moved" with Undo, and adds nothing to undo.')]
NOTES['1.51.20'] = [F('Picking an item up gives it a springy wobble: it swings past its tilt, back and again, settling at the tilt. Putting it down, it wobbles straight the same way.')]
NOTES['1.51.21'] = [F('Carried items are less blue and more see-through; the press and hold shading and its rings match.')]
NOTES['1.51.22'] = [F('Carried items look a little more like glass: more frosted, a brighter edge, and (in Chrome) a little more colour split, while staying light and see-through.')]
NOTES['1.51.23'] = [B('Tasks and Lists: the dashed outline of where a carried item will land stays the item\'s own height once it moves (it had grown taller, over the rows around it, from the item\'s tilt).')]
NOTES['1.51.24'] = [B("Phones: in the full-screen note editor, the formatting toolbar sits under the note's name and Done, so iPhone Safari's own floating ↑ ↓ ✓ bar (iOS 26) no longer covers it.")]
NOTES['1.51.25'] = [B("Phones: the full-screen note editor's toolbar is back at the bottom by the keyboard; on iPhones with iOS 26 it sits just above Safari's own floating ↑ ↓ ✓ bar, so that no longer covers it.")]
NOTES['1.51.26'] = [F("Day Planner, Bring in from tasks: ✓ Did it ticks off a task that's already done (with Undo, and a closing comment if you like), next to Claim for today.")]
NOTES['1.51.27'] = [F("Batch Book: lots of tags no longer fill the top of the page. They sit on one line that scrolls sideways (a chosen tag comes first), and All ▾ drops them all down over the recipes.")]
NOTES['1.51.28'] = [F("Batch Book: 📖 Recipes / 🧪 Batches sit up by the search, so on a phone the books have the whole line under it.")]
NOTES['1.51.29'] = [B("Day Planner, Bring in from tasks: For today (or the day's name) at the top, and a task already in the day shows 📅 Today, its words in the middle of the pill.")]
NOTES['1.51.30'] = [B("Day Planner, Unfinished from earlier days: → Bring to today (or the day's name, never \"this day\"), and Bring the rest to today; Bring in from tasks says the day's name too.")]
NOTES['1.51.31'] = [F("Day Planner: Bring in from tasks and Unfinished from earlier days are cleaner: one line per task with a few muted words and just Claim (or Bring to today), ✓ Did it and Archive (or Let it go); no notes, no Now / Next / Later. What's in the day's plan already is counted in a green strip at the top instead of offered again.")]
NOTES['1.51.32'] = [B("Day Planner, Unfinished from earlier days: no old time under an item; brought to today it's untimed anyway.")]
NOTES['1.51.33'] = [B("iPhone and iPad: a side swipe starting at the screen's edge no longer goes back or forward a page in Sift on the Home Screen (it was only stopped in Safari).")]
NOTES['1.51.34'] = [B("Day Planner, Bring in from tasks and Unfinished from earlier days: each one is in its own box again; 🗑 Delete sits in the box's top corner, away from the other buttons; and the buttons for everything at once are a box of their own (All 2 at once), so nothing wraps.")]
NOTES['1.51.35'] = [B("Day Planner: Bring in from tasks and Unfinished from earlier days open without a blue focus ring on their first button (the green strip, or a 🗑).")]
NOTES['1.51.36'] = [B("A long link or unbroken word wraps inside its box instead of running off the side: a task's pills and note while you edit it, Where things are's items and notes, and Batch Book's ingredient picks (with …).")]
NOTES['1.51.37'] = [F("Web addresses in your text (https://…, www.…, or example.com/page) show as links in notes and Batch Book steps. The first tap or click on one, there or in a title or name, asks: Open ↗ or Edit text. While you're writing in it, a tap just moves the cursor (Ctrl/⌘ + click still opens it).")]
NOTES['1.51.38'] = [B("Day Planner, Tasks: a task's name comes first. A short name keeps its pills beside it; a longer one has them on the line under it, and a name over two lines shows two, fading at the end (all of it while you're writing in it). On a computer, ⋯ shows over the end of the line instead of taking room from the name.")]
NOTES['1.51.39'] = [F("Moving things: Esc while dragging puts it back where it was, and nothing is saved (Tasks, Lists, Find Things, Contacts, Brain Dump, Batch Book, the Day Planner's moving and stretching, orders in Settings)."), B("A press let go of just off the list no longer picks the row up a moment later with nothing held; a drag whose release was missed puts the row back. Phones: a finger held in the text you're typing in moves the cursor as usual, instead of lifting the row; and a row being edited doesn't swipe, so its pills slide freely.")]
NOTES['1.51.40'] = [F('Sift has an About page and a privacy policy, linked at the top of Settings. Google Calendar asks only to read your events (not your calendar settings); the first Connect after this asks Google again.')]
NOTES['1.51.41'] = [F("Tasks and the Day Planner: clicking into a task's note shows its quick edit pills under it too, in every spacing (as Shift+Enter does), and the note isn't shown a second time. Tasks, Compact spacing on a computer: a task's 📝 stays just after its name while you edit the name, and pressing it goes into the note."), B("Tasks: after Add note, one press on More… or a pill is enough (it took two). Shift+Enter after changing a task's name no longer loses the note it opens. Alt+Enter in a name opens its panel and leaves the cursor in the name however you got there, so Alt+Enter again closes it. With lined paper on a computer, an open task's panel spans the whole row, tick box included.")]
NOTES['1.51.42'] = [F("Every message at the bottom has a small ring at its start that runs down over the time it stays, so you can see how long is left to press Undo.")]
NOTES['1.51.43'] = [F("Ticking something off is happier: a gentle wave runs along it, its letters and pills bobbing as it passes, a soft blue light going with it and a line drawn through its name, then it fades a little and folds away (Tasks, and the Day Planner's tasks; a scheduled item stays in its time, crossed out). Several ticked at once go one after another. The tick box stays still, so you can untick it.")]
NOTES['1.51.44'] = [F("Tasks, editing a task in place: More sits at the far right of the task's line, where ⋯ was (no ⋯ while editing), with ✓ Done before it on a laptop. Pressed, it stays in the same place as More (full), which opens the full panel, and More… is no longer at the end of the pills. Pressing a bare part of the line right of the name puts the cursor at the end of the name. In Compact spacing the 📝 sits a little further from the name."), B('On iPhone, the row of pills under a task being edited could be pushed up and down a little as well as sideways.')]
NOTES['1.51.45'] = [F("Contacts: + New contact is a button at the top left, as in Contracts and Batch Book (+ New case on the Cases tab), rather than in the ⋯ menu. On a phone the tabs sit under it.")]
NOTES['1.51.46'] = [F("Tasks: a Tasks | Projects switch at the top left, as Batch Book's Recipes | Batches, instead of Projects being in the ⋯ menu. Projects shows each project and + New project; a project's page goes back with ‹ Projects. All tasks is the All tab after Done. On a phone the list tabs sit under the switch.")]
NOTES['1.51.47'] = [F("Tasks have no ⋯ button any more. A task's full panel is its More pill, then More (full), which now shows its shortcut: Shift+Enter in the task's name, pressed a second time (on a phone, swiping the task still offers More too).")]
NOTES['1.51.48'] = [F("Tasks, with a mouse: the ⋯ is back as a More button, shown only while the pointer is over a task you're not editing; it opens the task's full panel.")]
NOTES['1.51.49'] = [F("Tasks, with a mouse: the More shown on hover now does what More does while editing: it goes into the task's name with its pills and note showing, and More (full) there opens the full panel.")]
NOTES['1.52.00'] = [F("Tasks, a project's page looks like an open list: ‹ Projects, a colour dot to change its colour, its name, then its progress, ⚑ Aim date and + Milestone. At the end: Pause, Mark finished, Archive project and Delete project (its tasks and milestones go with it, and come back with it from Archive or the Bin). Finished projects move under Finished on the Projects page; paused ones show Paused. Each milestone heading has a ⋯: Rename (and aim date), Done, move up or down, Delete (its tasks stay, under No milestone).")]
NOTES['1.53.00'] = [F("Share a project with someone on your sync server: open it in Tasks, Projects and press 👥 Share. Once they accept (under Shared with me on their Projects page), you both see and change its tasks and milestones: add, tick, rename, move. A task moved out of the project leaves it for both of you. Their card says who shared it; Leave takes it off their devices. Tasks that aren't in a project stay private.")]
NOTES['1.53.01'] = [B("Day Planner schedule: a long name comes first, its pills on the line under it (starting under the name), two lines at most with the rest fading out; a short name keeps its pills beside it. A name of exactly two lines no longer fades.")]
NOTES['1.54.00'] = [F("Tasks: move tasks into a project. Choose several (their ⠿), then Move ▸ Project… in the bar at the bottom: your projects open as pills just above it (the choice stays until you pick one), with No project and + New project. Sub-tasks go with them. One task on its own: while editing it, the 📁 Project pill does the same.")]
NOTES['1.54.01'] = [F('Tasks: Show / hide done is gone from the ⋯ menu. It only ever worked on the All tab and a project\'s page, which have their own Show done button at the end; Done has its own tab.')]
NOTES['1.54.02'] = [F("Tasks (projects too) and the Day Planner's tasks: one place at the far right of a task's line goes More, then More (full), then ✓ Close once its panel is open, so the same spot takes you in and back out. All three are green. The panel's footer starts with + Sub-task (Tasks) and no longer has Close. Day Planner: the ⋯ is a More on hover that goes into the task with its pills, and More (full) is at the end of its first line instead of at the end of the pills."), B("On iPhone, after putting the keyboard away with its ✓, a task stayed being edited (its More still showing) and a tap below it went straight back into it.")]
NOTES['1.54.03'] = [B("On iPhone, tapping outside a task being edited didn't stop editing it: the cursor and keyboard stayed in it (only the keyboard's ✓ worked). A tap on the name's own line off the text no longer keeps you in it on a phone either (that's for a mouse).")]
NOTES['1.54.04'] = [F("Tasks: a task is either on a list (Task Dump, Now, Next, Later) or in a project, not both. Moving it into a project takes it off its list, and moving it onto a list (Move, its List pill or panel) takes it out of its project, sub-tasks with it. All still shows everything.")]
NOTES['1.54.05'] = [F("Projects: a side swipe (or ← / →) on a project's page goes back to Projects, and on Projects goes back to Tasks, with the Tasks or Projects pill pulsing where you land. A milestone's ⋯ is now a clear button beside its name, and the name itself opens the same menu (Rename, Done, Delete).")]
NOTES['1.54.06'] = [F("Tasks: Move ▸ Project… (and a task's 📁 Project pill) now lists projects others share with you too, marked 👥 with their name. Moving tasks into one takes them (sub-tasks too) out of your own tasks and into their project, where you both see them. Undo brings them back. A task's photos and comments don't move with it yet.")]
NOTES['1.54.07'] = [F("Tasks: a task's Project choice in its full panel also lists projects shared with you (under 👥 Shared with me), and picking one moves the task into that project, as Move ▸ Project… does.")]
NOTES['1.54.08'] = [F("Shared projects: comments on their tasks are shared too, so everyone in the project sees them (the ones written before this go up once). Moving tasks into a project someone shares with you takes their comments along. Photos don't travel between accounts yet.")]
NOTES['1.54.09'] = [F("Sharing: no more yellow \"shared this with you\" notice. Something shared with you (a project, list, note, recipe or someone's day) shows 👥 in its title instead, as it does for the person who shared it. Tap it to see who shared it and when, who else has it, and to Leave. For the person who shared it, 👥 still opens the Share sheet (now on a shared recipe's page too).")]
NOTES['1.54.10'] = [F("Lists and Find Things' things work like Tasks: the ⋯ is a green More on hover that goes into the item; while editing, More sits at the far right of its line (Lists: More, Shift+Enter, straight to its note and files; Find Things: More (full), its Quantity pill staying under it); with the panel open that place is ✓ Close, and the panel's footer no longer has Close. With a mouse, clicking anywhere on an item's line, right of where its text starts, goes into the text at its end (Tasks, Lists, Find Things, the Day Planner), in every spacing.")]
NOTES['1.54.11'] = [F("Find Things: an open box looks like a box. The top (label, name, where it lives, notes) is a lid in the box's colour, the label is a black embossed strip like an old labelling machine's, and the contents sit sunk inside it.")]
