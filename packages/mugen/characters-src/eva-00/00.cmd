;------------------------------------------------------------------------------------
;------------------------------------------------------------------------------------
;Eva-00 By TonyADV
;------------------------------------------------------------------------------------
;------------------------------------------------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;Eva-00 Comand File By TonyADV
;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------

;-| AI Command |--------------------------------
[Command]
name = "AI1"
command = a, a, a
time = 1

[Command]
name = "AI2"
command = b, b, b
time = 1

[Command]
name = "AI3"
command = c, c, c
time = 1

[Command]
name = "AI4"
command = x, x, x
time = 1

[Command]
name = "AI5"
command = y, y, y
time = 1

[Command]
name = "AI6"
command = z, z, z
time = 1

[Command]
name = "AI7"
command = a, b, c
time = 1

[Command]
name = "AI8"
command = a, c, b
time = 1

[Command]
name = "AI9"
command = b, a, c
time = 1

[Command]
name = "AI10"
command = b, c, a
time = 1

[Command]
name = "AI11"
command = c, b, a
time = 1

[Command]
name = "AI12"
command = c, a, b
time = 1

[Command]
name = "AI13"
command = x, y, z
time = 1

[Command]
name = "AI14"
command = x, z, y
time = 1

[Command]
name = "AI15"
command = y, z, x
time = 1

[Command]
name = "AI16"
command = y, x, z
time = 1

[Command]
name = "AI17"
command = z, y, x
time = 1

[Command]
name = "AI18"
command = z, x, y
time = 1

[Command]
name = "AI19"
command = a, b, a
time = 1

[Command]
name = "AI20"
command = a, c, a
time = 1

[Command]
name = "AI21"
command = b, a, b
time = 1

[Command]
name = "AI22"
command = b, c, b
time = 1

[Command]
name = "AI23"
command = c, a, c
time = 1

[Command]
name = "AI24"
command = c, b, c
time = 1

[Command]
name = "AI25"
command = x, y, x
time = 1

[Command]
name = "AI26"
command = x, z, x
time = 1

[Command]
name = "AI27"
command = y, x, y
time = 1

[Command]
name = "AI28"
command = y, z, y
time = 1

[Command]
name = "AI29"
command = z, x, z
time = 1

[Command]
name = "AI30"
command = z, y, z
time = 1


;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;-| Normal Command |----------------------------
;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------

;-| Super Motions |-----------------------------

;Knife
[Command]
name = "Knife"
command =  B, DB, D, DF, F, a
time = 35

;Laser
[Command]
name = "Laser"
command = B, DB, D, DF, F, b
time = 35

;Cannon
[Command]
name = "Cannon"
command = B, DB, D, DF, F, c
time = 35

;Ronginus
[Command]
name = "Ronginus"
command = B, DB, D, DF, F, z
time = 35

;-| Special Motions |----------------------------


;ATField
[Command]
name = "ATField"
command = ~D, DB, B, a
time = 25
[Command]
name = "ATField"
command = ~D, DB, B, b
time = 25
[Command]
name = "ATField"
command = ~D, DB, B, c
time = 25
[Command]
name = "ATField"
command = ~D, DB, B, x
time = 25
[Command]
name = "ATField"
command = ~D, DB, B, y
time = 25
[Command]
name = "ATField"
command = ~D, DB, B, z
time = 25

;Gomitata
[Command]
name = "Gomitata"
command = ~D, DF, F, a
time = 20

;Pistola
[Command]
name = "Pistola"
command = ~D, DF, F, b
time = 20

;Mitra
[Command]
name = "Mitra"
command =  ~D, DF, F, c
time = 20

;Uppercut
[Command]
name = "Uppercut"
command = ~F, D, DF, a
time = 25
[Command]
name = "Uppercut"
command = ~F, D, DF, b
time = 25
[Command]
name = "Uppercut"
command = ~F, D, DF, c
time = 25

;Carikamento
[Command]
name = "charge"
command = /c
time= 1
[Command]
name = "charge 1"
command= /z
time= 1

;-| Double Tap |-------------------------------------
;Corsa Avanti
[Command]
name = "FF"     ;Required (do not remove)
command = F, F
time = 10

;Scatto indietro
[Command]
name = "BB"     ;Required (do not remove)
command = B, B
time = 10

;-| 2/3 Button Combination |---------------------------
[Command]
name = "recovery";Required (do not remove)
command = x+y
time = 1

;-| Dir + Button |--------------------------------------
[Command]
name = "down_a"
command = /$D,a
time = 1

[Command]
name = "down_b"
command = /$D,b
time = 1

;-| Single Button |--------------------------------------
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

