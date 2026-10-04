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
The screen a visitor lands on, with the logo, the prompt and the output of the last command.
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
A timed exercise that repeats one vim skill until it becomes muscle memory, launched from home with `vim <name>`, which opens its play screen. hjkl is a drill.
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
The line under the statusline that opens with Esc, where the player types `:help`, `:q`, `:q!`, `:w`, `:wq` or `argot`. While it's open, the stage is greyed. `:q` only quits when there's nothing to lose (before the first move, or from the help page); otherwise it shows an E37 error naming `:q!` or `:wq`.
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

**Best time**:
A drill's fastest run, kept once the player saves it with `:w` or `:wq`.
_Avoid_: High score, record

**New best**:
A run faster than the best time, or the first run when there's no best time yet.

## hjkl

**Board**:
The dotted grid the cursor moves around.
_Avoid_: Grid

**Cursor**:
The block the player moves with h, j, k and l.
_Avoid_: Player

**Target**:
The `✕` the player moves the cursor onto.
_Avoid_: Goal

**Hit**:
Moving the cursor onto the target, which makes a new target appear.
_Avoid_: Touch, catch

**Progress**:
How many hits the player has made out of the number needed to finish the run.

## Look

**Theme**:
A named look for argot (colours and font), such as Dusk.
_Avoid_: Colorscheme, skin
