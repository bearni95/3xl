; コンフィギュレーション

[Remap]
x = x
y = y
z = z
a = a
b = b
c = c
s = s
[Command]
name="holdy";Required(donotremove)
command=/$y
time=1
; コマンド
;-| Super Motions |--------------------------------------------------------

[Command]
name = "dragonrush"
command = ~D, B, F, b
time = 30

[Command]
name = "giga"
command = ~D, F, D, F, x
time = 25

[Command]
name = "tera"
command = ~D, F, D, F, y
time = 25

[Command]
name = "saiya jin ha sentou syuzoku da"
command = ~D, B, F, a
time = 25

[Command]
name = "bakuhatsu"
command = ~D, F, D, F, b
time = 25

[Command]
name = "mega"
command = ~D, B, F, y
time = 20


;-| Special Motions |------------------------------------------------------

[Command]
name = "shoryuken"
command = ~F, D, DF, x
time = 20

[Command]
name = "shoryuken2"
command = ~F, D, DF, y
time = 20

[Command]
name = "hadouken"
command = ~D, F, x
time = 20

[Command]
name = "hadouken2"
command = ~D, F, y
time = 20

[Command]
name = "tatsumaki"
command = ~D, B, a
time = 20

[Command]
name = "tatsumaki"
command = ~D, B, b
time = 20

[Command]
name = "flyingattack"
command = ~D, B, x
time = 20

[Command]
name = "flyingattack2"
command = ~D, B, y
time = 20

[command]
name = "superdash"
command = ~D, F, a
time = 20

[command]
name = "superdash2"
command = ~D, F, b
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
[State -1]
type = ChangeState
value = 365
triggerall = command = "c" && command = "z"
triggerall = power >= 500
trigger1 = movehit
trigger1 = stateno = 364
[State -1]
type = ChangeState
value = 364
triggerall = command = "c" && command = "z"
triggerall = power >= 500
trigger1 = movehit
trigger1 = stateno = 363
; 高速移動 (後方)
[State -1]
type = ChangeState
value = 363
triggerall = command = "c" && command = "z"
triggerall = power >= 500
trigger1 = enemy,movetype=H
trigger1 = stateno != [800,810]
trigger1 = stateno != [3000,4000]
trigger1 = stateno != [363,367]
[State -1]
type = ChangeState
value = 367
triggerall = command = "z"
triggerall = power >= 500
trigger1 = movehit
trigger1 = stateno = 365
ignorehitpause = 1
; プラネットバースト
[State -1,]
type = ChangeState
value = 12400
triggerall = command = "saiya jin ha sentou syuzoku da"
triggerall = power >= 1000
trigger1 = ctrl
trigger1 = statetype != A
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 210 && movecontact
trigger5 = stateno = 230 && movecontact
trigger6 = stateno = 200 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 250 && movecontact
trigger9 = stateno = 260 && movecontact
trigger10 = stateno = 270 && movecontact
trigger11 = stateno = 400 && movecontact
trigger12 = stateno = 410 && movecontact
trigger13 = stateno = 420 && movecontact
trigger14 = stateno = 450 && movecontact
trigger15 = stateno = 500 && movecontact
trigger16 = stateno = 550 && movecontact
; プラネットバースト
[State -1,]
type = ChangeState
value = 2300
triggerall = command = "dragonrush"
triggerall = power >= 3000
trigger1 = ctrl
trigger1 = statetype != A
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 210 && movecontact
trigger5 = stateno = 230 && movecontact
trigger6 = stateno = 200 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 250 && movecontact
trigger9 = stateno = 260 && movecontact
trigger10 = stateno = 270 && movecontact
trigger11 = stateno = 400 && movecontact
trigger12 = stateno = 410 && movecontact
trigger13 = stateno = 420 && movecontact
trigger14 = stateno = 450 && movecontact
trigger15 = stateno = 500 && movecontact
trigger16 = stateno = 550 && movecontact

