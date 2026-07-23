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
;   name = "some_name"
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
;               command = /F, a    ;hold fwd while you press a
;   tilde (~) - to detect key releases
;          egs. command = ~a       ;release the a button
;               command = ~D, F, a ;release down, press fwd, then a
;          If you want to detect "charge moves", you can specify
;          the time the key must be held down for (in game-ticks)
;          egs. command = ~30a     ;hold a for at least 30 ticks, then release
;               command = ~30
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
;   popular fighting games implement their engine.
;
; - time (optional)
;   Time allowed to do the command, given in game-ticks. Defaults to 15
;   if omitted
;
; If you have two or more commands with the same name, all of them will
; work. You can use it to allow multiple motions for the same move.
;
; Some common commands are given below. Delete, add, or modify as you wish.

;-| Super Motions |--------------------------------------------------------
[Command]
name = "transf"
command =~D, DF, F, DF, y
time = 40

[Command]
name = "choque"
command = ~D, DF, F, DF, x
time = 40

[Command]
name = "shock"
command = ~D, DB, B, a

[Command]
name = "firey"
command = ~D, DF, F, a

[Command]
name = "firex"
command = ~D, DF, F, b

[Command]
name = "airfireb"
command = ~D, DF, F, a

[Command]
name = "airfirea"
command = ~D, DF, F, b

[Command]
name = "spike"
command = ~D, DF, F, x

[Command]
name = "spike"
command = ~D, DF, F, y

[Command]
name = "comb"
command = ~D, DB, B, D, DB, y
time = 30

[Command]
name = "kane"
command = ~D, DB, B, D, DB, x
time = 30

[Command]
name = "boat"
command = ~D, DB, B, D, DB, a
time = 30

[Command]
name = "super1"
command = ~D, DF, F, D, DF, a
time = 30

;-| Special Motions |------------------------------------------------------
;-----------------

;--------------------
;Charge_Down_up
[Command]
name = "chargedownup_a"
command = ~60$D, U, a
time = 10

[Command]
name = "chargedownup_b"
command = ~60$D, U, b
time = 10

;--------------------
;Charge_Back_fwd
[Command]
name = "chargebackfwd_a"
command = ~60$B, F, a
time = 10

[Command]
name = "chargebackfwd_b"
command = ~60$B, F, b
time = 10

;-| Double Tap |-----------------------------------------------------------
[Command]
name = "FF";Required (do not remove)
command = F, F
time = 10

[Command]
name = "BB";Required (do not remove)
command = B, B
time = 10

;-| 2/3 Button Combination |-----------------------------------------------
[Command]
name = "recovery";Required (do not remove)
command = a+b
time = 1

;-| Dir + Button |---------------------------------------------------------
[Command]
name = "fwd_a"
command = /F,a
time = 1

[Command]
name = "fwd_b"
command = /F,b
time = 1

[Command]
name = "back_a"
command = /B,a
time = 1

[Command]
name = "back_b"
command = /B,b
time = 1

[Command]
name = "down_a"
command = /$D,a
time = 1

[Command]
name = "down_b"
command = /$D,b
time = 1

[Command]
name = "fwd_ab"
command = /F, a+b
time = 1

[Command]
name = "back_ab"
command = /B, a+b
time = 1

[Command]
name = "fwd_bc"
command = /F, b+c
time = 1

[Command]
name = "back_bc"
command = /B, b+c
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
name = "ct"
command = z
time = 1

[Command]
name = "hold_z"
command = /z
time = 1

[Command]
name= "hold_c"
command= /c
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
name = "holdup";Required (do not remove)
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
;   [State -1]                  ;Don't change this
;   type = ChangeState          ;Don't change this
;   value = new_state_number
;   trigger1 = command = "command_name"
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

;------------------
; TRANSFORMAR
;------------------
[State -1]
type = ChangeState
value = 2000
trigger1 = command = "transf"
trigger1 = power >= 2000
trigger1 = Var(1) = 0
trigger1 = statetype != A
trigger1 = ctrl = 1

