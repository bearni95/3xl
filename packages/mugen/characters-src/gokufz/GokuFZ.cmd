;===============================================================================
;-------------------------------Comandos----------------------------------------
;===============================================================================
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
command.time = 30

command.buffer.time = 1

;-/ AI /-------------------------------------------------------------------
[Command]
name = "AI_1"
command = b,b,b,b,b,b,b,b,b,b,b,b,b,b,b,b,b,b,b
time = 1

[Command]
name = "AI_2"
command = c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c
time = 1

[Command]
name = "AI_3"
command = x,x,x,x,x,x,x,x,x,x,x,x,x,x,x,x,x,x,x
time = 1

[Command]
name = "AI_4"
command = y,y,y,y,y,y,y,y,y,y,y,y,y,y,y,y,y,y,y
time = 1

[Command]
name = "AI_5"
command = z,z,z,z,z,z,z,z,z,z,z,z,z,z,z,z,z,z,z
time = 1

[Command]
name = "AI_6"
command = z,z,z,z,z,z,z,z,y,y,y,y,y,y,y,y,y,y,y
time = 1

[Command]
name = "AI_7"
command = F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F
time = 1

[Command]
name = "AI_8"
command = D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D
time = 1

[Command]
name = "AI_9"
command = B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B
time = 1

[Command]
name = "AI_10"
command = U,U,U,U,U,U,U,U,U,U,U,U,U,U,U,U,U,U,U
time = 1

[Command]
name = "AI_11"
command = a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a
time = 1

[Command]
name = "AI_12"
command = c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c
time = 1

[Command]
name = "AI_13"
command = x,x,x,x,x,x,x,x,x,x,x,x,x,x,x,x,x,x,x
time = 1

[Command]
name = "AI_14"
command = y,y,y,y,y,y,y,y,y,y,y,y,y,y,y,y,y,y,y
time = 1

[Command]
name = "AI_15"
command = z,z,z,z,z,z,z,z,z,z,z,z,z,z,z,z,z,z,z
time = 1

[Command]
name = "AI_16"
command = a,a,a,b,b,b,x,x,x,y,y,y,c,c,c,z,z,z,z
time = 1

[Command]
name = "AI_17"
command = a,B,c,x,y,z,c,B,D,F,U,a,b,c,x,y,x,b,a
time = 1

[Command]
name = "AI_18"
command = a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a
time = 1

[Command]
name = "AI_19"
command = b,b,b,b,b,b,b,b,b,b,b,b,b,b,b,b,b,b,b
time = 1

[Command]
name = "AI_20"
command = c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c,c
time = 1

;-| Super Motions |--------------------------------------------------------

[command]
name = "Meteor Smash"
command = D,DB,B,z
time = 20

[command]
name = "Meteor Smash"
command = D,DB,B,c
time = 20

[command]
name = "Instant Transmission Kamehameha"
command = D,DF,F,c
time = 20

[command]
name = "SuperKameramera"
command = D,DF,F,z
time = 20

;-| Special Motions |------------------------------------------------------

[command]
name = "Dragon Flash Fist Heavy"
command = D,DF,F,b
time = 20

[command]
name = "Dragon Flash Fist Medium"
command = D,DF,F,y
time = 20

[command]
name = "Dragon Flash Fist Light"
command = D,DF,F,x
time = 20

[command]
name = "Kameramera"
command = D,DF,F,a
time = 20

[command]
name = "Rapid Kick Rush Heavy"
command = D,DB,B,b
time = 20

[command]
name = "Rapid Kick Rush Medium"
command = D,DB,B,y
time = 20

[command]
name = "Rapid Kick Rush"
command = D,DB,B,x
time = 20

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
name = "DragonRush" ;Required (do not remove)
command = x+y
time = 1

[Command]
name = "SuperDash"
command = a+b
time = 1

[Command]
name = "Sparking Blast"
command = z+c
time = 1

