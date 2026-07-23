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
z = b
a = s;a
b = z
c = c
s = a;s

;-| Default Values |-------------------------------------------------------
[Defaults]
; Default value for the "time" parameter of a Command. Minimum 1.
command.time = 15
; Default value for the "buffer.time" parameter of a Command. Minimum 1,
; maximum 30.
command.buffer.time = 1


;-| Super Motions |--------------------------------------------------------
[Command]
name = "Desperation"
command=~B,DB,D,DF,F,a
time=30
[Command]
name = "Desperation"
command=~B,DB,D,DF,F,~a
time=30
[Command]
name = "Desperation"
command=~B,D,F,a
time=30
[Command]
name = "Desperation"
command=~B,D,F,~a
time=30


[Command]
name = "Dance_Blades_Z"
command=~D,DF,F,z
time=15
[Command]
name = "Dance_Blades_Z"
command=~D,DF,F,~z
time=15

[Command]
name = "Dance_Dead_Z"
command=~B,DB,D,z
time=20
[Command]
name = "Dance_Dead_Z"
command=~B,DB,D,~z
time=20

[Command]
name = "Dance_Dragon_Z"
command=~F,D,DF,z
time=20
[Command]
name = "Dance_Dragon_Z"
command=~F,D,DF,~z
time=20
[Command]
name = "Dance_Dragon_Z"
command=~F,D,z
time=20
[Command]
name = "Dance_Dragon_Z"
command=~F,D,~z
time=20

;-| Special Motions |------------------------------------------------------
[Command]
name = "Kanna_X"
command = ~D,D,x
time = 10
[Command]
name = "Kanna_Y"
command = ~D,D,y
time = 10
[Command]
name = "Kanna_Z"
command = ~D,D,z
time = 10

[Command]
name = "Dance_Blades_X"
command=~D,DF,F,x
time=15
[Command]
name = "Dance_Blades_X"
command=~D,DF,F,~x
time=15
[Command]
name = "Dance_Blades_Y"
command=~D,DF,F,y
time=15
[Command]
name = "Dance_Blades_Y"
command=~D,DF,F,~y
time=15


[Command]
name = "Dance_Dead_X"
command=~B,DB,D,x
time=20
[Command]
name = "Dance_Dead_X"
command=~B,DB,D,~x
time=20
[Command]
name = "Dance_Dead_Y"
command=~B,DB,D,y
time=20
[Command]
name = "Dance_Dead_Y"
command=~B,DB,D,~y
time=20

[Command]
name = "Dance_Dragon_X"
command=~F,D,DF,x
time=20
[Command]
name = "Dance_Dragon_X"
command=~F,D,DF,~x
time=20
[Command]
name = "Dance_Dragon_X"
command=~F,D,x
time=20
[Command]
name = "Dance_Dragon_X"
command=~F,D,~x
time=20
[Command]
name = "Dance_Dragon_Y"
command=~F,D,DF,y
time=20
[Command]
name = "Dance_Dragon_Y"
command=~F,D,DF,~y
time=20
[Command]
name = "Dance_Dragon_Y"
command=~F,D,y
time=20
[Command]
name = "Dance_Dragon_Y"
command=~F,D,~y
time=20


;-| Double Tap |-----------------------------------------------------------
[Command]
name = "FF"     ;Required (do not remove)
command = F, F
time = 10

[Command]
name = "BB"     ;Required (do not remove)
command = B, B
time = 10

[Command]
name = "superjump"     ;Required (do not remove)
command = $D, U
time = 15

[Command]
name = "superjumpforward"     ;Required (do not remove)
command = $D, UF
time = 15

[Command]
name = "superjumpbackward"     ;Required (do not remove)
command = $D, UB
time = 15

;-| 2/3 Button Combination |-----------------------------------------------
[Command]
name = "recovery";Required (do not remove)
command = x+y
time = 1

[Command]
name = "recovery";Required (do not remove)
command = y+z
time = 1

[Command]
name = "recovery";Required (do not remove)
command = x+z
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

[Command]
name = "forward"
command = F
time = 1

[Command]
name = "SelectRight"
command = F
time = 1

[Command]
name = "backward"
command = B
time = 1

[Command]
name = "SelectLeft"
command = B
time = 1

[Command]
name = "up"
command = U
time = 1

[Command]
name = "jump_cancel"
command = $U
time = 1

[Command]
name = "down"
command = D
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

[Command]
name = "holdZ";Required (do not remove)
command = /$z
time = 1

[Command]
name = "holdstart";Required (do not remove)
command = /$s
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

;==========================================================================


;===========================================================================
;This is not a move, but it sets up var(1) to be 1 if conditions are right
;for a combo into a special move (used below).
;Since a lot of special moves rely on the same conditions, this reduces
;redundant logic.
[State -1, Combo condition Reset]
type = VarSet
trigger1 = 1
var(1) = 0

[State -1, Combo condition Check]
type = VarSet
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = (stateno = [200,299]) || (stateno = [400,499])
;trigger2 = stateno != 440 ;Except for sweep kick
trigger2 = movecontact
var(1) = 1

