; コマンド
;
;-| Super Motions |--------------------------------------------------------

[Command]
name = "Ryuken"
command = ~D, F, D, F, b
time = 25

[Command]
name = "dragonrush"
command = ~D, B, F, b
time = 30

[Command]
name = "Kamehameha"
command = ~D, F, D, F, y
time = 25

;[Command]
;name = "Kaiohken"
;command = ~D, B, F, y
;time = 30

[Command]
name = "meteosmash"
command = ~D, DB, B, y
time = 20


;-| Special Motions |------------------------------------------------------
[Command]
name = "crazy"
command = ~D, B, x
time = 15

[Command]
name = "stop"
command = ~D, B, y
time = 15

[Command]
name = "shoryuken"
command = ~F, D, DF, x
time = 15

[Command]
name = "chongya"
command = ~D, DF, F, a
time = 15

[Command]
name = "chongya2"
command = ~D, DF, F, b
time = 15

[Command]
name = "shoryuken2"
command = ~F, D, DF, y
time = 15

[Command]
name = "hadouken"
command = ~D, DF, F, x
time = 15

[Command]
name = "hadouken2"
command = ~D, DF, F, y
time = 15

[Command]
name = "chongzhuang"
command = ~D, DB, B, a
time = 20

[Command]
name = "chongzhuang2"
command = ~D, DB, B, b
time = 20

[command]
name = "slashdown"
command = ~F, D, a
time = 20

[command]
name = "slashdown2"
command = ~F, D, b
time = 20

[Command]
name = "dash_x"
command = ~F, F, x

[Command]
name = "dash_y"
command = ~F, F, y

[Command]
name = "dash_a"
command = ~F, F, a

[Command]
name = "dash_b"
command = ~F, F, b

;-| Double Tap |-----------------------------------------------------------
[Command]
name = "FF"
command = F, F
time = 10

[Command]
name = "BB"
command = B, B
time = 10

;-| 2/3 Button Combination |-----------------------------------------------
[Command]
name = "recovery"
command = x+a
time = 1

[Command]
name = "recovery"
command = c
time = 1

[Command]
name = "charge"
command = y+b
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
name = "hold_a"
command = /$a
time = 1

[Command]
name = "hold_b"
command = /$b
time = 1

[Command]
name = "hold_c"
command = /$c
time = 1

[Command]
name = "hold_x"
command = /$x
time = 1

[Command]
name = "hold_y"
command = /$y
time = 1

[Command]
name = "hold_z"
command = /$z
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
name = "holddownfwd";Required (do not remove)
command = /$DF
time = 1

[Command]
name = "longjump"
command = ~D, $U
time = 11

[Statedef -1]

;---------------------------------------------------------------------------
;---------------------------------------------------------------------------
;=============================必殺技========================================
;---------------------------------------------------------------------------
;---------------------------------------------------------------------------
; ４倍超かめはめ波
[State -1,]
type = ChangeState
value = 2300
triggerall = command = "Kamehameha"
triggerall = power >= 1000
triggerall = var(10) != 0
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 200 && movecontact
trigger4 = stateno = 201 && movecontact
trigger5 = stateno = 202 && movecontact
trigger6 = stateno = 203 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 251 && movecontact
trigger9 = stateno = 253 && movecontact
trigger10 = stateno = 250 && movecontact
trigger11 = stateno = 252 && movecontact
trigger12 = stateno = 400 && movecontact
trigger13 = stateno = 410 && movecontact
trigger14 = stateno = 420 && movecontact
trigger15 = stateno = 450 && movecontact
trigger16 = stateno = 500 && movecontact