;-| Hold Dir |--------------------------------------
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

;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;-------------- CMD standard -------------------
[Statedef -1]
;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;===============================================

;Potenziamento
[State -1]
type = ChangeState
value = 900
triggerall = statetype = S
triggerall = Power < 3000
triggerall = ctrl = 1
trigger1 = command = "charge"
trigger1 = command = "charge 1"

;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------

;Ronginus
[State -1]
type = ChangeState
value = 3030
triggerall = command = "Ronginus"
triggerall = power >= 3000
trigger1 = statetype != A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 230
trigger5 = movecontact >= 1
trigger6 = stateno = 240
trigger6 = movecontact >= 1
trigger7 = stateno = 245
trigger7 = movecontact >= 1
trigger8 = stateno = 250
trigger8 = movecontact >= 1
trigger9 = stateno = 225
trigger9 = movecontact >= 1

;Knife
[State -1]
type = ChangeState
value = 3000
triggerall = command =  "Knife"
triggerall = power >= 1000
trigger1 = statetype != A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 225
trigger5 = movecontact >= 1

;Laser
[State -1]
type = ChangeState
value = 3005
triggerall = command = "Laser"
triggerall = power >= 2000
trigger1 = statetype != A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 230
trigger5 = movecontact >= 1
trigger6 = stateno = 240
trigger6 = movecontact >= 1
trigger7 = stateno = 245
trigger7 = movecontact >= 1
trigger8 = stateno = 250
trigger8 = movecontact >= 1
trigger9 = stateno = 225
trigger9 = movecontact >= 1

;Cannon
[State -1]
type = ChangeState
value = 3010
triggerall = command = "Cannon"
triggerall = power >= 2000
trigger1 = statetype != A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 225
trigger5 = movecontact >= 1

;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------

;ATField
[State -1]
type = ChangeState
value = 1080
triggerall = command = "ATField"
trigger1 = statetype != A
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 230
trigger5 = movecontact >= 1
trigger6 = stateno = 240
trigger6 = movecontact >= 1
trigger7 = stateno = 245
trigger7 = movecontact >= 1
trigger8 = stateno = 250
trigger8 = movecontact >= 1
trigger9 = stateno = 225
trigger9 = movecontact >= 1

;Uppercut
[State -1]
type = ChangeState
value = 1020
triggerall = command = "Uppercut"
trigger1 = statetype != A
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 230
trigger5 = movecontact >= 1
trigger6 = stateno = 225
trigger6 = movecontact >= 1

;Pistola
[State -1]
type = ChangeState
value = 1000
triggerall = command = "Pistola"
trigger1 = statetype != A
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 1030
trigger5 = movecontact >= 1
trigger6 = stateno = 225
trigger6 = movecontact >= 1

;Mitra
[State -1]
type = ChangeState
value = 1010
triggerall = command = "Mitra"
trigger1 = statetype != A
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 1030
trigger5 = movecontact >= 1
trigger6 = stateno = 225
trigger6 = movecontact >= 1

;Gomitata
[State -1]
type = ChangeState
value = 1030
triggerall = command = "Gomitata"
trigger1 = statetype != A
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 230
trigger5 = movecontact >= 1
trigger6 = stateno = 225
trigger6 = movecontact >= 1

;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;Corsa
[State -1]
type = ChangeState
value = 100
trigger1 = command = "FF"
trigger1 = statetype = S
trigger1 = ctrl

;Scatto indietro
[State -1]
type = ChangeState
value = 105
trigger1 = command = "BB"
trigger1 = statetype = S
trigger1 = ctrl

;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------

;presa
[State -1]
type = ChangeState
value = 800
triggerall = command = "c"
triggerall = statetype = S
triggerall = ctrl
triggerall = stateno != 100
trigger1 = command = "holdfwd"
trigger1 = p2bodydist X < 5
trigger1 = (p2statetype = S) || (p2statetype = C)
trigger1 = p2movetype != H


;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------

;Pugno debole
[State -1]
type = ChangeState
value = 200
triggerall = command = "a"
trigger1 = statetype = S
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 230
trigger5 = movecontact >= 1
trigger6 = stateno = 240
trigger6 = movecontact >= 1
trigger7 = stateno = 245
trigger7 = movecontact >= 1
trigger8 = stateno = 250
trigger8 = movecontact >= 1
trigger9 = stateno = 225
trigger9 = movecontact >= 1

;Pugno medio
[State -1]
type = ChangeState
value = 210
triggerall = command = "b"
trigger1 = statetype = S
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 230
trigger5 = movecontact >= 1
trigger6 = stateno = 240
trigger6 = movecontact >= 1
trigger7 = stateno = 245
trigger7 = movecontact >= 1
trigger8 = stateno = 250
trigger8 = movecontact >= 1
trigger9 = stateno = 225
trigger9 = movecontact >= 1


