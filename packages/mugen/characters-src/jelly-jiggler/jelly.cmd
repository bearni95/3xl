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


[command]
name = "magic"
command = D,F,x
time = 15

[command]
name = "gasser kick"
command = D,B,c
time = 15

[Defaults]
; Default value for the "time" parameter of a Command. Minimum 1.




; Default value for the "buffer.time" parameter of a Command. Minimum 1,
; maximum 30.





[command]
name = "uppercut"
command = D,F,y
time = 15

command.buffer.time = 1


;-| Special Motions |------------------------------------------------------

;-| Double Tap |-----------------------------------------------------------
[Command]
name = "FF"     ;Required (do not remove)
command = F, F
time = 10

[Command]
name = "BB"     ;Required (do not remove)
command = B, B
time = 10

;-| 2/3 Button Combination |-----------------------------------------------
[Command]
name = "recovery" ;Required (do not remove)
command = x+y
time = 1

[Command]
name = "recovery"
command = y+z
time = 1

[Command]
name = "recovery"
command = x+z
time = 1

[Command]
name = "recovery"
command = a+b
time = 1

[Command]
name = "recovery"
command = b+c
time = 1

[Command]
name = "recovery"
command = a+c
time = 1


;-| Dir + Button |---------------------------------------------------------
[Command]
name = "down_a"
command = /$D,a
time = 1

[Command]
name = "down down_a"
command = ~D, D, a
time = 10

[Command]
name = "down_b"
command = /$D,b
time = 1

[Command]
name = "down down_b"
command = ~D, D, b
time = 10

[Command]
name = "down_c"
command = /$D,c
time = 1

[Command]
name = "down_x"
command = /$D,x
time = 1

[Command]
name = "down down_x"
command = ~D, D, x
time = 10

[Command]
name = "down_y"
command = /$D,y
time = 1

[Command]
name = "down down_y"
command = ~D, D, y
time = 10

[Command]
name = "down_z"
command = /$D,z
time = 1

[Command]
name = "down_s"
command = /$D,s
time = 1



[Command]
name = "forward_b"
command = /$F,b
time = 1

[Command]
name = "forward_a"
command = /$F,a
time = 1

[Command]
name = "forward_c"
command = /$F,c
time = 1

[Command]
name = "forward_x"
command = /$F,x
time = 1


[Command]
name = "forward_z"
command = /$F,z
time = 1

[Command]
name = "forward_y"
command = /$F,y
time = 1

[Command]
name = "back_z"
command = /$B,z
time = 1

[Command]
name = "back_c"
command = /$B,c
time = 1

[Command]
name = "back_b"
command = /$B,b
time = 1

[Command]
name = "Up_z"
command = /$U,z
time = 1


[Command]
name = "hold a"
command = /a
time = 1

[Command]
name = "hold b"
command = /b
time = 1

[Command]
name = "hold c"
command = /c
time = 1

[Command]
name = "hold y"
command = /y
time = 1

[Command]
name = "hold z"
command = /z
time = 1

[Command]
name = "hold s"
command = /s
time = 1

[Command]
name = "hold x"
command = /x
time = 1

[Command]
name = "hold a + b"
command = a+b
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
name = "s"
command = s
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


[Command] ;Quarter circle forward + x
name = "QCF"
command = ~D, DF, F
time = 1

[Command] ;Quarter circle forward + x
name = "QCF_x"
command = ~D, DF, F, x

[Command] ;Quarter circle forward + z
name = "QCF_z"
command = ~D, DF, F, z

[Command] ;Quarter circle forward + z
name = "QCF_b"
command = ~D, DF, F, b

[Command] ;Quarter circle forward + z
name = "QCF_s"
command = ~D, DF, F, s

[Command] ;Quarter circle forward + z
name = "QCF_a"
command = ~D, DF, F, a

[Command] ;Quarter circle forward + z
name = "QCF_hold x"
command = ~D, DF, F, /x

[Command] ;Quarter circle forward + z
name = "QCF_y"
command = ~D, DF, F, y

[Command] ;Quarter circle forward + z
name = "QCF_c"
command = ~D, DF, F, c



[Command] ;Quarter circle back + z
name = "QCB_a"
command = ~D, DB, B, a

[Command] ;Quarter circle back + z
name = "QCB_c"
command = ~D, DB, B, c

