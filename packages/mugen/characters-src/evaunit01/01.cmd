;#ADD004BASIC PIEs#
;------------------------------------------------------------------------------------
;------------------------------------------------------------------------------------
;Eva-01 By TonyADV
;------------------------------------------------------------------------------------
;------------------------------------------------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;Eva-01 Comand File By TonyADV
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

;-| OHKO Desparation Move | -------------------------
;Awakening (Evangelion 2.0)
[Command]
name = "Awakening"
command = x+y+z
time = 35
;-| Super Motions |-----------------------------

;Knife
[Command]
name = "Knife"
command = a+x
time = 35

;Laser
[Command]
name = "Laser"
command = b+y
time = 35

;Cannon
[Command]
name = "Cannon"
command = c+z
time = 35

;the Spear of Cassius (Evangelion 3.0+1.0)
[Command]
name = "Cassius"
command = a+b+c
time = 35

;-| Special Motions |----------------------------


;ATField
[Command]
name = "ATField"
command = ~B, a
time = 25
[Command]
name = "ATField"
command = ~B, b
time = 25
[Command]
name = "ATField"
command = ~B, c
time = 25
[Command]
name = "ATField"
command = ~B, x
time = 25
[Command]
name = "ATField"
command = ~B, y
time = 25
[Command]
name = "ATField"
command = ~B, z
time = 25

;Gomitata
[Command]
name = "Gomitata"
command = ~F, a
time = 20

;Pistola
[Command]
name = "Pistola"
command = ~F, b
time = 20

;Mitra
[Command]
name = "Mitra"
command =  ~F, c
time = 20

;Uppercut
[Command]
name = "Uppercut"
command = ~DF,a
time = 25
[Command]
name = "Uppercut"
command = ~DF,b
time = 25
[Command]
name = "Uppercut"
command = ~DF,c
time = 25

;Super Calcio
[Command]
name = "Super Calcio"
command = ~DF,x
time = 25
[Command]
name = "Super Calcio"
command = ~DF,y
time = 25
[Command]
name = "Super Calcio"
command = ~DF,z
time = 25

;Carikamento
[Command]
name = "charge"
command = /s
time= 1
[Command]
name = "charge 1"
command= /s
time= 1

;Berserk
[Command]
name = "auto-berserk"
command = ~DF,s
time = 25

[Command]
name = "auto-berserk"
command = ~D, F, s
time = 25

[Command]
name = "auto-berserk"
command = D+F+s
time = 25

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

;##[a4b_-1_start.v20200523]##
;//==========================
;// add004-1-sctrls-start
;//==========================
;--- partner_standby
[state 0]
	type=selfstate
	value=190190
	ctrl=0
	trigger1=ctrl && numpartner && !ishelper && roundstate=2 && pos y=0
	trigger1=(sysfvar(4)>0) && (sysfvar(0)>0) && playeridexist(floor(sysfvar(0)))
	trigger1=(playerid(floor(sysfvar(0))),var(0)=90900) && (playerid(floor(sysfvar(0))),var(22)=4)
	ignorehitpause=1
;##Add.List01##
;//==========================
;// add004-1-sctrls-end
;//==========================
;##[a4b_-1_end]##



;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;===============================================

;Potenziamento
[State -1]
type = ChangeState
value = 900
triggerall = var(1) = 0
triggerall = statetype = S
triggerall = Power < 3000
triggerall = ctrl = 1
trigger1 = command = "charge"
trigger1 = command = "charge 1"

[State -1]
;berserk mode
type = ChangeState
value = 8887
triggerall = var(1) = 0
triggerall = statetype = S
triggerall = ctrl = 1
trigger1 = command = "auto-berserk"
;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;Cassius
[State -1]
type = ChangeState
value = 3030
triggerall = var(1) = 0
triggerall = command = "Cassius"
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

;OHKO - Awakening (Only usable at 20% health or less if in normal mode)
[State -1]
type = ChangeState
value = 3035
triggerall = var(1) = 0
triggerall = command = "Awakening"
triggerall = life <= 200
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
triggerall = var(1) = 0
triggerall = command = "Knife"
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