;-----------------
;   BEAM
;-----------------
[State -1]
type = ChangeState
value = 3300
triggerall = command = "kane"
triggerall = power = 3000
triggerall = Var(1) > 0
trigger1 = ctrl = 1
trigger1 = statetype = S
trigger2 = statetype != A
trigger3 = stateno = 200
trigger3 = movecontact = 1
trigger4 = stateno = 210
trigger4 = movecontact = 1
trigger5 = stateno = 400
trigger5 = movecontact = 1
trigger6 = stateno = 410
trigger6 = movecontact = 1
trigger7 = stateno = 213
trigger7 = movecontact = 1
trigger8 = stateno = 211
trigger8 = movecontact = 1
trigger9 = stateno = 201
trigger9 = movecontact = 1
trigger10 = stateno = 203
trigger10= movecontact = 1
trigger11 = stateno = 1000
trigger11= movecontact = 1
trigger12 = stateno = 401
trigger12 = movecontact = 1
trigger13 = stateno = 411
trigger13 = movecontact = 1
trigger14 = stateno = 214
trigger14 = movecontact = 1
trigger15 = stateno = 204
trigger15 = movecontact = 1
trigger16 = stateno = 240
trigger16 = movecontact = 1

;-------------------
; BARCO-SGOKU 3
;-------------------
[State -1]
type = ChangeState
value = 2400
triggerall = command = "boat"
triggerall = power >= 1000
triggerall = Var(1) > 0
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = statetype != A
trigger3 = stateno = 200

;-------------------
; Espinho-SGOKU 3
;-------------------
[State -1]
type = ChangeState
value = 2350
triggerall = command = "spike"
triggerall = NumProj = 0
triggerall = Var(1) > 0
trigger1 = statetype = S
trigger1 = ctrl = 1

;-------------------
; FIREBALL-SGOKU 3
;-------------------
;---RAPIDA
[State -1]
type = ChangeState
value = 3200
triggerall = command = "firey"
triggerall = NumProj = 0
triggerall = Var(1) > 0
trigger1 = statetype = S
trigger1 = ctrl = 1

;----LENTA
[State -1]
type = ChangeState
value = 3201
triggerall = command = "firex"
triggerall = NumProj = 0
triggerall = Var(1) > 0
trigger1 = statetype = S
trigger1 = ctrl = 1

;-------------------
; FIREBALL AEREA
;----------------
;------LENTA
[State -1]
type = ChangeState
value = 1400
triggerall = command = "airfireb"
triggerall = NumProj = 0
triggerall = Var(1) > 0
trigger1 = statetype = A
trigger1 = ctrl = 1
trigger2 = movecontact = 1
trigger2 = stateno = 600
trigger3 = movecontact = 1
trigger3 = stateno = 601
trigger4 = movecontact = 1
trigger4 = stateno = 602
trigger5 = movecontact = 1
trigger5 = stateno = 604
trigger6 = movecontact = 1
trigger6 = stateno = 605
trigger7 = movecontact = 1
trigger7 = stateno = 606
trigger8 = movecontact = 1
trigger8 = stateno = 704
trigger9 = movecontact = 1
trigger9 = stateno = 705
trigger10 = movecontact = 1
trigger10 = stateno = 706
trigger11 = stateno = 550
trigger12 = stateno = 800
trigger13 = movecontact = 1
trigger13 = stateno = 3520

;-----RAPIDA
[State -1]
type = ChangeState
value = 1401
triggerall = command = "airfirea"
triggerall = NumProj = 0
triggerall = Var(1) > 0
trigger1 = statetype = A
trigger1 = ctrl = 1
trigger2 = movecontact = 1
trigger2 = stateno = 600
trigger3 = movecontact = 1
trigger3 = stateno = 601
trigger4 = movecontact = 1
trigger4 = stateno = 602
trigger5 = movecontact = 1
trigger5 = stateno = 604
trigger6 = movecontact = 1
trigger6 = stateno = 605
trigger7 = movecontact = 1
trigger7 = stateno = 606
trigger8 = movecontact = 1
trigger8 = stateno = 704
trigger9 = movecontact = 1
trigger9 = stateno = 705
trigger10 = movecontact = 1
trigger10 = stateno = 706
trigger11 = stateno = 550
trigger12 = stateno = 800
trigger13 = movecontact = 1
trigger13 = stateno = 3520


