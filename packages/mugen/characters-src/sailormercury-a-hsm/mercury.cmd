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
name = "mercury_poisoning"
command = ~D,DF,F,D,DF,F,z
time = 30

[Command]
name = "crash_launcher"
command = ~D,DF,F,D,DF,F,x
time = 30

[Command]
name = "shine_aqua_cutter"
command = ~D,DF,F,D,DF,F,a
time = 30

[Command]
name = "mirage_wave"
command = ~D,DF,F,D,DF,F,y
time = 30

[Command]
name = "s_shabon_spray"
command = ~D,DF,F,D,DF,F,b
time = 30

[Command]
name = "s_shabon_spray_freezing"
command = ~D,DF,F,D,DF,F,c
time = 30

[Command]
name = "gettenhoukai"
command = ~D,DF,F,z
time = 22

[Command]
name = "water_bullet"
command = ~D,DB,B,D,DB,B,D,DB,B,D,DB,B,D,DB,B,D,DB,B,x
time = 30

[Command]
name = "water_bullet"
command = ~D,DB,B,c
time = 30

[Command]
name = "aqua_illusion"
command = ~D,DB,B,x

[Command]
name = "shine_aqua_illusion"
command = ~D,DF,F,c

[Command]
name = "aqua_illusion_h"
command = ~D,DB,B,y

[Command]
name = "aqua_mirage"
command = ~D,DB,B,D,DB,B,D,DB,B,D,DB,B,D,DB,B,D,DB,B,x

[Command]
name = "aqua_mirage_h"
command = ~F,D,F,x

[Command]
name = "aqua_blade"
command = ~D,DF,F,z

[Command]
name = "aqua_blade_h"
command = ~D,DB,B,z

[Command]
name = "shabon_spray"
command = ~D,DF,F,x

[Command]
name = "shabon_spray_freezing"
command = ~D,DF,F,y

[Command]
name = "aqua_rhapsody"
command = ~D,B,F,D,B,F,D,B,F,D,B,F,D,B,F,D,B,F,x
time = 20

[Command]
name = "aqua_rhapsody_h"
command = ~D,DB,B,b
time = 20

[Command]
name = "step"
command = ~D,DB,B,D,DB,B,D,DB,B,D,DB,B,D,DB,B,a

[Command]
name = "step_h"
command = ~D,DB,B,a

[Command]
name = "protectivewaterball"
command = ~D,DF,F,a

[Command]
name = "shabon_defend_3"
command = ~D,DB,x
time = 20

[Command]
name = "rain_storm_2"
command = ~D,DF,x
time = 20

[Command]
name = "rain_arrow"
command = ~D,DF,F,a
time = 20

[Command]
name = "shine_snow_illusion"
command = ~D,DF,F,b
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

[Command]
name = "nage"
command = z
time = 1

[Command]
name = "kaihi"
command = x+a
time = 1

[Command]
name = "kaihi"
command = y+b
time = 1

[Command]
name = "kaihi"
command = z+c
time = 1

[Command];ハイジ??プ
name = "HJ"
command = ~$D, $U
time = 8

[Command];ハイジ??プ暴発阻止
name = "NHJ"
command = ~12$D, $U
time = 8

[Command];ハイジ??プ暴発阻止
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
command = a+b
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
name = "holdDF";Required (do not remove)
command = /$DF
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
name = "holdc"
command = /$c
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

[State VarAdd];EXディフェ?ス
type = VarAdd
trigger1 = var(0) < 8 && (Command != "holdback" || var(0) < 0)
var(0) = 1

[State VarSet];EXディフェ?ス
type = VarSet
trigger1 = Ctrl && Command = "holdback" && var(0) >= 0
trigger2 = StateNo = 125
var(0) = -12 * (var(0) = 8)

[State HitOverride];EXディフェ?ス
type = HitOverride
trigger1 = Ctrl && var(0) < 0 && StateType = S && StateNo != [150,155]
attr = SA, AA, AP
stateno = 125
ignorehitpause = 1