; 超かめはめ波
[State -1,]
type = ChangeState
value = 2200
triggerall = command = "Kamehameha"
triggerall = power >= 1000
triggerall = var(10) = 0
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 200 && movecontact
trigger4 = stateno = 201 && movecontact
trigger5 = stateno = 202 && movecontact
trigger6 = stateno = 203 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 251 && movecontact
trigger9 = stateno = 253 && movecontact
trigger10 = stateno = 250 && movecontact
trigger11 = stateno = 252 && movecontact
trigger12 = stateno = 400 && movecontact
trigger13 = stateno = 410 && movecontact
trigger14 = stateno = 420 && movecontact
trigger15 = stateno = 450 && movecontact
trigger16 = stateno = 500 && movecontact

; ４倍超かめはめ波(空中)
[State -1,]
type = ChangeState
value = 2350
triggerall = command = "Kamehameha"
triggerall = power >= 1000
triggerall = var(10) != 0
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 610 && movecontact
trigger4 = stateno = 620 && movecontact
trigger5 = stateno = 630 && movecontact
trigger6 = stateno = 635 && movecontact
trigger7 = stateno = 640 && movecontact
trigger8 = stateno = 650 && movecontact

; 超かめはめ波(空中)
[State -1,]
type = ChangeState
value = 2250
triggerall = command = "Kamehameha"
triggerall = power >= 1000
triggerall = var(10) = 0
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 610 && movecontact
trigger4 = stateno = 620 && movecontact
trigger5 = stateno = 630 && movecontact
trigger6 = stateno = 635 && movecontact
trigger7 = stateno = 640 && movecontact
trigger8 = stateno = 650 && movecontact

; ドラゴンラッシュ
[State -1,]
type = ChangeState
value = 3000
triggerall = command = "dragonrush"
triggerall = power >= 2000
trigger1 = ctrl
trigger1 = statetype != A
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 200 && movecontact
trigger4 = stateno = 201 && movecontact
trigger5 = stateno = 202 && movecontact
trigger6 = stateno = 203 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 251 && movecontact
trigger9 = stateno = 253 && movecontact
trigger10 = stateno = 250 && movecontact
trigger11 = stateno = 252 && movecontact
trigger12 = stateno = 400 && movecontact
trigger13 = stateno = 410 && movecontact
trigger14 = stateno = 420 && movecontact
trigger15 = stateno = 450 && movecontact
trigger16 = stateno = 500 && movecontact
trigger17 = stateno = 550 && movecontact

; 龍拳
[State -1,]
type = ChangeState
value = 3100
triggerall = var(10) = 0
triggerall = command = "Ryuken"
triggerall = power >= 3000
trigger1 = ctrl
trigger1 = statetype != A
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 200 && movecontact
trigger4 = stateno = 201 && movecontact
trigger5 = stateno = 202 && movecontact
trigger6 = stateno = 203 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 251 && movecontact
trigger9 = stateno = 253 && movecontact
trigger10 = stateno = 250 && movecontact
trigger11 = stateno = 252 && movecontact
trigger12 = stateno = 400 && movecontact
trigger13 = stateno = 410 && movecontact
trigger14 = stateno = 420 && movecontact
trigger15 = stateno = 450 && movecontact
trigger16 = stateno = 500 && movecontact
trigger17 = stateno = 550 && movecontact

; 超・龍拳
[State -1,]
type = ChangeState
value = 3150
triggerall = var(10) != 0
triggerall = command = "Ryuken"
triggerall = power >= 3000
trigger1 = ctrl
trigger1 = statetype != A
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 200 && movecontact
trigger4 = stateno = 201 && movecontact
trigger5 = stateno = 202 && movecontact
trigger6 = stateno = 203 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 251 && movecontact
trigger9 = stateno = 253 && movecontact
trigger10 = stateno = 250 && movecontact
trigger11 = stateno = 252 && movecontact
trigger12 = stateno = 400 && movecontact
trigger13 = stateno = 410 && movecontact
trigger14 = stateno = 420 && movecontact
trigger15 = stateno = 450 && movecontact
trigger16 = stateno = 500 && movecontact
trigger17 = stateno = 550 && movecontact