;----------------
; Golpes Normais
;------------------
;-PONTAPE FORTE---LONGE
[State -1]
type = ChangeState
value = 6420
triggerall = command = "x"
triggerall = p2bodydist X > 15
triggerall = Var(1) > 0
trigger1 = statetype = S
trigger1 = ctrl = 1

;--PONTAPE FORTE--BAIXO--
[State -1]
type = ChangeState
value = 452
triggerall = command = "holddown"
triggerall = statetype = C
triggerall = Var(1) > 0
triggerall = ctrl = 1
trigger1 = command = "x"
trigger2 = command = "y"

;--PONTAPE FORTE--PERTO--
[State -1]
type = ChangeState
value = 453
triggerall = p2bodydist X <= 15
triggerall = statetype = S
triggerall = ctrl = 1
triggerall = Var(1) > 0
trigger1 = command = "x"

;--PONTAPE FRACO--LONGE--
[State -1]
type = ChangeState
value = 454
triggerall = command = "y"
triggerall = Var(1) > 0
triggerall = p2bodydist X > 15
trigger1 = statetype = S
trigger1 = ctrl = 1

;--PONTAPE FORTE--PERTO--
[State -1]
type = ChangeState
value = 455
triggerall = p2bodydist X <= 15
triggerall = statetype = S
triggerall = ctrl = 1
triggerall = Var(1) > 0
trigger1 = command = "y"

;--AR--
[State -1]
type = ChangeState
value = 456
triggerall = Var(1) > 0
trigger1 = statetype = A
trigger1 = ctrl = 1
trigger1 = command = "x"
trigger2 = command = "y"

;-------------------
; MURRO FORTE
;-------------------
;--LONGE----
[State -1]
type = ChangeState
value = 460
triggerall = command = "a"
triggerall = p2bodydist X > 15
triggerall = Var(1) > 0
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 200
trigger2 = time >= 7
trigger2 = movecontact = 1

;--BAIXO------
[State -1]
type = ChangeState
value = 462
triggerall = command = "holddown"
triggerall = statetype = C
triggerall = ctrl = 1
triggerall = Var(1) > 0
trigger1 = command = "a"
trigger2 = command = "b"

;--------------------
; MURRO FRACO
;--------------------
;--LONGE------
[State -1]
type = ChangeState
value = 461
triggerall = command = "b"
triggerall = p2bodydist X > 15
triggerall = Var(1) > 0
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 201
trigger2 = time >= 6
trigger2 = movecontact = 1

;--MURRO PERTO--
[State -1]
type = ChangeState
value = 463
triggerall = p2bodydist X <= 15
triggerall = statetype = S
triggerall = ctrl = 1
triggerall = Var(1) > 0
trigger1 = command = "a"
trigger2 = command = "b"

;--AR--
[State -1]
type = ChangeState
value = 464
triggerall = Var(1) > 0
trigger1 = statetype = A
trigger1 = ctrl = 1
trigger1 = command = "a"
trigger2 = command = "b"

;--AGARRAR2-------------
[State -1]
type = ChangeState
value = 913
triggerall = p2bodydist X <= 1
triggerall = Var(1) = 0
trigger1 = command = "ct"
trigger1 = statetype = S
trigger1 = ctrl = 1

