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


;-| Special Motions |------------------------------------------------------

[Command]
name = "karasu_attack"
command = ~D,DF,F,D,F,x
time = 30
buffer.time = 3

[Command]
name = "karasu_attack"
command = ~D,DF,F,x+y
buffer.time = 3

[Command]
name = "karasu_attack"
command = ~D,DF,F,z
buffer.time = 3

[Command]
name = "S_akuryou"
command = ~D,DF,F,D,F,a
time = 30
buffer.time = 3

[Command]
name = "S_akuryou"
command = ~D,DF,F,a+b
buffer.time = 3

[Command]
name = "S_akuryou"
command = ~D,DF,F,c
buffer.time = 3

[Command]
name = "S_mandara"
command = ~D,DF,F,D,F,y
time = 30
buffer.time = 3

[Command]
name = "S_mandara"
command = ~D,DF,F,D,F,z
time = 30
buffer.time = 3

[Command]
name = "S_soul"
command = ~D,DF,F,D,F,b
time = 30
buffer.time = 3

[Command]
name = "S_soul"
command = ~D,DF,F,D,F,c
time = 30
buffer.time = 3

[Command]
name = "mars_flame_dance"
command = ~D,DF,F,D,F,s
time = 30
buffer.time = 3

[Command]
name = "fire_bird_l"
command = ~D,DB,B,x
buffer.time = 3

[Command]
name = "fire_bird_h"
command = ~D,DB,B,y
buffer.time = 3

[Command]
name = "fire_snake_l"
command = ~D,DF,F,x
buffer.time = 3

[Command]
name = "fire_snake_h"
command = ~D,DF,F,y
buffer.time = 3

[Command]
name = "fire_snake_s"
command = ~D,DB,B,D,B,x
time = 30
buffer.time = 3

[Command]
name = "fire_snake_s"
command = ~D,DB,B,D,B,y
time = 30
buffer.time = 3

[Command]
name = "fire_snake_s"
command = ~D,DB,B,x+y
buffer.time = 3

[Command]
name = "fire_snake_s"
command = ~D,DB,B,z
buffer.time = 3

[Command]
name = "fire_sniper"
command = ~D,B,F,x
time = 20
buffer.time = 3

[Command]
name = "fire_sniper"
command = ~D,B,F,y
time = 20
buffer.time = 3

[Command]
name = "fire_kick_l"
command = ~D,DB,B,a
buffer.time = 3

[Command]
name = "fire_kick_h"
command = ~D,DB,B,b
buffer.time = 3

[Command]
name = "mandara"
command = ~F,D,DF,x
buffer.time = 3

[Command]
name = "mandara"
command = ~F,D,DF,y
buffer.time = 3

[Command]
name = "akuryou"
command = ~F,D,DF,a
buffer.time = 3

[Command]
name = "akuryou_h"
command = ~F,D,DF,b
buffer.time = 3

;-| Double Tap |-----------------------------------------------------------
[Command]
name = "FF"     ;Required (do not remove)
command = F, F
time = 10
buffer.time = 3

[Command]
name = "BB"     ;Required (do not remove)
command = B, B
time = 10
buffer.time = 3

;-| 2/3 Button Combination |-----------------------------------------------
[Command]
name = "recovery"
command = a
time = 1

[Command]
name = "recovery"
command = b
time = 1

[Command]
name = "recovery"
command = c
time = 1

[Command]
name = "recovery"
command = x
time = 1

[Command]
name = "recovery"
command = y
time = 1

[Command]
name = "recovery"
command = z
time = 1

[Command]
name = "nage"
command = x+y
time = 1
buffer.time = 3

[Command]
name = "nage"
command = z
time = 1
buffer.time = 3

[Command]
name = "kaihi"
command = x+a
time = 1
buffer.time = 3

[Command]
name = "kaihi"
command = y+b
time = 1
buffer.time = 3

[Command]
name = "kaihi"
command = z+c
time = 1
buffer.time = 3

[Command];ハイジャンプ
name = "HJ"
command = ~$D, $U
time = 8

[Command];ハイジャンプ暴発阻止
name = "NHJ"
command = ~12$D, $U
time = 8

[Command];ハイジャンプ暴発阻止
name = "NHJ"
command = /$D
time = 12

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
name = "holda"
command = /$a
time = 1

