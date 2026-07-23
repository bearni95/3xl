; The CMD file.
;

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
name = "hold_a" ;to charge your laser and DO A BARREL ROLL!
command = /a
time = 1

;-| XOR Method - New as of 08/01/07 |------------------------------------------
;
[Command]
name = "a2"
command = a
time = 1

[Command]
name = "b2"
command = b
time = 1

[Command]
name = "c2"
command = c
time = 1

[Command]
name = "x2"
command = x
time = 1

[Command]
name = "y2"
command = y
time = 1

[Command]
name = "z2"
command = z
time = 1

[Command]
name = "start2"
command = s
time = 1

[Command]
name = "holdfwd2";Required (do not remove)
command = /$F
time = 1

[Command]
name = "holdback2";Required (do not remove)
command = /$B
time = 1

[Command]
name = "holdup2" ;Required (do not remove)
command = /$U
time = 1

[Command]
name = "holddown2";Required (do not remove)
command = /$D
time = 1

[Command]
name = "hold_a2" ;to charge your laser and DO A BARREL ROLL!
command = /a
time = 1

[State -1, Turn dat shit on!]
type = VarSet
triggerall = var(59) != 1
trigger1 = (command = "a") ^^ (command = "a2")
trigger2 = (command = "b") ^^ (command = "b2")
trigger3 = (command = "c") ^^ (command = "c2")
trigger4 = (command = "x") ^^ (command = "x2")
trigger5 = (command = "y") ^^ (command = "y2")
trigger6 = (command = "z") ^^ (command = "z2")
trigger7 = (command = "start") ^^ (command = "start2")
trigger8 = (command = "holdfwd") ^^ (command = "holdfwd2")
trigger9 = (command = "holdback") ^^ (command = "holdback2")
trigger10 = (command = "holdup") ^^ (command = "holdup2")
trigger11 = (command = "holddown") ^^ (command = "holddown2")
trigger12 = (command = "hold_a") ^^ (command = "hold_a2")
v = 59
value = 1

;-| Super Motions |--------------------------------------------------------
;
[Command]
name = "Purify_Arrow"
command = D,D,x
buffer.time = 2

[Command]
name = "Purify_Arrow"
command = D,/D,x
buffer.time = 2

[Command]
name = "Purify_Arrow"
command = D,~D,/D,x
buffer.time = 2

[Command]
name = "Purify_Arrow"
command = D,~D,D,~D,x
buffer.time = 2

;-| Special Motions |------------------------------------------------------
[Command]
name = "Ascension"
command = /F, x
time = 10

[Command]
name = "Curse_Deflect"
command = /B, x
time = 10

[Command]
name = "Purification"
command = x
time = 10

;-| Double Tap |-----------------------------------------------------------
[Command]
name = "FF"     ;Required (do not remove)
command = F, F
time = 10

[Command]
name = "FF"     ;Alternate Dash Method
command = z
time = 10

[Command]
name = "BB"     ;Required (do not remove)
command = B, B
time = 10

[Command]
name = "BB"     ;Alternate Dash Method
command = c
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
trigger2 = movehit
var(1) = 1

;===========================================================================
; Kikyo's Sacred Arrow Hyper (CPU)
[State -1, Sacred Arrow CPU]
type = ChangeState
value = 6666
triggerall = Var(59) = 1
triggerall = power >= 1000
triggerall = ctrl
;triggerall = Var(1)
triggerall = Random <= 500
triggerall = P2BodyDist x > 20
trigger1 = statetype != A

; Kikyo's Sacred Arrow Hyper (Human)
[State -1, Sacred Arrow]
type = ChangeState
value = 6666
triggerall = Var(59) != 1
triggerall = power >= 1000
triggerall = command = "Purify_Arrow"
triggerall = ctrl
triggerall = Var(1)
trigger1 = statetype = S
trigger2 = statetype = C

;---------------------------------------------------------------------------
;Reserved for Kikyo's Specials

