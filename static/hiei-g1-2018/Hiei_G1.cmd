
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




;-| Default Values |-------------------------------------------------------

]
; Default value for the "time" parameter of a Command. Minimum 1.
; Default value for the "buffer.time" parameter of a Command. Minimum 1,
; maximum 30.


;-| Super Motions |--------------------------------------------------------
;The following two have the same name, but different motion.
;Either one will be detected by a "command = TripleKFPalm" trigger.
;Time is set to 20 (instead of default of 15) to make the move
;easier to do.
;


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
command = F,B,F,B,B,U,B,B,U,D,U
time = 1


[Command]
name = "CPU9"
command = F,B,F,B,B,U,B,B,U,D,U
time = 1

[Command]
name = "CPU10"
command = F,B,F,B,B,U,B,B,U,D,U
time = 1

[Command]
name = "CPU11"
command = F,B,F,B,B,U,B,B,U,D,U
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
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,B,DF,D
time = 1

[Command]
name = "CPU18"
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,B,DF,F
time = 1

[Command]
name = "CPU19"
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,B,DF,F,x
time = 1


[Command]
name = "CPU20"
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,B,DF,F,x
time = 1


[Command]
name = "CPU21"
command = F,B,F,U,B,F,B,F,U,D,U,B,F,D,B,DF,F,x
time = 1



;----------------movimentos hiei ---------------------------------------


[command]
name = "tele01"
command = F,x+a
time = 15
;command.buffer.time = 1

[command]
name = "tele02"
command = B,x+a
time = 15

[Command]
name = "zanzou(y)"
command = D, DB, B, a
time = 30

[Command]
name = "zanzou(b)"
command =  D, DB,B, b
time = 30

[command]
name = "espadaAR"
command = D,y
time = 10

[command]
name = "espada01"
command = D,DB,B,x
time = 30

[command]
name = "espada03"
command = D,DB,B,y
time = 30

[command]
name = "espada04"
command = D,DB,B,x ;~F, D, DF, x; hory
time = 15

[command]
name = "espada05"
command = D,DB,B,y ;~F, D, DF, x; hory
time = 15

[Command]
name = "Multiplos Chutes"
command = ~D, DF, F, b
time = 15

[Command]
name="CorteRapidoFrente"
command=~D,DF,F,x
time=15

[Command]
name="CorteRapidoFrente1"
command= D,DF,F,y
time=15

[Command]
name="projchamas"
command= ~30$B, $F, y
time=15

[Command]
name="projchamas1"
command= ~30$B, $F, x
time=15

[Command]
name="ChuteRapidoAR"
command= D,DF,F,b 
time=15

[Command]
name="ChuteRapidoAR1"
command= D,DF,F,a
time=15


[Command]
name = "charge"
command = /y

[Command]
name = "charge 1"
command = /b

[Command]
name = "Superpulo"
command = ~D, U
time = 20

[Command]
name = "Superpulo"
command = ~D, UF
time = 25

[Command]
name = "Superpulo"
command = ~D, UB
time = 25

[Command]
name = "SocoChao"
command = y+b
time = 25


[Command]
name = "hold_s"
command = /z
time = 1



;-------------------especiais -----------------------------------------------------------------

[command]
name = "corte"
command = D,DF,F,D,DF,F,x
time = 25

[Command]
name = "dra"
command = D,DF,F,D,DF,F,y
time = 25

[Command]
name = "maximozanzou"
command = D,DF,F,D,DF,F,b
time = 25

[Command]
name="DR"
command=  D, DF, F, D, DF, F, y+b
time=25

;-----------------------------------------------------------------------


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

;===================|
;--[ Hold Button ]--|
;===================|