; メテオスマッシュ
[State -1,]
type = ChangeState
value = 1700
triggerall = command = "meteosmash"
triggerall = var(10) != 0
trigger1 = ctrl
trigger1 = statetype != A
trigger2 = stateno = 200 && movecontact = 1
trigger3 = stateno = 201 && movecontact = 1
trigger4 = stateno = 202 && movecontact = 1
trigger5 = stateno = 203 && movecontact = 1
trigger6 = stateno = 204 && movecontact = 1
trigger7 = stateno = 251 && movecontact = 1
trigger8 = stateno = 253 && movecontact = 1
trigger9 = stateno = 250 && movecontact = 1
trigger10 = stateno = 252 && movecontact = 1
trigger11 = stateno = 400 && movecontact = 1
trigger12 = stateno = 410 && movecontact = 1
trigger13 = stateno = 420 && movecontact = 1
trigger14 = stateno = 450 && movecontact = 1
trigger15 = stateno = 500 && movecontact

; メテオスマッシュ（空中)
[State -1,]
type = ChangeState
value = 1701
triggerall = command = "meteosmash"
triggerall = var(10) != 0
trigger1 = ctrl
trigger1 = statetype = A
trigger2 = stateno = 52 || stateno = 100
trigger2 = animelem = 1, >= 1
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 610 && movecontact
trigger4 = stateno = 620 && movecontact
trigger5 = stateno = 630 && movecontact
trigger6 = stateno = 635 && movecontact
trigger7 = stateno = 640 && movecontact
trigger8 = stateno = 650 && movecontact

; 龍激拳（弱）
[State -1,]
type = ChangeState
value = 1600
triggerall = command = "shoryuken"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 100
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 200 && movecontact = 1
trigger4 = stateno = 201 && movecontact = 1
trigger5 = stateno = 202 && movecontact = 1
trigger6 = stateno = 203 && movecontact = 1
trigger7 = stateno = 204 && movecontact = 1
trigger8 = stateno = 251 && movecontact = 1
trigger9 = stateno = 253 && movecontact = 1
trigger10 = stateno = 250 && movecontact = 1
trigger11 = stateno = 252 && movecontact = 1
trigger12 = stateno = 400 && movecontact; = 1
trigger13 = stateno = 410 && movecontact; = 1
trigger14 = stateno = 420 && movecontact; = 1
trigger15 = stateno = 450 && movecontact; = 1
trigger16 = stateno = 500 && movecontact; = 1
trigger17 = stateno = 550 && movecontact
trigger18 = stateno = 5120

; 龍激拳（強）
[State -1,]
type = ChangeState
value = 1650
triggerall = command = "shoryuken2"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 100
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 200 && movecontact = 1
trigger4 = stateno = 201 && movecontact = 1
trigger5 = stateno = 202 && movecontact = 1
trigger6 = stateno = 203 && movecontact = 1
trigger7 = stateno = 204 && movecontact = 1
trigger8 = stateno = 251 && movecontact = 1
trigger9 = stateno = 253 && movecontact = 1
trigger10 = stateno = 250 && movecontact = 1
trigger11 = stateno = 252 && movecontact = 1
trigger12 = stateno = 400 && movecontact; = 1
trigger13 = stateno = 410 && movecontact; = 1
trigger14 = stateno = 420 && movecontact; = 1
trigger15 = stateno = 450 && movecontact; = 1
trigger16 = stateno = 500 && movecontact; = 1
trigger17 = stateno = 550 && movecontact
trigger18 = stateno = 5120