; Ascension (CPU)
[State -1, Ascension CPU]
type = ChangeState
value = 1000
triggerall = Var(59) = 1
triggerall = P2BodyDist x > 40
triggerall = NumProj < 1
trigger1 = statetype != A
trigger1 = ctrl
trigger1 = Var(1)

; Ascension (Human)
[State -1, Ascension]
type = ChangeState
value = 1000
triggerall = Var(59) != 1
triggerall = command = "Ascension"
triggerall = command != "holddown"
triggerall = NumProj < 1
trigger1 = statetype = S
trigger1 = ctrl
trigger1 = Var(1)

; Purification (CPU)
[State -1, Purification CPU]
type = ChangeState
value = 1500
triggerall = Var(59) = 1
triggerall = NumProj < 1
triggerall = 20 < P2BodyDist x <= 40
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 412 ;&& MoveContact
trigger2 = Var(1)

; Purification (Human)
[State -1, Purification]
type = ChangeState
value = 1500
triggerall = Var(59) != 1
triggerall = command != "holdback"
triggerall = command != "holdfwd"
triggerall = NumProj < 1
trigger1 = statetype = S
trigger1 = ctrl
trigger1 = command = "Purification"
trigger2 = command = "y"
trigger2 = command != "holddown"
trigger2 = stateno = [202,205]
trigger2 = Var(1)
trigger3 = command = "b"
trigger3 = command != "holddown"
trigger3 = stateno = [212,215]
trigger3 = Var(1)
trigger4 = command = "y"
trigger4 = command = "holddown"
trigger4 = stateno = [402,405]
trigger4 = Var(1)
trigger5 = command = "b"
trigger5 = command = "holddown"
trigger5 = stateno = [412,415]
trigger5 = Var(1)
trigger6 = (command = "b") || (command = "y")
trigger6 = (stateno = 206) || (stateno = 216) || (stateno = 406) || (stateno = 416)
trigger6 = Var(1)


; Curse Deflector (Human)
[State -1, Curse Deflector]
type = ChangeState
value = 2000
triggerall = Var(59) != 1
triggerall = command = "Curse_Deflect"
triggerall = command != "holddown"
triggerall = NumProj < 1
trigger1 = statetype = S
trigger1 = ctrl
trigger1 = Var(1)
;===========================================================================
;---------------------------------------------------------------------------
;Run Fwd (Human)
[State -1, Run Fwd]
type = ChangeState
value = 100
triggerall = Var(59) != 1
trigger1 = command = "FF"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
;Run Back (CPU)
[State -1, Run Back]
type = ChangeState
value = 105
triggerall = Var(59) = 1
triggerall = P2BodyDist x <= 20
triggerall = Random <= 500
triggerall = statetype != A
trigger1 = ctrl

;Run Back (Human)
[State -1, Run Back]
type = ChangeState
value = 105
triggerall = Var(59) != 1
trigger1 = command = "BB"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
; Kikyo's Throw
[State -1, Soul Collector In Yo Face Throw]
type = ChangeState
value = 800
triggerall = command = "b"
triggerall = statetype = S
triggerall = ctrl
triggerall = stateno != 100
trigger1 = command = "holdfwd"
trigger1 = p2bodydist X < 15
trigger1 = (p2statetype = S) || (p2statetype = C)
trigger1 = p2movetype != H
trigger2 = command = "holdback"
trigger2 = p2bodydist X < 15
trigger2 = (p2statetype = S) || (p2statetype = C)
trigger2 = p2movetype != H

; Kikyo's Air Throw
[State -1, Beat Yo Ass]
type = ChangeState
value = 801
triggerall = command = "b"
triggerall = statetype = A
triggerall = ctrl
triggerall = stateno != 100
triggerall = stateno != 101
triggerall = stateno != 110
triggerall = stateno != 111
triggerall = stateno != 105
triggerall = stateno != 106
trigger1 = command = "holdfwd"
trigger1 = p2bodydist X < 15
trigger1 = (p2statetype = A) || (p2statetype = S)
trigger1 = p2movetype != H
trigger2 = command = "holdback"
trigger2 = p2bodydist X < 15
trigger2 = (p2statetype = A) || (p2statetype = S)
trigger2 = p2movetype != H


