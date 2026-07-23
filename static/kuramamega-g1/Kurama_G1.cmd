; The CMD file.
;
; Two parts: 1. Command definition and  2. State entry
; (state entry is after the commands def section)
;
; 1. Command definition
; ---------------------                                                                     [State -1]

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
;   time = time (optional -- defaults to 15 if omitted)
;
; - some_name
;   A name to give that command. You'll use this name to refer to
;   that command in the state entry, as well as the CNS. It is case-
;   sensitive (QCB_a is NOT the same as Qcb_a or QCB_A).
;
; - command
;   list of buttons or directions, separated by commas.
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
;   You can combine them:
;     eg. command = ~30$D, a+b     ;hold D, DB or DF for 30 ticks, release,
;                                  ;then press a and b together
;   It's recommended that for most "motion" commads, eg. quarter-circle-fwd,
;   you start off with a "release direction". This matches the way most
;   popular fighting games implement their command detection.
;
; - time (optional)
;   Time allowed to do the command, given in game-ticks. Defaults to 15
;   if omitted
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
;

;-| Super Motions |--------------------------------------------------------
;The following two have the same name, but different motion.
;Either one will be detected by a "command = TripleKFPalm" trigger.
;Time is set to 20 (instead of default of 15) to make the move
;easier to do.

;-| AI |-------------------------------------------------------------
[Command]
name = "CPU1"
command = U,U,U,U,F,F,F,F
time = 1

[Command]
name = "CPU2"
command = U,D,DB,U,F,F,F,F,D
time = 1

[Command]
name = "CPU3"
command = U,D,F,U,F,F,F,F,U,D,U
time = 1

[Command]
name = "CPU4"
command = U,D,F,U,F,F,F,F,U,D,B
time = 1

[Command]
name = "CPU5"
command = B,D,F,U,F,F,F,F,U,D,U
time = 1

[Command]
name = "CPU6"
command = U,D,F,U,B,F,B,F,U,D,U
time = 1

[Command]
name = "CPU7"
command = F,B,F,U,B,F,B,F,U,D,U
time = 1


[Command]
name = "CPU8"
command = F,B,F,U,B,F,B,F,U,D,U,B
time = 1

[Command]
name = "CPU9"
command = F,B,F,U,B,F,B,F,U,D,U,B,U
time = 1

[Command]
name = "CPU10"
command = F,B,F,U,B,F,B,F,U,D,U,B,U,D
time = 1

[Command]
name = "CPU11"
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,F
time = 1

[Command]
name = "CPU12"
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,B
time = 1

[Command]
name = "CPU13"
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,F,DB
time = 1

[Command]
name = "CPU14"
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,B,DF
time = 1

[Command]
name = "CPU15"
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,B,DF
time = 1

[Command]
name = "CPU16"
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,B,DF,F
time = 1

[Command]
name = "CPU17"
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,B,DF,F,a
time = 1

[Command]
name = "CPU18"
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,B,DF,F,B,a
time = 1






;--------------------------------------------------------------------------


;[Command]
;name = "EMPLANTE PLANTA P2"
;command = ~D,DB,B+y
;time = 15


[Command]
name = "chute"
command = D,B, a
time = 20

[Command]
name = "chute2"
command = D,B, b
time = 20

[Command]
name = "plant mines_L"
command = D,D, x
time = 20

[Command]
name = "plant mines_H"
command = D,D, y
time = 20

[command]
name = "Vegetal2"
command = D,D, a
time = 20


[command]
name = "Vegetal"
command = D,D, b
time = 20


[command]
name = "rosewhipar"
command = D,F, x
time = 15


[command]
name = "rosewhipar2"
command = D,F, y
time = 15

[command]
name = "Poison Needles"
command = ~D,DF,F,a
time = 15


[command]
name = "Poison Needles2"
command = ~D,DF,F,b
time = 15


[command]
name = "Tornado"
command = F,D,F, x
time = 20

[command]
name = "Tornado2"
command = F,D,F, y
time = 20

;~50$D, U, a

[Command]
name = "hold_x";Required (do not remove)
command = /x
time = 1

[Command]
name = "hold_y";Required (do not remove)
command = /y
time = 1

[command]
name = "Rose01"
command = D,DF,F,x
time = 20

[Command]
name = "rosewhip02"
command = D,DF,F, y
time = 20

[command]
name = "rosewhip03"
command = D,B,x
time = 15

[command]
name = "rosewhip04"
command = D,B,y
time = 15

[command]
name = "plantpe"
command = x+a
time = 30

[Command]
name = "charge"
command = /y

[Command]
name = "charge 1"
command = /b


[Command]
name = "Superpulo"
command = ~D, U
time = 5

[Command]
name = "Superpulo"
command = ~D, UF
time = 5

[Command]
name = "Superpulo"
command = ~D, UB
time = 5

[Command]
name = "SocoChao"
command = y+b
time = 25

[Command]
name = "hold_s"
command = /z
time = 1

;----------------------------especiais-------------------------------------

[command]
name = "especial01"
command = D,B,D,B,b
time = 30

[Command]
name = "tornadoespecial"
command =  ~D, DB, B, D, DB, B, y
time = 25

[Command]
name = "espRosewhip"
command = ~D, DF, F, D, DF, F, y
time = 30

[Command]
name = "EMPLANTE PLANTA P2"
command = ~D,DF,F,D,DF,F, b
time = 30

[Command]
name = "EMPLANTE PLANTA P20"
command =  a+b;~D,DF,F,D,DF,F, b;a+b
time = 30

[Command]
name = "vaimorrer"
command = D,F,DF,F, y+b
time = 34



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