; ファイナルフラッシュ
[State -1]
type = ChangeState
value = 3500
triggerall = command = "tera"
triggerall = power >= 2000
trigger1 = statetype != A
trigger1 = PalNo<= 6
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 210 && movecontact
trigger5 = stateno = 230 && movecontact
trigger6 = stateno = 200 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 250 && movecontact
trigger9 = stateno = 260 && movecontact
trigger10 = stateno = 270 && movecontact
trigger11 = stateno = 400 && movecontact
trigger12 = stateno = 410 && movecontact
trigger13 = stateno = 420 && movecontact
trigger14 = stateno = 450 && movecontact
trigger15 = stateno = 500 && movecontact

; ファイナルフラッシュ
[State -1]
type = ChangeState
value = 3550
triggerall = command = "tera"
triggerall = power >= 2000
trigger1 = statetype != A
trigger1 = PalNo>= 6
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 210 && movecontact
trigger5 = stateno = 230 && movecontact
trigger6 = stateno = 200 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 250 && movecontact
trigger9 = stateno = 260 && movecontact
trigger10 = stateno = 270 && movecontact
trigger11 = stateno = 400 && movecontact
trigger12 = stateno = 410 && movecontact
trigger13 = stateno = 420 && movecontact
trigger14 = stateno = 450 && movecontact
trigger15 = stateno = 500 && movecontact

; 空中ファイナルフラッシュ
[State -1,]
type = ChangeState
value = 3600
triggerall = command = "tera"
triggerall = power >= 2000
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
value = 3200
triggerall = command = "bakuhatsu"
triggerall = power >= 1000
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 610 && movecontact
trigger4 = stateno = 620 && movecontact
trigger5 = stateno = 630 && movecontact
trigger6 = stateno = 635 && movecontact
trigger7 = stateno = 640 && movecontact
trigger8 = stateno = 650 && movecontact

; 超爆発波
[State -1,]
type = ChangeState
value = 2200
triggerall = command = "bakuhatsu"
triggerall = power >= 2000
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 210 && movecontact
trigger5 = stateno = 230 && movecontact
trigger6 = stateno = 200 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 250 && movecontact
trigger9 = stateno = 260 && movecontact
trigger10 = stateno = 270 && movecontact
trigger11 = stateno = 400 && movecontact
trigger12 = stateno = 410 && movecontact
trigger13 = stateno = 420 && movecontact
trigger14 = stateno = 450 && movecontact
trigger15 = stateno = 500 && movecontact

; ビッグバンアタック
[State -1,]
type = ChangeState
value = 3000
triggerall = command = "giga"
triggerall = power >= 1000
trigger1 = statetype != A
trigger1 = PalNo<= 6
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 210 && movecontact
trigger5 = stateno = 230 && movecontact
trigger6 = stateno = 200 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 250 && movecontact
trigger9 = stateno = 260 && movecontact
trigger10 = stateno = 270 && movecontact
trigger11 = stateno = 400 && movecontact
trigger12 = stateno = 410 && movecontact
trigger13 = stateno = 420 && movecontact
trigger14 = stateno = 450 && movecontact
trigger15 = stateno = 500 && movecontact

[State -1,]
type = ChangeState
value = 3050
triggerall = command = "giga"
triggerall = power >= 1000
trigger1 = statetype != A
trigger1 = PalNo>= 6
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 210 && movecontact
trigger5 = stateno = 230 && movecontact
trigger6 = stateno = 200 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 250 && movecontact
trigger9 = stateno = 260 && movecontact
trigger10 = stateno = 270 && movecontact
trigger11 = stateno = 400 && movecontact
trigger12 = stateno = 410 && movecontact
trigger13 = stateno = 420 && movecontact
trigger14 = stateno = 450 && movecontact
trigger15 = stateno = 500 && movecontact

; 空中ビッグバンアタック
[State -1,]
type = ChangeState
value = 3100
triggerall = command = "giga"
triggerall = power >= 1000
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 610 && movecontact
trigger4 = stateno = 620 && movecontact
trigger5 = stateno = 630 && movecontact
trigger6 = stateno = 635 && movecontact
trigger7 = stateno = 640 && movecontact
trigger8 = stateno = 650 && movecontact