;Pugno Forte Vicino
[State -1]
type = ChangeState
value = 225
triggerall = command = "c"
trigger1 = P2bodydist X <= 50
trigger1 = statetype = S
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 230
trigger5 = movecontact >= 1
trigger6 = stateno = 240
trigger6 = movecontact >= 1
trigger7 = stateno = 245
trigger7 = movecontact >= 1
trigger8 = stateno = 250
trigger8 = movecontact >= 1
trigger9 = stateno = 225
trigger9 = movecontact >= 1


;Pugno Forte
[State -1]
type = ChangeState
value = 220
triggerall = command = "c"
trigger1 = statetype = S
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 230
trigger5 = movecontact >= 1
trigger6 = stateno = 240
trigger6 = movecontact >= 1
trigger7 = stateno = 245
trigger7 = movecontact >= 1
trigger8 = stateno = 250
trigger8 = movecontact >= 1
trigger9 = stateno = 225
trigger9 = movecontact >= 1

;-----------------------------------------------

;Calcio debole
[State -1]
type = ChangeState
value = 230
triggerall = command = "x"
trigger1 = statetype = S
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 230
trigger5 = movecontact >= 1
trigger6 = stateno = 240
trigger6 = movecontact >= 1
trigger7 = stateno = 245
trigger7 = movecontact >= 1
trigger8 = stateno = 250
trigger8 = movecontact >= 1
trigger9 = stateno = 225
trigger9 = movecontact >= 1

;Calcio medio Vicino
[State -1]
type = ChangeState
value = 245
triggerall = command = "y"
trigger1 = P2bodydist X <= 30
trigger1 = statetype = S
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 230
trigger5 = movecontact >= 1
trigger6 = stateno = 240
trigger6 = movecontact >= 1
trigger7 = stateno = 245
trigger7 = movecontact >= 1
trigger8 = stateno = 250
trigger8 = movecontact >= 1
trigger9 = stateno = 225
trigger9 = movecontact >= 1

;Calcio medio
[State -1]
type = ChangeState
value = 240
triggerall = command = "y"
trigger1 = statetype = S
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 230
trigger5 = movecontact >= 1
trigger6 = stateno = 240
trigger6 = movecontact >= 1
trigger7 = stateno = 245
trigger7 = movecontact >= 1
trigger8 = stateno = 250
trigger8 = movecontact >= 1
trigger9 = stateno = 225
trigger9 = movecontact >= 1

;Calcio Forte
[State -1]
type = ChangeState
value = 250
triggerall = command = "z"
trigger1 = statetype = S
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 200
trigger2 = movecontact >= 1
trigger3 = stateno = 210
trigger3 = movecontact >= 1
trigger4 = stateno = 220
trigger4 = movecontact >= 1
trigger5 = stateno = 230
trigger5 = movecontact >= 1
trigger6 = stateno = 240
trigger6 = movecontact >= 1
trigger7 = stateno = 245
trigger7 = movecontact >= 1
trigger8 = stateno = 250
trigger8 = movecontact >= 1
trigger9 = stateno = 225
trigger9 = movecontact >= 1

;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;pugno abbasato debole
[State -1]
type = ChangeState
value = 400
triggerall = command = "a"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 400
trigger2 = movecontact >= 1
trigger3 = stateno = 410
trigger3 = movecontact >= 1
trigger4 = stateno = 430
trigger4 = movecontact >= 1

;pugno abbasato medio
[State -1]
type = ChangeState
value = 410
triggerall = command = "b"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 400
trigger2 = movecontact >= 1
trigger3 = stateno = 410
trigger3 = movecontact >= 1
trigger4 = stateno = 430
trigger4 = movecontact >= 1

;pugno abbasato forte
[State -1]
type = ChangeState
value = 420
triggerall = command = "c"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 400
trigger2 = movecontact >= 1
trigger3 = stateno = 410
trigger3 = movecontact >= 1
trigger4 = stateno = 430
trigger4 = movecontact >= 1
trigger5 = stateno = 440
trigger5 = movecontact >= 1

;-------------------------------------------------
;calcio abbasato debole
[State -1]
type = ChangeState
value = 430
triggerall = command = "x"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 400
trigger2 = movecontact >= 1
trigger3 = stateno = 410
trigger3 = movecontact >= 1
trigger4 = stateno = 430
trigger4 = movecontact >= 1
trigger5 = stateno = 440
trigger5 = movecontact >= 1

