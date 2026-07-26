; The CMD file.
;
; Two parts: 1. Command definition and  2. State entry
; (state entry is after the commands def section)
;
; 1. Command definition
; ---------------------
; Note: The commands are CASE-SENSITIVE, and so are the command names.
; The eight directions are:
;   B, DB, D, DF, F, UF, U, UB     (all CAPS)
;   corresponding to back, down-back, down, downforward, etc.
; The six buttons are:
;   a, b, c, x, y, z               (all lower case)
;   In default key config, abc are are the bottom, and xyz are on the
;   top row. For 2 button characters, we recommend you use a and b.
;   For 6 button characters, use abc for kicks and xyz for punches.
;
; Each [Command] section defines a command that you can use for
; state entry, as well as in the CNS file.
; The command section should look like:
;
;   [Command]
;   name = some_name
;   command = the_command
;   time = time (optional)
;   buffer.time = time (optional)
;
; - some_name
;   A name to give that command. You'll use this name to refer to
;   that command in the state entry, as well as the CNS. It is case-
;   sensitive (QCB_a is NOT the same as Qcb_a or QCB_A).
;
; - command
;   list of buttons or directions, separated by commas. Each of these
;   buttons or directions is referred to as a "symbol".
;   Directions and buttons can be preceded by special characters:
;   slash (/) - means the key must be held down
;          egs. command = /D       ;hold the down direction
;               command = /DB, a   ;hold down-back while you press a
;   tilde (~) - to detect key releases
;          egs. command = ~a       ;release the a button
;               command = ~D, F, a ;release down, press fwd, then a
;          If you want to detect "charge moves", you can specify
;          the time the key must be held down for (in game-ticks)
;          egs. command = ~30a     ;hold a for at least 30 ticks, then release
;   dollar ($) - Direction-only: detect as 4-way
;          egs. command = $D       ;will detect if D, DB or DF is held
;               command = $B       ;will detect if B, DB or UB is held
;   plus (+) - Buttons only: simultaneous press
;          egs. command = a+b      ;press a and b at the same time
;               command = x+y+z    ;press x, y and z at the same time
;   greater-than (>) - means there must be no other keys pressed or released
;                      between the previous and the current symbol.
;          egs. command = a, >~a   ;press a and release it without having hit
;                                  ;or released any other keys in between
;   You can combine the symbols:
;     eg. command = ~30$D, a+b     ;hold D, DB or DF for 30 ticks, release,
;                                  ;then press a and b together
;
;   Note: Successive direction symbols are always expanded in a manner similar
;         to this example:
;           command = F, F
;         is expanded when MUGEN reads it, to become equivalent to:
;           command = F, >~F, >F
;
;   It is recommended that for most "motion" commads, eg. quarter-circle-fwd,
;   you start off with a "release direction". This makes the command easier
;   to do.
;
; - time (optional)
;   Time allowed to do the command, given in game-ticks. The default
;   value for this is set in the [Defaults] section below. A typical
;   value is 15.
;
; - buffer.time (optional)
;   Time that the command will be buffered for. If the command is done
;   successfully, then it will be valid for this time. The simplest
;   case is to set this to 1. That means that the command is valid
;   only in the same tick it is performed. With a higher value, such
;   as 3 or 4, you can get a "looser" feel to the command. The result
;   is that combos can become easier to do because you can perform
;   the command early. Attacks just as you regain control (eg. from
;   getting up) also become easier to do. The side effect of this is
;   that the command is continuously asserted, so it will seem as if
;   you had performed the move rapidly in succession during the valid
;   time. To understand this, try setting buffer.time to 30 and hit
;   a fast attack, such as KFM's light punch.
;   The default value for this is set in the [Defaults] section below. 
;   This parameter does not affect hold-only commands (eg. /F). It
;   will be assumed to be 1 for those commands.
;
; If you have two or more commands with the same name, all of them will
; work. You can use it to allow multiple motions for the same move.
;
; Some common commands examples are given below.
;
; [Command] ;Quarter circle forward + x
; name = "QCF_x"
; command = ~D, DF, F, x
;
; [Command] ;Half circle back + a
; name = "HCB_a"
; command = ~F, DF, D, DB, B, a
;
; [Command] ;Two quarter circles forward + y
; name = "2QCF_y"
; command = ~D, DF, F, D, DF, F, y
;
; [Command] ;Tap b rapidly
; name = "5b"
; command = b, b, b, b, b
; time = 30
;
; [Command] ;Charge back, then forward + z
; name = "charge_B_F_z"
; command = ~60$B, F, z
; time = 10
;
; [Command] ;Charge down, then up + c
; name = "charge_D_U_c"
; command = ~60$D, U, c
; time = 10