; ギャリック砲
;[State -1,]
;type = ChangeState
;value = 2000
;triggerall = command = "giga"
;triggerall = power >= 1000
;trigger1 = statetype != A
;trigger1 = ctrl
;trigger2 = stateno = 52 || stateno = 101
;trigger2 = animelem = 1, >= 1
;trigger3 = stateno = 220 && movecontact
;trigger4 = stateno = 210 && movecontact
;trigger5 = stateno = 230 && movecontact
;trigger6 = stateno = 200 && movecontact
;trigger7 = stateno = 204 && movecontact
;trigger8 = stateno = 250 && movecontact
;trigger9 = stateno = 260 && movecontact
;trigger10 = stateno = 270 && movecontact
;trigger11 = stateno = 400 && movecontact
;trigger12 = stateno = 410 && movecontact
;trigger13 = stateno = 420 && movecontact
;trigger14 = stateno = 450 && movecontact
;trigger15 = stateno = 500 && movecontact

; 空中ギャリック砲
;[State -1,]
;type = ChangeState
;value = 2100
;triggerall = command = "giga"
;triggerall = power >= 1000
;trigger1 = statetype = A
;trigger1 = ctrl
;trigger2 = stateno = 600 && movecontact
;trigger3 = stateno = 610 && movecontact
;trigger4 = stateno = 620 && movecontact
;trigger5 = stateno = 630 && movecontact
;trigger6 = stateno = 635 && movecontact
;trigger7 = stateno = 640 && movecontact
;trigger8 = stateno = 650 && movecontact

; ダッシュボム
[State -1,]
type = ChangeState
value = 1700
triggerall = command = "mega"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 210 && movecontact
trigger5 = stateno = 230 && movecontact
trigger6 = stateno = 200 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 250 && movecontact
trigger9 = stateno = 260 && movecontact
trigger10 = stateno = 270 && movecontact
trigger11 = stateno = 400 && movecontact
trigger12 = stateno = 410 && movecontact
trigger13 = stateno = 420 && movecontact
trigger14 = stateno = 450 && movecontact
trigger15 = stateno = 500 && movecontact


; スラッシュアロー（弱）
[State -1,]
type = ChangeState
value = 1200
triggerall = command = "shoryuken"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 100
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact = 1
trigger4 = stateno = 210 && movecontact = 1
trigger5 = stateno = 230 && movecontact = 1
trigger6 = stateno = 200 && movecontact = 1
trigger7 = stateno = 204 && movecontact = 1
trigger8 = stateno = 250 && movecontact = 1
trigger9 = stateno = 260 && movecontact = 1
trigger10 = stateno = 270 && movecontact = 1
trigger11 = stateno = 400 && movecontact = 1
trigger12 = stateno = 410 && movecontact = 1
trigger13 = stateno = 420 && movecontact = 1
trigger14 = stateno = 450 && movecontact = 1
trigger15 = stateno = 500 && movecontact = 1
trigger16 = stateno = 550 && movecontact
trigger17 = stateno = 5120
trigger18 = stateno = 101 || stateno = 102

; スラッシュアロー（強）
[State -1,]
type = ChangeState
value = 1250
triggerall = command = "shoryuken2"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 100
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact = 1
trigger4 = stateno = 210 && movecontact = 1
trigger5 = stateno = 230 && movecontact = 1
trigger6 = stateno = 200 && movecontact = 1
trigger7 = stateno = 204 && movecontact = 1
trigger8 = stateno = 250 && movecontact = 1
trigger9 = stateno = 260 && movecontact = 1
trigger10 = stateno = 270 && movecontact = 1
trigger11 = stateno = 400 && movecontact = 1
trigger12 = stateno = 410 && movecontact = 1
trigger13 = stateno = 420 && movecontact = 1
trigger14 = stateno = 450 && movecontact = 1
trigger15 = stateno = 500 && movecontact = 1
trigger16 = stateno = 550 && movecontact
trigger17 = stateno = 5120
trigger18 = stateno = 101 || stateno = 102