[state -1]
type = changestate
triggerall = random < 100
triggerall = var(59) = 1
triggerall = stateno != 40
triggerall = statetype != a
trigger1 = (p2movetype = a) && (p2statetype != a) && (enemy, numhelper >= 1)
trigger1 = ctrl = 1
trigger2 = (p2movetype = a) && (p2statetype != a) && (enemy, numproj >= 1)
trigger2 = ctrl = 1
value = 40

[state -1]
type = varset
trigger1 = var(59) = 1
trigger1 = (p2movetype = a) && (p2statetype != a) && (enemy, numproj >= 1)
trigger1 = ctrl = 1
v = 3
value = 1


[State -1, Inteligencia]
type = VarSet
trigger1  = command = "CPU1"
trigger2  = command = "CPU2"
trigger3  = command = "CPU3"
trigger4  = command = "CPU4"
trigger5  = command = "CPU5"
trigger6  = command = "CPU6"
trigger7  = command = "CPU7"
trigger8  = command = "CPU8"
trigger9  = command = "CPU9"
trigger10  = command = "CPU10"
trigger11  = command = "CPU11"
trigger12  = command = "CPU12"
trigger13  = command = "CPU13"
trigger14  = command = "CPU14"
trigger15  = command = "CPU15"
trigger16  = command = "CPU16"
trigger17  = command = "CPU17"
trigger18  = command = "CPU18"
v = 59
value = 1


[state -1]
type = changestate
value = 0
triggerall = var(59) = 1
triggerall = roundstate = 3
trigger1 = statetype != a
trigger1 = ctrl



;ground combo 0--------------------------------------------------
;"CPU1"
[state -1,1]
type = changestate
value = 200
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = ctrl = 1
trigger1 = p2bodydist x = [0,15]
trigger1 = random < 50
trigger2 = stateno = 100
trigger2 = p2bodydist x = [0,15]
trigger2 = random < 50

[state -1]
type = changestate
value = 201
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 200
trigger1 = movecontact

[state -1]
type = changestate
value = 232
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 201
trigger1 = movecontact

[state -1]
type = changestate
value = 212
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 232
trigger1 = movecontact



[state -1,2]
type = changestate
value = 1501
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
trigger1 = (Movehit)
trigger1 = stateno = 212
trigger1 = movecontact
trigger1 = p2bodydist x < 50
trigger2 = p2bodydist x = [0,50]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 100;1513
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
;trigger1 = (Movehit)
trigger1 = stateno = 212
trigger1 = movecontact
trigger1 = p2bodydist x < 80
trigger2 = p2bodydist x = [0,80]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 702
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = power >= 1000
trigger1 = (Movehit)
trigger1 = stateno = 1502
trigger1 = movecontact
trigger1 = p2bodydist x < 50
trigger2 = p2bodydist x = [0,50]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 702
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = power >= 1000
trigger1 = (Movehit)
trigger1 = stateno = 1502
trigger1 = movecontact
trigger1 = p2bodydist x < 80
trigger2 = p2bodydist x = [0,80]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl


[state -1,2]
type = changestate
value = 1527
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = power >= 1500
trigger1 = (Movehit)
trigger1 = stateno = 1502
trigger1 = movecontact
trigger1 = p2bodydist x < 100
trigger2 = p2bodydist x = [0,100]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl


[state -1,2]
type = changestate
value = 1527
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = power >= 1500
triggerall = time >10
;trigger1 = (Movehit)
trigger1 = stateno = 212 || stateno = 1526 || stateno = 1500 || stateno = 1502
trigger1 = movecontact
trigger1 = p2bodydist x < 80
trigger2 = p2bodydist x = [0,100]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl


[state -1,2]
type = changestate
value = 1527
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = power >= 1500
triggerall = time >10
trigger1 = (Movehit)
trigger1 = stateno = 212 || stateno = 1500 || stateno = 1502
trigger1 = movecontact
trigger1 = p2bodydist x < 50
trigger2 = p2bodydist x = [0,90]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 15102
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = power >= 1500
triggerall = time >10
;trigger1 = (Movehit)
trigger1 = stateno = 1502 || stateno = 1526
trigger1 = movecontact
trigger1 = p2bodydist x < 200
trigger2 = p2bodydist x = [0,200]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl


[state -1,2]
type = changestate
value = 15102
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = power >= 1500
triggerall = time >5
trigger1 = (Movehit)
trigger1 = stateno = 1502 || stateno = 1526
trigger1 = movecontact
trigger1 = p2bodydist x < 200
trigger2 = p2bodydist x = [0,200]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 703
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = time > 20
trigger1 = (Movehit)
trigger1 = stateno = 702
trigger1 = movecontact
trigger1 = p2bodydist x < 50
trigger2 = p2bodydist x = [0,50]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 703
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = time > 20
trigger1 = (Movehit)
trigger1 = stateno = 702
trigger1 = movecontact
trigger1 = p2bodydist x < 80
trigger2 = p2bodydist x = [0,80]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

;ground combo 1--------------------------------------------------
;"CPU2"
[state -1,1]
type = changestate
value = 230
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = ctrl = 1
trigger1 = p2bodydist x = [0,10]
trigger1 = random < 50
trigger2 = stateno = 100
trigger2 = p2bodydist x = [0,10]
trigger2 = random < 50


[state -1]
type = changestate
value = 231
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 230
trigger1 = movecontact

[state -1]
type = changestate
value = 232
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 231
trigger1 = movecontact

[state -1]
type = changestate
value = 201
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 232
trigger1 = movecontact


[state -1]
type = changestate
value = 202
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 201
trigger1 = movecontact

[state -1]
type = changestate
value = 241
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 232
trigger1 = movecontact

[state -1]
type = changestate
value = 101
triggerall = var(59) = 1 && roundstate =2
triggerall = time > 13
trigger1 = stateno = 241
trigger1 = movecontact