;-| Button Remapping |-----------------------------------------------------
; This section lets you remap the player's buttons (to easily change the
; button configuration). The format is:
;   old_button = new_button
; If new_button is left blank, the button cannot be pressed.
[Remap]
x = x
y = y
z = z
a = a
b = b
c = c
s = s

;-| Default Values |-------------------------------------------------------
[Defaults]
; Default value for the "time" parameter of a Command. Minimum 1.
command.time = 15

; Default value for the "buffer.time" parameter of a Command. Minimum 1,
; maximum 30.
command.buffer.time = 1


;-| Super Motions |--------------------------------------------------------
;The following two have the same name, but different motion.
;Either one will be detected by a "command = TripleKFPalm" trigger.
;Time is set to 20 (instead of default of 15) to make the move
;easier to do.
;

;-| Special Motions |------------------------------------------------------


;-| Double Tap |-----------------------------------------------------------
[Command]
name = "FF"
command = F,F
time = 10

[Command]
name = "BB"     ;Required (do not remove)
command = B, B
time = 10

;-| 2/3 Button Combination |-----------------------------------------------
[Command]
name = "recovery";Required (do not remove)
command = x+y
time = 1

;-| Dir + Button |---------------------------------------------------------
[Command]
name = "down_a"
command = /$D,a
time = 1

[Command]
name = "down_b"
command = /$D,b
time = 1

;-| Single Button |---------------------------------------------------------
[Command]
name = "a"
command = a
time = 1

[Command]
name = "b"
command = b
time = 1

[Command]
name = "c"
command = c
time = 1

[Command]
name = "q"
command = ~D,DF,F,D,DF,F,c
time = 30

[Command]
name = "w"
command = ~D,DF,F,D,DF,F,b
time = 30

[Command]
name = "e"
command = ~D,DF,F,D,DF,F,z
time = 30

[Command]
name = "Thunder"
command = ~D,DF,F,a
time = 30

[Command]
name = "SmnSwd"
command = ~D,DF,F,b
time = 30

[Command]
name = "TH"
command = ~D,DF,F,c
time = 30

[Command]
name = "Throw"
command = /F,x
time = 30

[Command]
name = "AB"
command = a+b
time = 1

[Command]
name = "XY"
command = x+y
time = 1

[Command]
name = "x"
command = x
time = 1

[Command]
name = "y"
command = y
time = 1

[Command]
name = "z"
command = z
time = 1

[Command]
name = "start"
command = s
time = 1
;Ai
[Command]
name = "cpu1"
command = U, D, F
time = 1

[Command]
name = "cpu2"
command = U, B, F
time = 1

[Command]
name = "cpu3"
command = U, D, D
time = 1

[Command]
name = "cpu4"
command = F, B, U
time = 1

[Command]
name = "cpu5"
command = U, F, U, B
time = 1

[Command]
name = "cpu6"
command = U, D, B
time = 1

[Command]
name = "cpu7"
command = F, F, B
time = 1

[Command]
name = "cpu8"
command = U, D, U
time = 1

[Command]
name = "cpu9"
command = F, B, B
time = 1

[Command]
name = "cpu10"
command = F, F, B, B
time = 1

[Command]
name = "cpu11"
command = U, U, F
time = 1

[Command]
name = "cpu12"
command = U, B, B
time = 1

[Command]
name = "cpu13"
command = U, B, F, F
time = 1

[Command]
name = "cpu14"
command = U, F, B, U
time = 1

[Command]
name = "cpu15"
command = U, B, F, U
time = 1

[Command]
name = "cpu16"
command = U, B, B, B
time = 1