; 連続エネルギー弾（弱）
[State -1]
type = ChangeState
value = 1000
triggerall = command = "hadouken"
triggerall = power >= 100
triggerall = numproj = 0
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 100
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact = 1
trigger4 = stateno = 210 && movecontact = 1
trigger5 = stateno = 230 && movecontact = 1
trigger6 = stateno = 200 && movecontact = 1
trigger7 = stateno = 204 && movecontact = 1
trigger8 = stateno = 250 && movecontact = 1
trigger9 = stateno = 260 && movecontact = 1
trigger10 = stateno = 270 && movecontact = 1
trigger11 = stateno = 400 && movecontact = 1
trigger12 = stateno = 410 && movecontact = 1
trigger13 = stateno = 420 && movecontact = 1
trigger14 = stateno = 450 && movecontact = 1
trigger15 = stateno = 500 && movecontact = 1

; エネルギー弾（強）
[State -1]
type = ChangeState
value = 1005
triggerall = command = "hadouken2"
triggerall = power >= 100
triggerall = numproj = 0 || Numprojid(1000) = 2 || Numprojid(1005) = 0
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 100
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact = 1
trigger4 = stateno = 210 && movecontact = 1
trigger5 = stateno = 230 && movecontact = 1
trigger6 = stateno = 200 && movecontact = 1
trigger7 = stateno = 204 && movecontact = 1
trigger8 = stateno = 250 && movecontact = 1
trigger9 = stateno = 260 && movecontact = 1
trigger10 = stateno = 270 && movecontact = 1
trigger11 = stateno = 400 && movecontact = 1
trigger12 = stateno = 410 && movecontact = 1
trigger13 = stateno = 420 && movecontact = 1
trigger14 = stateno = 450 && movecontact = 1
trigger15 = stateno = 500 && movecontact = 1
trigger16 = stateno = 1000 && AnimElem = 9, >= 1 && AnimElem = 11, <= 1

; 空中連続エネルギー弾（弱）
[State -1,]
type = ChangeState
value = 1100
triggerall = command = "hadouken"
triggerall = power >= 100
triggerall = numproj = 0
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 610 && movecontact
trigger4 = stateno = 620 && movecontact
trigger5 = stateno = 630 && movecontact
trigger6 = stateno = 635 && movecontact
trigger7 = stateno = 640 && movecontact
trigger8 = stateno = 650 && movecontact

; 空中エネルギー弾（強）
[State -1,]
type = ChangeState
value = 1105
triggerall = command = "hadouken2"
triggerall = power >= 100
triggerall = numproj = 0 || Numprojid(1100) = 2 || Numprojid(1105) = 0
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 610 && movecontact
trigger4 = stateno = 620 && movecontact
trigger5 = stateno = 630 && movecontact
trigger6 = stateno = 635 && movecontact
trigger7 = stateno = 640 && movecontact
trigger8 = stateno = 650 && movecontact
trigger9 = stateno = 1100 && AnimElem = 5, >= 1 && AnimElem = 8, <= 1

; ジャンピングアロー
[State -1,]
type = ChangeState
value = 1300
triggerall = command = "tatsumaki"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 210 && movecontact
trigger5 = stateno = 230 && movecontact
trigger6 = stateno = 200 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 250 && movecontact
trigger9 = stateno = 260 && movecontact
trigger10 = stateno = 270 && movecontact
trigger11 = stateno = 400 && movecontact
trigger12 = stateno = 410 && movecontact
trigger13 = stateno = 420 && movecontact
trigger14 = stateno = 450 && movecontact
trigger15 = stateno = 500 && movecontact

; フライングアロー（弱）
[State -1,]
type = ChangeState
value = 1400
triggerall = command = "flyingattack"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 210 && movecontact
trigger5 = stateno = 230 && movecontact
trigger6 = stateno = 200 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 250 && movecontact
trigger9 = stateno = 260 && movecontact
trigger10 = stateno = 270 && movecontact
trigger11 = stateno = 400 && movecontact
trigger12 = stateno = 410 && movecontact
trigger13 = stateno = 420 && movecontact
trigger14 = stateno = 450 && movecontact
trigger15 = stateno = 500 && movecontact

; フライングアロー（強）
[State -1,]
type = ChangeState
value = 1450
triggerall = command = "flyingattack2"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 210 && movecontact
trigger5 = stateno = 230 && movecontact
trigger6 = stateno = 200 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 250 && movecontact
trigger9 = stateno = 260 && movecontact
trigger10 = stateno = 270 && movecontact
trigger11 = stateno = 400 && movecontact
trigger12 = stateno = 410 && movecontact
trigger13 = stateno = 420 && movecontact
trigger14 = stateno = 450 && movecontact
trigger15 = stateno = 500 && movecontact