;Laser
[State -1]
type = ChangeState
value = 3005
triggerall = var(1) = 0
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

;Cannon
[State -1]
type = ChangeState
value = 3010
triggerall = var(1) = 0
triggerall = command = "Cannon"
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


;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------

;ATField
[State -1]
type = ChangeState
value = 1080
triggerall = var(1) = 0
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

;Uppercut
[State -1]
type = ChangeState
value = 1020
triggerall = var(1) = 0
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

;Pistola
[State -1]
type = ChangeState
value = 1000
triggerall = var(1) = 0
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

;Mitra
[State -1]
type = ChangeState
value = 1010
triggerall = var(1) = 0
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

;Gomitata
[State -1]
type = ChangeState
value = 1030
triggerall = var(1) = 0
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

;Super Calcio
[State -1]
type = ChangeState
value = 1050
triggerall = var(1) = 0
triggerall = command = "Super Calcio"
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

;presa2
[State -1]
type = ChangeState
value = 825
triggerall = command = "z"
triggerall = statetype = S
triggerall = ctrl
triggerall = stateno != 100
trigger1 = command = "holdfwd"
trigger1 = p2bodydist X < 5
trigger1 = (p2statetype = S) || (p2statetype = C)
trigger1 = p2movetype != H

;presa
[State -1]
type = ChangeState
value = 800
triggerall = var(1) = 0
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
triggerall = var(1) = 0
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

;Pugno medio
[State -1]
type = ChangeState
value = 210
triggerall = var(1) = 0
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

;Pugno Forte
[State -1]
type = ChangeState
value = 220
triggerall = var(1) = 0
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

;-----------------------------------------------

;Calcio debole
[State -1]
type = ChangeState
value = 230
triggerall = var(1) = 0
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

;Calcio medio Vicino
[State -1]
type = ChangeState
value = 245
triggerall = var(1) = 0
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

;Calcio medio
[State -1]
type = ChangeState
value = 240
triggerall = var(1) = 0
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

;Calcio Forte
[State -1]
type = ChangeState
value = 250
triggerall = var(1) = 0
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

;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;pugno abbasato debole
[State -1]
type = ChangeState
value = 400
triggerall = var(1) = 0
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
triggerall = var(1) = 0
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
triggerall = var(1) = 0
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
triggerall = var(1) = 0
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
triggerall = var(1) = 0
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
triggerall = var(1) = 0
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
triggerall = var(1) = 0
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
triggerall = var(1) = 0
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
triggerall = var(1) = 0
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
triggerall = var(1) = 0
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
triggerall = var(1) = 0
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
triggerall = var(1) = 0
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
;BERSERK MODE
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
;-----------------------------------------------
;SUPER\SPECIAL STATE BERSERK MODE
;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------

;Cassius
[State -1]
type = ChangeState
value = 3036
triggerall = var(1) = 1
triggerall = command = "Cassius"
trigger1 = statetype != A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 202
trigger2 = movecontact >= 1
trigger3 = stateno = 212
trigger3 = movecontact >= 1
trigger4 = stateno = 222
trigger4 = movecontact >= 1
trigger5 = stateno = 232
trigger5 = movecontact >= 1
trigger6 = stateno = 242
trigger6 = movecontact >= 1
trigger7 = stateno = 247
trigger7 = movecontact >= 1
trigger8 = stateno = 252
trigger8 = movecontact >= 1