; かめはめ波（弱）
[State -1]
type = ChangeState
value = 1500
triggerall = command = "stop"
triggerall = power >= 150
triggerall = numproj = 0 || numproj = 1 && var(10) != 0
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 100
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 200 && movecontact = 1
trigger4 = stateno = 201 && movecontact = 1
trigger5 = stateno = 202 && movecontact = 1
trigger6 = stateno = 203 && movecontact = 1
trigger7 = stateno = 204 && movecontact = 1
trigger8 = stateno = 251 && movecontact = 1
trigger9 = stateno = 253 && movecontact = 1
trigger10 = stateno = 250 && movecontact = 1
trigger11 = stateno = 252 && movecontact = 1
trigger12 = stateno = 400 && movecontact = 1
trigger13 = stateno = 410 && movecontact = 1
trigger14 = stateno = 420 && movecontact = 1
trigger15 = stateno = 450 && movecontact = 1
trigger16 = stateno = 500 && movecontact = 1

; かめはめ波（弱）
[State -1]
type = ChangeState
value = 2900
triggerall = command = "crazy"
triggerall = power >= 150
triggerall = numproj = 0 || numproj = 1 && var(10) != 0
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 100
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 200 && movecontact = 1
trigger4 = stateno = 201 && movecontact = 1
trigger5 = stateno = 202 && movecontact = 1
trigger6 = stateno = 203 && movecontact = 1
trigger7 = stateno = 204 && movecontact = 1
trigger8 = stateno = 251 && movecontact = 1
trigger9 = stateno = 253 && movecontact = 1
trigger10 = stateno = 250 && movecontact = 1
trigger11 = stateno = 252 && movecontact = 1
trigger12 = stateno = 400 && movecontact = 1
trigger13 = stateno = 410 && movecontact = 1
trigger14 = stateno = 420 && movecontact = 1
trigger15 = stateno = 450 && movecontact = 1
trigger16 = stateno = 500 && movecontact = 1

; かめはめ波（弱）
[State -1]
type = ChangeState
value = 1550
triggerall = command = "stop"
triggerall = power >= 150
triggerall = numproj = 0 || numproj = 1 && var(10) != 0
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 610 && movecontact
trigger4 = stateno = 620 && movecontact
trigger5 = stateno = 630 && movecontact
trigger6 = stateno = 635 && movecontact
trigger7 = stateno = 640 && movecontact
trigger8 = stateno = 650 && movecontact

; かめはめ波（弱）
[State -1]
type = ChangeState
value = 1200
triggerall = command = "hadouken"
triggerall = power >= 100
triggerall = numproj = 0 || numproj = 1 && var(10) != 0
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 100
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 200 && movecontact = 1
trigger4 = stateno = 201 && movecontact = 1
trigger5 = stateno = 202 && movecontact = 1
trigger6 = stateno = 203 && movecontact = 1
trigger7 = stateno = 204 && movecontact = 1
trigger8 = stateno = 251 && movecontact = 1
trigger9 = stateno = 253 && movecontact = 1
trigger10 = stateno = 250 && movecontact = 1
trigger11 = stateno = 252 && movecontact = 1
trigger12 = stateno = 400 && movecontact = 1
trigger13 = stateno = 410 && movecontact = 1
trigger14 = stateno = 420 && movecontact = 1
trigger15 = stateno = 450 && movecontact = 1
trigger16 = stateno = 500 && movecontact = 1

; かめはめ波（強）
[State -1]
type = ChangeState
value = 1205
triggerall = command = "hadouken2"
triggerall = power >= 100
triggerall = numproj = 0 || numproj = 1 && var(10) != 0
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 100
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 200 && movecontact = 1
trigger4 = stateno = 201 && movecontact = 1
trigger5 = stateno = 202 && movecontact = 1
trigger6 = stateno = 203 && movecontact = 1
trigger7 = stateno = 204 && movecontact = 1
trigger8 = stateno = 251 && movecontact = 1
trigger9 = stateno = 253 && movecontact = 1
trigger10 = stateno = 250 && movecontact = 1
trigger11 = stateno = 252 && movecontact = 1
trigger12 = stateno = 400 && movecontact = 1
trigger13 = stateno = 410 && movecontact = 1
trigger14 = stateno = 420 && movecontact = 1
trigger15 = stateno = 450 && movecontact = 1
trigger16 = stateno = 500 && movecontact = 1