[state -1]
type = changestate
value = 600
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 101
trigger1 = movecontact



;ground combo 2--------------------------------------------------
;"CPU3"
[state -1,1]
type = changestate
value = 210
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = ctrl = 1
trigger1 = p2bodydist x = [0,15]
trigger1 = random < 50
trigger2 = stateno = 100
trigger2 = p2bodydist x = [0,15]
trigger2 = random < 50


[state -1]
type = changestate
value = 211
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 210
trigger1 = movecontact

[state -1]
type = changestate
value = 410
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 211
trigger1 = movecontact


;ground combo 3--------------------------------------------------
;"CPU4"
[state -1,1]
type = changestate
value = 240
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = ctrl = 1
trigger1 = p2bodydist x = [0,15]
trigger1 = random < 50
trigger2 = stateno = 100
trigger2 = p2bodydist x = [0,15]
trigger2 = random < 50


[state -1]
type = changestate
value = 241
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 240
trigger1 = movecontact




;ground combo 4--------------------------------------------------
;"CPU5"
[state -1,1]
type = changestate
value = 230
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = ctrl = 1
trigger1 = p2bodydist x = [0,15]
trigger1 = random < 50
trigger2 = stateno = 100
trigger2 = p2bodydist x = [0,15]
trigger2 = random < 50


[state -1]
type = changestate
value = 210
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 230
trigger1 = movecontact

[state -1]
type = changestate
value = 211
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 210
trigger1 = movecontact

[state -1]
type = changestate
value = 410
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 211
trigger1 = movecontact


[state -1,2]
type = changestate
value = 60
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
;triggerall = power >= 500
;triggerall = time >10
trigger1 = (Movehit)
trigger1 = stateno = 410
trigger1 = movecontact
trigger1 = p2bodydist x < 20
trigger2 = p2bodydist x = [0,40]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 1500
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = power >= 150
triggerall = time >10
trigger1 = stateno = 410
trigger1 = movecontact
trigger1 = p2bodydist x < 30
trigger2 = p2bodydist x = [0,40]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 1508
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = power >= 500
triggerall = time >10
trigger1 = stateno = 1500
trigger1 = movecontact
trigger1 = p2bodydist x < 80
trigger2 = p2bodydist x = [0,80]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 600
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != S
trigger1 = stateno = 60
trigger1 = movecontact
trigger1 = p2bodydist x < 20
trigger2 = p2bodydist x = [0,40]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl


[state -1,2]
type = changestate
value = 600
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != S
trigger1 = stateno = 60
trigger1 = movecontact
trigger1 = p2bodydist x < 30
trigger2 = p2bodydist x = [0,40]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 600
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != S
trigger1 = stateno = 60
trigger1 = movecontact
trigger1 = p2bodydist x < 40
trigger2 = p2bodydist x = [0,50]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 630
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != S
trigger1 = stateno = 600
trigger1 = movecontact
trigger1 = p2bodydist x < 30
trigger2 = p2bodydist x = [0,40]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 610
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != S
trigger1 = stateno = 630
trigger1 = movecontact
trigger1 = p2bodydist x < 30
trigger2 = p2bodydist x = [0,40]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 640
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != S
trigger1 = stateno = 610
trigger1 = movecontact
trigger1 = p2bodydist x < 30
trigger2 = p2bodydist x = [0,40]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 611
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != S
trigger1 = stateno = 640
trigger1 = movecontact
trigger1 = p2bodydist x < 30
trigger2 = p2bodydist x = [0,40]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 611
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != S
trigger1 = stateno = 610
trigger1 = movecontact
trigger1 = p2bodydist x < 30
trigger2 = p2bodydist x = [0,40]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

;ground combo 5--------------------------------------------------
;"CPU6"
[state -1,1]
type = changestate
value = 230
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = ctrl = 1
trigger1 = p2bodydist x = [0,15]
trigger1 = random < 50
trigger2 = stateno = 100
trigger2 = p2bodydist x = [0,15]
trigger2 = random < 50

[state -1]
type = changestate
value = 231
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 230
trigger1 = movecontact

[state -1]
type = changestate
value = 232
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 231
trigger1 = movecontact


[state -1]
type = changestate
value = 232
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 231
trigger1 = movecontact

[state -1]
type = changestate
value = 241
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 232
trigger1 = movecontact

[state -1]
type = changestate
value = 101
triggerall = var(59) = 1 && roundstate =2
triggerall = time > 13
trigger1 = stateno = 241
trigger1 = movecontact

[state -1]
type = changestate
value = 630
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 101
trigger1 = movecontact

[state -1]
type = changestate
value = 640
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 101
trigger1 = movecontact



;ground combo 6--------------------------------------------------

[state -1,1]
type = changestate
value = 100
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = ctrl = 1
trigger1 = p2bodydist x = [0,70]
trigger1 = random < 50
trigger2 = stateno = 0
trigger2 = p2bodydist x = [0,110]
trigger2 = random < 50


[state -1,1]
type = changestate
value = 400
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = ctrl = 1
trigger1 = p2bodydist x = [0,20]
trigger1 = random < 50
trigger2 = stateno = 100
trigger2 = p2bodydist x = [0,20]
trigger2 = random < 50

[state -1]
type = changestate
value = 430
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 400
trigger1 = movecontact


[state -1]
type = changestate
value = 440
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 430
trigger1 = movecontact

[state -1]
type = changestate
value = 410
triggerall = var(59) = 1 && roundstate =2
trigger1 = stateno = 430
trigger1 = movecontact