;===========================================================================
;---------------------------------------------------------------------------
; Kikyo's Bow Smack 1 (Stand Light Punch - CPU)
[State -1, Stand Light Punch CPU]
type = ChangeState
value = 200
triggerall = Var(59) = 1
triggerall = P2BodyDist x <= 20
triggerall = P2StateType != S
triggerall = Random <= 500
trigger1 = statetype != A
trigger1 = ctrl
trigger1 = Var(1)

; Kikyo's Bow Smack 1 (Stand Light Punch - Human)
[State -1, Stand Light Punch]
type = ChangeState
value = 200
triggerall = Var(59) != 1
triggerall = command = "y"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl
trigger1 = Var(1)

; Kikyo's Bow Smack 2 (For Yasha Combos - CPU)
[State -1, Stand Light Punch2 CPU]
type = ChangeState
value = 201 ;(Duplicate of State 200 for Yasha Combos)
triggerall = Var(59) = 1
triggerall = Var(1)
trigger1 = stateno = 200 ;&& MoveContact

; Kikyo's Bow Smack 2 (For Yasha Combos - Human)
[State -1, Stand Light Punch2]
type = ChangeState
value = 201 ;(Duplicate of State 200 for Yasha Combos)
triggerall = Var(59) != 1
triggerall = command = "y"
triggerall = command != "holddown"
triggerall = Var(1)
trigger1 = stateno = 200
trigger2 = stateno = 210
trigger3 = stateno = 400
trigger4 = stateno = 410

; Kikyo's Bow Smack 3 (For Yasha Combos - CPU)
[State -1, Stand Light Punch3 CPU]
type = ChangeState
value = 202
triggerall = Var(59) = 1
triggerall = Var(1)
trigger1 = stateno = 201 ;&& MoveContact
trigger2 = stateno = 211 ;&& MoveContact
trigger3 = stateno = 401 ;&& MoveContact
trigger4 = stateno = 411 ;&& MoveContact


; Kikyo's Bow Smack 3 (For Yasha Combos - Human)
[State -1, Stand Light Punch3]
type = ChangeState
value = 202
triggerall = Var(59) != 1
triggerall = command = "y"
triggerall = command != "holddown"
triggerall = Var(1)
trigger1 = stateno = 201
trigger2 = stateno = 211
trigger3 = stateno = 401
trigger4 = stateno = 411

; Kikyo's Bow Smack 4 (For Yasha Combos - Human)
[State -1, Stand Light Punch4]
type = ChangeState
value = 203
triggerall = Var(59) != 1
triggerall = command = "y"
triggerall = command != "holddown"
triggerall = Var(1)
trigger1 = stateno = 212
trigger2 = stateno = 402
trigger3 = stateno = 412

; Kikyo's Bow Smack 5 (For Yasha Combos - Human)
[State -1, Stand Light Punch5]
type = ChangeState
value = 204
triggerall = Var(59) != 1
triggerall = command = "y"
triggerall = command != "holddown"
triggerall = Var(1)
trigger1 = stateno = 213
trigger2 = stateno = 403
trigger3 = stateno = 413

; Kikyo's Bow Smack 6 (For Yasha Combos - Human)
[State -1, Stand Light Punch6]
type = ChangeState
value = 205
triggerall = Var(59) != 1
triggerall = command = "y"
triggerall = command != "holddown"
triggerall = Var(1)
trigger1 = stateno = 214
trigger2 = stateno = 404
trigger3 = stateno = 414