[Command] ;Quarter circle back + z
name = "QCB_y"
command = ~D, DB, B, y

[Command] ;Quarter circle back + z
name = "QCB_s"
command = ~D, DB, B, s

[Command] ;Quarter circle back + z
name = "QCB_z"
command = ~D, DB, B, z

[Command] ;Quarter circle back + z
name = "QCB_x"
command = ~D, DB, B, x

[Command] ;Quarter circle forward + z
name = "QCB_hold x"
command = ~D, DB, B, /x


[Command] ;Quarter circle back + z
name = "QCB_b"
command = ~D, DB, B, b


[Command] ;Two quarter circles forward + y
 name = "2QCF_a"
 command = ~D, DF, F, D, DF, F, a

 [Command] ;Two quarter circles forward + y
 name = "2QCF_b"
 command = ~D, DF, F, D, DF, F, b

 [Command] ;Two quarter circles forward + y
 name = "2QCF_c"
 command = ~D, DF, F, D, DF, F, c

 [Command] ;Two quarter circles forward + y
 name = "2QCF_x"
 command = ~D, DF, F, D, DF, F, x

 [Command] ;Two quarter circles forward + y
 name = "2QCF_y"
 command = ~D, DF, F, D, DF, F, y

 [Command] ;Two quarter circles forward + y
 name = "2QCF_z"
 command = ~D, DF, F, D, DF, F, z

 [Command] ;Two quarter circles forward + y
 name = "2QCF_s"
 command = ~D, DF, F, D, DF, F, s



 [Command] ;Two quarter circles forward + y
 name = "2QCB_a"
 command = ~D, DB, B, D, DB, B, a

 [Command] ;Two quarter circles forward + y
 name = "2QCB_b"
 command = ~D, DB, B, D, DB, B, b

 [Command] ;Two quarter circles forward + y
 name = "2QCB_c"
 command = ~D, DB, B, D, DB, B, c

 [Command] ;Two quarter circles forward + y
 name = "2QCB_x"
 command = ~D, DB, B, D, DB, B, x

 [Command] ;Two quarter circles forward + y
 name = "2QCB_y"
 command = ~D, DB, B, D, DB, B, y

 [Command] ;Two quarter circles forward + y
 name = "2QCB_z"
 command = ~D, DB, B, D, DB, B, z

 [Command] ;Two quarter circles forward + y
 name = "2QCB_s"
 command = ~D, DB, B, D, DB, B, s


[command]
name = "DF_a"
command = ~F, D, DF, a
time = 15

[command]
name = "DF_b"
command = ~F, D, DF, b
time = 15

[command]
name = "DF_c"
command = ~F, D, DF, c
time = 15

[command]
name = "DF_x"
command = ~F, D, DF, x
time = 15

[command]
name = "DF_y"
command = ~F, D, DF, y
time = 15

[command]
name = "DF_z"
command = ~F, D, DF, z
time = 15

[command]
name = "DB_a"
command = ~B, D, DB, a
time = 15

[command]
name = "DB_b"
command = ~B, D, DB, b
time = 15

[command]
name = "DB_c"
command = ~B, D, DB, c
time = 15

[command]
name = "DB_x"
command = ~B, D, DB, x
time = 15

[command]
name = "DB_y"
command = ~B, D, DB, y
time = 15

[command]
name = "DB_z"
command = ~B, D, DB, z
time = 15
; -| CPU Commands |------

[Command]
name = "CPU1"
command = D, D, U, U, D, U
time = 1

[Command]
name = "CPU2"
command = D, U, U, D, D, U
time = 1

[Command]
name = "CPU3"
command = D, D, D, U, U, U
time = 1

[Command]
name = "CPU4"
command = U, D, B, F, a, b, x
time = 1
[Command]
name = "CPU5"
command = U, D, B, F, a, b, y
time = 1
[Command]
name = "CPU6"
command = U, D, B, F, a, b, z
time = 1
[Command]
name = "CPU7"
command = U, D, B, F, a, a, a
time = 1
[Command]
name = "CPU8"
command = U, D, B, F, a, a, b
time = 1
[Command]
name = "CPU9"
command = U, D, B, F, a, a, c
time = 1