[state -1,2]
type = changestate
value = 400
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
trigger1 = stateno = 100
;trigger1 = (Movehit)
trigger1 = movecontact
trigger1 = p2bodydist x < 30
trigger2 = p2bodydist x = [0,40]
trigger2 = random < 30 && enemynear, statetype = l
trigger2 = ctrl


[state -1,2]
type = changestate
value = 1526
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = power >= 250
trigger1 = stateno = 210 || stateno = 400|| stateno = 410 || stateno = 430
;trigger1 = (Movehit)
trigger1 = movecontact
trigger1 = p2bodydist x < 30
trigger2 = p2bodydist x = [0,40]
trigger2 = random < 30 && enemynear, statetype = l
trigger2 = ctrl

;-------------------Poderes AI-------------------------------------

[state -1,1]
type = changestate
value = 400
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = ctrl = 1
trigger1 = p2bodydist x = [0,23]
trigger1 = random < 50
trigger2 = stateno = 100
trigger2 = p2bodydist x = [0,23]
trigger2 = random < 50

[state -1,2]
type = changestate
value = 1526
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = power >= 150
trigger1 = stateno = 440
;trigger1 = (Movehit)
trigger1 = movecontact
trigger1 = p2bodydist x < 30
trigger2 = p2bodydist x = [0,50]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 1512
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = power >= 350
trigger1 = stateno = 440
trigger1 = (Movehit)
trigger1 = movecontact
trigger1 = p2bodydist x < 23
trigger2 = p2bodydist x = [0,40]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 1511
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = power >= 150
trigger1 = stateno = 440
;trigger1 = (Movehit)
trigger1 = movecontact
trigger1 = p2bodydist x < 40
trigger2 = p2bodydist x = [0,50]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1,2]
type = changestate
value = 1600
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = power >= 150
trigger1 = stateno = 1511
;trigger1 = (Movehit)
trigger1 = movecontact
trigger1 = p2bodydist x < 23
trigger2 = p2bodydist x = [0,40]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl


[state -1,2]
type = changestate
value = 1502
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != a
triggerall = power >= 250
triggerall = time >10
trigger1 = (Movehit)
trigger1 = stateno = 1504
trigger1 = movecontact
trigger1 = p2bodydist x < 30
trigger2 = p2bodydist x = [0,40]
trigger2 = random < 50 && enemynear, statetype = l
trigger2 = ctrl

[state -1]
type = changestate
value = 701
triggerall = var(59) = 1 && roundstate =2
triggerall = statetype != s
triggerall = power >= 200
triggerall = time >15
;trigger1 = (Movehit)
trigger1 = stateno = 101 || stateno = 241; || stateno = 640; || stateno = 451 || stateno = 210 || stateno = 210
trigger1 = movecontact
trigger1 = random < 50




;-------------------------------AI So golpes ---------------------------------


;CPU00
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >=150
trigger1 = ctrl
trigger1 = random <= 25;10; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 30
trigger1 = p2statetype != A
;trigger2 = (stateno = 0)
value = ifelse (p2bodydist x<30,1504,1504) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<50,1504,1504)
value = ifelse (p2bodydist x<60,15040,15040)

;-----------------------------------------------------------------------------
;CPU1
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 100
trigger1 = ctrl
trigger1 = random <= 25 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 20
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<10,1500,1500) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<20,1500,1500)
;-----------------------------------------------------------------------
;CPU2
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >=250
trigger1 = ctrl
trigger1 = random <= 25;10; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 55
trigger1 = p2statetype != A
;trigger2 = (stateno = 0)
value = ifelse (p2bodydist x<30,1501,1501) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<40,1501,1501)
value = ifelse (p2bodydist x<30,1523,1523) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<40,1523,1523)

;-----------------------------------------------------------------------
;CPU3
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 100
trigger1 = ctrl
trigger1 = random <= 25 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 40
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<10,1511,1511) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<20,1511,1511)
value = ifelse (p2bodydist x<30,1503,1503) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<40,1503,1503)
;-----------------------------------------------------------------------
;CPU4
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >=250
trigger1 = ctrl
trigger1 = random <= 25;10; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 40
trigger1 = p2statetype != A
;trigger2 = (stateno = 0)
value = ifelse (p2bodydist x<30,1513,1513) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<40,1513,1513)

;--------------------------------------------------------------------------
;CPU5
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >=250
trigger1 = ctrl
trigger1 = random <= 25;10; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 70
trigger1 = p2statetype != A
;trigger2 = (stateno = 0)
value = ifelse (p2bodydist x<50,1512,1512) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<70,1512,1512)
value = ifelse (p2bodydist x<90,1512,1512)
value = ifelse (p2bodydist x<50,1526,1526)
;--------------------------------------------------------------------------
;CPU6
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >=150
trigger1 = ctrl
trigger1 = random <= 25;10; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 60
trigger1 = p2statetype != A
;trigger2 = (stateno = 0)
value = ifelse (p2bodydist x<50,1600,1600) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<70,1610,1610)
value = ifelse (p2bodydist x<25,1525,1525)

;--------------------------------------------------------------------------
;CPU7
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >=500
trigger1 = ctrl
trigger1 = random <= 25;10; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 43
trigger1 = p2statetype != A
;trigger2 = (stateno = 0)
value = ifelse (p2bodydist x<40,1504,1504) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<50,15040,15040)
;-------------------------------------------------------------------------
;CPU8
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >=500
trigger1 = ctrl
trigger1 = random <= 25;10; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 60
trigger1 = p2statetype != A
;trigger2 = (stateno = 0)
value = ifelse (p2bodydist x<50,1508,1508) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<60,1508,1508)

;-------------------------------------------------------------------------
;CPU9
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = A && movetype != H
triggerall = power >=150
trigger1 = ctrl
trigger1 = random <= 25;10; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 30
trigger1 = p2statetype != S
;trigger2 = (stateno = 0)
value = ifelse (p2bodydist x<30,701,701) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<50,701,701)
value = ifelse (p2bodydist x<60,701,701)