[Command]
name = "cpu17"
command = U, D, B, F
time = 1

[Command]
name = "cpu18"
command = U, D, B, D
time = 1

[Command]
name = "cpu19"
command = U, D, F, U
time = 1

[Command]
name = "cpu20"
command = U, D, U, B
time = 1

[Command]
name = "cpu21"
command = U, D, F, F
time = 1

[Command]
name = "cpu22"
command = F, F, F, F
time = 1

[Command]
name = "cpu23"
command = U, U, U, D
time = 1

[Command]
name = "cpu24"
command = B, B, B
time = 1

[Command]
name = "cpu25"
command = D, D, D, D
time = 1

[Command]
name = "cpu26"
command = D, D, D
time = 1

[Command]
name = "cpu27"
command = F, F, F
time = 1

[Command]
name = "cpu28"
command = U, U, U
time = 1

[Command]
name = "cpu29"
command = U, U, B, B
time = 1

[Command]
name = "cpu30"
command = D, D, F, F
time = 1

;-| Hold Dir |--------------------------------------------------------------
[Command]
name = "holdfwd";Required (do not remove)
command = /$F
time = 1

[Command]
name = "holdback";Required (do not remove)
command = /$B
time = 1

[Command]
name = "holdup" ;Required (do not remove)
command = /$U
time = 1

[Command]
name = "holddown";Required (do not remove)
command = /$D
time = 1