[Command]
name = "Vanish"
command = y+b
time = 1

[Command]
name = "Power Charge"
command = a+x
time = 1

[Command]
name = "Sparking Blast"
command = a+b+x+y
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
command = b+c
time = 1

[Command]
name = "recovery"
command = a+c
time = 1

;-| Dir + Button |---------------------------------------------------------
[Command]
name = "back_x"
command = /$B,x
time = 1

[Command]
name = "back_y"
command = /$B,y
time = 1

[Command]
name = "back_z"
command = /$B,z
time = 1

[Command]
name = "down_x"
command = /$D,x
time = 1

[Command]
name = "down_y"
command = /$D,y
time = 1

[Command]
name = "down_z"
command = /$D,z
time = 1

[Command]
name = "fwd_x"
command = /$F,x
time = 1

[Command]
name = "fwd_y"
command = /$F,y
time = 1

[Command]
name = "fwd_z"
command = /$F,z
time = 1

[Command]
name = "up_x"
command = /$U,x
time = 1

[Command]
name = "up_y"
command = /$U,y
time = 1

[Command]
name = "up_z"
command = /$U,z
time = 1

[Command]
name = "back_a"
command = /$B,a
time = 1

[Command]
name = "back_b"
command = /$B,b
time = 1

[Command]
name = "back_c"
command = /$B,c
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
name = "down_c"
command = /$D,c
time = 1

[Command]
name = "fwd_a"
command = /$F,a
time = 1

[Command]
name = "fwd_b"
command = /$F,b
time = 1

[Command]
name = "fwd_c"
command = /$F,c
time = 1

[Command]
name = "up_a"
command = /$U,a
time = 1

[Command]
name = "up_b"
command = /$U,b
time = 1

[Command]
name = "up_c"
command = /$U,c
time = 1

;-| Single Button |---------------------------------------------------------
[Command]
name = "LightAttack"
command = x
time = 1

[Command]
name = "MediumAttack"
command = y
time = 1

[Command]
name = "HeavyAttack"
command = b
time = 1

[Command]
name = "SuperDash"
command = c
time = 1

[Command]
name = "DragonRush"
command = z
time = 1

[Command]
name = "SpecialAttack"
command = a
time = 1

[Command]
name = "s"
command = s
time = 1

;-| Single Dir |------------------------------------------------------------
[Command]
name = "fwd" ;Required (do not remove)
command = $F
time = 1

[Command]
name = "downfwd"
command = $DF
time = 1

[Command]
name = "down" ;Required (do not remove)
command = $D
time = 1

[Command]
name = "downback"
command = $DB
time = 1

[Command]
name = "back" ;Required (do not remove)
command = $B
time = 1

[Command]
name = "upback"
command = $UB
time = 1

[Command]
name = "up" ;Required (do not remove)
command = $U
time = 1

[Command]
name = "upfwd"
command = $UF
time = 1

;-| Hold Button |--------------------------------------------------------------
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
name = "hold_s"
command = /s
time = 1

;-| Hold Dir |--------------------------------------------------------------
[Command]
name = "holdfwd" ;Required (do not remove)
command = /$F
time = 1

[Command]
name = "holddownfwd"
command = /$DF
time = 1

[Command]
name = "holddown" ;Required (do not remove)
command = /$D
time = 1

[Command]
name = "holddownback"
command = /$DB
time = 1

[Command]
name = "holdback" ;Required (do not remove)
command = /$B
time = 1

[Command]
name = "holdupback"
command = /$UB
time = 1

[Command]
name = "holdup" ;Required (do not remove)
command = /$U
time = 1

[Command]
name = "holdupfwd"
command = /$UF
time = 1