; フライングアロー（弱）
[State -1,]
type = ChangeState
value = 1800
triggerall = command = "flyingattack"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 610 && movecontact
trigger4 = stateno = 620 && movecontact
trigger5 = stateno = 630 && movecontact
trigger6 = stateno = 635 && movecontact
trigger7 = stateno = 640 && movecontact
trigger8 = stateno = 650 && movecontact

; フライングアロー（強）
[State -1,]
type = ChangeState
value = 1850
triggerall = command = "flyingattack2"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 && movecontact
trigger3 = stateno = 610 && movecontact
trigger4 = stateno = 620 && movecontact
trigger5 = stateno = 630 && movecontact
trigger6 = stateno = 635 && movecontact
trigger7 = stateno = 640 && movecontact
trigger8 = stateno = 650 && movecontact

; スーパーダッシュ（弱）
[State -1,]
type = ChangeState
value = 1500
triggerall = command = "superdash"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 210 && movecontact
trigger5 = stateno = 230 && movecontact
trigger6 = stateno = 200 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 250 && movecontact
trigger9 = stateno = 260 && movecontact
trigger10 = stateno = 270 && movecontact
trigger11 = stateno = 400 && movecontact
trigger12 = stateno = 410 && movecontact
trigger13 = stateno = 420 && movecontact
trigger14 = stateno = 450 && movecontact
trigger15 = stateno = 500 && movecontact

; スーパーダッシュ（強）
[State -1,]
type = ChangeState
value = 1510
triggerall = command = "superdash2"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact
trigger4 = stateno = 210 && movecontact
trigger5 = stateno = 230 && movecontact
trigger6 = stateno = 200 && movecontact
trigger7 = stateno = 204 && movecontact
trigger8 = stateno = 250 && movecontact
trigger9 = stateno = 260 && movecontact
trigger10 = stateno = 270 && movecontact
trigger11 = stateno = 400 && movecontact
trigger12 = stateno = 410 && movecontact
trigger13 = stateno = 420 && movecontact
trigger14 = stateno = 450 && movecontact
trigger15 = stateno = 500 && movecontact

; ドライビングエルボー
;[State -1,]
;type = ChangeState
;value = 1600
;triggerall = stateno = 1500 || stateno = 1510
;triggerall = command = "x" || command = "y" 
;trigger1 = statetype != A
;trigger1 = ctrl
;trigger2 = stateno = 1500
;trigger2 = animelem = 5, >= 1
;trigger3 = stateno = 1510
;trigger3 = animelem = 5, >= 1

; ダッシュ強パンチ (ニュートラル)
[State -1,]
type = ChangeState
value = 510
triggerall = command = "dash_y"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 100
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 220 && movecontact; = 1
trigger4 = stateno = 210 && movecontact; = 1
trigger5 = stateno = 230 && movecontact; = 1
trigger6 = stateno = 200 && movecontact; = 1
trigger7 = stateno = 204 && movecontact; = 1
trigger8 = stateno = 250 && movecontact; = 1
trigger9 = stateno = 260 && movecontact; = 1
trigger10 = stateno = 270 && movecontact; = 1
trigger11 = stateno = 400 && movecontact = 1
trigger12 = stateno = 410 && movecontact = 1
trigger13 = stateno = 420 && movecontact = 1
trigger14 = stateno = 450 && movecontact = 1
trigger15 = stateno = 500 && movecontact = 1
;---------------------------------------------------------------------------
;============================特殊技=========================================
;---------------------------------------------------------------------------

;ダッシュ
[State -1, Run Fwd]
type = ChangeState
value = 100
trigger1 = command = "FF"
trigger1 = statetype = S
trigger1 = ctrl

;空中ダッシュ
[State -1, Run Fwd]
type = ChangeState
value = 110
trigger1 = command = "FF"
trigger1 = statetype = A
trigger1 = ctrl

; バックステップ
[State -1, Run Back]
type = ChangeState
value = 105
trigger1 = command = "BB"
trigger1 = statetype = S
trigger1 = ctrl