[State -1, Naraku Desperation]
type = changestate
value = 3350
triggerall = var(47) = 2 ;Naraku must be selected in round 1
triggerall = floor(life*lifemax/1000) <= 300
triggerall = power >= 3000
triggerall = numhelper(3500) = 0
triggerall = numhelper(3550) = 0
trigger1 = ctrl
trigger1 = command = "Desperation"
trigger1 = statetype = S || statetype = C

[State -1, Sesshomaru Desperation]
type = changestate
value = 3300
triggerall = var(47) = 1 ;Sesshomaru must be selected in round 1
triggerall = floor(life*lifemax/1000) <= 300
triggerall = power >= 3000
triggerall = numhelper(3400) = 0
triggerall = numhelper(3450) = 0
trigger1 = ctrl
trigger1 = command = "Desperation"
trigger1 = statetype = S || statetype = C

; Dance of Blades
[State -1, Dance of Blades]
type = ChangeState
value = 1000
triggerall = NumProjId(1000) = 0
triggerall = ctrl || ((stateno = [615,620]) && movehit=[1,15])
trigger1 = command = "Dance_Blades_X"
trigger1 = var(20) := 3
trigger2 = command = "Dance_Blades_Y"
trigger2 = var(20) := 1
trigger3 = command = "Dance_Blades_Z"
trigger3 = var(20) := 2
trigger3 = power >= 1000


[State -1, sparry]
type=hitoverride
trigger1= roundstate=2 && statetype=S
trigger1= command="forward" && command!="backward" && command!="up" && command!="down"
trigger1= ctrl || stateno=851
trigger1= var(9):=1
attr=SA,AA,AP
stateno=851
slot=0
time=8

[State -1, cparry]
type=hitoverride
trigger1= roundstate=2 && statetype!=A
trigger1= command="down" && command!="forward" && command!="backward" && command!="up"
trigger1= ctrl || stateno=851
trigger1= var(9):=2
attr=C,AA,AP
stateno=851
slot=0
time=8

[State -1, aparry]
type=hitoverride
trigger1= roundstate=2 && statetype=A
trigger1= command="forward" && command!="backward" && command!="up" && command!="down"
trigger1= ctrl || stateno=852
trigger1= var(9):=3
attr=SA,AA,AP
stateno=852
forceair=1
slot=0
time=7

[State -1, Reset Parry]
type=hitoverride
trigger1= (statetype=S || statetype=C) && var(9)!=1 && var(9)!=2
trigger1= var(9) := 0
trigger2= statetype=A && var(9)!=3
trigger2= var(9) := 0
;triggerall = var(9) := 0
;trigger1= (!ctrl && (stateno!=[851,852])) || var(9)
trigger3= movetype!=I || (stateno=[100,106])|| (stateno=[120,132])
trigger3= var(9) := 0
;trigger3= var(9)<=0 && (command="holdback" || command="holdup")
;trigger4= (statetype=S || statetype=C) && var(9)!=1 && var(9)!=2
;trigger5= statetype=A && var(9)!=3
slot=0
time=0

;---------------------------------------------------------------------------
; Kanna
[State -1, Kanna]
type = ChangeState
value = 1100
;triggerall = var(36) = 0
triggerall = NumHelper(1100) = 0
triggerall = (statetype = S) || (statetype = C)
triggerall = ctrl
trigger1 = command = "Kanna_X"
trigger1 = var(20) := 1
trigger2 = command = "Kanna_Y"
trigger2 = var(20) := 2
trigger3 = command = "Kanna_Z"
trigger3 = var(20) := 3

; Dance of the Dragon
[State -1, Dance of the Dragon]
type = ChangeState
value = 1190+(10*var(20))
triggerall = NumHelper(1201) = 0
triggerall = NumHelper(1211) = 0
triggerall = ctrl || ((stateno=230) && (movehit=[1,6])) || ((stateno=430) && (movehit=1))
triggerall = statetype = S || statetype = C
trigger1 = command = "Dance_Dragon_X"
trigger1 = var(20) := 1
trigger2 = command = "Dance_Dragon_Y"
trigger2 = var(20) := 2
trigger3 = command = "Dance_Dragon_Z"
trigger3 = var(20) := 4
trigger3 = power >= 1000

;---------------------------------------------------------------------------
; Dance of the Dead
[State -1, Dance of the Dead]
type = changestate
value = 1290+(10*var(20))
triggerall = numhelper(1301) = 0
triggerall = ctrl || ((stateno=230) && (movehit=1)) || ((stateno=[430,440]) && (movehit=[1,10]))
triggerall = statetype = S || statetype = C
trigger1 = command = "Dance_Dead_X"
trigger1 = var(20) := 1
trigger2 = command = "Dance_Dead_Y"
trigger2 = var(20) := 2
trigger3 = command = "Dance_Dead_Z"
trigger3 = var(20) := 3
trigger3 = power >= 1000

;---------------------------------------------------------------------------
;Dash Fwd
;ダッシュ
[State -1, Run Fwd]
type = ChangeState
value = 100
trigger1 = command = "FF"
trigger1 = var(8) = 0
trigger1 = var(8) := 1
trigger1 = ctrl

