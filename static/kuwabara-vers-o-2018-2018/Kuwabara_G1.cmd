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


;----------------------------------------------------------------------


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
command = U,B,F,U,F,F,F,F,U,D,B
time = 1

[Command]
name = "CPU6"
command = U,B,F,U,F,F,F,F,U,D,F,B
time = 1

[Command]
name = "CPU7"
command = U,B,F,U,F,F,F,F,U,D,F,B,D
time = 1

[Command]
name = "CPU8"
command = U,B,F,U,F,F,F,F,U,D,F,B,D,F
time = 1

[Command]
name = "CPU9"
command = U,B,F,U,F,F,F,F,U,D,F,B,D,F,B
time = 1


[Command]
name = "CPU10"
command = U,B,F,U,F,F,F,F,U,D,F,B,D,F,B,F
time = 1

[Command]
name = "CPU11"
command = U,B,F,U,F,F,F,F,U,D,F,B,D,F,B,F,D
time = 1

[Command]
name = "CPU12"
command = U,B,F,U,F,F,F,F,U,D,F,B,D,F,B,F,B
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
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,B,DF,F,a,x
time = 1

[Command]
name = "CPU19"
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,B,DF,F,a,b
time = 1

[Command]
name = "CPU20"
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,B,DF,F,a
time = 1

[Command]
name = "CPU21"
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,B,DF,F,a,a
time = 1

[Command]
name = "CPU2"
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,B,DF,F,a,y
time = 1




;------------------------------------------------------------------------


[command]
name = "leiken1"
command = D,B,y
time = 20

[command]
name = "leiken2"
command = D,B,x
time = 20

[command]
name = "leiken3"
command = D,F,x
time = 15

[command]
name = "leiken4"
command = D,B,x
time = 20

[command]
name = "leiken5"
command = D,DF,F,y
time = 30

[command]
name = "leiken6"
command = D,B, a;~30$B, $F, y
time = 20

[command]
name = "leiken10"
command = D,B, b;~30$B, $F, y
time = 20

[Command]
name = "leiken7"
command = D,B,y
time = 15

[Command]
name = "leiken8"
Command = D,D, a
time = 25

[Command]
name = "leiken9"
Command = D,D, b
time = 25


[Command]
name = "SocoChao"
command = y+b
time = 25

[Command]
name = "esquiva"
command = x+a
time = 25


;[Command]
;name = "devolta"
;command = c
;time=15

[Command]
name = "charge"
command = /y

[Command]
name = "charge 1"
command = /b


[Command]
name = "Superpulo"
command = ~D, U
time = 15

[Command]
name = "Superpulo"
command = ~D, UF
time = 25

[Command]
name = "Superpulo"
command = ~D, UB
time = 25

[Command]
name = "hold_s"
command = /z
time = 1

;-----------------------------especial----------------------------
[command]
name = "yukina"
command = D,B,D,B, x
time = 30


[command]
name = "especial2"
command = D,F,D,F,y
time = 30

[command]
name = "espadaDime"
command = D,F,D,F,x
time = 25

[Command]
name = "KuwadaraYusuke"
command = D,F,DF,F, y+b
time = 34





;[Command]
;name = "D_DF_F_D_DF_F_x+a"
;command = c
;time = 20


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

[Command]
name = "holdy"
command = /y
time = 1

[Command]
name = "holdx"
command = /x
time = 1

[Command]
name = "holda"
command = /a
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

;===========================================================================

;===========================================================================
;---------------------------------------------------------------------------

;=========================================================================


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
trigger19  = command = "CPU19"
trigger20  = command = "CPU20"
trigger21  = command = "CPU21"
v = 59
value = 1



;-----------------------------------------------------------------------
;CPU1
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 150
trigger1 = ctrl
trigger1 = random <= 15 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 35
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<35,701,701) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<40,701,701)


;CPU2
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 250
trigger1 = ctrl
trigger1 = random <= 25 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 35
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<45,700,700) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<50,700,700)


;CPU3
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 150
trigger1 = ctrl
trigger1 = random <= 20 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x <130
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<130,703,703) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<150,703,703)


;CPU4
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 250
trigger1 = ctrl
trigger1 = random <= 21 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x <140
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<140,705,705) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<160,705,705)
value = ifelse (p2bodydist x<170,705,705)


;CPU5
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 250
trigger1 = ctrl
trigger1 = random <= 30 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x <80
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<80,731,731) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<85,731,731)
value = ifelse (p2bodydist x<90,731,731) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<95,731,731)
value = ifelse (p2bodydist x<100,731,731) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<105,731,731)