;----------------
; SUPER-SHOCK
;---------------
[State -1]
type = ChangeState
value = 3000
triggerall = command = "super1"
triggerall = stateno != 3301
triggerall = stateno != 3306
triggerall = power >= 1000
triggerall = Var(1) = 0
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = statetype != A
trigger3 = stateno = 200
trigger3 = movecontact = 1
trigger4 = stateno = 210
trigger4 = movecontact = 1
trigger5 = stateno = 400
trigger5 = movecontact = 1
trigger6 = stateno = 410
trigger6 = movecontact = 1
trigger7 = stateno = 213
trigger7 = movecontact = 1
trigger8 = stateno = 211
trigger8 = movecontact = 1
trigger9 = stateno = 201
trigger9 = movecontact = 1
trigger10 = stateno = 203
trigger10= movecontact = 1
trigger11 = stateno = 1000
trigger11= movecontact = 1
trigger12 = stateno = 401
trigger12 = movecontact = 1
trigger13 = stateno = 411
trigger13 = movecontact = 1
trigger14 = stateno = 214
trigger14 = movecontact = 1
trigger15 = stateno = 204
trigger15 = movecontact = 1
trigger16 = stateno = 240
trigger16 = movecontact = 1

;-----------------
; CIRCULO-DE-FOGO
;-----------------
[State -1]
type = ChangeState
value = 1500
triggerall = command = "kane"
triggerall = power >= 2000
triggerall = Var(1) = 0
trigger1 = ctrl = 1
trigger1 = statetype = S
trigger2 = statetype != A
trigger3 = stateno = 200
trigger3 = movecontact = 1
trigger4 = stateno = 210
trigger4 = movecontact = 1
trigger5 = stateno = 400
trigger5 = movecontact = 1
trigger6 = stateno = 410
trigger6 = movecontact = 1
trigger7 = stateno = 213
trigger7 = movecontact = 1
trigger8 = stateno = 211
trigger8 = movecontact = 1
trigger9 = stateno = 201
trigger9 = movecontact = 1
trigger10 = stateno = 203
trigger10= movecontact = 1
trigger11 = stateno = 1000
trigger11= movecontact = 1
trigger12 = stateno = 401
trigger12 = movecontact = 1
trigger13 = stateno = 411
trigger13 = movecontact = 1
trigger14 = stateno = 214
trigger14 = movecontact = 1
trigger15 = stateno = 204
trigger15 = movecontact = 1
trigger16 = stateno = 240
trigger16 = movecontact = 1

;-----------------
; COMBINAÇÃO
;-----------------
[State -1]
type = ChangeState
value = 1510
triggerall = command = "comb"
triggerall = power >= 1000
triggerall = Var(1) = 0
trigger1 = ctrl = 1
trigger1 = statetype = S
trigger2 = statetype != A
trigger3 = stateno = 200
trigger3 = movecontact = 1
trigger4 = stateno = 210
trigger4 = movecontact = 1
trigger5 = stateno = 400
trigger5 = movecontact = 1
trigger6 = stateno = 410
trigger6 = movecontact = 1
trigger7 = stateno = 213
trigger7 = movecontact = 1
trigger8 = stateno = 211
trigger8 = movecontact = 1
trigger9 = stateno = 201
trigger9 = movecontact = 1
trigger10 = stateno = 203
trigger10= movecontact = 1
trigger11 = stateno = 1000
trigger11= movecontact = 1
trigger12 = stateno = 401
trigger12 = movecontact = 1
trigger13 = stateno = 411
trigger13 = movecontact = 1
trigger14 = stateno = 214
trigger14 = movecontact = 1
trigger15 = stateno = 204
trigger15 = movecontact = 1
trigger16 = stateno = 240
trigger16 = movecontact = 1

;----------------
; OMBRO ATAQUE
;----------------
[State -1]
type = ChangeState
value = 1520
triggerall = statetype = S
triggerall = command = "choque"
triggerall = Var(1) = 0
trigger1 = ctrl = 1

;-----------------
; SHOCK
;-----------------
[State -1]
type = ChangeState
value = 1100
triggerall = statetype = S
triggerall = command = "shock"
triggerall = Var(1) = 0
trigger1 = ctrl = 1