[Command]
name = "hold_x"
command = /x
time = 1
[Command]
name = "hold_y"
command = /y
time = 1
[Command]
name = "hold_z"
command = /z
time = 1
[Command]
name = "hold_a"
command = /a
time = 1
[Command]
name = "hold_b"
command = /b
time = 1
[Command]
name = "hold_c"
command = /c
time = 1
[Command]
name = "hold_start"
command = /s
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
trigger18  = command = "CPU20"
trigger19  = command = "CPU21"
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
trigger1 = random <= 5;5 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 30
trigger1 = p2statetype != A
;trigger2 = (stateno = 200)
;trigger3 = (stateno = 210)
value = ifelse (p2bodydist x<30,1700,1700) ;escolhe o golpe a ser executado

;-----------------------------------------------------------------------
;CPU2
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 250
trigger1 = ctrl
trigger1 = random <= 5;10 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 60
trigger1 = p2statetype != A
;trigger2 = (stateno = 200)
;trigger3 = (stateno = 210)
value = ifelse (p2bodydist x<50,900,900) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<80,900,900)
value = ifelse (p2bodydist x<30,900,900)


;-----------------------------------------------------------------------
;CPU3
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 50
trigger1 = ctrl
trigger1 = random <= 5;5 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 50
trigger1 = p2statetype != A
trigger2 = (stateno = 200)
trigger3 = (stateno = 210)
value = ifelse (p2bodydist x<50,702,702) ;escolhe o golpe a ser executado

;-----------------------------------------------------------------------
;CPU4
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 150
trigger1 = ctrl
trigger1 = random <= 5;20 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 40
trigger1 = p2statetype != A
;trigger2 = (stateno = 200)
;trigger3 = (stateno = 210)
value = ifelse (p2bodydist x<25,101,101) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<35,101,101)
value = ifelse (p2bodydist x<40,101,101


-----------------------------------------------------------------------
;CPU5
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 250
trigger1 = ctrl
trigger1 = random <= 5;25; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 40
trigger1 = p2statetype != A
trigger2 = (stateno = 200)
trigger3 = (stateno = 210)
value = ifelse (p2bodydist x<40,1200,1200) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<55,1203,1203)

;------------------------------------------------------------------------

;CPU6
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = A && movetype != H
triggerall = power >= 250
trigger1 = ctrl
trigger1 = random <= 5;30 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 60
trigger1 = p2statetype != S
value = ifelse (p2bodydist x<60,723,723) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<50,723,723)


;CPU7
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 150
trigger1 = ctrl
trigger1 = random <= 5;35 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 70
trigger1 = p2statetype != A
trigger2 = (stateno = 200)
trigger3 = (stateno = 210)
value = ifelse (p2bodydist x<55,1000,1000) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<75,1000,1000)



;CPU8
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 150
trigger1 = ctrl
trigger1 = random <= 5;40 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 40
trigger1 = p2statetype != A
trigger2 = (stateno = 200)
trigger3 = (stateno = 210)
value = ifelse (p2bodydist x<55,1200,1200) ;escolhe o golpe a ser executado


;CPU9
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 250
trigger1 = ctrl
trigger1 = random <= 5;45 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 35
trigger1 = p2statetype != A
trigger2 = (stateno = 200)
trigger3 = (stateno = 210)
value = ifelse (p2bodydist x<35,704,704) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<25,704,704)
value = ifelse (p2bodydist x<20,704,704)

;CPU10
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 250
trigger1 = ctrl
trigger1 = random <= 5;50; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 30
trigger1 = p2statetype != A
trigger2 = (stateno = 200)
trigger3 = (stateno = 210)
value = ifelse (p2bodydist x<30,202,202) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<25,202,202)
value = ifelse (p2bodydist x<20,202,202)

;CPU11
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = A && movetype != H
triggerall = power >= 50
trigger1 = ctrl
trigger1 = random <= 5;55 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 30
trigger1 = p2statetype != S
trigger2 = (stateno = 200)
trigger3 = (stateno = 210)
value = ifelse (p2bodydist x<30,717,717) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<40,717,717)