[State -1, Activate AI]
type = VarSet
triggerall = var(20) != 1
trigger1 = command = "CPU1"
trigger2 = command = "CPU2"
trigger3 = command = "CPU3"
trigger4 = command = "CPU4"
trigger5 = command = "CPU5"
trigger6 = command = "CPU6"
trigger7 = command = "CPU7"
trigger8 = command = "CPU8"
trigger9 = command = "CPU9"
v = 20
value = 1



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

;===========================================================================
;---------------------------------------------------------------------------

;------------------------------------------------------------------------
[State -1, Run Fwd]
type = ChangeState
value = 100
trigger1 = command = "FF"
trigger1 = statetype = S
trigger1 = ctrl

[State -1, Run Back]
type = ChangeState
value = 105
trigger1 = command = "BB"
trigger1 = statetype = S
trigger1 = ctrl

;-------------------------------------------------------------------
[State -1, punch]
type = ChangeState
value = 200
trigger1 = command = "a"
trigger1 = statetype = S
trigger1 = ctrl
;-------------------------------------------------------------------
[State -1, punch1]
type = ChangeState
value = 236
trigger1 = command = "a"
trigger1 = statetype = S
trigger1 = stateno = 200
trigger1 = animelemtime(2) > 0
;-------------------------------------------------------------------
[State -1, bobobo beam]
type = ChangeState
value = 275
trigger1 = command = "a"
trigger1 = command = "holdfwd"
trigger1 = statetype = S
trigger1 = stateno = 236
trigger1 = animelemtime(2) > 0
;-------------------------------------------------------------------
[State -1, yugioh celtic gurdian]
type = ChangeState
value = 267
triggerall = numhelper(623) = 0
trigger1 = command = "c"
trigger1 = command = "holdback"
trigger1 = statetype = S
trigger1 = ctrl
;------------------------------------------------------------------
[State -1, don patch throw ]
type = ChangeState
value = 587
trigger1 = command = "b"
trigger1 = statetype = S
trigger1 = ctrl
;------------------------------------------------------------------
[State -1, rocket]
type = ChangeState
value = 469
trigger1 = command = "x"
trigger1 = command = "holdback"
trigger1 = statetype =S
trigger1 = ctrl
;------------------------------------------------------------------
[State -1,Snot Attck]
type = ChangeState
value = 285
trigger1 = command = "c"
trigger1 = command = "holdfwd"
trigger1 = statetype = S
trigger1 = ctrl

;------------------------------------------------------------------
[State -1, bobobo frying pan]
type = ChangeState
value = 268
triggerall = numhelper(269) = 0
trigger1 = command = "a"
trigger1 = command = "holdback"
trigger1 = statetype = S
trigger1 = stateno = 236
trigger1 = animelemtime(2) > 0
;------------------------------------------------------------------
[State -1, dark magic]
type = ChangeState
value = 234
triggerall = numhelper(523) = 0
triggerall = power >= 700
trigger1 = command = "QCB_y"
trigger1 = statetype =S
trigger1 = ctrl
;------------------------------------------------------------------
[State -1,karate uppercut]
type = ChangeState
value = 281
trigger1 = command = "uppercut"
triggerall = power >= 1000
trigger1 = statetype = S
trigger1 = ctrl
;------------------------------------------------------------------
[State -1,Magic ]
type = ChangeState
value = 700
triggerall = power >= 500
trigger1 = command = "QCF_x"
trigger1 = statetype = S
trigger1 = ctrl
;------------------------------------------------------------------
[State -1, gasser kick]
type = ChangeState
value = 963
triggerall = numhelper(562) = 0
trigger1 = command = "c"
trigger1= command!="holddown"
trigger1 = statetype = S
trigger1 = ctrl
;------------------------------------------------------------------
[State -1, transform punch]
type = ChangeState
value = 602
trigger1 = command = "x"
trigger1 = command = "holdfwd"
trigger1= command!="holddown"
triggerall = power >= 400
trigger1 = statetype = S
trigger1 = ctrl
;------------------------------------------------------------------
[State -1,Tramsform attck]
type = ChangeState
value = 561
triggerall = power >= 400
trigger1 = command = "QCF_z"
trigger1= command!="holddown"
trigger1 = statetype = S
trigger1 = ctrl
;------------------------------------------------------------------
[State -1,Tramsform Rapid Punch]
type = ChangeState
value = 294
triggerall = power >= 800
trigger1 = command = "QCB_z"
trigger1= command!="holddown"
trigger1 = statetype = S
trigger1 = ctrl
;------------------------------------------------------------------
[State -1,bobobo shake]
type = ChangeState
value = 713
triggerall = power >= 600
triggerall = numhelper(465) = 0
trigger1 = command = "x"
trigger1= command!="holddown"
trigger1 = statetype = S
trigger1 = ctrl
;------------------------------------------------------------------
[State -1,Gasser Slide]
type = ChangeState
value = 205
trigger1 = command = "c"
trigger1 = statetype = C
trigger1 = ctrl