; 空中かめはめ波（弱）
[State -1,]
type = ChangeState
value = 1400
triggerall = command = "hadouken"
triggerall = power >= 100
triggerall = numproj = 0 || numproj = 1 && var(10) != 0
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 610 && movecontact
trigger4 = stateno = 620 && movecontact
trigger5 = stateno = 630 && movecontact
trigger6 = stateno = 635 && movecontact
trigger7 = stateno = 640 && movecontact
trigger8 = stateno = 650 && movecontact

; 空中かめはめ波（強）
[State -1,]
type = ChangeState
value = 1450
triggerall = command = "hadouken2"
triggerall = power >= 100
triggerall = numproj = 0 || numproj = 1 && var(10) != 0
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 610 && movecontact
trigger4 = stateno = 620 && movecontact
trigger5 = stateno = 630 && movecontact
trigger6 = stateno = 635 && movecontact
trigger7 = stateno = 640 && movecontact
trigger8 = stateno = 650 && movecontact

[State -1,]
type = ChangeState
value = 1610
triggerall = command = "chongzhuang" || command = "chongzhuang2"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 610 && movecontact
trigger4 = stateno = 620 && movecontact
trigger5 = stateno = 630 && movecontact
trigger6 = stateno = 635 && movecontact
trigger7 = stateno = 640 && movecontact
trigger8 = stateno = 650 && movecontact

; 浴びせ蹴り(弱)
[State -1,]
type = ChangeState
value = 1000
triggerall = command = "chongzhuang"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 200 && movecontact = 1
trigger4 = stateno = 201 && movecontact = 1
trigger5 = stateno = 202 && movecontact = 1
trigger6 = stateno = 203 && movecontact = 1
trigger7 = stateno = 204 && movecontact = 1
trigger8 = stateno = 251 && movecontact = 1
trigger9 = stateno = 253 && movecontact = 1
trigger10 = stateno = 250 && movecontact = 1
trigger11 = stateno = 252 && movecontact = 1
trigger12 = stateno = 400 && movecontact = 1
trigger13 = stateno = 410 && movecontact = 1
trigger14 = stateno = 420 && movecontact = 1
trigger15 = stateno = 450 && movecontact = 1
trigger16 = stateno = 500 && movecontact = 1

; 浴びせ蹴り(強)
[State -1,]
type = ChangeState
value = 1050
triggerall = command = "chongzhuang2"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 200 && movecontact = 1
trigger4 = stateno = 201 && movecontact = 1
trigger5 = stateno = 202 && movecontact = 1
trigger6 = stateno = 203 && movecontact = 1
trigger7 = stateno = 204 && movecontact = 1
trigger8 = stateno = 251 && movecontact = 1
trigger9 = stateno = 253 && movecontact = 1
trigger10 = stateno = 250 && movecontact = 1
trigger11 = stateno = 252 && movecontact = 1
trigger12 = stateno = 400 && movecontact = 1
trigger13 = stateno = 410 && movecontact = 1
trigger14 = stateno = 420 && movecontact = 1
trigger15 = stateno = 450 && movecontact = 1
trigger16 = stateno = 500 && movecontact = 1


; ダッシュ強パンチ (ニュートラル)
[State -1,]
type = ChangeState
value = 520
triggerall = command = "dash_y"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 100
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 200 && movecontact = 1
trigger4 = stateno = 201 && movecontact = 1
trigger5 = stateno = 202 && movecontact = 1
trigger6 = stateno = 203 && movecontact = 1
trigger7 = stateno = 204 && movecontact = 1
trigger8 = stateno = 251 && movecontact = 1
trigger9 = stateno = 253 && movecontact = 1
trigger10 = stateno = 250 && movecontact = 1
trigger11 = stateno = 252 && movecontact = 1
trigger12 = stateno = 400 && movecontact = 1
trigger13 = stateno = 410 && movecontact = 1
trigger14 = stateno = 420 && movecontact = 1
trigger15 = stateno = 450 && movecontact = 1
trigger16 = stateno = 500 && movecontact