[Statedef -1]
;===========================================================================
;--------------------------------AI-----------------------------------------
;===========================================================================
[State -1]
type = VarSet
trigger1 = command = "AI_1"
trigger2 = command = "AI_2"
trigger3 = command = "AI_3"
trigger4 = command = "AI_4"
trigger5 = command = "AI_5"
trigger6 = command = "AI_6"
trigger7 = command = "AI_7"
trigger8 = command = "AI_8"
trigger9 = command = "AI_9"
trigger10 = command = "AI_10"
trigger11 = command = "AI_11"
trigger12 = command = "AI_12"
trigger13 = command = "AI_13"
trigger14 = command = "AI_14"
trigger15 = command = "AI_15"
trigger16 = command = "AI_16"
trigger17 = command = "AI_17"
trigger18 = command = "AI_18"
trigger19 = command = "AI_19"
trigger20 = command = "AI_20"
v = 59
value = 1

;---------------------------------------------------------------------------
[State -1,AIcombo]
type = ChangeState
TriggerAll = RoundState = 2
TriggerAll = var(59) != 0
TriggerAll = StateType = S && MoveType != H
Trigger1 = Ctrl
Trigger1 = Random <= 300
Trigger1 = P2BodyDist X < 150
Trigger2 = Stateno = 201 && movecontact
Trigger3 = Stateno = 202 && movecontact
Trigger2 = Stateno = 203 && movecontact
Value = 200

;---------------------------------------------------------------------------
[State -1,AIcombo2]
type = ChangeState
TriggerAll = RoundState = 2
TriggerAll = var(59) != 0
TriggerAll = StateType = S && MoveType != H
Trigger1 = Ctrl
Trigger1 = Random <= 200
Trigger1 = P2BodyDist X < 150
Trigger1 = P2StateType != A
Trigger1 = StateType != A
Trigger2 = Stateno = 211 && movecontact
Value = 210

;---------------------------------------------------------------------------
[State -1,AIcomboair]
type = ChangeState
TriggerAll = RoundState = 2
TriggerAll = var(59) != 0
TriggerAll = StateType = A && MoveType != H
Trigger1 = Ctrl
Trigger1 = Random <= 500
Trigger1 = P2BodyDist X < 50
Trigger1 = P2StateType != S
Trigger1 = StateType != S
Trigger2 = Stateno = 601 && movecontact
Value = 600

;---------------------------------------------------------------------------
[State -1,AIcomboair2]
type = ChangeState
TriggerAll = RoundState = 2
TriggerAll = var(59) != 0
TriggerAll = StateType = A && MoveType != H
Trigger1 = Ctrl
Trigger1 = Random <= 400
Trigger1 = P2BodyDist X < 50
Trigger1 = P2StateType != S
Trigger1 = StateType != S
Trigger2 = Stateno = 412 && movecontact
Value = 610

;---------------------------------------------------------------------------
[State -1,AIcomboC]
type = ChangeState
TriggerAll = RoundState = 2
TriggerAll = var(59) != 0
TriggerAll = StateType = C && MoveType != H
Trigger1 = Ctrl
Trigger1 = Random <= 500
Trigger1 = P2BodyDist X < 80
Trigger1 = P2StateType != A
Trigger1 = StateType != A
Trigger2 = Stateno = 201 && movecontact
Value = 400

;---------------------------------------------------------------------------
[State -1,AIcomboC2]
type = ChangeState
TriggerAll = RoundState = 2
TriggerAll = var(59) != 0
TriggerAll = StateType = C && MoveType != H
Trigger1 = Ctrl
Trigger1 = Random <= 400
Trigger1 = P2BodyDist X < 80
Trigger1 = P2StateType != A
Trigger1 = StateType != A
Trigger2 = Stateno = 412 && movecontact
Value = 410

;---------------------------------------------------------------------------
[State -1, AIGuard]
type = ChangeState
trigger1 = Ctrl
trigger1 = RoundState = 2
trigger1 = var(59) != 0
trigger1 = Random <= 750
trigger1 = P2BodyDist X <= 65
trigger1 = StateType = S
trigger1 = P2MoveType = A
value = 120