;OHKO - Awakening
[State -1]
type = ChangeState
value = 3039
triggerall = var(1) = 1
triggerall = command = "Awakening"
triggerall = power >= 3000
trigger1 = statetype != A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 202
trigger2 = movecontact >= 1
trigger3 = stateno = 212
trigger3 = movecontact >= 1
trigger4 = stateno = 222
trigger4 = movecontact >= 1
trigger5 = stateno = 232
trigger5 = movecontact >= 1
trigger6 = stateno = 242
trigger6 = movecontact >= 1
trigger7 = stateno = 247
trigger7 = movecontact >= 1
trigger8 = stateno = 252
trigger8 = movecontact >= 1 
;Super Combo1
[State -1]
type = ChangeState
value = 3060
triggerall = var(1) = 1
triggerall = command = "Knife"
triggerall = power >= 1000
trigger1 = statetype != A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 202
trigger2 = movecontact >= 1
trigger3 = stateno = 212
trigger3 = movecontact >= 1
trigger4 = stateno = 222
trigger4 = movecontact >= 1
trigger5 = stateno = 232
trigger5 = movecontact >= 1
trigger6 = stateno = 242
trigger6 = movecontact >= 1
trigger7 = stateno = 247
trigger7 = movecontact >= 1
trigger8 = stateno = 252
trigger8 = movecontact >= 1

;Super Combo2
[State -1]
type = ChangeState
value = 3040
triggerall = var(1) = 1
triggerall = command = "Laser"
triggerall = power >= 1000
trigger1 = statetype != A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 202
trigger2 = movecontact >= 1
trigger3 = stateno = 222
trigger3 = movecontact >= 1
trigger4 = stateno = 232
trigger4 = movecontact >= 1
trigger5 = stateno = 242
trigger5 = movecontact >= 1
trigger6 = stateno = 252
trigger6 = movecontact >= 1

;Super Combo3
[State -1]
type = ChangeState
value = 3015
triggerall = var(1) = 1
triggerall = command = "Cannon"
triggerall = power >= 1000
trigger1 = statetype != A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 202
trigger2 = movecontact >= 1
trigger3 = stateno = 232
trigger3 = movecontact >= 1
trigger4 = stateno = 242
trigger4 = movecontact >= 1
trigger5 = stateno = 252
trigger5 = movecontact >= 1

;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------

;ATField
[State -1]
type = ChangeState
value = 1082
triggerall = var(1) = 1
triggerall = command = "ATField"
trigger1 = statetype != A
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 202
trigger2 = movecontact >= 1
trigger3 = stateno = 212
trigger3 = movecontact >= 1
trigger4 = stateno = 222
trigger4 = movecontact >= 1
trigger5 = stateno = 232
trigger5 = movecontact >= 1
trigger6 = stateno = 242
trigger6 = movecontact >= 1
trigger7 = stateno = 247
trigger7 = movecontact >= 1
trigger8 = stateno = 252
trigger8 = movecontact >= 1

;Uppercut
[State -1]
type = ChangeState
value = 1022
triggerall = var(1) = 1
triggerall = command = "Uppercut"
trigger1 = statetype != A
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 212
trigger2 = movecontact >= 1
trigger3 = stateno = 247
trigger3 = movecontact >= 1
trigger4 = stateno = 202
trigger4 = movecontact >= 1
trigger5 = stateno = 222
trigger5 = movecontact >= 1
trigger6 = stateno = 232
trigger6 = movecontact >= 1
trigger7 = stateno = 242
trigger7 = movecontact >= 1
trigger8 = stateno = 252
trigger8 = movecontact >= 1
trigger9 = stateno = 1032
trigger9 = movecontact >= 1

;ATField
[State -1]
type = ChangeState
value = 1090
triggerall = var(1) = 1
triggerall = command = "Pistola"
trigger1 = statetype != A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 202
trigger2 = movecontact >= 1
trigger3 = stateno = 212
trigger3 = movecontact >= 1
trigger4 = stateno = 222
trigger4 = movecontact >= 1
trigger5 = stateno = 232
trigger5 = movecontact >= 1
trigger6 = stateno = 242
trigger6 = movecontact >= 1
trigger7 = stateno = 247
trigger7 = movecontact >= 1
trigger8 = stateno = 252
trigger8 = movecontact >= 1