[State HitOverride];EXディフェ?ス
type = HitOverride
trigger1 = Ctrl && var(0) < 0 && StateType = C && StateNo != [150,155]
attr = CA, AA, AP
stateno = 125
ignorehitpause = 1

[State HitOverride];EXディフェ?ス
type = HitOverride
trigger1 = Ctrl && var(0) < 0 && StateType = A && StateNo != [150,155]
attr = SCA, AA, AP
stateno = 125
ignorehitpause = 1

[State VarAdd];EXディフェ?ス
type = VarAdd
trigger1 = var(1) > 0
var(1) = -1

[State -1, マーキ??ー・ポイズニ?グ]
type = ChangeState
value = 3400
triggerall = command = "mercury_poisoning"
triggerall = power >= 5000
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, シ?ボ?・スプ?ー]
type = ChangeState
value = 3300
triggerall = command = "s_shabon_spray"
triggerall = !numprojID(3300)
triggerall = !numhelper(3300)
triggerall = power >= 4000
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, シ?ボ?・スプ?ー]
type = ChangeState
value = 3600
triggerall = command = "s_shabon_spray_freezing"
triggerall = !numhelper(3610)
triggerall = power >= 5000
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, ミ?ージ?・ウェー?]
type = ChangeState
value = 3200
triggerall = command = "mirage_wave"
triggerall = !numprojID(3200)
triggerall = !numprojID(3201)
triggerall = !numprojID(3202)
triggerall = power >= 3000
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, シ?イ?・アクア・カッター]
type = ChangeState
value = 3100
triggerall = command = "shine_aqua_cutter"
triggerall = power >= 2000
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, ク?ッシ?・??チ?ー]
type = ChangeState
value = 3000
triggerall = command = "crash_launcher"
triggerall = !numprojID(3000)
triggerall = !numprojID(3050)
triggerall = power >= 1000
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, suija waza]
type = ChangeState
value = 3500
triggerall = command = "gettenhoukai"
triggerall = power >= 4000
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 231
trigger2 = time < 15
trigger3 = stateno = 631
trigger3 = time > 12
trigger4 = stateno = 711
trigger4 = time < 12
trigger5 = stateno = 222
trigger5 = !MoveContact
trigger5 = time = [6,14]
trigger6 = stateno = 1606
trigger6 = time > 4
trigger7 = stateno = [1951,1956]

[State -1, マーキ??ー・アクア・?プソディー]
type = ChangeState
value = 2200
triggerall = command = "shine_aqua_illusion"
triggerall = !numhelper(3610)
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, Stand Light Punch]
type = ChangeState
value = 1502
triggerall = command = "shabon_defend_3"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 231
trigger2 = time < 15
trigger3 = stateno = 631
trigger3 = time > 12
trigger4 = stateno = 711
trigger4 = time < 12
trigger5 = stateno = 222
trigger5 = !MoveContact
trigger5 = time = [6,14]
trigger6 = stateno = 1606
trigger6 = time > 4
trigger7 = stateno = [1951,1956]

[State -1, suija waza]
type = ChangeState
value = 1800
triggerall = command = "rain_arrow"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 231
trigger2 = time < 15
trigger3 = stateno = 631
trigger3 = time > 12
trigger4 = stateno = 711
trigger4 = time < 12
trigger5 = stateno = 222
trigger5 = !MoveContact
trigger5 = time = [6,14]
trigger6 = stateno = 1606
trigger6 = time > 4
trigger7 = stateno = [1951,1956]

[State -1, suija waza]
type = ChangeState
value = 1750
triggerall = command = "rain_storm_2"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 231
trigger2 = time < 15
trigger3 = stateno = 631
trigger3 = time > 12
trigger4 = stateno = 711
trigger4 = time < 12
trigger5 = stateno = 222
trigger5 = !MoveContact
trigger5 = time = [6,14]
trigger6 = stateno = 1606
trigger6 = time > 4
trigger7 = stateno = [1951,1956]