;---------------------------------------------------------------------------
[State -1, AIGuard]
type = ChangeState
trigger1 = Ctrl
trigger1 = RoundState = 2
trigger1 = var(59) != 0
trigger1 = Random <= 750
trigger1 = P2BodyDist X <= 65
trigger1 = StateType = C
trigger1 = P2MoveType = A
value = 120

;---------------------------------------------------------------------------
[State -1, AIGuard]
type = ChangeState
trigger1 = Ctrl
trigger1 = RoundState = 2
trigger1 = var(59) != 0
trigger1 = Random <= 750
trigger1 = P2BodyDist X <= 65
trigger1 = StateType = A
trigger1 = P2MoveType = A
value = 120

;---------------------------------------------------------------------------
[State -1, AIKiBlast]
type = ChangeState
trigger1 = Ctrl
trigger1 = RoundState = 2
trigger1 = var(59) != 0
trigger1 = p2bodydist X >= 140
trigger1 = Random <= 300
trigger1 = statetype = S
trigger1 = p2statetype != C
value = 520

;---------------------------------------------------------------------------
[State -1, AIKameramera]
type = ChangeState
trigger1 = Ctrl
trigger1 = RoundState = 2
trigger1 = var(59) != 0
trigger1 = p2bodydist X >= 140
trigger1 = Random <= 200
trigger1 = statetype = S
trigger1 = p2statetype != C
value = 1100

;---------------------------------------------------------------------------
[State -1, AISuperDash]
type = ChangeState
trigger1 = Ctrl
trigger1 = RoundState = 2
trigger1 = var(59) != 0
trigger1 = p2bodydist X >= 140
trigger1 = Random <= 400
trigger1 = statetype = S
value = 700

;---------------------------------------------------------------------------
[State -1, AIDragonFlashFist]
type = ChangeState
trigger1 = Ctrl
trigger1 = RoundState = 2
trigger1 = var(59) != 0
trigger1 = p2bodydist X >= 100
trigger1 = Random <= 500
trigger1 = statetype = S
value = 1200

;---------------------------------------------------------------------------
[State -1, AIDragonFlashFist]
type = ChangeState
trigger1 = Ctrl
trigger1 = RoundState = 2
trigger1 = var(59) != 0
trigger1 = p2bodydist X >= 150
trigger1 = Random <= 350
trigger1 = statetype = S
value = 1210

;---------------------------------------------------------------------------
[State -1, AIDragonFlashFist]
type = ChangeState
trigger1 = Ctrl
trigger1 = RoundState = 2
trigger1 = var(59) != 0
trigger1 = p2bodydist X >= 200
trigger1 = Random <= 100
trigger1 = statetype = S
value = 1220

;---------------------------------------------------------------------------
[State -1, AIRapidKickRush]
type = ChangeState
trigger1 = Ctrl
trigger1 = RoundState = 2
trigger1 = var(59) != 0
trigger1 = p2bodydist X >= 50
trigger1 = Random <= 300
trigger1 = statetype = S
trigger1 = p2statetype != C
value = 1000

;---------------------------------------------------------------------------
[State -1, AIRapidKickRushAir]
type = ChangeState
trigger1 = Ctrl
trigger1 = RoundState = 2
trigger1 = var(59) != 0
trigger1 = p2bodydist X >= 100
trigger1 = Random <= 300
trigger1 = statetype = A
trigger1 = p2statetype != S
value = 1000

;---------------------------------------------------------------------------
[State -1, AIRapidKickRush]
type = ChangeState
trigger1 = Ctrl
trigger1 = RoundState = 2
trigger1 = var(59) != 0
trigger1 = p2bodydist X >= 100
trigger1 = Random <= 200
trigger1 = statetype = S
trigger1 = p2statetype != C
value = 1010