;calcio abbasato medio
[State -1]
type = ChangeState
value = 440
triggerall = command = "y"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 400
trigger2 = movecontact >= 1
trigger3 = stateno = 410
trigger3 = movecontact >= 1
trigger4 = stateno = 430
trigger4 = movecontact >= 1
trigger5 = stateno = 450
trigger5 = movecontact >= 1

;calcio abbasato in scivolata
[State -1]
type = ChangeState
value = 450
triggerall = command = "z"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 400
trigger2 = movecontact >= 1
trigger3 = stateno = 410
trigger3 = movecontact >= 1
trigger4 = stateno = 430
trigger4 = movecontact >= 1
trigger5 = stateno = 440
trigger5 = movecontact >= 1
trigger6 = stateno = 450
trigger6 = movecontact >= 1

;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;pugno debole in salto
[State -1]
type = ChangeState
value = 600
triggerall = command = "a"
trigger1 = statetype = A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 600
trigger2 = movecontact >= 1
trigger3 = stateno = 610
trigger3 = movecontact >= 1
trigger4 = stateno = 620
trigger4 = movecontact >= 1
trigger5 = stateno = 630
trigger5 = movecontact >= 1
trigger6 = stateno = 640
trigger6 = movecontact >= 1
trigger7 = stateno = 650
trigger7 = movecontact >= 1

;pugno medio in salto
[State -1]
type = ChangeState
value = 610
triggerall = command = "b"
trigger1 = statetype = A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 600
trigger2 = movecontact >= 1
trigger3 = stateno = 610
trigger3 = movecontact >= 1
trigger4 = stateno = 620
trigger4 = movecontact >= 1
trigger5 = stateno = 630
trigger5 = movecontact >= 1
trigger6 = stateno = 640
trigger6 = movecontact >= 1
trigger7 = stateno = 650
trigger7 = movecontact >= 1

;pugno forte in salto
[State -1]
type = ChangeState
value = 620
triggerall = command = "c"
trigger1 = statetype = A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 600
trigger2 = movecontact >= 1
trigger3 = stateno = 610
trigger3 = movecontact >= 1
trigger4 = stateno = 620
trigger4 = movecontact >= 1
trigger5 = stateno = 630
trigger5 = movecontact >= 1
trigger6 = stateno = 640
trigger6 = movecontact >= 1
trigger7 = stateno = 650
trigger7 = movecontact >= 1

;------------------------------------------------
;calcio debole in salto
[State -1]
type = ChangeState
value = 630
triggerall = command = "x"
trigger1 = statetype = A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 600
trigger2 = movecontact >= 1
trigger3 = stateno = 610
trigger3 = movecontact >= 1
trigger4 = stateno = 620
trigger4 = movecontact >= 1
trigger5 = stateno = 630
trigger5 = movecontact >= 1
trigger6 = stateno = 640
trigger6 = movecontact >= 1
trigger7 = stateno = 650
trigger7 = movecontact >= 1

;calcio medio in salto
[State -1]
type = ChangeState
value = 640
triggerall = command = "y"
trigger1 = statetype = A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 600
trigger2 = movecontact >= 1
trigger3 = stateno = 610
trigger3 = movecontact >= 1
trigger4 = stateno = 620
trigger4 = movecontact >= 1
trigger5 = stateno = 630
trigger5 = movecontact >= 1
trigger6 = stateno = 640
trigger6 = movecontact >= 1
trigger7 = stateno = 650
trigger7 = movecontact >= 1

;calcio forte in salto
[State -1]
type = ChangeState
value = 650
triggerall = command = "z"
trigger1 = statetype = A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 600
trigger2 = movecontact >= 1
trigger3 = stateno = 610
trigger3 = movecontact >= 1
trigger4 = stateno = 620
trigger4 = movecontact >= 1
trigger5 = stateno = 630
trigger5 = movecontact >= 1
trigger6 = stateno = 640
trigger6 = movecontact >= 1
trigger7 = stateno = 650
trigger7 = movecontact >= 1

;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------

;-----------------------------------------------
;-| AI Variabile |------------------------------
;-----------------------------------------------