; Kikyo's Bow Smack 7 (For Yasha Combos - Human)
[State -1, Stand Light Punch7]
type = ChangeState
value = 206
triggerall = Var(59) != 1
triggerall = command = "y"
triggerall = command != "holddown"
triggerall = Var(1)
trigger1 = stateno = 215
trigger2 = stateno = 405
trigger3 = stateno = 415

; Kikyo's Dash Fwd Attack (Human)
[State -1, Dash FWD Atk]
type = ChangeState
value = 110
triggerall = Var(59) != 1
triggerall = stateno = 100
triggerall = statetype =  A
trigger1 = command = "y"
trigger2 = command = "z"
trigger3 = command = "b"
trigger4 = command = "c"

; Kikyo's Dash Back Attack (CPU)
[State -1, Dash Back Atk CPU]
type = ChangeState
value = 111
triggerall = Var(59) = 1
triggerall = stateno = 105
triggerall = statetype = A
trigger1 = P2Statetype = A
trigger2 = P2BodyDist x <= 20

; Kikyo's Dash Back Attack (Human)
[State -1, Dash Back Atk]
type = ChangeState
value = 111
triggerall = Var(59) != 1
triggerall = stateno = 105
triggerall = statetype =  A
trigger1 = command = "y"
trigger2 = command = "z"
trigger3 = command = "b"
trigger4 = command = "c"
;---------------------------------------------------------------------------
; Kikyo's Shikigami Smack 1 (Stand Strong Punch - CPU)
[State -1, Stand Strong Punch CPU]
type = ChangeState
value = 210
triggerall = Var(59) = 1
triggerall = P2BodyDist x <= 20
triggerall = P2StateType != S
triggerall = Random >= 500
trigger1 = statetype != A
trigger1 = ctrl
trigger1 = Var(1)

; Kikyo's Shikigami Smack 1 (Stand Strong Punch - Human)
[State -1, Stand Strong Punch]
type = ChangeState
value = 210
triggerall = Var(59) != 1
triggerall = command = "b"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl
trigger1 = Var(1)

; Kikyo's Shikigami Smack 2 (For Yasha Combos - CPU)
[State -1, Stand Strong Punch 2 CPU]
type = ChangeState
value = 211
triggerall = Var(59) = 1
triggerall = Var(1)
trigger1 = stateno = 210 ;&& MoveContact

; Kikyo's Shikigami Smack 2 (For Yasha Combos - Human)
[State -1, Stand Strong Punch 2]
type = ChangeState
value = 211
triggerall = Var(59) != 1
triggerall = command = "b"
triggerall = command != "holddown"
triggerall = Var(1)
trigger1 = stateno = 200
trigger2 = stateno = 210
trigger3 = stateno = 400
trigger4 = stateno = 410

; Kikyo's Shikigami Smack 3 (For Yasha Combos - CPU)
[State -1, Stand Strong Punch 3 CPU]
type = ChangeState
value = 212
triggerall = Var(59) = 1
triggerall = Var(1)
trigger1 = stateno = 202 ;&& MoveContact

; Kikyo's Shikigami Smack 3 (For Yasha Combos - Human)
[State -1, Stand Strong Punch 3]
type = ChangeState
value = 212
triggerall = Var(59) != 1
triggerall = command = "b"
triggerall = command != "holddown"
triggerall = Var(1)
trigger1 = stateno = 201
trigger2 = stateno = 211
trigger3 = stateno = 401
trigger4 = stateno = 411

; Kikyo's Shikigami Smack 4 (For Yasha Combos - Human)
[State -1, Stand Strong Punch 4]
type = ChangeState
value = 213
triggerall = Var(59) != 1
triggerall = command = "b"
triggerall = command != "holddown"
triggerall = Var(1)
trigger1 = stateno = 202
trigger2 = stateno = 402
trigger3 = stateno = 412

; Kikyo's Shikigami Smack 5 (For Yasha Combos - Human)
[State -1, Stand Strong Punch 5]
type = ChangeState
value = 214
triggerall = Var(59) != 1
triggerall = command = "b"
triggerall = command != "holddown"
triggerall = Var(1)
trigger1 = stateno = 203
trigger2 = stateno = 403
trigger3 = stateno = 413