;---------------------------------------------------------------------------
[State -1, AIRapidKickRushAir]
type = ChangeState
trigger1 = Ctrl
trigger1 = RoundState = 2
trigger1 = var(59) != 0
trigger1 = p2bodydist X >= 150
trigger1 = Random <= 200
trigger1 = statetype = A
trigger1 = p2statetype != S
value = 1010

;---------------------------------------------------------------------------
[State -1, AISuperKameramera]
type = ChangeState
Triggerall = power >= 1000
trigger1 = Ctrl
trigger1 = RoundState = 2
trigger1 = var(59) != 0
trigger1 = p2bodydist X >= 70
trigger1 = Random <= 80
trigger1 = statetype = S
trigger1 = p2statetype != A
value = 1700

;---------------------------------------------------------------------------
[State -1, AIInstantTransmissionKameramera]
type = ChangeState
Triggerall = power >= 2000
trigger1 = Ctrl
trigger1 = RoundState = 2
trigger1 = var(59) != 0
trigger1 = p2bodydist X >= 150
trigger1 = Random <= 80
trigger1 = statetype = S
trigger1 = p2statetype != A
value = 1800

;---------------------------------------------------------------------------
[State -1, AIMeteorSmash]
type = ChangeState
Triggerall = power >= 3000
trigger1 = Ctrl
trigger1 = RoundState = 2
trigger1 = var(59) != 0
trigger1 = p2bodydist X >= 150
trigger1 = Random <= 80
trigger1 = statetype = S
trigger1 = p2statetype != A
value = 1900

;===========================================================================
;---------------------------Basicos-----------------------------------------
;===========================================================================

;---------------------------------------------------------------------------
; Power Charge
[State -1, Power Charge]
type = ChangeState
value = 850
triggerall = power < 3000
triggerall = var(59) !=1
triggerall = command = "Power Charge"
trigger1 = statetype != A
trigger1 = ctrl

;---------------------------------------------------------------------------
; Dash Fwd
[State -1, Dash Fwd]
type = ChangeState
value = 100
trigger1 = command = "FF"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
; Dash Back
[State -1, Dash Back]
type = ChangeState
value = 105
trigger1 = command = "BB"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
; Air Dash Fwd
[State -1, Air Dash Fwd]
type = ChangeState
value = 101
trigger1 = command = "FF"
trigger1 = statetype = A
trigger1 = ctrl

;---------------------------------------------------------------------------
; Air Dash Back
[State -1, Air Dash Back]
type = ChangeState
value = 102
triggerall
trigger1 = command = "BB"
trigger1 = statetype = A
trigger1 = ctrl

;===========================================================================
;--------------------------------Ataques Supers-----------------------------
;===========================================================================

;---------------------------------------------------------------------------
; Air Super Kameramera
[State -1, Air Super Kameramera]
type = ChangeState
Triggerall = power >= 1000
value = 1710
triggerall = command = "SuperKameramera"
trigger1 = (statetype = a) && ctrl

;---------------------------------------------------------------------------
; Super Kameramera
[State -1, Super Kameramera]
type = ChangeState
Triggerall = power >= 1000
value = 1700
triggerall = command = "SuperKameramera"
triggerall = statetype != A
trigger1 = ctrl

;---------------------------------------------------------------------------
; Instant Transmission Kamehameha
[State -1, Instant Transmission Kamehameha]
type = ChangeState
Triggerall = power >= 2000
value = 1800
triggerall = command = "Instant Transmission Kamehameha"
triggerall = statetype != A
trigger1 = ctrl

;---------------------------------------------------------------------------
; Meteor Smash
[State -1, Meteor Smash]
type = ChangeState
Triggerall = power >= 3000
value = 1900
triggerall = command = "Meteor Smash"
triggerall = statetype != A
trigger1 = ctrl

;===========================================================================
;--------------------------------Ataques Especiales-------------------------
;===========================================================================

