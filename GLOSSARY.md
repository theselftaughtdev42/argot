# argot

argot teaches vim by playing short games in a terminal-like shell, using the keyboard only.

## People

**Visitor**:
Someone using argot, especially on home before they've launched a game.
_Avoid_: User

**Player**:
A visitor who is in a game.
_Avoid_: User. Also don't use it for the thing moved on the board (that's the **Cursor**).

## Home

**Home**:
The screen a visitor lands on, with the logo, the prompt and the output of the last command.
_Avoid_: Landing, main menu, terminal

**Prompt**:
The `❯` line on home where the visitor types commands.
_Avoid_: Input, terminal

**Command**:
What's typed at the prompt (e.g. `ls`, `vim hjkl`) or on the command line (e.g. `:q!`, `:wq`).

**Hint**:
The short line telling the visitor or player what to type next.
_Avoid_: Help, tip

## Games

**Game**:
Something a visitor can launch from home with `vim <name>`.

**Drill**:
A kind of game that practises one vim skill against the clock. hjkl is a drill.
_Avoid_: Using it for the play screen

**Game frame**:
The in-game layout: the stage, with the statusline and command line pinned beneath it.

**Stage**:
The part of the game frame that the game draws in.

**Statusline**:
The bar under the stage showing the mode and the game's name.
_Avoid_: Status bar

**Command line**:
The line under the statusline that opens with Esc, where the player types `:q!` or `:wq`.
_Avoid_: Prompt (that's home's), cmdline

**Instructions Page**:
A game's first screen, explaining the task and waiting for Enter to start.
_Avoid_: Splash, landing

**Play screen**:
The screen where the player is doing the drill and the clock is running.
_Avoid_: Drill (that's a kind of game)

**Results screen**:
The screen after a run ends, showing the final time and whether it's a new best.

**Run**:
One attempt at a drill, from starting play to reaching the results screen.
_Avoid_: Round, attempt, session

**Best time**:
A drill's fastest run, kept once the player saves it with `:wq`.
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