; Kikyo's Shikigami Smack 6 (For Yasha Combos - Human)
[State -1, Stand Strong Punch 6]
type = ChangeState
value = 215
triggerall = Var(59) != 1
triggerall = command = "b"
triggerall = command != "holddown"
triggerall = Var(1)
trigger1 = stateno = 204
trigger2 = stateno = 404
trigger3 = stateno = 414

; Kikyo's Shikigami Smack 7 (For Yasha Combos - Human)
[State -1, Stand Strong Punch 7]
type = ChangeState
value = 216
triggerall = Var(59) != 1
triggerall = command = "b"
triggerall = command != "holddown"
triggerall = Var(1)
trigger1 = stateno = 205
trigger2 = stateno = 405
trigger3 = stateno = 415

;---------------------------------------------------------------------------
;---------------------------------------------------------------------------
; Kikyo's Crouching Bow Smack 1 (Stand Light Punch - CPU)
[State -1, Crouch Light Punch CPU]
type = ChangeState
value = 400
triggerall = Var(59) = 1
triggerall = P2BodyDist x <= 20
triggerall = P2StateType = S
triggerall = Random <= 500
trigger1 = statetype != A
trigger1 = ctrl
trigger1 = Var(1)

; Kikyo's Crouching Bow Smack 1 (Stand Light Punch - Human)
[State -1, Crouch Light Punch]
type = ChangeState
value = 400
triggerall = Var(59) != 1
triggerall = command = "y"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger1 = Var(1)

; Kikyo's Crouching Bow Smack 2 (For Yasha Combos - CPU)
[State -1, Crouch Light Punch2 CPU]
type = ChangeState
value = 401 ;(Duplicate of State 400 for Yasha Combos)
triggerall = Var(59) = 1
triggerall = Var(1)
trigger1 = stateno = 400 ;&& MoveContact


; Kikyo's Crouching Bow Smack 2 (For Yasha Combos - Human)
[State -1, Crouch Light Punch2]
type = ChangeState
value = 401 ;(Duplicate of State 400 for Yasha Combos)
triggerall = Var(59) != 1
triggerall = command = "y"
triggerall = command = "holddown"
triggerall = Var(1)
trigger1 = stateno = 200
trigger2 = stateno = 210
trigger3 = stateno = 400
trigger4 = stateno = 410

; Kikyo's Crouching Bow Smack 3 (For Yasha Combos - CPU)
[State -1, Crouch Light Punch3 CPU]
type = ChangeState
value = 402 ;(Duplicate of State 400 for Yasha Combos)
triggerall = Var(59) = 1
triggerall = Var(1)
trigger1 = stateno = 212 ;&& MoveContact

; Kikyo's Crouching Bow Smack 3 (For Yasha Combos - Human)
[State -1, Crouch Light Punch3]
type = ChangeState
value = 402 ;(Duplicate of State 400 for Yasha Combos)
triggerall = Var(59) != 1
triggerall = command = "y"
triggerall = command = "holddown"
triggerall = Var(1)
trigger1 = stateno = 201
trigger2 = stateno = 211
trigger3 = stateno = 401
trigger4 = stateno = 411

; Kikyo's Crouching Bow Smack 4 (For Yasha Combos - Human)
[State -1, Crouch Light Punch4]
type = ChangeState
value = 403 ;(Duplicate of State 400 for Yasha Combos)
triggerall = Var(59) != 1
triggerall = command = "y"
triggerall = command = "holddown"
triggerall = Var(1)
trigger1 = stateno = 202
trigger2 = stateno = 212
trigger3 = stateno = 412