;---------------------------------------------------------------------------
;Air Dragon Flash Fist Heavy
[State -1, Air Dragon Flash Fist Heavy]
type = ChangeState
value = 1220
Triggerall = power >= 1000
triggerall = command = "Dragon Flash Fist Heavy"
trigger1 = (statetype = a) && ctrl

;---------------------------------------------------------------------------
;Dragon Flash Fist Heavy
[State -1,Dragon Flash Fist Heavy]
type = ChangeState
value = 1220
Triggerall = power >= 1000
triggerall = command = "Dragon Flash Fist Heavy"
trigger1 = (statetype = s) && ctrl

;---------------------------------------------------------------------------
;Air Dragon Flash Fist Medium
[State -1, Air Dragon Flash Fist Medium]
type = ChangeState
value = 1210
triggerall = command = "Dragon Flash Fist Medium"
trigger1 = (statetype = a) && ctrl

;---------------------------------------------------------------------------
;Dragon Flash Fist Medium
[State -1,Dragon Flash Fist Medium]
type = ChangeState
value = 1210
triggerall = command = "Dragon Flash Fist Medium"
trigger1 = (statetype = s) && ctrl

;---------------------------------------------------------------------------
;Air Dragon Flash Fist Light
[State -1, Air Dragon Flash Fist Light]
type = ChangeState
value = 1200
triggerall = command = "Dragon Flash Fist Light"
trigger1 = (statetype = a) && ctrl

;---------------------------------------------------------------------------
;Dragon Flash Fist Light
[State -1,Dragon Flash Fist Light]
type = ChangeState
value = 1200
triggerall = command = "Dragon Flash Fist Light"
trigger1 = (statetype = s) && ctrl

;---------------------------------------------------------------------------
;Air Kameramera
[State -1, Air Kameramera]
type = ChangeState
value = 1110
triggerall = command = "Kameramera"
trigger1 = (statetype = a) && ctrl

;---------------------------------------------------------------------------
;Kameramera
[State -1, Kameramera]
type = ChangeState
value = 1100
triggerall = command = "Kameramera"
trigger1 = (statetype = s) && ctrl

;---------------------------------------------------------------------------
;Rapid Kick Rush
[State -1, Rapid Kick Rush]
type = ChangeState
value = 1000
triggerall = command = "Rapid Kick Rush"
trigger1 = (statetype = s) && ctrl

;---------------------------------------------------------------------------
;Air Rapid Kick Rush
[State -1, Air Rapid Kick Rush]
type = ChangeState
value = 1000
triggerall = command = "Rapid Kick Rush"
trigger1 = (statetype = a) && ctrl

;---------------------------------------------------------------------------
;Rapid Kick Rush Medium
[State -1, Rapid Kick Rush Medium]
type = ChangeState
value = 1010
triggerall = command = "Rapid Kick Rush Medium"
trigger1 = (statetype = s) && ctrl

;---------------------------------------------------------------------------
;Air Rapid Kick Rush Medium
[State -1, Air Rapid Kick Rush Medium]
type = ChangeState
value = 1010
triggerall = command = "Rapid Kick Rush Medium"
trigger1 = (statetype = a) && ctrl

;---------------------------------------------------------------------------
;Rapid Kick Rush Heavy
[State -1, Rapid Kick Rush Heavy]
type = ChangeState
Triggerall = power >= 1000
value = 1020
triggerall = command = "Rapid Kick Rush Heavy"
trigger1 = (statetype = s) && ctrl

;---------------------------------------------------------------------------
;Air Rapid Kick Rush Heavy
[State -1, Air Rapid Kick Rush Heavy]
type = ChangeState
Triggerall = power >= 1000
value = 1020
triggerall = command = "Rapid Kick Rush Heavy"
trigger1 = (statetype = a) && ctrl

;===========================================================================
;---------------------------------------------------------------------------
; Air Sparking Blast
[State -1, Air Sparking Blast]
type = ChangeState
value = 951
triggerall = command = "Sparking Blast"
trigger1 = statetype != S
trigger1 = ctrl

