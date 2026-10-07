# argot

argot builds vim muscle memory through short, timed drills in a terminal-like shell, using the keyboard only.

## People

**Visitor**:
Someone using argot, especially on home before they've launched a drill.
_Avoid_: User

**Player**:
A visitor who is in a drill.
_Avoid_: User. Also don't use it for the thing moved on the board (that's the **Cursor**).

## Home

**Home**:
The screen a visitor lands on, with the logo, the prompt and the output of the last command. Every command but `theme`, whose picker opens over home as it is, shrinks the logo to the top; Esc takes home back to how it first looked.
_Avoid_: Landing, main menu, terminal

**Prompt**:
The `❯` line on home where the visitor types commands.
_Avoid_: Input, terminal

**Command**:
What's typed at the prompt (e.g. `ls`, `vim hjkl`) or on the command line (e.g. `:help`, `:q`, `:q!`, `:wq`). Each screen has its own set of commands. `argot` (or `:argot`) works everywhere and lists the commands available on the current screen.

**History**:
The commands run at the prompt this visit, which ↑ and ↓ step back and forth through, like a shell's. It skips empty lines and a command repeated straight after itself, and is forgotten on reload.
_Avoid_: Recall, log

**Command response**:
What a command shows after it runs: one line, like an error, or several, like `argot`'s list. On the command line, a response that takes several lines grows upward over the stage.
_Avoid_: Output, message

**Hint**:
The short line telling the visitor or player what to type next. On home it points at `argot`, then at typing one of the commands `argot` lists; on the drill screens it points at the likeliest commands (`:help` on the play screen, `:q` on the help page, `:w` and `:wq` on the results screen) and at `:argot` for the rest.
_Avoid_: Help, tip

## Drills

**Drill**:
A timed exercise that repeats one vim skill until it becomes muscle memory, launched from home with `vim <name>`, which opens its play screen. hjkl, wb and rel-jk are drills.
_Avoid_: Game, exercise, lesson

**Drill frame**:
The layout while a drill is open: the stage, with the statusline and command line pinned beneath it.
_Avoid_: Game frame

**Stage**:
The part of the drill frame that the drill draws in.

**Statusline**:
The bar under the stage showing the mode and the drill's name.
_Avoid_: Status bar

**Command line**:
The line under the statusline where the player types `:help`, `:q`, `:q!`, `:w`, `:wq` or `argot`. On the play screen it opens with Esc and greys the stage while it's open; the help page and results screen have nothing to play, so it's always open there, ungreyed, and Esc only clears what's typed. `:q` only quits when there's nothing to lose (before the first move, or from the help page); otherwise it shows an E37 error naming `:q!` or `:wq`.
_Avoid_: Prompt (that's home's), cmdline

**Help page**:
A drill's instructions, laid out like a vim help file, opened with `:help` from the command line and closed with `:q`.
_Avoid_: Instructions screen, man page, splash, landing, instructions page

**Play screen**:
The screen a drill opens on, where the player is doing the drill. The clock starts on the first move.

**Results screen**:
The screen after a run ends, showing the final time and whether it's a new best. `:w` saves and starts the next run straight away, so the player can go again and again.

**Run**:
One attempt at a drill, from the first move to reaching the results screen. Opening the help page ends the run without saving it; `:q` from help starts a fresh one.
_Avoid_: Round, attempt, session

**Cursor**:
The block the player moves, with h, j, k and l in hjkl, w and b in wb, or a count and j or k in rel-jk.
_Avoid_: Player

**Target**:
Where the player moves the cursor to: the `✕` on hjkl's board, the start of a marked word in wb, or a marked line in rel-jk.
_Avoid_: Goal

**Passage**:
The lines of text a run of wb or rel-jk is played on. Each drill picks one at random from its own list at the start of a run and keeps it until the run ends.
_Avoid_: Text, buffer

**Hit**:
Moving the cursor onto the target, which makes a new target appear.
_Avoid_: Touch, catch

**Progress**:
How many hits the player has made out of the number needed to finish the run.

**Best time**:
A drill's fastest run, kept once the player saves it with `:w` or `:wq`.
_Avoid_: High score, record

**New best**:
A run faster than the best time, or the first run when there's no best time yet.

## hjkl

**Board**:
The dotted grid the cursor moves around.
_Avoid_: Grid

## wb

**Word**:
A word in vim's sense: a run of letters, digits and `_`, or a run of other non-blank characters. So punctuation is its own word, and `don't` is three words: `don`, `'` and `t`.

## rel-jk

**Count**:
The number typed before a motion to repeat it, e.g. `5` in `5j`.
_Avoid_: Multiplier, prefix

**Gutter**:
The column of line numbers to the left of the passage.
_Avoid_: Margin, ruler

**Relative line number**:
How many lines a line is from the cursor's line.

## Look

**Theme**:
A named look for argot (colours and font), such as Dusk, Paper or Synth. The visitor's choice is saved in the browser and comes back on the next visit.
_Avoid_: Colorscheme, skin

**Theme picker**:
The list of themes that `theme` opens over a dimmed home, grouped dark then light, with the selected theme (the one saved for this browser) marked. j and k (or ↓ and ↑) move through it, showing each theme as it's reached; Enter makes the one showing the selected theme and Esc goes back to the selected theme without changing it.
_Avoid_: Theme menu, settings