;CPU12
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 1000
trigger1 = ctrl
trigger1 = random <= 5;60 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 75
trigger1 = p2statetype != A
trigger2 = (stateno = 200)
trigger3 = (stateno = 210)
value = ifelse (p2bodydist x<55,700,700) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<75,700,700)

;CPU13
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 1000
trigger1 = ctrl
trigger1 = random <= 65 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 75
trigger1 = p2statetype != A
trigger2 = (stateno = 200)
trigger3 = (stateno = 210)
value = ifelse (p2bodydist x<55,1002,1002) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<75,1002,1002)
value = ifelse (p2bodydist x<30,1002,1002)

;CPU14
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 2000
trigger1 = ctrl
trigger1 = random <= 5;70 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 75
trigger1 = p2statetype != A
trigger2 = (stateno = 200)
trigger3 = (stateno = 210)
value = ifelse (p2bodydist x<55,3000,3000) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<75,3000,3000)
value = ifelse (p2bodydist x<30,3000,3000)

;CPU15
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
triggerall = power >= 2000
trigger1 = ctrl
trigger1 = random <= 5;75 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 75
trigger1 = p2statetype != A
trigger2 = (stateno = 200)
trigger3 = (stateno = 210)
value = ifelse (p2bodydist x<85,1500,1500) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<75,1500,1500)
value = ifelse (p2bodydist x<65,1500,1500)

;CPU16
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
trigger1 = ctrl
trigger1 = random <= 5;80 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 25
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<15,200,201) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<20,210,212)
value = ifelse (p2bodydist x<20,230,231,232)

;CPU17
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = A && movetype != H
trigger1 = ctrl
trigger1 = random <= 5;85 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 25
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<15,600,610) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<15,600,630,610,640,611)


;CPU18
[State -1, Inteligencia]
type = ChangeState
triggerall = roundstate = 2
triggerall = var(59) != 0
triggerall = statetype = S && movetype != H
trigger1 = ctrl
trigger1 = random <= 5;85 ; quanto maior mais vezes executar golpe
trigger1 = p2bodydist x < 25
trigger1 = p2statetype != A
value = ifelse (p2bodydist x<25,410,830) ;escolhe o golpe a ser executado
value = ifelse (p2bodydist x<25,410,830,600,630,610,640,611)


;CPU19
[State -1, powercharge]
type=changestate
value=500
trigger1= var(59)<=0
trigger1= command= "hold_s"; && command="holdy"
trigger1= roundstate=2 && statetype!=A && ctrl
trigger1= power<const(data.power) && power<powermax && !var(20)
trigger1 = random <= 20
value = ifelse (p2bodydist x<50,500,500)
value = ifelse (p2bodydist x<60,500,500)

;CPU20
[State -1, run/dash]
type=changestate
value=ifelse(command="FF",100,105)
trigger1= var(59)<=0
trigger1= command="FF" || command="BB"
trigger1= roundstate=2 && (stateno!=[100,106]) && statetype=S && ctrl




;--------------------Especial Movies ---------------------------------------


[State -1, ]
type = ChangeState
value = 13000
trigger1 = command = "DR"
triggerall = power >= 3000
trigger1 = statetype = S
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 1002;+((palno=10)*500)
triggerall = !var(0)
triggerall = palno !=12
triggerall = power >= 1000
triggerall = command = "corte"
trigger1 = statetype = S
trigger1 = ctrl 


[State -1,]
type = ChangeState
value = 1500
trigger1 = command = "dra"
triggerall = power >= 2000
trigger1 = statetype = S
trigger1 = ctrl