;ATField
[State -1]
type = ChangeState
value = 1091
triggerall = var(1) = 1
triggerall = command = "Mitra"
trigger1 = statetype != A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 202
trigger2 = movecontact >= 1
trigger3 = stateno = 212
trigger3 = movecontact >= 1
trigger4 = stateno = 222
trigger4 = movecontact >= 1
trigger5 = stateno = 232
trigger5 = movecontact >= 1
trigger6 = stateno = 242
trigger6 = movecontact >= 1
trigger7 = stateno = 247
trigger7 = movecontact >= 1
trigger8 = stateno = 252
trigger8 = movecontact >= 1

;Gomitata
[State -1]
type = ChangeState
value = 1032
triggerall = var(1) = 1
triggerall = command = "Gomitata"
trigger1 = statetype != A
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 202
trigger2 = movecontact >= 1
trigger3 = stateno = 222
trigger3 = movecontact >= 1
trigger4 = stateno = 232
trigger4 = movecontact >= 1
trigger5 = stateno = 247
trigger5 = movecontact >= 1
trigger6 = stateno = 252
trigger6 = movecontact >= 1


;Super Calcio
[State -1]
type = ChangeState
value = 1052
triggerall = var(1) = 1
triggerall = command = "Super Calcio"
trigger1 = statetype = A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 602
trigger2 = movecontact >= 1
trigger3 = stateno = 612
trigger3 = movecontact >= 1
trigger4 = stateno = 622
trigger4 = movecontact >= 1
trigger5 = stateno = 632
trigger5 = movecontact >= 1
trigger6 = stateno = 642
trigger6 = movecontact >= 1
trigger7 = stateno = 652
trigger7 = movecontact >= 1

;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;NORMAL STATE BERSERK MODE
;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------

;presa
[State -1]
type = ChangeState
value = 822
triggerall = var(1) = 1
triggerall = command = "c"
triggerall = statetype = S
triggerall = ctrl
triggerall = stateno != 100
trigger1 = command = "holdfwd"
trigger1 = p2bodydist X < 5
trigger1 = (p2statetype = S) || (p2statetype = C)
trigger1 = p2movetype != H

;-----------------------------------------------

;Pugno debole
[State -1]
type = ChangeState
value = 202
triggerall = var(1) = 1
triggerall = command = "a"
trigger1 = statetype = S
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 202
trigger2 = movecontact >= 1
trigger3 = stateno = 222
trigger3 = movecontact >= 1
trigger4 = stateno = 232
trigger4 = movecontact >= 1
trigger5 = stateno = 247
trigger5 = movecontact >= 1

;Pugno medio
[State -1]
type = ChangeState
value = 212
triggerall = var(1) = 1
triggerall = command = "b"
trigger1 = statetype = S
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 222
trigger2 = movecontact >= 1
trigger3 = stateno = 202
trigger3 = movecontact >= 1
trigger4 = stateno = 232
trigger4 = movecontact >= 1
trigger5 = stateno = 247
trigger5 = movecontact >= 1
trigger6 = stateno = 252
trigger6 = movecontact >= 1

;Pugno Forte
[State -1]
type = ChangeState
value = 222
triggerall = var(1) = 1
triggerall = command = "c"
trigger1 = statetype = S
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 202
trigger2 = movecontact >= 1
trigger3 = stateno = 232
trigger3 = movecontact >= 1
trigger4 = stateno = 247
trigger4 = movecontact >= 1
trigger5 = stateno = 252
trigger5 = movecontact >= 1

;-----------------------------------------------
;Calcio debole
[State -1]
type = ChangeState
value = 232
triggerall = var(1) = 1
triggerall = command = "x"
trigger1 = statetype = S
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 202
trigger2 = movecontact >= 1
trigger3 = stateno = 222
trigger3 = movecontact >= 1
trigger4 = stateno = 232
trigger4 = movecontact >= 1
trigger5 = stateno = 247
trigger5 = movecontact >= 1

;Calcio medio Vicino
[State -1]
type = ChangeState
value = 247
triggerall = var(1) = 1
triggerall = command = "y"
trigger1 = P2bodydist X <= 30
trigger1 = statetype = S
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 202
trigger2 = movecontact >= 1
trigger3 = stateno = 222
trigger3 = movecontact >= 1
trigger4 = stateno = 232
trigger4 = movecontact >= 1
trigger5 = stateno = 247
trigger5 = movecontact >= 1