;---------------------------------------------------------------------------
;============================特殊技=========================================
;---------------------------------------------------------------------------

;ダッシュ
[State -1, Run Fwd]
type = ChangeState
value = 100
triggerall = var(22) = 0
triggerall = command = "FF"
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno = 1801

;空中ダッシュ
[State -1, Run Fwd]
type = ChangeState
value = 110
triggerall = var(22) = 0
trigger1 = command = "FF"
trigger1 = statetype = A
trigger1 = ctrl

; バックステップ
[State -1, Run Back]
type = ChangeState
value = 105
triggerall = var(22) = 0
trigger1 = command = "BB"
trigger1 = statetype = S
trigger1 = ctrl

; 空中バックダッシュ
[State -1, Run Back]
type = ChangeState
value = 112
triggerall = var(22) = 0
triggerall = vel x <= 0;-1 
trigger1 = command = "BB"
trigger1 = statetype = A
trigger1 = ctrl

; 投げ
[State -1,]
type = ChangeState
value = 1300
triggerall = (command = "holdfwd" || command = "holdback") && (command = "y")
triggerall = statetype = S
triggerall = ctrl
triggerall = stateno != 100
trigger1 = p2bodydist X < 12
trigger1 = (p2statetype = S) || (p2statetype = C)
trigger1 = p2movetype != H

; 残像拳（カウンター）
[State -1]
type = ChangeState
value = 305
triggerall = command = "recovery" ^^ command = "z"
trigger1 = (stateno = 150 || stateno = 151) && power >= 1000
trigger2 = (stateno = 152 || stateno = 153) && power >= 1000

; 気力溜め
[State -1]
type = ChangeState
value = 1900
triggerall = statetype = S
triggerall = Power < 3000
triggerall = ctrl = 1
trigger1 = command = "hold_b" && command = "hold_y"
trigger2 = command = "hold_c"

; 挑発
[State -1]
type = ChangeState
value = 195
triggerall = var(22) = 0
trigger1 = command = "start"
trigger1 = Vel X = 0
trigger1 = stateno != 195
trigger1 = statetype = S
trigger1 = ctrl = 1

; 高速移動 (後方)
[State -1]
type = ChangeState
value = 360
triggerall = var(22) = 0
triggerall = command = "recovery" ^^ command = "z"
triggerall = command = "holdback"
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno = 100
trigger3 = stateno = 101
trigger4 = stateno = 102

; 高速移動 (前方)
[State -1]
type = ChangeState
value = 361
triggerall = var(22) = 0
triggerall = command = "recovery" ^^ command = "z"
trigger1 = statetype = S
trigger1 = ctrl

 ダッシュ高速移動 (前方)
[State -1]
type = ChangeState
value = 361
triggerall = stateno = 100 || stateno = 101 || stateno = 102
triggerall = ctrl = 0
trigger1 = command = "hold_x" && command = "hold_a" 
trigger2 = command = "hold_z"
trigger3 = command = "hold_c"


;---------------------------------------------------------------------------
;=======================ダッシュ攻撃========================================
;---------------------------------------------------------------------------

; ダッシュ強パンチ (ダッシュ中)
[State -1,]
type = ChangeState
value = 520
triggerall = stateno = 101
trigger1 = command = "hold_y"

; ダッシュ弱パンチ (ダッシュ中)
[State -1,]
type = ChangeState
value = 500
triggerall = stateno = 101
trigger1 = command = "hold_x"

 ダッシュ弱キック (スライディングキック)
[State -1,]
type = ChangeState
value = 550
triggerall = stateno = 101
trigger1 = command = "hold_a"

 ダッシュ強キック (ダッシュ中)
[State -1,]
type = ChangeState
value = 525
triggerall = stateno = 101
trigger1 = command = "hold_b"