; ============================
; AI Auto taunt
; ============================
[State -1,AutoTaunt]
type = ChangeState
value = 195
triggerall = var(20) = 1
triggerall = statetype != A
triggerall = movetype != H
triggerall = statetype != L
triggerall = P2life != 0
trigger1 = (P2statetype = L) && (ctrl = 1) && (random <= 500)
persistent = 0

; AI walk Forward and Back
;----------------
[State -1, AI walk fwd & bck]
type = ChangeState
value = 20
triggerall = var(20) = 1
triggerall = (StateType = S) && (ctrl)
trigger1 = (vel x != 0)
; ==========================
; AI Standing Guard
; ==========================
[State -1]
type = ChangeState
triggerall = var(20) = 1 ;AI trigger used
triggerall = Statetype != A ;Player is not in the air
triggerall = P2statetype != C ;Player is not crouching
triggerall = Statetype = S ;Player is currently standing
triggerall = P2Movetype = A ;Opponent is attacking
triggerall = Pos Y != [-1,-999]
triggerall = ctrl = 1
trigger1 = random <= 400 ;triggers at 80% probability
value = 130 ;Default standing guard state

; =============================
; AI Stand to Crouch Guard Transition
; =============================
[State -1]
type = ChangeState
triggerall = var(20) = 1
triggerall = StateType != A
triggerall = P2statetype = C
triggerall = P2Movetype = A
triggerall = Pos Y != [-1,-999]
trigger1 = stateno = 150
trigger1 = 1
value = 152

; =============================
; AI Crouching Guard
; =============================
[State -1]
type = ChangeState
triggerall = var(20) = 1
triggerall = StateType != A
triggerall = P2statetype = C
triggerall = P2Movetype = A
triggerall = Pos Y != [-1,-999]
triggerall = ctrl = 1
trigger1 = random <= 300
value = 131

; =============================
; AI Crouch to Stand Guard Transition
; =============================
[State -1]
type = ChangeState
triggerall = var(20) = 1
triggerall = Statetype != A
triggerall = P2statetype != C
triggerall = P2Movetype = A
trigger1 = 1
trigger1 = stateno = 152
value = 150

; =============================
; AI Aerial Guard
; =============================
[State -1]
type = ChangeState
triggerall = var(20) = 1
triggerall = Statetype = A
triggerall = P2Movetype = A
triggerall = ctrl = 1
trigger1 = random <= 300
value = 132

; ==========================
; Jab
; ==========================
[State -1, AI jab]
type = ChangeState
triggerall = var(20) = 1
triggerall = random <= 800
triggerall = StateType != A
triggerall = Movetype != H
triggerall = P2Life > 0
triggerall = P2bodydist X <= 50
trigger1 = ctrl = 1
value = 200

;AI Jab2
[State -1,AI 2nd punch]
type = ChangeState
triggerall = Stateno = 200
trigger1 = movehit = 1
triggerall = random <= 800
triggerall = var(20) = 1
triggerall = StateType != A
triggerall = Movetype != H
triggerall = P2Life > 0
triggerall = P2bodydist X <= 50
value = 236

;AI BOBOBO Beam
[State -1, AI Beam]
type = ChangeState
triggerall = Stateno = 236
trigger1 = movehit = 1
triggerall = random <= 700
triggerall = var(20) = 1
triggerall = StateType != A
triggerall = Movetype != H
triggerall = P2Life > 0
triggerall = P2bodydist X <= 50
value = 275


[State -1, AI Ball Throw]
type = ChangeState
triggerall = var(20) = 1
triggerall = random <= 800
triggerall = StateType != A
triggerall = Movetype != H
triggerall = P2Life > 0
triggerall = P2bodydist X <= 50
trigger1 = ctrl = 1
value = 587