;Calcio medio
[State -1]
type = ChangeState
value = 242
triggerall = var(1) = 1
triggerall = command = "y"
trigger1 = statetype = S
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 247
trigger2 = movecontact >= 1
trigger3 = stateno = 202
trigger3 = movecontact >= 1
trigger4 = stateno = 222
trigger4 = movecontact >= 1
trigger5 = stateno = 232
trigger5 = movecontact >= 1

;Calcio Forte
[State -1]
type = ChangeState
value = 252
triggerall = var(1) = 1
triggerall = command = "z"
trigger1 = statetype = S
trigger1 = ctrl 
;-------------------------
trigger2 = stateno = 242
trigger2 = movecontact >= 1
trigger3 = stateno = 202
trigger3 = movecontact >= 1
trigger4 = stateno = 247
trigger4 = movecontact >= 1
trigger5 = stateno = 232
trigger5 = movecontact >= 1
trigger6 = stateno = 212
trigger6 = movecontact >= 1
trigger7 = stateno = 252
trigger7 = movecontact >= 1
trigger8 = stateno = 222
trigger8 = movecontact >= 1

;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;pugno abbasato debole
[State -1]
type = ChangeState
value = 402
triggerall = var(1) = 1
triggerall = command = "a"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 402
trigger2 = movecontact >= 1
trigger3 = stateno = 412
trigger3 = movecontact >= 1
trigger4 = stateno = 432
trigger4 = movecontact >= 1

;pugno abbasato medio
[State -1]
type = ChangeState
value = 412
triggerall = var(1) = 1
triggerall = command = "b"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 402
trigger2 = movecontact >= 1
trigger3 = stateno = 412
trigger3 = movecontact >= 1
trigger4 = stateno = 432
trigger4 = movecontact >= 1

;pugno abbasato forte
[State -1]
type = ChangeState
value = 422
triggerall = var(1) = 1
triggerall = command = "c"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 402
trigger2 = movecontact >= 1
trigger3 = stateno = 412
trigger3 = movecontact >= 1
trigger4 = stateno = 432
trigger4 = movecontact >= 1
trigger5 = stateno = 442
trigger5 = movecontact >= 1

;-------------------------------------------------
;calcio abbasato debole
[State -1]
type = ChangeState
value = 432
triggerall = var(1) = 1
triggerall = command = "x"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 402
trigger2 = movecontact >= 1
trigger3 = stateno = 412
trigger3 = movecontact >= 1
trigger4 = stateno = 432
trigger4 = movecontact >= 1
trigger5 = stateno = 442
trigger5 = movecontact >= 1

;calcio abbasato medio
[State -1]
type = ChangeState
value = 442
triggerall = var(1) = 1
triggerall = command = "y"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 402
trigger2 = movecontact >= 1
trigger3 = stateno = 412
trigger3 = movecontact >= 1
trigger4 = stateno = 432
trigger4 = movecontact >= 1
trigger5 = stateno = 452
trigger5 = movecontact >= 1

;calcio abbasato in scivolata
[State -1]
type = ChangeState
value = 452
triggerall = var(1) = 1
triggerall = command = "z"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 402
trigger2 = movecontact >= 1
trigger3 = stateno = 412
trigger3 = movecontact >= 1
trigger4 = stateno = 432
trigger4 = movecontact >= 1
trigger5 = stateno = 442
trigger5 = movecontact >= 1
trigger6 = stateno = 452
trigger6 = movecontact >= 1

;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------
;pugno debole in salto
[State -1]
type = ChangeState
value = 602
triggerall = var(1) = 1
triggerall = command = "a"
trigger1 = statetype = A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 602
trigger2 = movecontact >= 1
trigger3 = stateno = 612
trigger3 = movecontact >= 1
trigger4 = stateno = 622
trigger4 = movecontact >= 1
trigger5 = stateno = 632
trigger5 = movecontact >= 1
trigger6 = stateno = 642
trigger6 = movecontact >= 1
trigger7 = stateno = 652
trigger7 = movecontact >= 1