; Kikyo's Crouching Bow Smack 5 (For Yasha Combos - Human)
[State -1, Crouch Light Punch5]
type = ChangeState
value = 404 ;(Duplicate of State 400 for Yasha Combos)
triggerall = Var(59) != 1
triggerall = command = "y"
triggerall = command = "holddown"
triggerall = Var(1)
trigger1 = stateno = 203
trigger2 = stateno = 213
trigger3 = stateno = 413

; Kikyo's Crouching Bow Smack 6 (For Yasha Combos - Human)
[State -1, Crouch Light Punch6]
type = ChangeState
value = 405 ;(Duplicate of State 400 for Yasha Combos)
triggerall = Var(59) != 1
triggerall = command = "y"
triggerall = command = "holddown"
triggerall = Var(1)
trigger1 = stateno = 204
trigger2 = stateno = 214
trigger3 = stateno = 414

; Kikyo's Crouching Bow Smack 7 (For Yasha Combos - Human)
[State -1, Crouch Light Punch7]
type = ChangeState
value = 406 ;(Duplicate of State 400 for Yasha Combos)
triggerall = Var(59) != 1
triggerall = command = "y"
triggerall = command = "holddown"
triggerall = Var(1)
trigger1 = stateno = 205
trigger2 = stateno = 215
trigger3 = stateno = 415

;---------------------------------------------------------------------------
; Kikyo's Crouching Shikigami Smack 1 (Crouch Strong Punch - CPU)
[State -1, Crouch Strong Punch CPU]
type = ChangeState
value = 410
triggerall = Var(59) = 1
triggerall = P2BodyDist x <= 20
triggerall = P2StateType = S
triggerall = Random >= 500
trigger1 = statetype != A
trigger1 = ctrl
trigger1 = Var(1)

; Kikyo's Crouching Shikigami Smack 1 (Crouch Strong Punch - Human)
[State -1, Crouch Strong Punch]
type = ChangeState
value = 410
triggerall = Var(59) != 1
triggerall = command = "b"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger1 = Var(1)

; Kikyo's Crouching Shikigami Smack 2 (For Yasha Combos - CPU)
[State -1, Crouch Strong Punch 2 CPU]
type = ChangeState
value = 411
triggerall = Var(59) = 1
triggerall = Var(1)
trigger1 = stateno = 410 ;&& MoveContact

; Kikyo's Crouching Shikigami Smack 2 (For Yasha Combos - Human)
[State -1, Crouch Strong Punch 2]
type = ChangeState
value = 411
triggerall = Var(59) != 1
triggerall = command = "b"
triggerall = command = "holddown"
triggerall = Var(1)
trigger1 = stateno = 200
trigger2 = stateno = 210
trigger3 = stateno = 400
trigger4 = stateno = 410

; Kikyo's Crouching Shikigami Smack 3 (For Yasha Combos - CPU)
[State -1, Crouch Strong Punch 3 CPU]
type = ChangeState
value = 412
triggerall = Var(59) = 1
triggerall = Var(1)
trigger1 = stateno = 402 ;&& MoveContact

; Kikyo's Crouching Shikigami Smack 3 (For Yasha Combos - Human)
[State -1, Crouch Strong Punch 3]
type = ChangeState
value = 412
triggerall = Var(59) != 1
triggerall = command = "b"
triggerall = command = "holddown"
triggerall = Var(1)
trigger1 = stateno = 201
trigger2 = stateno = 211
trigger3 = stateno = 401
trigger4 = stateno = 411

; Kikyo's Crouching Shikigami Smack 4 (For Yasha Combos - Human)
[State -1, Crouch Strong Punch 4]
type = ChangeState
value = 413
triggerall = Var(59) != 1
triggerall = command = "b"
triggerall = command = "holddown"
triggerall = Var(1)
trigger1 = stateno = 202
trigger2 = stateno = 212
trigger3 = stateno = 402