[Command]
name = "holdb"
command = /$b
time = 1

[Command]
name = "holdx"
command = /$x
time = 1

[Command]
name = "holdy"
command = /$y
time = 1

[Command]
name = "holdz"
command = /$z
time = 1

[Statedef -1]

[State VarAdd];EXディフェンス
type = VarAdd
trigger1 = var(0) < 8 && (Command != "holdback" || var(0) < 0)
var(0) = 1

[State VarSet];EXディフェンス
type = VarSet
trigger1 = Ctrl && Command = "holdback" && var(0) >= 0
trigger2 = StateNo = 125
var(0) = -12 * (var(0) = 8)

[State HitOverride];EXディフェンス
type = HitOverride
trigger1 = Ctrl && var(0) < 0 && StateType = S && StateNo != [150,155]
attr = SA, AA, AP
stateno = 125
ignorehitpause = 1

[State HitOverride];EXディフェンス
type = HitOverride
trigger1 = Ctrl && var(0) < 0 && StateType = C && StateNo != [150,155]
attr = CA, AA, AP
stateno = 125
ignorehitpause = 1

[State HitOverride];EXディフェンス
type = HitOverride
trigger1 = Ctrl && var(0) < 0 && StateType = A && StateNo != [150,155]
attr = SCA, AA, AP
stateno = 125
ignorehitpause = 1

[State VarAdd];EXディフェンス
type = VarAdd
trigger1 = var(1) > 0
var(1) = -1

[State -1, マーズ・フレイム・ダンス]
type = ChangeState
value = 3400
triggerall = command = "mars_flame_dance"
triggerall = !NumHelper(901) && !NumHelper(902)
triggerall = power >= 5000
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 240 || stateno = 245 || stateno = 250 || stateno = 400 || stateno = 410 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1955]
trigger4 = stateno = 108 && time = [10,27]

[State -1, ファイヤー・ソール]
type = ChangeState
value = 3300
triggerall = command = "S_soul"
triggerall = !NumHelper(901) && !NumHelper(902) && !NumHelper(3320)
triggerall = power >= 4000
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 240 || stateno = 245 || stateno = 250 || stateno = 400 || stateno = 410 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1955]
trigger4 = stateno = 108 && time = [10,27]

[State -1, バーニング・マンダラー]
type = ChangeState
value = 3200
triggerall = command = "S_mandara"
triggerall = !NumHelper(901) && !NumHelper(902)
triggerall = power >= 3000
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 240 || stateno = 245 || stateno = 250 || stateno = 400 || stateno = 410 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1955]
trigger4 = stateno = 108 && time = [10,27]

[State -1, 悪霊退散]
type = ChangeState
value = 3100
triggerall = command = "S_akuryou"
triggerall = !NumHelper(901) && !NumHelper(902)
triggerall = power >= 2000
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 240 || stateno = 245 || stateno = 250 || stateno = 400 || stateno = 410 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1955]
trigger4 = stateno = 108 && time = [10,27]

[State -1, フォボス・ディモス]
type = ChangeState
value = 3000
triggerall = command = "karasu_attack"
triggerall = !NumHelper(901) && !NumHelper(902)
triggerall = power >= 1000
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 240 || stateno = 245 || stateno = 250 || stateno = 400 || stateno = 410 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1955]
trigger4 = stateno = 108 && time = [10,27]

[State -1, バーニング・マンダラー]
type = ChangeState
value = 1500
triggerall = command = "mandara"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 240 || stateno = 245 || stateno = 250 || stateno = 400 || stateno = 410 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1955]
trigger4 = stateno = 108 && time = [10,27]

[State -1, 悪霊退散]
type = ChangeState
value = 1400
triggerall = command = "akuryou"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 240 || stateno = 245 || stateno = 250 || stateno = 400 || stateno = 410 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1955]
trigger4 = stateno = 108 && time = [10,27]

[State -1, 悪霊退散]
type = ChangeState
value = 1405
triggerall = command = "akuryou_h"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 240 || stateno = 245 || stateno = 250 || stateno = 400 || stateno = 410 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1955]
trigger4 = stateno = 108 && time = [10,27]