;pugno medio in salto
[State -1]
type = ChangeState
value = 612
triggerall = var(1) = 1
triggerall = command = "b"
trigger1 = statetype = A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 602
trigger2 = movecontact >= 1
trigger3 = stateno = 612
trigger3 = movecontact >= 1
trigger4 = stateno = 622
trigger4 = movecontact >= 1
trigger5 = stateno = 632
trigger5 = movecontact >= 1
trigger6 = stateno = 642
trigger6 = movecontact >= 1
trigger7 = stateno = 652
trigger7 = movecontact >= 1

;pugno forte in salto
[State -1]
type = ChangeState
value = 622
triggerall = var(1) = 1
triggerall = command = "c"
trigger1 = statetype = A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 602
trigger2 = movecontact >= 1
trigger3 = stateno = 612
trigger3 = movecontact >= 1
trigger4 = stateno = 622
trigger4 = movecontact >= 1
trigger5 = stateno = 632
trigger5 = movecontact >= 1
trigger6 = stateno = 642
trigger6 = movecontact >= 1
trigger7 = stateno = 652
trigger7 = movecontact >= 1

;------------------------------------------------
;calcio debole in salto
[State -1]
type = ChangeState
value = 632
triggerall = var(1) = 1
triggerall = command = "x"
trigger1 = statetype = A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 602
trigger2 = movecontact >= 1
trigger3 = stateno = 612
trigger3 = movecontact >= 1
trigger4 = stateno = 622
trigger4 = movecontact >= 1
trigger5 = stateno = 632
trigger5 = movecontact >= 1
trigger6 = stateno = 642
trigger6 = movecontact >= 1
trigger7 = stateno = 652
trigger7 = movecontact >= 1

;calcio medio in salto
[State -1]
type = ChangeState
value = 642
triggerall = var(1) = 1
triggerall = command = "y"
trigger1 = statetype = A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 602
trigger2 = movecontact >= 1
trigger3 = stateno = 612
trigger3 = movecontact >= 1
trigger4 = stateno = 622
trigger4 = movecontact >= 1
trigger5 = stateno = 632
trigger5 = movecontact >= 1
trigger6 = stateno = 642
trigger6 = movecontact >= 1
trigger7 = stateno = 652
trigger7 = movecontact >= 1

;calcio forte in salto
[State -1]
type = ChangeState
value = 652
triggerall = var(1) = 1
triggerall = command = "z"
trigger1 = statetype = A
trigger1 = ctrl
;-------------------------
trigger2 = stateno = 602
trigger2 = movecontact >= 1
trigger3 = stateno = 612
trigger3 = movecontact >= 1
trigger4 = stateno = 622
trigger4 = movecontact >= 1
trigger5 = stateno = 632
trigger5 = movecontact >= 1
trigger6 = stateno = 642
trigger6 = movecontact >= 1
trigger7 = stateno = 652
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
triggerall = var(1) = 0
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

[State -1]
type = ChangeState
triggerall = var(1) = 1
triggerall = var(59) = 1 
triggerall = Statetype != A 
triggerall = P2statetype != C 
triggerall = Statetype = S 
triggerall = P2Movetype = A 
triggerall = Pos Y != [-1,-999]
triggerall = ctrl = 1
trigger1 = random <= 999 
value = 1082
[State -1]
type = ChangeState
triggerall = var(1) = 1
triggerall = (Var(30) = 59) && (StateType = S) && (Pos Y = 0) && (P2BodyDist Y <= 0) 
triggerall = (P2BodyDist Y = -120) && (P2StateType != C) && (P2MoveType = A) 
trigger1 = (P2BodyDist X <= 120) && (Random <= 799) && (Ctrl) 
trigger2 = (StateNo = [140, 155]) || (StateNo = [100, 105]) 
value = 1082 

;-----------------------------------------------
;-----------------------------------------------
;-----------------------------------------------