[State -1, ウォーターブ?ット]
type = ChangeState
value = 2000
triggerall = command = "water_bullet"
triggerall = power >= 500
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, アクア・ブ?ード]
type = ChangeState
value = 1690
triggerall = command = "aqua_blade"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, アクア・ブ?ード]
type = ChangeState
value = 1695
triggerall = command = "aqua_blade_h"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, アクア・ブ?ード]
type = ChangeState
value = 1600
triggerall = command = "aqua_blade"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 231 || stateno = 600 || stateno = 610 || stateno = 630 || stateno = 711
trigger2 = MoveContact

[State -1, アクア・ブ?ード]
type = ChangeState
value = 1650
triggerall = command = "aqua_blade_h"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 231 || stateno = 600 || stateno = 610 || stateno = 630 || stateno = 711
trigger2 = MoveContact

[State -1, マーキ??ー・アクア・?プソディー]
type = ChangeState
value = 1300
triggerall = command = "aqua_rhapsody"
triggerall = !NumProjID(1300)
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, マーキ??ー・アクア・?プソディー]
type = ChangeState
value = 1350
triggerall = command = "aqua_rhapsody_h"
triggerall = !NumProjID(1300)
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, マーキ??ー・アクア・ミ?ージ?]
type = ChangeState
value = 1100
triggerall = command = "aqua_mirage"
triggerall = !NumProjID(1100)
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, マーキ??ー・アクア・ミ?ージ?]
type = ChangeState
value = 1150
triggerall = command = "aqua_mirage_h"
triggerall = !NumProjID(1100)
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, ?バース・ブ?イク・ステップ]
type = ChangeState
value = 1400
triggerall = command = "step"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, ?バース・ブ?イク・ステップ]
type = ChangeState
value = 1450
triggerall = command = "step_h"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, シ?イ?・アクア・イ??ージ??]
type = ChangeState
value = 1201
triggerall = var(51) != 1
triggerall = command = "aqua_illusion"
triggerall = numhelper(1200) <= 4
triggerall = !numhelper(3610)
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, シ?イ?・アクア・イ??ージ??]
type = ChangeState
value = 1200
triggerall = command = "aqua_illusion_h"
triggerall = numhelper(1200) < 5
triggerall = !numhelper(3610)
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, シ?イ?・アクア・イ??ージ??発動]
type = ChangeState
value = 1250
triggerall = command = "c"
triggerall = numhelper(1200) > 0
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, シ?ボ?・スプ?ー]
type = ChangeState
value = 1000
triggerall = command = "shabon_spray"
triggerall = !NumProjID(1000)
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1, シ?ボ?・スプ?ー・フ?ージ?グ]
type = ChangeState
value = 1050
triggerall = command = "shabon_spray_freezing"
triggerall = !NumProjID(1050)
triggerall = !numhelper(3610)
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1]
type = ChangeState
value = 8600
triggerall = command = "protectivewaterball"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]

[State -1]
type = ChangeState
value = 2100
triggerall = command = "shine_snow_illusion"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 245 || stateno = 247 || stateno = 400 || stateno = 410 || stateno = 420 || stateno = 700
trigger2 = MoveContact
trigger3 = stateno = [1951,1956]
trigger4 = stateno = 108 && time = [10,27]
;---------------------------------------------------------------------------
;Run Fwd
;ダッシ?
[State -1, Run Fwd]
type = ChangeState
value = 100
trigger1 = command = "FF"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
;Run Back
;後退ダッシ?
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
trigger1 = statetype != A
trigger1 = ctrl || StateNo = 135 || stateno = [150,153]
;---------------------------------------------------------------------------
;Kung Fu Throw
;?げ
[State -1, Kung Fu Throw]
type = ChangeState
value = 800
triggerall = statetype != A
triggerall = ctrl
trigger1 = command = "nage"

;空??げ
[State -1, Kung Fu Throw]
type = ChangeState
value = 880
triggerall = statetype = A
triggerall = ctrl
trigger1 = command = "nage"