[State -1, マーズ・フレイム・スナイパー]
type = ChangeState
value = 1000
triggerall = command = "fire_sniper"
triggerall = NumProjID(1000) = 0
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 240 || stateno = 245 || stateno = 250 || stateno = 400 || stateno = 410 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1955]
trigger4 = stateno = 108 && time = [10,27]

[State -1, マーズ・スネイク・ファイヤーEX]
type = ChangeState
value = 1190
triggerall = command = "fire_snake_s"
triggerall = NumProjID(1100) = 0
triggerall = (100 * life / const(data.life)) <= 30
triggerall = power >= 500
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 240 || stateno = 245 || stateno = 250 || stateno = 400 || stateno = 410 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1955]
trigger4 = stateno = 108 && time = [10,27]

[State -1, マーズ・スネイク・ファイヤー]
type = ChangeState
value = 1100
triggerall = command = "fire_snake_l"
triggerall = NumProjID(1100) = 0
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 240 || stateno = 245 || stateno = 250 || stateno = 400 || stateno = 410 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1955]
trigger4 = stateno = 108 && time = [10,27]

[State -1, マーズ・スネイク・ファイヤー]
type = ChangeState
value = 1150
triggerall = command = "fire_snake_h"
triggerall = NumProjID(1100) = 0
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 240 || stateno = 245 || stateno = 250 || stateno = 400 || stateno = 410 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1955]
trigger4 = stateno = 108 && time = [10,27]

[State -1, ファイヤー・ソール・バード]
type = ChangeState
value = 1200
triggerall = command = "fire_bird_l"
triggerall = NumProjID(1200) = 0
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 240 || stateno = 245 || stateno = 250 || stateno = 400 || stateno = 410 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1955]
trigger4 = stateno = 108 && time = [10,27]

[State -1, ファイヤー・ソール・バード]
type = ChangeState
value = 1250
triggerall = command = "fire_bird_h"
triggerall = NumProjID(1200) = 0
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 240 || stateno = 245 || stateno = 250 || stateno = 400 || stateno = 410 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1955]
trigger4 = stateno = 108 && time = [10,27]

[State -1, ファイヤー・ヒール・ドロップ]
type = ChangeState
value = 1300
triggerall = command = "fire_kick_l"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 240 || stateno = 245 || stateno = 250 || stateno = 400 || stateno = 410 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1955]
trigger4 = stateno = 108 && time = [10,27]

[State -1, ファイヤー・ヒール・ドロップ]
type = ChangeState
value = 1350
triggerall = command = "fire_kick_h"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 240 || stateno = 245 || stateno = 250 || stateno = 400 || stateno = 410 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1955]
trigger4 = stateno = 108 && time = [10,27]

[State -1, ファイヤー・ヒール・ドロップ]
type = ChangeState
value = 1301
triggerall = command = "fire_kick_l" || command = "fire_kick_h"
trigger1 = statetype = A
trigger1 = stateno = 231 || stateno = 600 || stateno = 610 || stateno = 630
trigger1 = MoveContact
trigger2 = statetype = A
trigger2 = ctrl
trigger3 = stateno = 19544

;---------------------------------------------------------------------------
;Run Fwd
;ダッシュ
[State -1, Run Fwd]
type = ChangeState
value = 100
trigger1 = command = "FF"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
;Run Back
;後退ダッシュ
[State -1, Run Back]
type = ChangeState
value = 105
trigger1 = command = "BB"
trigger1 = statetype = S
trigger1 = ctrl

;回避
[State -1, Run Back]
type = ChangeState
value = 108
triggerall = command = "kaihi"
triggerall = statetype != A
trigger1 = ctrl || StateNo = 135 || stateno = [150,153]
;---------------------------------------------------------------------------
;Kung Fu Throw
;投げ
[State -1, 通常投げ]
type = ChangeState
value = 800
triggerall = statetype != A
triggerall = ctrl
trigger1 = command = "nage"
trigger1 = stateno != 100

[State -1, ダッシュ投げ]
type = ChangeState
value = 890
triggerall = statetype != A
triggerall = ctrl
trigger1 = command = "nage"

[State -1, ダッシュ弱攻撃]
type = ChangeState
value = 700
triggerall = command = "a"
triggerall = ctrl
trigger1 = stateno = 100
trigger2 = stateno = 105