;---------------------------------------------------------------------------
; 2. State entry
; --------------
; This is where you define what commands bring you to what states.
;
; Each state entry block looks like:
;   [State -1, Label]           ;Change Label to any name you want to use to
;                               ;identify the state with.
;   type = ChangeState          ;Don't change this
;   value = new_state_number
;   trigger1 = command = command_name
;   . . .  (any additional triggers)
;
; - new_state_number is the number of the state to change to
; - command_name is the name of the command (from the section above)
; - Useful triggers to know:
;   - statetype
;       S, C or A : current state-type of player (stand, crouch, air)
;   - ctrl
;       0 or 1 : 1 if player has control. Unless "interrupting" another
;                move, you'll want ctrl = 1
;   - stateno
;       number of state player is in - useful for "move interrupts"
;   - movecontact
;       0 or 1 : 1 if player's last attack touched the opponent
;                useful for "move interrupts"
;
; Note: The order of state entry is important.
;   State entry with a certain command must come before another state
;   entry with a command that is the subset of the first.
;   For example, command "fwd_a" must be listed before "a", and
;   "fwd_ab" should come before both of the others.
;
; For reference on triggers, see CNS documentation.
;
; Just for your information (skip if you're not interested):
; This part is an extension of the CNS. "State -1" is a special state
; that is executed once every game-tick, regardless of what other state
; you are in.


; Don't remove the following line. It's required by the CMD standard.


[Statedef -1]

[State -1, AI TRIGGER]
type = Varset
triggerall = RoundState = 2
trigger1 = command = "cpu1"
trigger2 = command = "cpu2"
trigger3 = command = "cpu3"
trigger4 = command = "cpu4"
trigger5 = command = "cpu5"
trigger6 = command = "cpu6"
trigger7 = command = "cpu7"
trigger8 = command = "cpu8"
trigger9 = command = "cpu9"
trigger10 = command = "cpu10"
trigger11 = command = "cpu11"
trigger12 = command = "cpu12"
trigger13 = command = "cpu13"
trigger14 = command = "cpu14"
trigger15 = command = "cpu15"
trigger16 = command = "cpu16"
trigger17 = command = "cpu17"
trigger18 = command = "cpu18"
trigger19 = command = "cpu19"
trigger20 = command = "cpu20"
trigger21 = command = "cpu21"
trigger22 = command = "cpu22"
trigger23 = command = "cpu23"
trigger24 = command = "cpu24"
trigger25 = command = "cpu25"
trigger26 = command = "cpu26"
trigger27 = command = "cpu27"
trigger28 = command = "cpu28"
trigger29 = command = "cpu29"
trigger30 = command = "cpu30"
v = 7
value = 1

;===========================================================================
[State -1, Run Fwd]
type = ChangeState
value = 100
trigger1 = command = "FF"
trigger1 = statetype = S
trigger1 = ctrl
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 100
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = p2bodydist x > 50
;trigger1 = Random <= 9999999999999999999999999999999999999999999999999999999999

;---------------------------------------------------------------------------
[State -1, Run Back]
type = ChangeState
value = 105
trigger1 = command = "BB"
trigger1 = statetype = S
trigger1 = ctrl
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 105
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = p2bodydist x < 20
;---------------------------------------------------------------------------
[State -1, Taunt]
type = ChangeState
value = 195
triggerall = command = "start"
trigger1 = statetype != A
trigger1 = ctrl
;------------------------
[State -1, Demon Form]
type = ChangeState
value = 900
triggerall = command = "e"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = power = 3000
trigger1 = ctrl = 1
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 900
triggerall = var(7)
triggerall = !Win
triggerall = power = 3000
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 99
;-------------------------------
[State -1, Whip of Light]
type = ChangeState
value = 300
triggerall = command = "q"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = power >= 2000
trigger1 = ctrl = 1
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 300
triggerall = var(7)
triggerall = !Win
triggerall = power >= 2000
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 20
triggerall = p2bodydist x > 40

;-------------------------------------------
[State -1, Thunder Slash]
Type = ChangeState
Triggerall = Command = "Thunder"
Trigger1 = ctrl = 1
Triggerall = StateType = S
trigger2 = stateno = 987 && movecontact
trigger3 = stateno = 234 && movecontact
Value = 8765
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 8765
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 30
trigger1 = p2bodydist x < 50
;-------------------------------------------
[State -1, Thunder Drop]
Type = ChangeState
Triggerall = Command = "TH"
Trigger1 = ctrl = 1
Triggerall = StateType = S
Value = 458
;----------------------------
[State -1, Knock Back]
Type = ChangeState
Trigger1 = Command = "XY"
Trigger1 = ctrl = 1
Triggerall = StateType = S
trigger2 = stateno = 520 &&movecontact
trigger2 = command = "z"
Value = 438
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 438
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 30
trigger1 = p2bodydist x < 50
;---------------------------
[State -1, Knock up]
Type = ChangeState
Triggerall = Command = "AB"
Trigger1 = ctrl = 1
Triggerall = StateType = S
trigger2 = stateno = 987 && movecontact
trigger3 = stateno = 234 && movecontact
Value = 433
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 433
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 30
trigger1 = p2bodydist x < 50
;----------------
[State -1, Sounga]
type = ChangeState
value = 450
triggerall = command = "w"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = power >= 1000
trigger1 = ctrl = 1
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 450
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = power >= 1000
trigger1 = ctrl
trigger1 = Random <= 10

;------------------------
[State -1, Summon Sword]
type = ChangeState
value = 3214
triggerall = command = "SmnSwd"
triggerall = command != "holddown"
trigger1 = statetype = S
triggerall = ctrl
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 3214
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 30
trigger1 = p2bodydist x < 50
;---------------
[State -1, Throw]
type = ChangeState
value = 5432
triggerall = command = "Throw"
triggerall = command != "holddown"
trigger1 = statetype = S
triggerall = ctrl
triggerall = p2bodydist x < 50
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 5432
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 30
triggerall = p2bodydist x < 50
;------------------------------------------------------------
[State -1, Stand Strong Slash 1]
Type = ChangeState
Triggerall = Command = "c"
Triggerall = Command != "holddown"
Trigger1 = ctrl = 1
Trigger1 = StateType = S
Value = 200
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 200
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 30
trigger1 = p2bodydist x < 50
;---------------------------------------------------------------------------
[State -1, Stand Strong Slash 2]
type = ChangeState
value = 210
triggerall = stateno = 200 && movecontact
triggerall = command = "c"
triggerall = command != "holddown"
trigger1 = statetype = S
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 210
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 99
triggerall = stateno = 200 && movecontact
trigger1 = p2bodydist x < 50
;---------------------------------------------------------------------------
[State -1, Stand Strong Slash 3]
type = ChangeState
value = 341
triggerall = stateno = 210 && movecontact
triggerall = command = "c"
triggerall = command != "holddown"
trigger1 = statetype = S
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 341
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 99
triggerall = stateno = 210 && movecontact
trigger1 = p2bodydist x < 50
;---------------------------------------------------------------------------
[State -1, Claw Attack Strong]
type = ChangeState
value = 520
triggerall = command = "z"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl = 1
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 520
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 30
trigger1 = p2bodydist x < 50

;---------------------------------------------------------------------------
[State -1, Air A]
Type = ChangeState
Triggerall = Command = "a"
Triggerall = Command != "holddown"
Trigger1 = ctrl = 1
Trigger1 = StateType = A
Value = 611
;---------------------------------------------------------------------------
[State -1, Air B]
Type = ChangeState
Triggerall = Command = "b"
Triggerall = Command != "holddown"
Trigger1 = ctrl = 1
Trigger1 = StateType = A
Value = 611
;---------------------------------------------------------------------------
[State -1, Air C]
Type = ChangeState
Triggerall = Command = "c"
Triggerall = Command != "holddown"
Trigger1 = ctrl = 1
Trigger1 = StateType = A
Value = 611
;---------------------------------------------------------------------------
[State -1, Air X]
Type = ChangeState
Triggerall = Command = "x"
Triggerall = Command != "holddown"
Trigger1 = ctrl = 1
Trigger1 = StateType = A
Value = 611
;---------------------------------------------------------------------------
[State -1, Air Y]
Type = ChangeState
Triggerall = Command = "y"
Triggerall = Command != "holddown"
Trigger1 = ctrl = 1
Trigger1 = StateType = A
Value = 611
;---------------------------------------------------------------------------
[State -1, Air Z]
Type = ChangeState
Triggerall = Command = "z"
Triggerall = Command != "holddown"
Trigger1 = ctrl = 1
Trigger1 = StateType = A
Value = 611
;-----------------
[State -1, Crouch A]
type = ChangeState
value = 630
triggerall = command = "a"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-----------------
[State -1, Crouch B]
type = ChangeState
value = 630
triggerall = command = "b"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-----------------
[State -1, Crouch C]
type = ChangeState
value = 630
triggerall = command = "c"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-----------------
[State -1, Crouch Y]
type = ChangeState
value = 436
triggerall = command = "y"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-----------------
[State -1, Crouch Z]
type = ChangeState
value = 437
triggerall = command = "z"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-----------------
[State -1, Crouch X]
type = ChangeState
value = 435
triggerall = command = "x"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-----------------
[State -1, Stand B]
type = ChangeState
value = 987
triggerall = command = "b"
trigger1 = statetype = S
trigger1 = ctrl
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 987
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 30
trigger1 = p2bodydist x < 50
;-----------------
[State -1, Stand A]
type = ChangeState
value = 234
triggerall = command = "a"
trigger1 = statetype = S
trigger1 = ctrl
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 234
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 30
trigger1 = p2bodydist x < 50
;-----------------
[State -1, Stand Y]
type = ChangeState
value = 230
triggerall = command = "y"
trigger1 = statetype = S
trigger1 = ctrl
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 230
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 30
trigger1 = p2bodydist x < 50
;-----------------
[State -1, Stand Y 2]
type = ChangeState
value = 231
triggerall = command = "y"
triggerall = stateno = 230 && movecontact
trigger1 = statetype = S
;---------------------------------
[State -1, Stand Y 2]
type = ChangeState
value = 434
triggerall = command = "b"
trigger1 = statetype = S
trigger1 = stateno = 987 && movecontact
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 434
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 99
trigger1 = stateno = 987 && movecontact
trigger1 = p2bodydist x < 50
;-----------------
[State -1, Stand Z]
type = ChangeState
value = 654
trigger1 = command = "x"
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno = 438 && movecontact
trigger2 = command = "z"
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 654
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 30
trigger1 = p2bodydist x < 50
;----------------------------------------------
[State -1, AI]
type = ChangeState
value = 654
trigger1 = stateno = 438 && movecontact
triggerall = var(7)
triggerall = !Win
triggerall = StateType = S
trigger1 = ctrl
trigger1 = Random <= 99
trigger1 = p2bodydist x < 50