[State -1, ダッシ?弱攻?]
type = ChangeState
value = 700
triggerall = command = "x"
trigger1 = stateno = 100 || stateno = 105
trigger1 = ctrl

[State -1, ダッシ?強攻?]
type = ChangeState
value = 710
triggerall = command = "b"
trigger1 = stateno = 100 || stateno = 105
trigger1 = ctrl

;コ?ビネーシ??2
[State -1, Stand Light Punch]
type = ChangeState
value = 205
triggerall = command = "x"
triggerall = command != "holddown"
trigger1 = stateno = 200 || stateno = 700
trigger1 = MoveContact

;コ?ビネーシ??3
[State -1, Stand Light Kick]
type = ChangeState
value = 221
triggerall = command = "x"
triggerall = command != "holddown"
trigger1 = stateno = 205
trigger1 = MoveContact

;コ?ビネーシ??4
[State -1, Stand Strong Punch]
type = ChangeState
value = 225
triggerall = command = "x"
triggerall = command != "holddown"
trigger1 = command = "x"
trigger1 = stateno = 221
trigger1 = MoveContact

;コ?ビネーシ??5
[State -1, Standing Strong Kick]
type = ChangeState
value = 235
triggerall = command != "holddown"
triggerall = command = "x"
trigger1 = stateno = 225
trigger1 = time >= 5
trigger1 = MoveContact

;立ち弱パ?チ
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
trigger2 = MoveContact
trigger3 = stateno = 210
trigger3 = time > 6

;立ち強パ?チ
[State -1, Stand Strong Punch]
type = ChangeState
value = 220
triggerall = command = "y"
triggerall = command != "holddown"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 400
trigger2 = MoveContact

[State -1, 立ち強キック]
type = ChangeState
value = 240
triggerall = command = "b";"yb" || command = "z"
triggerall = command != "holddown"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 400 || stateno = 410
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

[State -1, 振り向き攻?]
type = ChangeState
value = 640
triggerall = command = "holdback"
triggerall = command = "a"
trigger1 = statetype = A
trigger1 = ctrl

[State -1, 空?弱攻?]
type = ChangeState
value = 600
triggerall = command = "x"
trigger1 = statetype = A
trigger1 = ctrl

[State -1, 空??攻?]
type = ChangeState
value = 610
triggerall = command = "a"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600
trigger2 = MoveContact

[State -1, 空?突進攻?]
type = ChangeState
value = 650
triggerall = command = "holdfwd" && command = "b"
trigger1 = statetype = A
trigger1 = ctrl && StateNo = 50

[State -1, 空?強攻?]
type = ChangeState
value = 630
triggerall = command = "y" || command = "b"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 || stateno = 610
trigger2 = MoveContact

[State -1, しゃがみ弱攻?]
type = ChangeState
value = 400
triggerall = command = "x" || command = "a"
triggerall = command = "holddown"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 400
trigger2 = time > 3

[State -1, しゃがみ強パ?チ]
type = ChangeState
value = 410
triggerall = command = "y"
triggerall = command = "holddown"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 400 || stateno = 200 || stateno = 210
trigger2 = MoveContact
trigger3 = stateno = 405
trigger3 = MoveContact

[State -1, しゃがみ強キック]
type = ChangeState
value = 420
triggerall = command = "b"
triggerall = command = "holddown"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno = 200 || stateno = 210 || stateno = 220 || stateno = 400 || stateno = 410
trigger2 = MoveContact

;ハイジ??プ
[State -1]
type = ChangeState
value = 199
trigger1 = command = "HJ"
trigger1 = command != "NHJ"
trigger1 = statetype != A
trigger1 = ctrl

;---------------------------------------------------------------------------

[State -1, setting];kao;アクシ??顔画?
type = varset
trigger1 = 1
v = 46
value = 1

[State -1, setting];ero;脱衣KO ON(1)/OFF(0)
type = varset
trigger1 = 1
v = 39
value = 0;1