;---------------------------------------------------------------------------
;============================通常技=========================================
;---------------------------------------------------------------------------
;-------------パンチ

; 弱パンチ (近距離)
[State -1,]
type = ChangeState
value = 201
triggerall = command = "x"
triggerall = command != "holddown"
triggerall = p2bodydist x < 15
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 201 && movecontact
trigger4 = stateno = 500 && movecontact
trigger5 = stateno = 1801
trigger5 = time > 4

; 弱パンチ
[State -1,]
type = ChangeState
value = 203
triggerall = command = "x"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 203
trigger3 = time > 9
trigger4 = stateno = 201 && movecontact
trigger5 = stateno = 253 && movecontact
trigger6 = stateno = 500 && movecontact

; 強パンチ (近距離)
[State -1,]
type = ChangeState
value = 202
triggerall = command = "y"
triggerall = command != "holddown"
triggerall = p2bodydist x < 15
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 201 && movecontact
trigger3 = stateno = 203 && movecontact
trigger4 = stateno = 500 && movecontact

; 強パンチ
[State -1,]
type = ChangeState
value = 200
triggerall = command = "y"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 202 && movecontact
trigger3 = stateno = 203 && movecontact
trigger4 = stateno = 201 && movecontact
trigger5 = stateno = 251 && movecontact
trigger6 = stateno = 253 && movecontact
trigger7 = stateno = 500 && movecontact

;-------------------------------------------キック

; 弱キック (近距離)
[State -1,]
type = ChangeState
value = 253
triggerall = command = "a"
triggerall = command != "holddown"
triggerall = p2bodydist x < 15
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 235
trigger2 = time > 3
trigger3 = stateno = 201 && movecontact
trigger4 = stateno = 203 && movecontact
trigger5 = stateno = 500 && movecontact

; 弱キック
[State -1,]
type = ChangeState
value = 251
triggerall = command = "a"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 251
trigger2 = time > 14
trigger3 = stateno = 253
trigger3 = time > 3
trigger4 = stateno = 201 && movecontact
trigger5 = stateno = 203 && movecontact
trigger6 = stateno = 500 && movecontact
trigger7 = stateno = 251 && movecontact

; 強キック (近距離)
[State -1,]
type = ChangeState
value = 252
triggerall = command = "b"
triggerall = command != "holddown"
triggerall = p2bodydist x < 15
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 202 && movecontact
trigger3 = stateno = 203 && movecontact
trigger4 = stateno = 251 && movecontact
trigger5 = stateno = 253 && movecontact
trigger6 = stateno = 500 && movecontact

; 強キック
[State -1]
type = ChangeState
value = 250
;triggerall = var(22) = 0
triggerall = command = "b"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 200 && movecontact
trigger3 = stateno = 201 && movecontact
trigger4 = stateno = 202 && movecontact
trigger5 = stateno = 203 && movecontact
trigger6 = stateno = 251 && movecontact
trigger7 = stateno = 253 && movecontact
trigger8 = stateno = 500 && movecontact

;---------------------------------------------------------------------------
;============================しゃがみ=========================================
;---------------------------------------------------------------------------

; しゃがみ弱パンチ
[State -1]
type = ChangeState
value = 410
triggerall = var(22) = 0
triggerall = command = "x"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 101
trigger3 =  stateno = 410
trigger3 =  time > 6
trigger4 = stateno = 500 && movecontact

; しゃがみ強パンチ
[State -1]
type = ChangeState
value = 400
triggerall = var(22) = 0
triggerall = command = "y"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 101
trigger3 = stateno = 420 && movecontact
trigger4 = stateno = 410 && movecontact
trigger5 = stateno = 201 && movecontact
trigger6 = stateno = 203 && movecontact
trigger7 = stateno = 251 && movecontact
trigger8 = stateno = 253 && movecontact
trigger9 = stateno = 500 && movecontact