[State -1, AI]
type = Varset
trigger1 = command = "AI1"
trigger2 = command = "AI2"
trigger3 = command = "AI3"
trigger4 = command = "AI4"
trigger5 = command = "AI5"
trigger6 = command = "AI6"
trigger7 = command = "AI7"
trigger8 = command = "AI8"
trigger9 = command = "AI9"
trigger10 = command = "AI10"
trigger11 = command = "AI11"
trigger12 = command = "AI12"
trigger13 = command = "AI13"
trigger14 = command = "AI14"
trigger15 = command = "AI15"
trigger16 = command = "AI16"
trigger17 = command = "AI17"
trigger18 = command = "AI18"
trigger19 = command = "AI19"
trigger20 = command = "AI20"
trigger21 = command = "AI21"
trigger22 = command = "AI22"
trigger23 = command = "AI23"
trigger24 = command = "AI24"
trigger25 = command = "AI25"
trigger26 = command = "AI26"
trigger27 = command = "AI27"
trigger28 = command = "AI28"
trigger29 = command = "AI29"
trigger30 = command = "AI30"
v = 59
value = 1

;-----------------------------------
; ------ AI Standing Guard ---------
;-----------------------------------
[State -1]
type = ChangeState
triggerall = var(59) = 1 
triggerall = Statetype != A 
triggerall = P2statetype != C 
triggerall = Statetype = S 
triggerall = P2Movetype = A 
triggerall = Pos Y != [-1,-999]
triggerall = ctrl = 1
trigger1 = random <= 999 
value = 130
[State -1]
type = ChangeState 
triggerall = (Var(30) = 59) && (StateType = S) && (Pos Y = 0) && (P2BodyDist Y <= 0) 
triggerall = (P2BodyDist Y = -120) && (P2StateType != C) && (P2MoveType = A) 
trigger1 = (P2BodyDist X <= 120) && (Random <= 799) && (Ctrl) 
trigger2 = (StateNo = [140, 155]) || (StateNo = [100, 105]) 
value = 130 

;-----------------------------------
; ------ AI Standing Guard ---------
;-----------------------------------
; AI Stand to Crouch Guard Transition
[State -1]
type = ChangeState
triggerall = var(59) = 1
triggerall = StateType != A
triggerall = P2statetype = C
triggerall = P2Movetype = A
triggerall = Pos Y != [-1,-999]
trigger1 = stateno = 150
trigger1 = 1
value = 152

; AI Crouching Guard
[State -1]
type = ChangeState
triggerall = var(59) = 1
triggerall = StateType != A
triggerall = P2statetype = C
triggerall = P2Movetype = A
triggerall = Pos Y != [-1,-999]
triggerall = ctrl = 1
trigger1 = random <= 900
value = 131
[State -1]
type = ChangeState 
triggerall = (Var(30) = 59) && (StateType != A) && (Pos Y = 0) && (P2BodyDist Y <= 0) 
triggerall = (P2BodyDist Y = -50) && (P2StateType = C) && (P2MoveType = A) 
trigger1 = (P2BodyDist X <= 120) && (Random <= 799) && (Ctrl) 
trigger2 = (StateNo = [140, 155]) || (StateNo = [100, 105]) 
value = 131

;-----------------------------------
; ------- AI Aerial Guard ---------
;-----------------------------------

; AI Crouch to Stand Guard Transition
[State -1]
type = ChangeState
triggerall = var(59) = 1
triggerall = Statetype != A
triggerall = P2statetype != C
triggerall = P2Movetype = A
trigger1 = 1
trigger1 = stateno = 152
value = 150

;AI Aerial Guard
[State -1]
type = ChangeState
triggerall = var(59) = 1
triggerall = Statetype = A
triggerall = P2Movetype = A
triggerall = ctrl = 1
trigger1 = random <= 900
value = 132
[State -1]
type = ChangeState 
triggerall = (Var(30) = 59) && (StateType = A) && (Pos Y = 0)  && (P2BodyDist Y = -120) 
triggerall = (StateType = A) && (P2MoveType = A) 
trigger1 = ((P2BodyDist X <= 120) && (Ctrl)) || (StateNo = [140, 155]) 
value = 132 

;-----------------------------------
; ------ ATField Guard ---------
;-----------------------------------
[State -1]
type = ChangeState
triggerall = var(59) = 1 
triggerall = Statetype != A 
triggerall = P2statetype != C 
triggerall = Statetype = S 
triggerall = P2Movetype = A 
triggerall = Pos Y != [-1,-999]
triggerall = ctrl = 1
trigger1 = random <= 999 
value = 1080
[State -1]
type = ChangeState
triggerall = var(1) = 0 
triggerall = (Var(30) = 59) && (StateType = S) && (Pos Y = 0) && (P2BodyDist Y <= 0) 
triggerall = (P2BodyDist Y = -120) && (P2StateType != C) && (P2MoveType = A) 
trigger1 = (P2BodyDist X <= 120) && (Random <= 799) && (Ctrl) 
trigger2 = (StateNo = [140, 155]) || (StateNo = [100, 105]) 
value = 1080 

;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------