;-------------------------------------------------------------------------
;CPU10
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = A && movetype != H
triggerall = power >=250
trigger1 = ctrl
trigger1 = random <= 25;10; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 40
trigger1 = p2statetype != S
;trigger2 = (stateno = 0)
value = ifelse (p2bodydist x<30,1515,1515) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<50,1515,1515)
;-------------------------------------------------------------------------
;CPU11
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >=1500
trigger1 = ctrl
trigger1 = random <= 25;10; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 60
trigger1 = p2statetype != A
;trigger2 = (stateno = 0)
value = ifelse (p2bodydist x<40,15102,15102) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<50,15102,15102)
value = ifelse (p2bodydist x<60,1527,1527)
value = ifelse (p2bodydist x<30,1527,1527)
;-------------------------------------------------------------------------
;CPU12
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >=2000
trigger1 = ctrl
trigger1 = random <= 25;10; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 90
trigger1 = p2statetype != A
;trigger2 = (stateno = 0)
value = ifelse (p2bodydist x<90,3000,3000) ;escolhe o golpe a ser executado
;-------------------------------------------------------------------------
;CPU13
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >=2500
trigger1 = ctrl
trigger1 = random <= 25;10; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 35
trigger1 = p2statetype != A
;trigger2 = (stateno = 0)
value = ifelse (p2bodydist x<20,2100,2100) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<30,2100,2100)
value = ifelse (p2bodydist x<40,2100,2100)

;CPU18
[State -1, run/dash]
type=changestate
value=ifelse(command="FF",100,105)
trigger1= var(59)<=0
trigger1= command="FF" || command="BB"
trigger1= roundstate=2 && (stateno!=[100,105]) && statetype=S && ctrl

;CPU19
[State -1, run/dash]
type=changestate
value=ifelse(command="FF",101,115)
trigger1= var(59)<=0
trigger1= command="FF" || command="BB"
trigger1= roundstate=2 && (stateno!=[101,115]) && statetype=A && ctrl

;-----------------------ESPECIAIS-----------------------------------

[State -1, H1]
type = ChangeState
value = 2100
triggerall = command = "vaimorrer"
triggerall = power >= 2500
triggerall = var(59) != 1
trigger1 = statetype != A
trigger1 = ctrl

[State -1, Bomba al P2]
type = ChangeState
value = 702
triggerall = command = "EMPLANTE PLANTA P2"
triggerall = Var(3) = 0
triggerall = numhelper(2590) = 0
triggerall = power >= 500
trigger1 = ctrl = 1
trigger1 = statetype != A
trigger2 = (stateno = 200) && (movecontact = 1)
trigger3 = (stateno = 201) && (movecontact = 1)
;trigger4 = (stateno = 210) && (movecontact = 1)
trigger5 = (stateno = 230)  && (movecontact = 1)
trigger6 = (stateno = 240)  && (movecontact = 1)
trigger7 = (stateno = 400)  && (movecontact = 1)
trigger8 = (stateno = 410)  && (movecontact = 1)
trigger9 = (stateno = 430)  && (movecontact = 1)
trigger10 = (stateno = 440)  && (movecontact = 1)
trigger11 = (stateno = 310)  && (movecontact = 1)
trigger12 = (stateno = 2000)  && (time > 14)
trigger13 = (stateno = 2001)  && (time > 16)


[State -1, Bomba al P2 - Detonaci]
type = ChangeState
value = 703
triggerall = command = "EMPLANTE PLANTA P20"
triggerall = Var(3) = 0
triggerall = numhelper(2590) = 1 || numhelper(3150) >= 1
trigger1 = ctrl = 1
trigger1 = statetype != A
trigger2 = (stateno = 200) && (movecontact = 1)
trigger3 = (stateno = 201) && (movecontact = 1)
trigger4 = (stateno = 210) && (movecontact = 1)
trigger5 = (stateno = 230)  && (movecontact = 1)
trigger6 = (stateno = 240)  && (movecontact = 1)
trigger7 = (stateno = 400)  && (movecontact = 1)
trigger8 = (stateno = 410)  && (movecontact = 1)
trigger9 = (stateno = 430)  && (movecontact = 1)
trigger10 = (stateno = 440)  && (movecontact = 1)
trigger11 = (stateno = 310)  && (movecontact = 1)
trigger12 = (stateno = 2000)  && (time > 14)
trigger13 = (stateno = 2001)  && (time > 16)


[State -1, ]
type = ChangeState
value = 1527
trigger1 = command = "espRosewhip"
triggerall = power >= 1500
trigger1 = statetype = S
trigger1 = ctrl


[State -1, ]
type = ChangeState
value = 15102
trigger1 = command = "especial01"
triggerall = power >= 1500
trigger1 = statetype = S
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 3000
trigger1 = command = "tornadoespecial"
triggerall = power >= 2000
trigger1 = statetype = S
trigger1 = ctrl


;----------------Golpes Basicos ------------------------------------


[State -1, Run Fwd]
type = ChangeState
value = 100
trigger1 = command = "FF"
trigger1 = statetype = S
trigger1 = ctrl


[State -1, Run Fwd]
type = ChangeState
value = 101
trigger1 = command = "FF"
trigger1 = statetype = A
trigger1 = ctrl

[State -1, Run Back]
type = ChangeState
value = 105
trigger1 = command = "BB"
trigger1 = statetype = S
trigger1 = ctrl

[State -1, Run Back]
type = ChangeState
value = 115
trigger1 = command = "BB"
trigger1 = statetype = A
trigger1 = ctrl