;---------------------------------------------------------------------------
; Sparking Blast
[State -1, Sparking Blast]
type = ChangeState
value = 950
triggerall = command = "Sparking Blast"
trigger1 = statetype != A
trigger1 = ctrl

;---------------------------------------------------------------------------
; Super Dash Air
[State -1, Super Dash Air]
type = ChangeState
value = 700
triggerall = command = "SuperDash"
trigger1 = statetype != A
trigger1 = ctrl

;---------------------------------------------------------------------------
; Super Dash
[State -1, Super Dash]
type = ChangeState
value = 700
triggerall = command = "SuperDash"
trigger1 = statetype != S
trigger1 = ctrl

;---------------------------------------------------------------------------
; Air Special Attack
[State -1, Air Special Attack]
type = ChangeState
value = 526
triggerall = command = "SpecialAttack"
trigger1 = statetype = A
trigger1 = ctrl

;---------------------------------------------------------------------------
; Special Attack
[State -1, Special Attack]
type = ChangeState
value = 520
triggerall = command = "SpecialAttack"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
; DragonRush
[State -1, DragonRush]
type = ChangeState
value = 900
triggerall = command = "DragonRush"
trigger1 = statetype != a
trigger1 = ctrl

;---------------------------------------------------------------------------
; Air DragonRush
[State -1, Air DragonRush]
type = ChangeState
value = 910
triggerall = command = "DragonRush"
trigger1 = statetype != s
trigger1 = ctrl

;---------------------------------------------------------------------------
; Air Vanish
[State -1, Air Vanish]
type = ChangeState
Triggerall = power >= 1000
value = 800
triggerall = command = "Vanish"
trigger1 = statetype = A
trigger1 = ctrl

;---------------------------------------------------------------------------
; Vanish
[State -1, Vanish]
type = ChangeState
Triggerall = power >= 1000
value = 800
triggerall = command = "Vanish"
trigger1 = statetype != a
trigger1 = ctrl

;---------------------------------------------------------------------------
; Taunt
[State -1, Taunt]
type = ChangeState
value = 195
triggerall = command = "s"
trigger1 = statetype != A
trigger1 = ctrl

;---------------------------------------------------------------------------
; Light Attack
[State -1, Light Attack]
type = ChangeState
value = 200
triggerall = command = "LightAttack"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
; Medium Attack
[State -1, Medium Attack]
type = ChangeState
value = 210
triggerall = command = "MediumAttack"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
; Heavy Attack
[State -1, Heavy Attack]
type = ChangeState
value = 220
triggerall = command = "HeavyAttack"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
; Crouching Light Attack
[State -1, Crouching Light Attack]
type = ChangeState
value = 400
triggerall = command = "LightAttack"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl

;---------------------------------------------------------------------------
; Crouching Medium Attack
[State -1, Crouching Medium Attack]
type = ChangeState
value = 410
triggerall = command = "MediumAttack"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl

;---------------------------------------------------------------------------
; Crouching Heavy Attack
[State -1, Crouching Heavy Attack]
type = ChangeState
value = 420
triggerall = command = "HeavyAttack"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl

;---------------------------------------------------------------------------
; Jump Light Attack
[State -1, Jump Light Attack]
type = ChangeState
value = 600
triggerall = command = "LightAttack"
trigger1 = statetype = A
trigger1 = ctrl

;---------------------------------------------------------------------------
; Jump Medium Attack
[State -1, Jump Medium Attack]
type = ChangeState
value = 610
triggerall = command = "MediumAttack"
trigger1 = statetype = A
trigger1 = ctrl

;---------------------------------------------------------------------------
; Jump Heavy Attack
[State -1, Jump Heavy Attack]
type = ChangeState
value = 620
triggerall = command = "HeavyAttack"
trigger1 = statetype = A
trigger1 = ctrl

;---------------------------------------------------------------------------