; Kikyo's Crouching Shikigami Smack 5 (For Yasha Combos - Human)
[State -1, Crouch Strong Punch 5]
type = ChangeState
value = 414
triggerall = Var(59) != 1
triggerall = command = "b"
triggerall = command = "holddown"
triggerall = Var(1)
trigger1 = stateno = 203
trigger2 = stateno = 213
trigger3 = stateno = 403

; Kikyo's Crouching Shikigami Smack 6 (For Yasha Combos - Human)
[State -1, Crouch Strong Punch 6]
type = ChangeState
value = 415
triggerall = Var(59) != 1
triggerall = command = "b"
triggerall = command = "holddown"
triggerall = Var(1)
trigger1 = stateno = 204
trigger2 = stateno = 214
trigger3 = stateno = 404

; Kikyo's Crouching Shikigami Smack 7 (For Yasha Combos - Human)
[State -1, Crouch Strong Punch 7]
type = ChangeState
value = 416
triggerall = Var(59) != 1
triggerall = command = "b"
triggerall = command = "holddown"
triggerall = Var(1)
trigger1 = stateno = 205
trigger2 = stateno = 215
trigger3 = stateno = 405

;---------------------------------------------------------------------------
;Kikyo's Air Bow Smack (CPU)
[State -1, Jump Light Punch CPU]
type = ChangeState
value = 600
triggerall = Var(59) = 1
triggerall = P2BodyDist y <= 0
triggerall = statetype = A
triggerall = stateno != 100
triggerall = stateno != 101
triggerall = stateno != 110
triggerall = stateno != 111
triggerall = stateno != 105
triggerall = stateno != 106
trigger1 = ctrl

;Kikyo's Air Bow Smack (Human)
[State -1, Jump Light Punch]
type = ChangeState
value = 600
triggerall = Var(59) != 1
triggerall = command = "y"
triggerall = statetype = A
triggerall = stateno != 100
triggerall = stateno != 101
triggerall = stateno != 110
triggerall = stateno != 111
triggerall = stateno != 105
triggerall = stateno != 106
trigger1 = ctrl


;---------------------------------------------------------------------------
;Kikyo's Air Shikigami Smack (CPU)
[State -1, Jump Strong Punch]
type = ChangeState
value = 610
triggerall = Var(59) = 1
triggerall = P2BodyDist y > 0
triggerall = statetype = A
triggerall = stateno != 100
triggerall = stateno != 101
triggerall = stateno != 110
triggerall = stateno != 111
triggerall = stateno != 105
triggerall = stateno != 106
trigger1 = ctrl

;Kikyo's Air Shikigami Smack (Human)
[State -1, Jump Strong Punch]
type = ChangeState
value = 610
triggerall = Var(59) != 1
triggerall = command = "b"
triggerall = statetype = A
triggerall = stateno != 100
triggerall = stateno != 101
triggerall = stateno != 110
triggerall = stateno != 111
triggerall = stateno != 105
triggerall = stateno != 106
trigger1 = ctrl

;-----------------------------------------------------------
;Kikyo's Standing Parry Attack (Human)
[State -1, Standing Parry]
type = ChangeState
value = 900
triggerall = Var(59) != 1
triggerall = command = "a"
triggerall = command != "holdback"
triggerall = statetype = S
trigger1 = ctrl

;Kikyo's Standing Parry Attack - Guard Version (Human)
[State -1, Standing PushBlock]
type = ChangeState
value = 950
triggerall = Var(59) != 1
triggerall = (StateNo = 130) || (StateNo = 150)
trigger1 = command = "a"

;Kikyo's Crouching Parry Attack (Human)
[State -1, Crouching Parry]
type = ChangeState
value = 901
triggerall = Var(59) != 1
triggerall = command = "a"
triggerall = command != "holdback"
triggerall = statetype = C
trigger1 = ctrl

;Kikyo's Crouching Parry Attack - Guard Version (Human)
[State -1, Crouching PushBlock]
type = ChangeState
value = 951
triggerall = Var(59) != 1
triggerall = (StateNo = 131) || (StateNo = 151)
trigger1 = command = "a"