[State -1:Super pulo]
type = ChangeState
value = 60
triggerall = !var(59)&&command = "Superpulo"
trigger1 = (statetype = S) && (ctrl)


; Carregar Energia 01
;[State -1, Power Charge]
;type = ChangeState
;Triggerall = power < 3000
;value = 500
;trigger1 = command = "hold_s"
;trigger1 = statetype != A
;trigger1 = ctrl

[State -1, powercharge]
type=changestate
value=500
trigger1= var(59)<=0
trigger1= command="hold_s"; && command="holdy"
trigger1= roundstate=2 && statetype!=A && ctrl
trigger1= power<const(data.power) && power<powermax && !var(20)

;----------------------GOLPES AERIO -------------------------------

[State -1, rosewhipar]
type = ChangeState
value =  701
trigger1 = command = "rosewhipar"
triggerall = power >= 200
trigger1 = statetype = A
trigger1 = ctrl
triggerall = power >= 100


[State -1, rosewhipar]
type = ChangeState
value = 1515
trigger1 = command = "rosewhipar2"
triggerall = power >= 300
trigger1 = statetype = A
trigger1 = ctrl
triggerall = power >= 100

;----------------- GOLPES NORMAIS ----------------------------------------


[State -1, ]
type = ChangeState
value = 1525
trigger1 = command = "chute"
triggerall = power >= 150
trigger1 = statetype = S
trigger1 = ctrl


[State -1, ]
type = ChangeState
value = 1526
trigger1 = command = "chute2"
triggerall = power >= 250
trigger1 = statetype = S
trigger1 = ctrl


[State -1, ]
type = ChangeState
value = 1503
trigger1 = command = "Tornado"
triggerall = power >= 250
trigger1 = statetype = S
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 1523
trigger1 = command = "Tornado2"
triggerall = power >= 350
trigger1 = statetype = S
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 1500
trigger1 = command = "Rose01"
triggerall = power >= 150
trigger1 = statetype = S
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 1501
trigger1 = command = "rosewhip02"
triggerall = power >= 200
trigger1 = statetype = S
trigger1 = ctrl


[State -1, ]
type = ChangeState
value = 1504
trigger1 = command = "Vegetal"
triggerall = power >= 500
trigger1 = statetype = S
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 15040
trigger1 = command = "Vegetal2"
triggerall = power >= 500
trigger1 = statetype = S
trigger1 = ctrl

[State -1, Poison ]
type = ChangeState
Triggerall = numhelper(1250) = 0
Triggerall = numhelper(1290) = 0
Triggerall = power >= 500
value = 1508
triggerall = command = "Poison Needles"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = movecontact && (stateno = 200||stateno = 300||stateno = 310||stateno = 400||stateno = 410||stateno = 210||stateno = 205)
trigger3 = time >= 45 && (stateno = 320||(stateno = 1400 && ifelse(var(2) = 1,time >= 55,time >= 45)))
trigger4 = time >= 25 && (stateno = 420)
trigger5 = time >= 55 && (stateno = 3200 && !movecontact)
trigger6 = time >= 40 && (stateno = 1200)
trigger7 = time >= 80 && (stateno = 1300)||time >= 50 && (stateno =1050 )

[State -1, Poison ]
type = ChangeState
Triggerall = numhelper(1250) = 0
Triggerall = numhelper(1290) = 0
Triggerall = power >= 500
value = 1514
triggerall = command = "Poison Needles2"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = movecontact && (stateno = 200||stateno = 300||stateno = 310||stateno = 400||stateno = 410||stateno = 210||stateno = 205)
trigger3 = time >= 45 && (stateno = 320||(stateno = 1400 && ifelse(var(2) = 1,time >= 55,time >= 45)))
trigger4 = time >= 25 && (stateno = 420)
trigger5 = time >= 55 && (stateno = 3200 && !movecontact)
trigger6 = time >= 40 && (stateno = 1200)
trigger7 = time >= 80 && (stateno = 1300)||time >= 50 && (stateno =1050 )

[State -1, ]
type = ChangeState
value = 1511
trigger1 = command = "rosewhip03"
triggerall = power >= 150
trigger1 = statetype = S
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 1513
triggerall = command = "rosewhip04"
trigger1 = statetype = S
triggerall = power >= 250
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 1512
trigger1 = command = "plantpe"
triggerall = power >= 350
trigger1 = statetype = S
trigger1 = ctrl


[State -1]
type = changestate
value = 1600
triggerall = Var(59) != 1
triggerall = statetype != A && command = "plant mines_L"
triggerall = power >= 150
trigger1 = ctrl = 1 || (stateno = 100 && time >= 3)
trigger2 = (stateno=[200,210]) || (stateno=[220,240]) || (stateno=[400,700])
trigger2 = movecontact
trigger3 = (stateno=[900,999]) && movecontact


[State -1]
type = changestate
value = 1610
triggerall = Var(59) != 1
triggerall = statetype != A && command = "plant mines_H"
triggerall = power >= 150
trigger1 = ctrl = 1 || (stateno = 100 && time >= 3)
trigger2 = (stateno=[200,210]) || (stateno=[220,240]) || (stateno=[400,700])
trigger2 = movecontact
trigger3 = (stateno=[900,999]) && movecontact


;---------------------------Combos M-------------------------------------

[State -1]
type = ChangeState
value = 230
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 200
triggerall = movecontact = 1
trigger1 = statetype = S

[State -1]
type = ChangeState
value = 240
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 230
triggerall = movecontact = 1
trigger1 = statetype = S


[State -1]
type = ChangeState
value = 210
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 230
triggerall = movecontact = 1
trigger1 = statetype = S

[State -1]
type = ChangeState
value = 211
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 240
triggerall = movecontact = 1
trigger1 = statetype = S