; 空中バックダッシュ
[State -1, Run Back]
type = ChangeState
value = 112
triggerall = vel x <= 0;-1 
trigger1 = command = "BB"
trigger1 = statetype = A
trigger1 = ctrl

; 投げ
[State -1,]
type = ChangeState
value = 800
triggerall = (command = "holdfwd") && (command = "y")
triggerall = statetype = S
triggerall = ctrl
triggerall = stateno != 100
trigger1 = p2bodydist X < 7
trigger1 = (p2statetype = S) || (p2statetype = C)
trigger1 = p2movetype != H
[State -1,]
type = ChangeState
value = 805
triggerall = (command = "holdback") && (command = "y")
triggerall = statetype = S
triggerall = ctrl
triggerall = stateno != 100
trigger1 = p2bodydist X < 7
trigger1 = (p2statetype = S) || (p2statetype = C)
trigger1 = p2movetype != H
; きたねぇ花火（カウンター）
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
triggerall = Power < powermax
triggerall = ctrl = 1
trigger1 = command = "hold_b" && command = "hold_y"
trigger2 = command = "hold_c"

; 挑発
[State -1]
type = ChangeState
value = 195
trigger1 = command = "start"
trigger1 = Vel X = 0
trigger1 = stateno != 195
trigger1 = statetype = S
trigger1 = ctrl = 1

; 高速移動 (後方)
[State -1]
type = ChangeState
value = 360
triggerall = command = "recovery" ^^ command = "z"
triggerall = command = "holdback"
trigger1 = ctrl
trigger2 = stateno = 100
trigger3 = stateno = 101
trigger4 = stateno = 102

; 高速移動 (前方)
[State -1]
type = ChangeState
value = 361
triggerall = command = "recovery" ^^ command = "z"
trigger1 = ctrl

; ダッシュ高速移動 (前方)
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
value = 511
triggerall = stateno = 101
trigger1 = command = "hold_y"

; ダッシュ弱パンチ (ダッシュ中)
[State -1,]
type = ChangeState
value = 500
triggerall = stateno = 101
trigger1 = command = "hold_x"

; ダッシュ弱キック (スライディングキック)
[State -1,]
type = ChangeState
value = 550
triggerall = stateno = 101
trigger1 = command = "hold_a"

; ダッシュ強キック (ダッシュ中)
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
value = 210
triggerall = command = "x"
triggerall = command != "holddown"
triggerall = p2bodydist x < 4
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 210 && movecontact
trigger4 = stateno = 500 && movecontact

; 弱パンチ
[State -1,]
type = ChangeState
value = 200
triggerall = command = "x"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 52 || stateno = 101
trigger2 = animelem = 1, >= 1
trigger3 = stateno = 200
trigger3 = time > 9
trigger4 = stateno = 210 && movecontact
trigger5 = stateno = 260 && movecontact
trigger6 = stateno = 500 && movecontact

; 強パンチ (近距離)
[State -1,]
type = ChangeState
value = 230
triggerall = command = "y"
triggerall = command != "holddown"
triggerall = p2bodydist x < 15
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 210 && movecontact
trigger3 = stateno = 200 && movecontact
trigger4 = stateno = 500 && movecontact

; 強パンチ
[State -1,]
type = ChangeState
value = 220
triggerall = command = "y"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 230 && movecontact
trigger3 = stateno = 200 && movecontact
trigger4 = stateno = 210 && movecontact
trigger5 = stateno = 250 && movecontact
trigger6 = stateno = 260 && movecontact
trigger7 = stateno = 500 && movecontact

;-------------------------------------------キック

; 弱キック (近距離)
[State -1,]
type = ChangeState
value = 260
triggerall = command = "a"
triggerall = command != "holddown"
triggerall = p2bodydist x < 5
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 235
trigger2 = time > 3
trigger3 = stateno = 210 && movecontact
trigger4 = stateno = 200 && movecontact
trigger5 = stateno = 500 && movecontact