[State -1, ]
type = ChangeState
value = 3000;+((palno=10)*500)
triggerall = !var(0)
triggerall = palno !=12
triggerall = power >= 1500
triggerall = command = "maximozanzou"
trigger1 = ctrl
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 210 && movecontact
trigger4 = stateno = 220 && movecontact
trigger5 = stateno = 230 && movecontact
trigger6 = stateno = 240 && movecontact
trigger7 = stateno = 250 && movecontact
trigger8 = stateno = 400 && movecontact
trigger9 = stateno = 410 && movecontact
trigger10= stateno = 420 && movecontact
trigger11= stateno = 430 && movecontact
trigger12= stateno = 440 && movecontact
trigger13= stateno = 450 && movecontact
trigger14= stateno = 600 && movecontact
trigger15= stateno = 610 && movecontact
trigger16= stateno = 620 && movecontact
trigger17= stateno = 630 && movecontact
trigger18= stateno = 640 && movecontact
trigger19= stateno = 650 && movecontact


;--------------Golpes  Normais -----------------------------------------------

[State -1, Gram]
type = ChangeState
value = 1700
triggerall = command = "espada01"
triggerall = power >= 200
triggerall = RoundState = 2 && StateType != A
trigger1 = ctrl || StateNo = 40 || StateNo = 52 || (StateNo = [100,101])
trigger2 = var(5)

[State -1, Gram]
type = ChangeState
value = 1701
triggerall = command = "espada03"
triggerall = power >= 250
triggerall = RoundState = 2 && StateType != A
trigger1 = ctrl || StateNo = 40 || StateNo = 52 || (StateNo = [100,101])
trigger2 = var(5)

[State -1, Gram Air]
type = ChangeState
value = 1300
triggerall = command = "espada04" 
triggerall = power >= 200
triggerall = RoundState = 2 && StateType = A
triggerall = var(3)!=[1,2]
trigger1= ctrl && pos y <= -30
trigger2 = var(5)


[State -1, Gram Air]
type = ChangeState
value = 1301
triggerall = command = "espada05" 
triggerall = power >= 250
triggerall = RoundState = 2 && StateType = A
triggerall = var(3)!=[1,2]
trigger1= ctrl && pos y <= -30
trigger2 = var(5)


[State -1, Hiei tele 01]
type = ChangeState
value = 602
trigger1 = command = "tele02"
triggerall = power >= 150
trigger1 = statetype = S
trigger1 = ctrl

[State -1, Hiei tele 01]
type = ChangeState
value = 602
trigger1 = command = "tele02"
triggerall = power >= 150
trigger1 = statetype = A
trigger1 = ctrl


[State -1, Hiei tele 01]
type = ChangeState
value = 702
trigger1 = command = "tele01"
triggerall = power >= 150
trigger1 = statetype = S
trigger1 = ctrl

[State -1, Hiei tele 01]
type = ChangeState
value = 702
trigger1 = command = "tele01"
triggerall = power >= 150
trigger1 = statetype = A
trigger1 = ctrl

[State -1, espadaAR]
type = ChangeState
value = 703
triggerall = command = "espadaAR"
TriggerAll = var(30) != 1
trigger1 = statetype = A
trigger1 = ctrl

[State -1, zanzou(b)]
type = ChangeState
value = 704
triggerall = command = "zanzou(b)"
triggerall = power >= 350
TriggerAll = var(30) != 1
trigger1 = statetype != A
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




;----------------trava ar -------------------------------------------------
[State -1, zanzou(y)]
type = ChangeState
value = 708
triggerall = command = "zanzou(y)"
triggerall = power >= 200
TriggerAll = var(30) != 1
trigger1 = statetype != A
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


[State -1, Air Kick Combo]
type = ChangeState
value = 723
triggerall = command = "Multiplos Chutes"
triggerall = power >= 350
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = (stateno = 600)  && (movecontact = 1)
trigger3 = (stateno = 610)  && (movecontact = 1)
trigger4 = (stateno = 630)  && (movecontact = 1)
trigger5 = (stateno = 640)  && (movecontact = 1)
trigger6 = (stateno = 615)  && (movecontact = 1)
trigger7 = (stateno = 1100) && (movecontact = 1)


