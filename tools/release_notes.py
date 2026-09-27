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