[State -1]
type = ChangeState
value = 240
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 210
triggerall = movecontact = 1
trigger1 = statetype = S

[State -1]
type = ChangeState
value = 202
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 240
triggerall = movecontact = 1
trigger1 = statetype = S


[State -1]
type = ChangeState
value = 410
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = command = "holddown"
triggerall = stateno = 202
triggerall = movecontact = 1
trigger1 = statetype = S

[State -1]
type = ChangeState
value = 410
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = command = "holddown"
triggerall = stateno = 240
triggerall = movecontact = 1
trigger1 = statetype = S


;---------------------------COMBOS -----------------------------------------


[State -1, Stand Light Punch]
type = ChangeState
value = 200
triggerall = command = "x"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno = 200
trigger2 = time > 6

;---------------------------------------------------------------------------

 [State -1]
type = ChangeState
value = 201
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 200
triggerall = movecontact = 1
trigger1 = statetype = S

;---------------------------------------------------------------------------

 [State -1]
type = ChangeState
value = 202
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 201
triggerall = movecontact = 1
trigger1 = statetype = S

;------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 201
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 232
triggerall = movecontact = 1
trigger1 = statetype = S

;-------------------------------------------------------------------------
[State -1]
type = ChangeState
value = 212
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 202
triggerall = movecontact = 1
trigger1 = statetype = S


[State -1]
type = ChangeState
value = 1501
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "rosewhip02"
triggerall = stateno = 202
triggerall = movecontact = 1
trigger1 = statetype = S

;-------------------------------------------------------------------------
[State -1]
type = ChangeState
value = 232
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 201
triggerall = movecontact = 1
trigger1 = statetype = S

;--------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 210
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 201
triggerall = movecontact = 1
trigger1 = statetype = S

;---------------------------------------------------------------------------

;Stand Strong Punch
;立ち強パンチ
[State -1, Stand Strong Punch]
type = ChangeState
value = 210
triggerall = command = "y"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = (stateno = 200) && time > 5
trigger3 = (stateno = 230) && time > 6

;-------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 211
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 210
triggerall = movecontact = 1
trigger1 = statetype = S

;-----------------------------------------------------------------

[State -1]
type = ChangeState
value = 410
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = command = "holddown"
triggerall = stateno = 211
triggerall = movecontact = 1
trigger1 = statetype = S

[State -1]
type = ChangeState
value = 830
triggerall = Var(1) = 0     ;teste
triggerall = alive = 1
triggerall = command = "holdup"
triggerall = stateno = 410
triggerall = movecontact = 1
trigger1 = statetype = S

[State -1]
type = ChangeState
value = 600
triggerall = Var(1) = 0     ;teste
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 830
triggerall = movecontact = 1
trigger1 = statetype = S


[State -1]
type = ChangeState
value = 60
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "Superpulo"
triggerall = stateno = 410
triggerall = movecontact = 1
trigger1 = statetype = S


;-------------------------------------------------------------------------
[State -1]
type = ChangeState
value = 240
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 211
triggerall = movecontact = 1
trigger1 = statetype = S

;-------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 212
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 211
triggerall = movecontact = 1
trigger1 = statetype = S


;------------------------------------------------------------------------


[State -1]
type = ChangeState
value = 202
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 211
triggerall = movecontact = 1
trigger1 = statetype = S



[State -1]
type = ChangeState
value = 702
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "EMPLANTE PLANTA P2"
triggerall = stateno = 1502
triggerall = movecontact = 1
trigger1 = statetype = S


[State -1]
type = ChangeState
value = 702
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "EMPLANTE PLANTA P2"
triggerall = stateno = 1512
triggerall = movecontact = 1
trigger1 = statetype = S

[State -1]
type = ChangeState
value = 703
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "EMPLANTE PLANTA P2"
triggerall = stateno = 702
triggerall = movecontact = 1
trigger1 = statetype = S

;-------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 630
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 213
triggerall = movecontact = 1
trigger1 = statetype = A

;--------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 640
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 213
triggerall = movecontact = 1
trigger1 = statetype = A

;--------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 701
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "rosewhipar"
triggerall = stateno = 640
triggerall = movecontact = 1
trigger1 = statetype = A


;--------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 701
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "rosewhipar"
triggerall = stateno = 610
triggerall = movecontact = 1
trigger1 = statetype = A


[State -1]
type = ChangeState
value = 1515
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "rosewhipar2"
triggerall = stateno = 610
triggerall = movecontact = 1
trigger1 = statetype = A

[State -1]   ;chute ar forte original
type = ChangeState
value = 611
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "SocoChao"
triggerall = stateno = 610
triggerall = movecontact = 1
trigger1 = statetype = A

[State -1]   ;chute ar forte original
type = ChangeState
value = 611
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "SocoChao"
triggerall = stateno = 640
triggerall = movecontact = 1
trigger1 = statetype = A


;---------------------------------------------------------------------------
 ;Stand Light Kick
;立ち弱キック
[State -1, Stand Light Kick]
type = ChangeState
value = 230
triggerall = command = "a"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = (stateno = 200) && time > 7
trigger3 = (stateno = 230) && time > 9

;---------------------------------------------------------------------------

 [State -1]
type = ChangeState
value = 231
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 230
triggerall = movecontact = 1
trigger1 = statetype = S

;-----------------------------------------------------------------------

[State -1]
type = ChangeState
value = 240
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 231
triggerall = movecontact = 1
trigger1 = statetype = S


;------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 210
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 231
triggerall = movecontact = 1
trigger1 = statetype = S

;-------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 232
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 231
triggerall = movecontact = 1
trigger1 = statetype = S