[State -1, ]
type = ChangeState
value = 900
trigger1 = command = "projchamas"
triggerall = power >= 250
trigger1 = statetype = S
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 902
trigger1 = command = "projchamas1"
triggerall = power >= 150
trigger1 = statetype = S
trigger1 = ctrl

[State -1, ]
type = ChangeState
value = 1200
trigger1 = command = "ChuteRapidoAR"
triggerall = power >= 250
trigger1 = statetype = S
trigger1 = ctrl


[State -1, ]
type = ChangeState
value = 1203
trigger1 = command = "ChuteRapidoAR1"
triggerall = power >= 150
trigger1 = statetype = S
trigger1 = ctrl


[State -1, ]
type = ChangeState
value = 1203
trigger1 = command = "ChuteRapidoAR1"
triggerall = power >= 150
trigger1 = statetype = A
trigger1 = ctrl

[State -1,]
type=ChangeState
value=1600
triggerall=var(59)!=1
triggerall=command="CorteRapidoFrente"
triggerall=statetype!=A
triggerall = power >= 200
trigger1=ctrl||(stateno=100&&animelemtime(2)>1)||stateno=101
trigger2=(stateno=[200,455])&&time>4&&movecontact&&!var(30)||(stateno=1300||stateno=4000)&&time>4&&movecontact&&!var(30)
trigger3=var(50)&&movecontact
ignorehitpause=0

[State -1, ]
type = ChangeState
value = 1607
trigger1 = command = "CorteRapidoFrente1"
triggerall = power >= 250
trigger1 = statetype = S
trigger1 = ctrl


;[State -1, Lela Mutsube]
;type = changestate
;value = 1607
;triggerall = !AIlevel
;triggerall = command = "teste"
;triggerall = roundstate = 2 && statetype != A
;trigger1 = ctrl || stateno = 40 || stateno = 52 || (stateno = [100, 101])
;trigger2 = var(7)







;-----------------------MovimentosNormais ---------------------------------

[State -1, correndo traz ar]
type = ChangeState
value = 115
trigger1 = command = "BB"
trigger1 = statetype = A
trigger1 = ctrl


[State -1, correndo frente ar]
type = ChangeState
value = 102
trigger1 = command = "FF"
trigger1 = statetype = A
trigger1 = ctrl

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


[State -1:Super pulo]
type = ChangeState
value = 60
triggerall = !var(59)&&command = "Superpulo"
trigger1 = (statetype = S) && (ctrl)

; Carregar Energia 01
[State -1, powercharge]
type=changestate
value=500
trigger1= var(59)<=0
trigger1= command="hold_s"; && command="holdy"
trigger1= roundstate=2 && statetype!=A && ctrl
trigger1= power<const(data.power) && power<powermax && !var(20)

;---------------------------------------------------------------------------
;Kung Fu Throw
;“Š‚°
[State -1, Kung Fu Throw]
type = ChangeState
value = 800
triggerall = command = "y"
triggerall = statetype = S
triggerall = ctrl
triggerall = stateno != 100
trigger1 = command = "holdfwd"
trigger1 = p2bodydist X < 3
trigger1 = (p2statetype = S) || (p2statetype = C)
trigger1 = p2movetype != H
trigger2 = command = "holdback"
trigger2 = p2bodydist X < 5
trigger2 = (p2statetype = S) || (p2statetype = C)
trigger2 = p2movetype != H



;------------combos marvel---------------------------------------------------

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
value = 240
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 210
triggerall = movecontact = 1
trigger1 = statetype = S

[State -1]
type = ChangeState
value = 1000
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 202
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
value = 212
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 202
triggerall = movecontact = 1
trigger1 = statetype = S



;---------------------------------------------------------------------------
[State -1,Varios socos 200]
type             = ChangeState
value            = 200
triggerall       = Command="x"
trigger1         = statetype = S
trigger1         = ctrl
trigger2         = stateno = 301 && movecontact
trigger3         = stateno = 302 && movecontact
trigger4         = stateno = 303 && movecontact