; しゃがみ弱キック
[State -1]
type = ChangeState
value = 420
triggerall = var(22) = 0
triggerall = command = "a"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 101
trigger3 = stateno = 420 && movecontact
trigger3 = time > 4
trigger4 = stateno = 410 && movecontact
trigger5 = stateno = 201 && movecontact
trigger6 = stateno = 203 && movecontact
trigger7 = stateno = 500 && movecontact

; しゃがみ強キック
[State -1]
type = ChangeState
value = 450
triggerall = var(22) = 0
triggerall = command = "b"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 101
trigger3 = stateno = 420 && movecontact
trigger4 = stateno = 410 && movecontact
trigger5 = stateno = 203 && movecontact
trigger6 = stateno = 201 && movecontact
trigger7 = stateno = 251 && movecontact
;trigger8 = stateno = 252 && movecontact
trigger8 = stateno = 200 && movecontact
trigger9 = stateno = 202 && movecontact
trigger10 = stateno = 400 && movecontact
trigger11 = stateno = 500 && movecontact

[State -1]
type = ChangeState
value = 660
triggerall = var(22) = 0
triggerall = command = "down_b"
trigger1 = statetype = A
trigger1 = ctrl = 1
trigger2 = stateno = 610 && movecontact = 1
trigger3 = stateno = 630 && movecontact = 1
trigger4 = stateno = 620 && movecontact = 1
trigger5 = stateno = 650 && movecontact = 1
trigger6 = stateno = 640 && movecontact = 1

;---------------------------------------------------------------------------
;============================空中技=========================================
;---------------------------------------------------------------------------

; ジャンプ弱パンチ
[State -1]
type = ChangeState
value = 610
triggerall = var(22) = 0
triggerall = command = "x"
trigger1 = statetype = A && vel x != 0 
trigger1 = ctrl = 1
;trigger2 = stateno = 610 && movecontact = 1

; ジャンプ弱パンチ (垂直)
[State -1]
type = ChangeState
value = 600
triggerall = var(22) = 0
triggerall = command = "x"
trigger1 = statetype = A
trigger1 = ctrl = 1
trigger2 = stateno = 600 && movecontact = 1

; ジャンプ強パンチ
[State -1]
type = ChangeState
value = 620
triggerall = var(22) = 0
triggerall = command = "y"
trigger1 = statetype = A
trigger1 = ctrl = 1
trigger2 = stateno = 600 && movecontact = 1
trigger3 = stateno = 610 && movecontact = 1
trigger4 = stateno = 630 && movecontact = 1
trigger5 = stateno = 635 && movecontact = 1

; ジャンプ弱キック
[State -1]
type = ChangeState
value = 630
triggerall = var(22) = 0
triggerall = command = "a"
trigger1 = statetype = A && vel x != 0
trigger1 = ctrl = 1
trigger2 = stateno = 610 && movecontact = 1
;trigger3 = stateno = 630 && movecontact = 1

; ジャンプ弱キック (垂直)
[State -1]
type = ChangeState
value = 635
triggerall = var(22) = 0
triggerall = command = "a"
trigger1 = statetype = A
trigger1 = ctrl = 1
trigger2 = stateno = 600 && movecontact = 1
trigger3 = stateno = 635 && movecontact = 1

; ジャンプ強キック
[State -1]
type = ChangeState
value = 650
triggerall = var(22) = 0
triggerall = command = "b"
trigger1 = statetype = A && vel x != 0
trigger1 = ctrl = 1
trigger2 = stateno = 610 && movecontact = 1
trigger3 = stateno = 630 && movecontact = 1
trigger4 = stateno = 620 && movecontact = 1


; ジャンプ強キック (垂直)
[State -1]
type = ChangeState
value = 640
triggerall = var(22) = 0
triggerall = command = "b"
trigger1 = statetype = A
trigger1 = ctrl = 1
trigger2 = stateno = 600 && movecontact = 1
trigger3 = stateno = 635 && movecontact = 1
trigger4 = stateno = 620 && movecontact = 1