[State -1, ダッシュ強攻撃]
type = ChangeState
value = 250
triggerall = command = "b"
triggerall = ctrl
trigger1 = stateno = 100
trigger2 = stateno = 105

;コンビネーション2
[State -1, Stand Light Punch]
type = ChangeState
value = 205
triggerall = command = "x"
triggerall = command != "holddown"
trigger1 = stateno = 200 || stateno = 700
trigger1 = MoveContact

;コンビネーション3
[State -1, Stand Light Kick]
type = ChangeState
value = 215
triggerall = command = "x"
triggerall = command != "holddown"
trigger1 = stateno = 205
trigger1 = MoveContact

;コンビネーション4
[State -1, Stand Strong Punch]
type = ChangeState
value = 225
triggerall = command = "x"
triggerall = command != "holddown"
trigger1 = command = "x"
trigger1 = stateno = 215
trigger1 = MoveContact

;コンビネーション5
[State -1, Standing Strong Kick]
type = ChangeState
value = 235
triggerall = command != "holddown"
triggerall = command = "x"
trigger1 = stateno = 225
trigger1 = MoveContact

;立ち弱パンチ
[State -1, Stand Light Punch]
type = ChangeState
value = 200
triggerall = command = "x"
triggerall = command != "holddown"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 400
trigger2 = time > 3

;立ち弱キック
[State -1, Stand Light Kick]
type = ChangeState
value = 210
triggerall = command = "a"
triggerall = command != "holddown"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 400
trigger2 = movehit
trigger3 = stateno = 210
trigger3 = time > 7

;立ち強パンチ
[State -1, Stand Strong Punch]
type = ChangeState
value = 240
triggerall = command = "y"
triggerall = command != "holddown"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 400
trigger2 = MoveContact

[State -1, しゃがみ強キック]
type = ChangeState
value = 410
triggerall = command = "b"
triggerall = command = "holddown"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 400
trigger2 = MoveContact

;中段攻撃
[State -1, Standing Strong Kick]
type = ChangeState
value = 230
triggerall = command = "b"
triggerall = command = "holdfwd"
triggerall = command != "holddown"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 220 || stateno = 200 || stateno = 210 || stateno = 240 || stateno = 400
trigger2 = MoveContact

;立ち強キック
[State -1, Standing Strong Kick]
type = ChangeState
value = 250
triggerall = command = "b"
triggerall = command != "holddown"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 220 || stateno = 200 || stateno = 210 || stateno = 240 || stateno = 400
trigger2 = MoveContact


;---------------------------------------------------------------------------
;Taunt
;挑発
[State -1, Taunt]
type = ChangeState
value = 195
triggerall = command = "start"
trigger1 = statetype != A
trigger1 = ctrl

[State -1, 振り向き攻撃]
type = ChangeState
value = 640
triggerall = command = "holdback"
triggerall = command = "a"
trigger1 = statetype = A
trigger1 = ctrl

[State -1, 空中弱攻撃]
type = ChangeState
value = 600
triggerall = command = "x"
trigger1 = statetype = A
trigger1 = ctrl

[State -1, 空中中攻撃]
type = ChangeState
value = 610
triggerall = command = "a"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600
trigger2 = MoveContact

[State -1, 空中強攻撃]
type = ChangeState
value = 630
triggerall = command = "b" || command = "y"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 || stateno = 610
trigger2 = MoveContact

[State -1, しゃがみ弱攻撃]
type = ChangeState
value = 400
triggerall = command = "x" || command = "a"
triggerall = command = "holddown"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 400
trigger2 = time > 3

[State -1, しゃがみ強パンチ]
type = ChangeState
value = 220
triggerall = command = "y"
triggerall = command = "holddown"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 400
trigger2 = MoveContact

;ハイジャンプ
[State -1]
type = ChangeState
value = 198
trigger1 = command = "HJ"
trigger1 = command != "NHJ"
trigger1 = statetype != A
trigger1 = ctrl
;---------------------------------------------------------------------------

[State -1, setting];kao;アクション顔画像
type = varset
trigger1 = 1
v = 46
value = 1

[State -1, setting];ero;脱衣KO ON(1)/OFF(0)
type = varset
trigger1 = 1
v = 39
value = 0;1