;---------------------------------------------------------------------------
;Dash Back
[State -1, Run Back]
type = ChangeState
value = 105
trigger1 = command = "BB"
trigger1 = var(8) = 0
trigger1 = var(8) := 1
trigger1 = ctrl

;===========================================================================
;---------------------------------------------------------------------------
;Stand Light Punch
;立ち弱パンチ
[State -1, Stand Light Punch]
type = ChangeState
value = 200
triggerall = command = "x"
triggerall = command != "holddown"
triggerall = statetype = S
trigger1 = ctrl

[State -1, Stand Medium Punch 1]
type = ChangeState
value = 210
triggerall = command = "y"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = (Stateno = 200) || (Stateno = 400)
trigger2 = movecontact = 1

;---------------------------------------------------------------------------
;Tornado Hold
[State -1, T.Hold]
type = ChangeState
value = 240
triggerall = command = "z"
triggerall = command = "holdfwd"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl
trigger1 = p2bodydist X < 24

;---------------------------------------------------------------------------
;Stand Strong Punch
;立ち強パンチ
[State -1, Stand Strong Punch]
type = ChangeState
value = 230
triggerall = command = "z"
triggerall = command != "holddown"
;triggerall = command != "holdfwd"
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = (stateno = 200) && (Movecontact = 1) && var(1)
trigger3 = (stateno = 210) && (Movecontact = 1) && var(1)
trigger4 = (stateno = 400) && (Movecontact = 1) && var(1)
trigger5 = (stateno = 410) && (Movecontact = 1) && var(1)

;---------------------------------------------------------------------------
;Taunt
;挑発
[State -1, Taunt]
type = null;ChangeState
value = 195
triggerall = command = "start"
trigger1 = statetype != A
trigger1 = ctrl

;---------------------------------------------------------------------------
;Crouching Light Punch
;しゃがみ弱パンチ
[State -1, Crouching Light Punch]
type = ChangeState
value = 400
triggerall = command = "x"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 440
trigger2 = movecontact = [1,15]
;---------------------------------------------------------------------------
;Crouching Strong Punch
;しゃがみ強パンチ
[State -1, Crouching Medium Punch]
type = ChangeState
value = 410
triggerall = command = "y"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = (Stateno = 200) || (Stateno = 400)
trigger2 = movecontact = 1

;---------------------------------------------------------------------------
;Crouching Light Kick
;しゃがみ弱キック
[State -1, Crouching Light Kick]
type = ChangeState
value = 430
triggerall = command = "z"
triggerall = command = "holddown"
triggerall = command != "holdfwd"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = (stateno = 200) && (Movecontact = 1) && var(1)
trigger3 = (stateno = 210) && (Movecontact = 1) && var(1)
trigger4 = (stateno = 400) && (Movecontact = 1) && var(1)
trigger5 = (stateno = 410) && (Movecontact = 1) && var(1)
trigger6 = (stateno = 230) && (Movecontact = 1) && var(1)

;---------------------------------------------------------------------------
;Crouching Strong Kick
;しゃがみ強キック
[State -1, Crouching Strong Kick]
type = ChangeState
value = 440
triggerall = command = "z"
triggerall = command = "holddown"
triggerall = command = "holdfwd"
trigger1 = statetype = C
trigger1 = ctrl
;trigger2 = (stateno = 200) && (Movecontact = 1) && var(1)
;trigger3 = (stateno = 210) && (Movecontact = 1) && var(1)
;trigger4 = (stateno = 400) && (Movecontact = 1) && var(1)
;trigger5 = (stateno = 410) && (Movecontact = 1) && var(1)
;trigger6 = (stateno = 230) && (Movecontact = 1) && var(1)
;trigger7 = (stateno = 430) && (Movecontact = 1) && var(1)

;---------------------------------------------------------------------------
;Jump Light Attack
[State -1, Jump Light Attack]
type = ChangeState
value = 600
triggerall = command = "x"
triggerall = statetype = A
trigger1 = ctrl
trigger2 = (stateno = 100) || (stateno = 105)

;---------------------------------------------------------------------------
;Jump Medium Attack
[State -1, Jump Medium Attack]
type = ChangeState
value = 610
triggerall = command = "y"
triggerall = command != "holddown"
triggerall = statetype = A
trigger1 = ctrl
trigger2 = (stateno = 600) && (Movecontact = 1)
trigger3 = (stateno = 100) || (stateno = 105)

;---------------------------------------------------------------------------
;Jump Medium Attack 2
[State -1, Jump Medium Attack 2]
type = ChangeState
value = 615
triggerall = command = "y"
triggerall = command != "holddown"
triggerall = statetype = A
trigger1 = stateno = 610
trigger1 = Movecontact = 1

;---------------------------------------------------------------------------
;Jump Strong Attack
[State -1, Jump Strong Attack]
type = ChangeState
value = 620
triggerall = command = "z"
triggerall = command != "holddown"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = (stateno = [600,615]) && (Movecontact = 1)
trigger3 = (stateno = 100) || (stateno = 105)