[State -1, varios socos 202]
type             = ChangeState
value            = 202
triggerall       = Command="x"
trigger1         = statetype = S
trigger1         = ctrl = 1
trigger2         = (stateno = 200) && (Time > 5) && (PrevStateNo != 202)
;-----------------------------------------------------------------------

[State -1]
type = ChangeState
value = 1001
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 717
triggerall = movecontact = 1
trigger1 = statetype = A



[State -1]
type = ChangeState
value = 717
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 630
triggerall = movecontact = 1
trigger1 = statetype = A


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


;---------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 232
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 202
triggerall = movecontact = 1
trigger1 = statetype = S


;---------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 212
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 202
triggerall = movecontact = 1
trigger1 = statetype = S

;---------------------------------------------------------------------------
[State -1]
type = ChangeState
value = 212
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 201
triggerall = movecontact = 1
trigger1 = statetype = S

;---------------------------------------------------------------------------
[State -1]
type = ChangeState
value = 230
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 201
triggerall = movecontact = 1
trigger1 = statetype = S

;--------------------------------------------------------------------------
[State -1]
type = ChangeState
value = 231
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 230
triggerall = movecontact = 1
trigger1 = statetype = S

;-------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 242
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 231
triggerall = movecontact = 1
trigger1 = statetype = S


;--------------------------------------------------------------------------
[State -1]
type = ChangeState
value = 232
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 231
triggerall = movecontact = 1
trigger1 = statetype = S

;--------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 212
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 231
triggerall = movecontact = 1
trigger1 = statetype = S

;---------------------------------------------------------------------------
;Stand Strong Punch
;—§‚¿‹­ƒpƒ“ƒ`
[State -1, Stand Strong Punch]
type = ChangeState
value = 210
triggerall = command = "y"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = (stateno = 200) && time > 5
trigger3 = (stateno = 230) && time > 6

;------------------soco forte meio-----------------------------------------

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
value = 60
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "Superpulo"
triggerall = stateno = 410
triggerall = movecontact = 1
trigger1 = statetype = S

;-----------------------------espada01--------------------------------------

[State -1]
type = ChangeState
value = 701
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = power >= 50
triggerall = command = "espada01"
triggerall = stateno = 211
triggerall = movecontact = 1
trigger1 = statetype = S


;---------------------------------------------------------------------------

[State -1, zanzou(b)_AI]
type = ChangeState
value = 704
triggerall = power >= 250
triggerall = var(30) = 1
trigger1 = var(31) = [251,450]
trigger1 = statetype != A
trigger1 = ctrl
trigger1 = P2MoveType = A
trigger1 = P2BodyDist X <= 50
trigger1 = life > 250


;-----------soco forte 03 --------------------------------------------------

[State -1]
type = ChangeState
value = 212
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 211
triggerall = movecontact = 1
trigger1 = statetype = S

;--------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 202
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 211
triggerall = movecontact = 1
trigger1 = statetype = S

;---------------------------------------------------------------------------
;Stand Light Kick
;—§‚¿ŽãƒLƒbƒN
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
;Standing Strong Kick
;—§‚¿‹­ƒLƒbƒN
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
;’§”­
[State -1, Taunt]
type = ChangeState
value = 195
triggerall = command = "start"
trigger1 = statetype != A
trigger1 = ctrl

;---------------------------------------------------------------------------
;Crouching Light Punch
;‚µ‚á‚ª‚ÝŽãƒpƒ“ƒ`
[State -1, Crouching Light Punch]
type = ChangeState
value = 400
triggerall = command = "x"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl

;---------------------------------------------------------------------------
;Crouching Strong Punch
;‚µ‚á‚ª‚Ý‹­ƒpƒ“ƒ`
[State -1, Crouching Strong Punch]
type = ChangeState
value = 410
triggerall = command = "y"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = (stateno = 400) || (stateno = 430)
trigger2 = (time > 9) || (movecontact && time > 5)

;---------------------------------------------------------------------------
;Crouching Light Kick
;‚µ‚á‚ª‚ÝŽãƒLƒbƒN
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
;‚µ‚á‚ª‚Ý‹­ƒLƒbƒN
[State -1, Crouching Strong Kick]
type = ChangeState
value = 440
triggerall = command = "b"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = (stateno = 400) || (stateno = 430)
trigger2 = (time > 9) || (movecontact && time > 5)

;--------------------------------------------------------------------------
[State -1]
type = ChangeState
value = 241
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 240
triggerall = movecontact = 1
trigger1 = statetype = S

;--------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 242
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "b"
triggerall = stateno = 241
triggerall = movecontact = 1
trigger1 = statetype = S

;---------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 232
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 242
triggerall = movecontact = 1
trigger1 = statetype = S


[State -1]   ;chute ar forte original
type = ChangeState
value = 3000
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "maximozanzou"
triggerall = stateno = 1000
triggerall = movecontact = 1
trigger1 = statetype = S

;--------------------------------------------------------------------------
[State -1, varios socos 202]
type             = ChangeState
value            = 600
triggerall       = Command="x"
trigger1         = statetype = A
trigger1         = ctrl
trigger2         = stateno = 301 && movecontact
trigger3         = stateno = 302 && movecontact
trigger4         = stateno = 303 && movecontact


[State -1, varios socos 202]
type             = ChangeState
value            = 717
triggerall       = Command="x"
trigger1         = statetype = A
trigger1         = ctrl
trigger2         = (stateno = 600) && (Time > 5) && (PrevStateNo != 717)

[State -1]   ;chute ar forte original
type = ChangeState
value = 630
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "a"
triggerall = stateno = 600
triggerall = movecontact = 1
trigger1 = statetype = A

[State -1]   ;chute ar forte original
type = ChangeState
value = 611
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "SocoChao"
triggerall = stateno = 717
triggerall = movecontact = 1
trigger1 = statetype = A

[State -1]   ;chute ar forte original
type = ChangeState
value = 611
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "espadaAR"
triggerall = stateno = 703
triggerall = movecontact = 1
trigger1 = statetype = A


[State -1]   ;chute ar forte original
type = ChangeState
value = 3000
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "maximozanzou"
triggerall = stateno = 1001
triggerall = movecontact = 1
trigger1 = statetype = A


;---------------------------------------------------------------------------


;Jump Strong Punch
[State -1, Jump Strong Punch]
type = ChangeState
value = 610
triggerall = command = "y"
TriggerAll = var(30) != 1
trigger1 = statetype = A
trigger1 = ctrl

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

;------------------------------------------------------------------------------

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


;---------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 610
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 630
triggerall = movecontact = 1
trigger1 = statetype = A

;---------------------------------------------------------------------------
;Jump Strong Kick
;‹ó’†‹­ƒLƒbƒN
[State -1, Jump Strong Kick]
type = ChangeState
value = 640
triggerall = command = "b"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 || stateno = 630 ;jump_x or jump_a
trigger2 = movecontact
trigger3 = stateno = 1350 ;Air blocking

;----------------------------------------------------------------------

[State -1]
type = ChangeState
value = 717
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 610
triggerall = movecontact = 1
trigger1 = statetype = A


;------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 717
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "x"
triggerall = stateno = 640
triggerall = movecontact = 1
trigger1 = statetype = A

;------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 610
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "y"
triggerall = stateno = 640
triggerall = movecontact = 1
trigger1 = statetype = A

;-------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 703
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "espadaAR"
triggerall = stateno = 610
triggerall = movecontact = 1
trigger1 = statetype = A


;-------------------------------------------------------------------------

[State -1]
type = ChangeState
value = 703
triggerall = Var(1) = 0
triggerall = alive = 1
triggerall = command = "espadaAR"
triggerall = stateno = 717
triggerall = movecontact = 1
trigger1 = statetype = A