;CPU6
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 200
trigger1 = ctrl
trigger1 = random <= 23 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x <60
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<40,706,706) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<45,706,706)
value = ifelse (p2bodydist x<50,706,706) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<55,706,706)
value = ifelse (p2bodydist x<60,706,706) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<70,706,706)


;CPU7
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 1000
trigger1 = ctrl
trigger1 = random <= 33 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x <30
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<30,708,708) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<35,708,708)

;CPU8
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 1000
trigger1 = ctrl
trigger1 = random <= 40 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x <40
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<30,3000,3000) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<35,3000,3000)
value = ifelse (p2bodydist x<40,3000,3000) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<45,3000,3000)
value = ifelse (p2bodydist x<50,3000,3000) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<55,3000,3000)
value = ifelse (p2bodydist x<60,3000,3000) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<65,3000,3000)


;CPU9
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 150
trigger1 = ctrl
trigger1 = random <= 100 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x <20
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<10,710,710) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<15,710,710)
value = ifelse (p2bodydist x<20,710,710) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<25,710,710) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<30,710,710)
value = ifelse (p2bodydist x<35,710,710) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<40,710,710) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<45,710,710)
value = ifelse (p2bodydist x<50,710,710) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<55,710,710) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<60,710,710)
value = ifelse (p2bodydist x<65,710,710) ;escolhe o 

;CPU10
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 1500
trigger1 = ctrl
trigger1 = random <= 32 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x <115
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<100,711,711) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<110,711,711)
value = ifelse (p2bodydist x<115,711,711) ;escolhe o golpe a ser executado

;CPU11
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 250
trigger1 = ctrl
trigger1 = random <= 28 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x <50
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<51,1501,1501) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<61,1501,1501)
value = ifelse (p2bodydist x<81,1501,1501) ;escolhe o golpe a ser executado

;CPU12
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = A && movetype != H
triggerall = power >= 250
trigger1 = ctrl
trigger1 = random <= 28 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x <50
trigger1 = p2statetype != S
value = ifelse (p2bodydist x<51,1500,1500) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<61,1500,1500)
value = ifelse (p2bodydist x<81,1500,1500) ;escolhe o golpe a ser executado

;CPU13
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = A && movetype != H
triggerall = power >= 150
trigger1 = ctrl
trigger1 = random <= 32 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x <32
trigger1 = p2statetype != S
value = ifelse (p2bodydist x<32,702,702) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<42,702,702)
value = ifelse (p2bodydist x<52,702,702) ;escolhe o golpe a ser executado

;CPU14
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
trigger1 = ctrl
trigger1 = random <= 60;35 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 20
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<15,200,201) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<20,210,211,212)
value = ifelse (p2bodydist x<20,230,231,232)
value = ifelse (p2bodydist x<10,240,242,243)
value = ifelse (p2bodydist x<250,210,211,203)

;CPU15
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
trigger1 = ctrl
trigger1 = random <= 60;40 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 20
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<20,210,211) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<25,210,211,410)

;CPU16
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = A && movetype != H
trigger1 = ctrl
trigger1 = random <= 60;45 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 20
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<15,600,630) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<15,610,640)
value = ifelse (p2bodydist x<15,640,611)

;CPU17
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
trigger1 = ctrl
trigger1 = random <= 100 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 15
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<10,410,830) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<15,830,600,630,610,640,611)


;CPU18
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 2500
trigger1 = ctrl
trigger1 = random <= 80; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x <65
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<50,3100,3100)
value = ifelse (p2bodydist x<65,3100,3100) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<70,3100,3100)
value = ifelse (p2bodydist x<75,3100,3100) ;escolhe o golpe a ser executado


;CPU19
[State -1, powercharge]
type=changestate
value=500
trigger1= var(59)<=0
trigger1= command= "hold_s"; && command="holdy"
trigger1= roundstate=2 && statetype!=A && ctrl
trigger1= power<const(data.power) && power<powermax && !var(20)
trigger1 = random <= 30
trigger1 = p2bodydist x < 50

;CPU20
[State -1, run/dash]
type=changestate
value=ifelse(command="FF",100,105)
trigger1= var(59)<=0
trigger1= command="FF" || command="BB"
trigger1= roundstate=2 && (stateno!=[100,106]) && statetype=S && ctrl


;--------------------------Especial-----------------------------

[State -1, ]
type = ChangeState
value = 3100
triggerall = command = "KuwadaraYusuke"
trigger1 = statetype = S
triggerall = power >= 2500
trigger1 = ctrl