;-------------------------------------------------------------------------
[State -1]
type = ChangeState
value = 212
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 232
triggerall = movecontact = 1
trigger1 = statetype = S




;-------------------------------------------------------------------------
[State -1]
type = ChangeState
value = 241
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 232
triggerall = movecontact = 1
trigger1 = statetype = S


;---------------------------------------------------------------------------
;Standing Strong Kick
;立ち強キック
[State -1, Standing Strong Kick]
type = ChangeState
value = 240
triggerall = command = "b"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = (stateno = 200) && time > 5
trigger3 = (stateno = 230) && time > 6

;-------------------------------------------------------------------------


[State -1]
type = ChangeState
value = 241
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 240
triggerall = movecontact = 1
trigger1 = statetype = S


;---------------------------------------------------------------------------
;Taunt
;挑発
[State -1, Taunt]
type = ChangeState
value = 195
triggerall = command = "start"
trigger1 = statetype != A
trigger1 = ctrl

;---------------------------------------------------------------------------
;Soco fracp aga original
;しゃがみ弱パンチ
[State -1, Crouching Light Punch]
type = ChangeState
value = 400
triggerall = command = "x"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;---------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 430
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 400
triggerall = movecontact = 1
trigger1 = statetype = A


;--------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 410
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 400
triggerall = movecontact = 1
trigger1 = statetype = A
;---------------------------------------------------------------------------


[State -1]
type = ChangeState
value = 440
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 400
triggerall = movecontact = 1
trigger1 = statetype = A

[State -1]
type = ChangeState
value = 440
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 430
triggerall = movecontact = 1
trigger1 = statetype = A

;---------------------------------------------------------------------------
;Soco aga forte original
;しゃがみ強パンチ
[State -1, Crouching Strong Punch]
type = ChangeState
value = 410
triggerall = command = "y"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;----------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 440
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 410
triggerall = movecontact = 1
trigger1 = statetype = C


;---------------------------------------------------------------------------


[State -1]
type = ChangeState
value = 440
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 410
triggerall = movecontact = 1
trigger1 = statetype = A

;---------------------------------------------------------------------------


[State -1]
type = ChangeState
value = 400
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 410
triggerall = movecontact = 1
trigger1 = statetype = A


;---------------------------------------------------------------------------
;chute aga fraco original
;しゃがみ弱キック
[State -1, Crouching Light Kick]
type = ChangeState
value = 430
triggerall = command = "a"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl



;----------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 400
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 430
triggerall = movecontact = 1
trigger1 = statetype = C

;----------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 240
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 430
triggerall = movecontact = 1
trigger1 = statetype = A

;----------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 410
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 430
triggerall = movecontact = 1
trigger1 = statetype = C

;---------------------------------------------------------------------------


[State -1]
type = ChangeState
value = 410
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 430
triggerall = movecontact = 1
trigger1 = statetype = C



;---------------------------------------------------------------------------
[State -1]
type = ChangeState
value = 400
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 430
triggerall = movecontact = 1
trigger1 = statetype = A

;-----------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 410
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 430
triggerall = movecontact = 1
trigger1 = statetype = A


;---------------------------------------------------------------------------
;Crouching Strong Kick
;しゃがみ強キック
[State -1, Crouching Strong Kick]
type = ChangeState
value = 440
triggerall = command = "b"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = (stateno = 400) || (stateno = 430)
trigger2 = (time > 9) || (movecontact && time > 5)

;---------------------------------------------------------------------------
;soco ar fraco original
;空中弱パンチ
[State -1, Jump Light Punch]
type = ChangeState
value = 600
triggerall = command = "x"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 630
trigger2 = statetime >= 7

[State -1, ]
type             = ChangeState
value            = 600
triggerall       = Command="z"
trigger1         = statetype = A
trigger1         = ctrl
trigger2         = stateno = 301 && movecontact
trigger3         = stateno = 302 && movecontact
trigger4         = stateno = 303 && movecontact

;---------------------------------------------------------------------------
[State -1]
type = ChangeState
value = 630
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 600
triggerall = movecontact = 1
trigger1 = statetype = A

;---------------------------------------------------------------------------
;Soco ar forte original
[State -1, Jump Strong Punch]
type = ChangeState
value = 610
triggerall = command = "y"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 || stateno = 630 ;jump_x or jump_a
trigger2 = movecontact

;-------------------------------------------------------------------------

[State -1]   ;chute ar forte original
type = ChangeState
value = 640
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 610
triggerall = movecontact = 1
trigger1 = statetype = A

[State -1]
type = ChangeState
value = 1515
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "rosewhipar2"
triggerall = stateno = 640
triggerall = movecontact = 1
trigger1 = statetype = A

;--------------------------------------------------------------------------

 [State -1]
type = ChangeState
value = 630
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 640
triggerall = movecontact = 1
trigger1 = statetype = A

;--------------------------------------------------------------------------

 [State -1]     ; chute ar fraco original
type = ChangeState
value = 630
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 610
triggerall = movecontact = 1
trigger1 = statetype = A


;-------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 600
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 630
triggerall = movecontact = 1
trigger1 = statetype = A

;--------------------------------------------------------------------------


 [State -1]
type = ChangeState
value = 640
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 630
triggerall = movecontact = 1
trigger1 = statetype = A



;---------------------------------------------------------------------------
;Jump Light Kick
[State -1, Jump Light Kick]
type = ChangeState
value = 630
triggerall = command = "a"
trigger1 = statetype = A
trigger1 = ctrl

;---------------------------------------------------------------------------
;Jump Strong Kick
;空中強キック
[State -1, Jump Strong Kick]
type = ChangeState
value = 640
triggerall = command = "b"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 || stateno = 630 ;jump_x or jump_a
trigger2 = movecontact

;---------------Especiais --------------------------------------