; 弱キック
[State -1,]
type = ChangeState
value = 250
triggerall = command = "a"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 250
trigger2 = time > 14
trigger3 = stateno = 260
trigger3 = time > 3
trigger4 = stateno = 210 && movecontact
trigger5 = stateno = 200 && movecontact
trigger6 = stateno = 500 && movecontact
trigger7 = stateno = 250 && movecontact

; 強キック (近距離)
[State -1,]
type = ChangeState
value = 280
triggerall = command = "b"
triggerall = command != "holddown"
triggerall = p2bodydist x < 25
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 230 && movecontact
trigger3 = stateno = 200 && movecontact
;trigger4 = stateno = 250 && movecontact
trigger4 = stateno = 260 && movecontact
trigger5 = stateno = 500 && movecontact

; 強キック
[State -1]
type = ChangeState
value = 270
triggerall = command = "b"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = 220 && movecontact
trigger3 = stateno = 210 && movecontact
trigger4 = stateno = 230 && movecontact
trigger5 = stateno = 200 && movecontact
trigger6 = stateno = 250 && movecontact
;trigger7 = stateno = 260 && movecontact
trigger7 = stateno = 500 && movecontact

;---------------------------------------------------------------------------
;============================しゃがみ=========================================
;---------------------------------------------------------------------------

; しゃがみ弱パンチ
[State -1]
type = ChangeState
value = 410
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
triggerall = command = "y"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 101
trigger3 = stateno = 420 && movecontact
trigger4 = stateno = 410 && movecontact
trigger5 = stateno = 210 && movecontact
trigger6 = stateno = 200 && movecontact
trigger7 = stateno = 250 && movecontact
trigger8 = stateno = 260 && movecontact
trigger9 = stateno = 500 && movecontact

; しゃがみ弱キック
[State -1]
type = ChangeState
value = 420
triggerall = command = "a"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 101
trigger3 = stateno = 420 && movecontact
trigger3 = time > 4
trigger4 = stateno = 410 && movecontact
trigger5 = stateno = 210 && movecontact
trigger6 = stateno = 200 && movecontact
trigger7 = stateno = 500 && movecontact

; しゃがみ強キック
[State -1]
type = ChangeState
value = 450
triggerall = command = "b"
triggerall = command = "holddown"
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 101
trigger3 = stateno = 420 && movecontact
trigger4 = stateno = 410 && movecontact
trigger5 = stateno = 200 && movecontact
trigger6 = stateno = 210 && movecontact
trigger7 = stateno = 250 && movecontact
;trigger8 = stateno = 280 && movecontact
trigger8 = stateno = 220 && movecontact
trigger9 = stateno = 230 && movecontact
trigger10 = stateno = 400 && movecontact
trigger11 = stateno = 500 && movecontact

;---------------------------------------------------------------------------
;============================空中技=========================================
;---------------------------------------------------------------------------

; ジャンプ弱パンチ
[State -1]
type = ChangeState
value = 610
triggerall = command = "x"
trigger1 = statetype = A && vel x != 0 
trigger1 = ctrl = 1
;trigger2 = stateno = 610 && movecontact = 1

; ジャンプ弱パンチ (垂直)
[State -1]
type = ChangeState
value = 600
triggerall = command = "x"
trigger1 = statetype = A
trigger1 = ctrl = 1
trigger2 = stateno = 600 && movecontact = 1

; ジャンプ強パンチ
[State -1]
type = ChangeState
value = 620
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
triggerall = command = "a"
trigger1 = statetype = A && vel x != 0
trigger1 = ctrl = 1
trigger2 = stateno = 610 && movecontact = 1
;trigger3 = stateno = 630 && movecontact = 1

; ジャンプ弱キック (垂直)
[State -1]
type = ChangeState
value = 635
triggerall = command = "a"
trigger1 = statetype = A
trigger1 = ctrl = 1
trigger2 = stateno = 600 && movecontact = 1
trigger3 = stateno = 635 && movecontact = 1

; ジャンプ強キック
[State -1]
type = ChangeState
value = 650
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
triggerall = command = "b"
trigger1 = statetype = A
trigger1 = ctrl = 1
trigger2 = stateno = 600 && movecontact = 1
trigger3 = stateno = 635 && movecontact = 1
trigger4 = stateno = 620 && movecontact = 1