[State -1]
type = ChangeState
value = 3000
;triggerall = var(59) != 1
;triggerall = RoundState = 2
triggerall = Life <= (LifeMax/4) || Life > (LifeMax/4) && power >= 1500
triggerall = command = "espadaDime"
triggerall = command != "holdy"
triggerall = statetype != A
trigger1 = ctrl || (stateno = 40 && time = 3 || stateno = 100 && time >= 2) || (stateno = 101 && time >= 1)
trigger2 = ((stateno = 6505 || stateno = 6515) && time >= 12) || (stateno = 6530 && movehit)
trigger3 = stateno = 200 && var(58) = [1,2]
trigger3 = movecontact && AnimElemTime(13) < 0
trigger4 = stateno = 210
trigger4 = movecontact && AnimElemTime(15) < 0
trigger5 = stateno = 220
trigger5 = movecontact && AnimElemTime(11) < 0
trigger6 = stateno = 230
trigger6 = movecontact && AnimElemTime(34) < 0
trigger7 = stateno = 250
trigger7 = movecontact && AnimElemTime(23) < 0
trigger8 = stateno = 260 && var(58) = 0
trigger8 = movecontact && AnimElemTime(30) < 0
trigger9 = stateno = 300 && var(58) = [1,2]
trigger9 = movecontact && AnimElemTime(9) < 0
trigger10 = stateno = 310
trigger10 = movecontact && AnimElemTime(33) < 0
trigger11 = stateno = 320 && var(58) = [1,2]
trigger11 = movecontact && AnimElemTime(14) < 0
trigger12 = stateno = 330
trigger12 = movecontact && AnimElemTime(16) < 0
trigger13 = stateno = 500
trigger13 = movecontact && AnimElemTime(21) < 0
trigger14 = stateno = 3400 && movecontact





;-----------------------Golpes--------------------------------------------


[State -1, ]
type = ChangeState
value = 711
trigger1 = command = "especial2"
triggerall = power >= 1500
trigger1 = statetype = S
trigger1 = ctrl


[State -1, ]
type = ChangeState
value = 708
trigger1 = command = "yukina"
triggerall = power >= 1000
trigger1 = statetype = S
trigger1 = ctrl

;------------------------------------------------------------------

[State -1, ]
type = ChangeState
value = 700
trigger1 = command = "leiken1"
triggerall = power >= 150
trigger1 = statetype = S
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 701
trigger1 = command = "leiken2"
triggerall = power >= 150
trigger1 = statetype = S
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 703
trigger1 = command = "leiken3"
triggerall = power >= 150
trigger1 = statetype = S
trigger1 = ctrl


[State -1, ]
type = ChangeState
value = 702
trigger1 = command = "leiken4"
triggerall = power >= 150
trigger1 = statetype = A
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 705
triggerall = command = "leiken5"
trigger1 = statetype = S
triggerall = power >= 250
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 706
trigger1 = command = "leiken6"
triggerall = power >= 250
trigger1 = statetype = S
trigger1 = ctrl


[State -1, ]
type = ChangeState
value = 710
trigger1 = command = "esquiva"
triggerall = power >= 150
trigger1 = statetype = S
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 731
triggerall = command = "leiken8"
trigger1 = statetype = S
triggerall = power >= 300
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 1501
triggerall = command = "leiken9"
trigger1 = statetype = S
triggerall = power >= 250
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 713
trigger1 = command = "leiken10"
triggerall = power >= 250
trigger1 = statetype = S
trigger1 = ctrl

[State -1, "leiken7"]
type = ChangeState
value = 1500
triggerall = command = "leiken7"
triggerall = power >= 250
TriggerAll = var(30) != 1
trigger1 = statetype != S
trigger1 = ctrl
trigger2 = stateno = 200
trigger2 = movecontact
trigger3 = stateno = 210
trigger3 = movecontact
trigger4 = stateno = 230
trigger4 = movecontact
trigger5 = stateno = 240
trigger5 = movecontact
trigger6 = stateno = 400
trigger6 = movecontact
trigger7 = stateno = 410
trigger7 = movecontact
trigger8 = stateno = 430
trigger8 = movecontact
trigger9 = stateno = 440
trigger9 = movecontact
trigger10 = stateno = 220
trigger10 = movecontact
trigger11 = stateno = 250
trigger11 = movecontact
trigger12 = StateNo = 40
trigger13 = StateNo = 11
trigger14 = StateNo = 12


;[State -1, ]
;type = ChangeState
;value = 1100
;triggerall = command = "devolta"
;trigger1 = statetype = S
;triggerall = power >= 250
;trigger1 = ctrl







;----------------------------------------------------------------------------
; Carregar Energia 01
[State -1, powercharge]
type=changestate
value=500
trigger1= var(59)<=0
trigger1= command="hold_s"; && command="holdy"
trigger1= roundstate=2 && statetype!=A && ctrl
trigger1= power<const(data.power) && power<powermax && !var(20)