;-------------------
; FIREBALL-SGOKU 1
;-------------------
;---RAPIDA
[State -1]
type = ChangeState
value = 1600
triggerall = command = "firey"
triggerall = NumProj = 0
triggerall = Var(1) = 0
trigger1 = statetype = S
trigger1 = ctrl = 1

;----LENTA
[State -1]
type = ChangeState
value = 1601
triggerall = command = "firex"
triggerall = NumProj = 0
triggerall = Var(1) = 0
trigger1 = statetype = S
trigger1 = ctrl = 1

;--------------
; CARREGAR
;--------------
[State -1]
type = ChangeState
value = 700
trigger1 = command = "hold_z"
trigger1 = command = "hold_c"
trigger1 = power < 3000
trigger1 = statetype = S
trigger1 = ctrl = 1

;--CORRER FRENTE
[State -1]
type = ChangeState
value = 100
trigger1 = command = "FF"
trigger1 = statetype = S
trigger1 = ctrl = 1

;--CORRER TRAS
[State -1]
type = ChangeState
value = 105
trigger1 = command = "BB"
trigger1 = statetype = S
trigger1 = ctrl = 1

;-------------------
; MURRO FORTE
;-------------------
;--NORMAL----
[State -1]
type = ChangeState
value = 200
triggerall = command = "a"
triggerall = command != "holddown"
triggerall = Var(1) = 0
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 200
trigger2 = time >= 7
trigger2 = movecontact = 1

;--BAIXO------
[State -1]
type = ChangeState
value = 400
triggerall = command = "holddown"
triggerall = statetype = C
triggerall = ctrl = 1
triggerall = Var(1) = 0
trigger1 = command = "a"
trigger2 = command = "b"

;---SALTO---------
[State -1]
type = ChangeState
value = 600
trigger1 = command = "a"
triggerall = statetype = A
triggerall = ctrl = 1
triggerall = Var(1) = 0

;--------------------
; MURRO FRACO
;--------------------
;--NORMAL------
[State -1]
type = ChangeState
value = 201
triggerall = command = "b"
triggerall = command != "holddown"
triggerall = Var(1) = 0
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 201
trigger2 = time >= 6
trigger2 = movecontact = 1

;--SALTO--------
[State -1]
type = ChangeState
value = 420
triggerall = command = "b"
triggerall = Var(1) = 0
trigger1 = statetype = A
trigger1 = ctrl = 1

;------------
; PONTAPE
;------------
;--LONGE--
[State -1]
type = ChangeState
value = 210
triggerall = command = "x"
triggerall = p2bodydist X > 20
triggerall = Var(1) = 0
trigger1 = statetype = S
trigger1 = ctrl = 1

;--PERTO--
[State -1]
type = ChangeState
value = 211
triggerall = p2bodydist X <= 20
triggerall = statetype = S
triggerall = ctrl = 1
triggerall = Var(1) = 0
trigger1 = command = "x"
trigger2 = command = "y"

;--BAIXO--
[State -1]
type = ChangeState
value = 430
triggerall = command = "holddown"
triggerall = statetype = C
triggerall = Var(1) = 0
triggerall = ctrl = 1
trigger1 = command = "x"
trigger2 = command = "y"

;--AR--
[State -1]
type = ChangeState
value = 610
triggerall = command = "x"
triggerall = Var(1) = 0
trigger1 = statetype = A
trigger1 = ctrl = 1

;------------
; PONTAPE FRACO
;------------
;--LONGE--
[State -1]
type = ChangeState
value = 215
triggerall = command = "y"
triggerall = p2bodydist X > 20
triggerall = Var(1) = 0
trigger1 = statetype = S
trigger1 = ctrl = 1

;--AR--
[State -1]
type = ChangeState
value = 611
triggerall = command = "y"
triggerall = Var(1) = 0
trigger1 = statetype = A
trigger1 = ctrl = 1