;---------------------------------------------------------------------------



;Run Fwd
;ダッシュ
[State -1, Run Fwd]
type = ChangeState
value = 100
trigger1 = command = "FF"
trigger1 = statetype = S
trigger1 = ctrl


[State -1, correndo frente ar]
type = ChangeState
value = 102
trigger1 = command = "FF"
trigger1 = statetype = A
trigger1 = ctrl

[State -1, correndo traz ar]
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
;---------------------------------------------------------------------------
;Run Back
;後退ダッシュ
[State -1, Run Back]
type = ChangeState
value = 105
trigger1 = command = "BB"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
;Kung Fu Throw
;投げ
;[State -1, Kung Fu Throw]
;type = ChangeState
;value = 800
;triggerall = command = "y"
;triggerall = statetype = S
;triggerall = ctrl
;triggerall = stateno != 100
;trigger1 = command = "holdfwd"
;trigger1 = p2bodydist X < 3
;trigger1 = (p2statetype = S) || (p2statetype = C)
;trigger1 = p2movetype != H
;trigger2 = command = "holdback"
;trigger2 = p2bodydist X < 5
;trigger2 = (p2statetype = S) || (p2statetype = C)
;trigger2 = p2movetype != H


;---------------------------------------------------------------------------
;Stand Light Punch
;立ち弱パンチ
[State -1, Stand Light Punch]
type = ChangeState
value = 200
triggerall = command = "x"
;triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno = 200
trigger2 = time > 6

;------------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 201
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 200
triggerall = movecontact = 1
trigger1 = statetype = S

[State -1]
type = ChangeState
value = 210
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 201
triggerall = movecontact = 1
trigger1 = statetype = S

[State -1]
type = ChangeState
value = 231
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 201
triggerall = movecontact = 1
trigger1 = statetype = S

;------------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 210
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 200
triggerall = movecontact = 1
trigger1 = statetype = S

;------------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 202
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
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

[State -1]
type = ChangeState
value = 211
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 210
triggerall = movecontact = 1
trigger1 = statetype = S


[State -1]
type = ChangeState
value = 241
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 211
triggerall = movecontact = 1
trigger1 = statetype = S


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
value = 202
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 210
triggerall = movecontact = 1
trigger1 = statetype = S

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


[State -1]
type = ChangeState
value = 232
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 230
triggerall = movecontact = 1
trigger1 = statetype = S

[State -1]
type = ChangeState
value = 231
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 232
triggerall = movecontact = 1
trigger1 = statetype = S


[State -1]
type = ChangeState
value = 240
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 231
triggerall = movecontact = 1
trigger1 = statetype = S


[State -1]
type = ChangeState
value = 241
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 240
triggerall = movecontact = 1
trigger1 = statetype = S




[State -1]
type = ChangeState
value = 200
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 230
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
;Crouching Light Punch
;しゃがみ弱パンチ
[State -1, Crouching Light Punch]
type = ChangeState
value = 400
triggerall = command = "x"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl

;---------------------------------------------------------------------------
;Crouching Strong Punch
;しゃがみ強パンチ
[State -1, Crouching Strong Punch]
type = ChangeState
value = 410
triggerall = command = "y"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = (stateno = 400) || (stateno = 430)
trigger2 = (time > 9) || (movecontact && time > 5)


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

;---------------------------------------------------------------------------
;Crouching Light Kick
;しゃがみ弱キック
[State -1, Crouching Light Kick]
type = ChangeState
value = 430
triggerall = command = "a"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = (stateno = 400) || (stateno = 430)
trigger2 = (time > 9) || (movecontact && time > 5)

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
;Jump Light Punch
;空中弱パンチ
[State -1, Jump Light Punch]
type = ChangeState
value = 600
triggerall = command = "x"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600
trigger2 = statetime >= 7
trigger3 = stateno = 1350 ;Air blocking

[State -1, Jump Light Punch]
type = ChangeState
value = 600
triggerall = command = "z"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600
trigger2 = statetime >= 7
trigger3 = stateno = 1350 ;Air blocking


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
;Jump Strong Punch
[State -1, Jump Strong Punch]
type = ChangeState
value = 610
triggerall = command = "y"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 || stateno = 630 ;jump_x or jump_a
trigger2 = movecontact
trigger3 = stateno = 1350 ;Air blocking


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

[State -1]
type = ChangeState
value = 640
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 610
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
trigger2 = stateno = 1350 ;Air blocking

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
trigger3 = stateno = 1350 ;Air blocking


[State -1]
type = ChangeState
value = 610
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 640
triggerall = movecontact = 1
trigger1 = statetype = A









