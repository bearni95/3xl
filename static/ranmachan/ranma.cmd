;-| 超必殺技 |--------------------------------------------------------
[Command]
name = "HSH"
command = ~D, DF, F, D, DF, F, a
time = 20

[Command] 
name = "HSH"
command = ~D, DF, F, D, DF, F, b
time = 20

[Command]
name = "KTA"
command = ~D, F, D, B, x
time = 20

[Command] 
name = "KTA"   ;Same name as above
command = ~D, F, D, B, y
time = 20

[Command]
name = "MTB"
command = ~D, DF, F, D, DF, F, x
time = 20

[Command] 
name = "MTB"
command = ~D, DF, F, D, DF, F, y
time = 20

;-| 必殺技 |------------------------------------------------------
[Command]
name = "amaguri_x"
command = x, x, x
time = 15

[Command]
name = "amaguri_y"
command = y, y, y
time = 15

[Command]
name = "Hiryu_x"
command = ~F, D, DF, x

[Command]
name = "Hiryu_y"
command = ~F, D, DF, y

[Command]
name = "Mouko_x"
command = ~D, DF, F, x

[Command]
name = "Mouko_y"
command = ~D, DF, F, y

;-| ２回押し技 |-----------------------------------------------------------
[Command]
name = "FF"     
command = F, F
time = 10

[Command]
name = "BB"     
command = B, B
time = 10

;-| ２・３個の同時押し技 |-----------------------------------------------
[Command]
name = "recovery"
command = x+y
time = 1

[Command]
name = "xa"
command = x+a
time = 1

[Command]
name = "yb"
command = y+b
time = 1

;-| 方向とボタンで出す技 |---------------------------------------------------------
[Command]
name = "down_a"
command = /$D,a
time = 1

[Command]
name = "down_b"
command = /$D,b
time = 1

;-| ボタン設定（いじらない）|---------------------------------------------------------
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

;-| 押しっぱなし設定（いじらない）-------------------------------------------------------
[Command]
name = "holdfwd"
command = /$F
time = 1

[Command]
name = "holdback"
command = /$B
time = 1

[Command]
name = "holdup" 
command = /$U
time = 1

[Command]
name = "holddown"
command = /$D
time = 1


; 下の記述↓は絶対に消さないでください。
[Statedef -1]

;===========================================================================
;---------------------------------------------------------------------------
; 飛竜昇天破（開始）
[State -1]
type = ChangeState
value = 3000
triggerall = command = "HSH"
triggerall = power >= 1000
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno >= 200
trigger2 = stateno <= 499
trigger2 = movecontact
trigger3 = stateno =950
trigger3 = movecontact

;---------------------------------------------------------------------------
;火中天津甘栗拳(超必)
[State -1]
type = ChangeState
value = 3100
triggerall = command = "KTA"
triggerall = power >= 1000
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno >= 200
trigger2 = stateno <= 499
trigger2 = movecontact
trigger3 = stateno =950
trigger3 = movecontact

;---------------------------------------------------------------------------
;猛虎高飛車(超必)
[State -1]
type = ChangeState
value = 3200
triggerall = command = "MTB"
triggerall = power >= 1000
triggerall = numproj = 0
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno >= 200
trigger2 = stateno <= 499
trigger2 = movecontact
trigger3 = stateno =950
trigger3 = movecontact

;===========================================================================
; 飛竜昇天破（弱）
[State -1]
type = ChangeState
value = 1100
triggerall = command = "Hiryu_x"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno >= 200
trigger2 = stateno <= 499
trigger2 = movecontact
trigger3 = stateno =950
trigger3 = movecontact

;---------------------------------------------------------------------------
; 飛竜昇天破（強）
[State -1]
type = ChangeState
value = 1110
triggerall = command = "Hiryu_y"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno >= 200
trigger2 = stateno <= 499
trigger2 = movecontact
trigger3 = stateno =950
trigger3 = movecontact

;===========================================================================
;猛虎高飛車（弱）
[State -1]
type = ChangeState
value = 1200
triggerall = command = "Mouko_x"
triggerall = numproj = 0
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno >= 200
trigger2 = stateno <= 499
trigger2 = movecontact
trigger3 = stateno =950
trigger3 = movecontact

;---------------------------------------------------------------------------
;猛虎高飛車（強）
[State -1]
type = ChangeState
value = 1210
triggerall = command = "Mouko_y"
triggerall = numproj = 0
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno >= 200
trigger2 = stateno <= 499
trigger2 = movecontact
trigger3 = stateno =950
trigger3 = movecontact

;===========================================================================
;火中天津甘栗拳（弱）
[State -1,]
type = ChangeState
value = 1000
triggerall = command = "amaguri_x"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno >= 200
trigger2 = stateno <= 499
trigger2 = movecontact
trigger3 = stateno = 200
trigger3 = Time >= 4
trigger4 = stateno =950
trigger4 = movecontact

;---------------------------------------------------------------------------
;火中天津甘栗拳（強）
[State -1,]
type = ChangeState
value = 1010
triggerall = command = "amaguri_y"
trigger1 = statetype != A
trigger1 = ctrl
trigger2 = stateno >= 200
trigger2 = stateno <= 499
trigger2 = movecontact
trigger3 = stateno = 210
trigger3 = Time >= 6
trigger4 = stateno =950
trigger4 = movecontact

;===========================================================================
;ガードキャンセル緊急回避　後
[State -1]
type = ChangeState
value = 915
triggerall = power >= 1000
triggerall = command = "xa"
triggerall = command = "holdback"
trigger1 = stateno >= 150
trigger1 = stateno <= 153

;---------------------------------------------------------------------------
;緊急回避　後
[State -1]
type = ChangeState
value = 910
triggerall = command = "xa"
triggerall = command = "holdback"
trigger1 = statetype != A
trigger1 = ctrl = 1

;---------------------------------------------------------------------------
;ガードキャンセル緊急回避　前
[State -1]
type = ChangeState
value = 905
triggerall = power >= 1000
triggerall = command = "xa"
triggerall = command != "holdback"
trigger1 = stateno >= 150
trigger1 = stateno <= 153

;---------------------------------------------------------------------------
;ダッシュ緊急回避　前
[State -1]
type = ChangeState
value = 901
triggerall = command = "xa"
triggerall = stateno = 100
trigger1 = statetype != A
trigger1 = ctrl = 1
trigger2 = command = "holdfwd"
trigger2 = statetype != A
trigger2 = ctrl = 1

;---------------------------------------------------------------------------
;緊急回避　前
[State -1]
type = ChangeState
value = 900
triggerall = command = "xa"
trigger1 = statetype != A
trigger1 = ctrl = 1
trigger2 = command = "holdfwd"
trigger2 = statetype != A
trigger2 = ctrl = 1

;---------------------------------------------------------------------------
;ふっとばし
[State -1]
type = ChangeState
value = 950
triggerall = command = "yb"
trigger1 = statetype != A
trigger1 = ctrl = 1

;---------------------------------------------------------------------------
;ガードキャンセルふっとばし
[State -1]
type = ChangeState
value = 955
triggerall = command = "yb"
triggerall = power >= 1000
trigger1 = stateno >= 150
trigger1 = stateno <= 153

;---------------------------------------------------------------------------
;空中ふっとば
[State -1,]
type = ChangeState
value = 960
triggerall = command = "yb"
trigger1 = statetype = A
trigger1 = ctrl

;---------------------------------------------------------------------------
;２段蹴り
[State -1]
type = ChangeState
value = 930
triggerall = command = "b"
triggerall = command = "holdfwd"
triggerall = command != "holddown"
trigger1 = statetype = S
trigger1 = ctrl = 1
trigger2 = stateno = [100,109]

;---------------------------------------------------------------------------
; 急降下キック
[State -1]
type = ChangeState
value = 970
triggerall = command = "holddown"
triggerall = command = "b"
trigger1 = statetype = A
trigger1 = ctrl = 1

;---------------------------------------------------------------------------
;ダッシュ
[State -1, Run Fwd]
type = ChangeState
value = 100
trigger1 = command = "FF"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
;後退ダッシュ
[State -1, Run Back]
type = ChangeState
value = 105
trigger1 = command = "BB"
trigger1 = statetype = S
trigger1 = ctrl

;---------------------------------------------------------------------------
;投げ
[State -1,]
type = ChangeState
value = 800
triggerall = command = "y"
triggerall = statetype = S
triggerall = ctrl
triggerall = stateno != 100
triggerall = p2movetype != H
trigger1 = command = "holdfwd"
trigger1 = p2bodydist X < 3
trigger1 = (p2statetype = S) || (p2statetype = C)
trigger1 = p2movetype != H
trigger2 = command = "holdback"
trigger2 = p2bodydist X < 5
trigger2 = (p2statetype = S) || (p2statetype = C)
trigger2 = p2movetype != H

;---------------------------------------------------------------------------
;空中投げ
[State -1,]
type = ChangeState
value = 850
triggerall = command = "y"
triggerall = statetype = A
triggerall = ctrl
triggerall = p2statetype = A
trigger1 = command = "holddown"
trigger1 = p2bodydist X < 20

;===========================================================================
;立ち弱パンチ
[State -1, Stand Light Punch]
type = ChangeState
value = 200
triggerall = command = "x"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno = 200
trigger2 = time > 5
trigger3 = stateno = 400
trigger3 = time > 5

;---------------------------------------------------------------------------
;立ち強パンチ
[State -1, Stand Strong Punch]
type = ChangeState
value = 210
triggerall = command = "y"
triggerall = command != "holddown"
triggerall = statetype != A
triggerall =  stateno != 210
triggerall =  stateno != 240
triggerall =  stateno != 410
triggerall =  stateno != 440
triggerall =  stateno != [600,3999]
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno = 200
trigger2 = movecontact
trigger3 = stateno = 230
trigger3 = movecontact
trigger4 = stateno = 400
trigger4 = movecontact
trigger5 = stateno = 430
trigger6 = movecontact

;---------------------------------------------------------------------------
;立ち弱キック
[State -1, Stand Light Kick]
type = ChangeState
value = 230
triggerall = command = "a"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = statetype = S
trigger1 = ctrl
;trigger2 = (stateno = 230) && time > 8
trigger2 = stateno = 200
trigger2 = movecontact
trigger3 = stateno = 400
trigger3 = movecontact
trigger4 = stateno = 430
trigger4 = movecontact

;---------------------------------------------------------------------------
;立ち強キック
[State -1, Standing Strong Kick]
type = ChangeState
value = 240
triggerall = command = "b"
triggerall = command != "holddown"
triggerall = statetype != A
trigger1 = statetype = S
trigger1 = ctrl
trigger2 = stateno = 200
trigger2 = movecontact
trigger3 = stateno = 210
trigger3 = movecontact
trigger4 = stateno = 230
trigger4 = movecontact
trigger5 = stateno = 400
trigger5 = movecontact
trigger6 = stateno = 410
trigger6 = movecontact
trigger7 = stateno = 430
trigger7 = movecontact

;---------------------------------------------------------------------------
;挑発
[State -1, Taunt]
type = ChangeState
value = 195
triggerall = command = "start"
trigger1 = statetype != A
trigger1 = ctrl

;---------------------------------------------------------------------------
;しゃがみ弱パンチ
[State -1, Crouching Light Punch]
type = ChangeState
value = 400
triggerall = command = "x"
triggerall = command = "holddown"
triggerall = statetype != A
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 200
trigger2 = time > 5
trigger3 = stateno = 400
trigger3 = time > 5

;---------------------------------------------------------------------------
;しゃがみ強パンチ
[State -1, Crouching Strong Punch]
type = ChangeState
value = 410
triggerall = command = "y"
triggerall = command = "holddown"
triggerall = statetype != A
triggerall =  stateno != 210
triggerall =  stateno != 240
triggerall =  stateno != 410
triggerall =  stateno != 440
triggerall =  stateno != [600,3999]
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 200
trigger2 = movecontact
trigger3 = stateno = 230
trigger3 = movecontact
trigger4 = stateno = 400
trigger4 = movecontact
trigger5 = stateno = 430
trigger6 = movecontact

;---------------------------------------------------------------------------
;しゃがみ弱キック
[State -1, Crouching Light Kick]
type = ChangeState
value = 430
triggerall = command = "a"
triggerall = command = "holddown"
triggerall = statetype != A
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 200
trigger2 = movecontact
trigger3 = stateno = 230
trigger3 = time > 10
trigger4 = stateno = 400
trigger4 = movecontact
trigger5 = stateno = 430
trigger5 = time > 8

;---------------------------------------------------------------------------
;しゃがみ強キック
[State -1, Crouching Strong Kick]
type = ChangeState
value = 440
triggerall = command = "b"
triggerall = command = "holddown"
triggerall = statetype != A
trigger1 = statetype = C
trigger1 = ctrl
trigger2 = stateno = 200
trigger2 = movecontact
trigger3 = stateno = 210
trigger3 = movecontact
trigger4 = stateno = 230
trigger4 = movecontact
trigger5 = stateno = 400
trigger5 = movecontact
trigger6 = stateno = 410
trigger6 = movecontact
trigger7 = stateno = 430
trigger7 = movecontact

;---------------------------------------------------------------------------
;空中弱パンチ
[State -1, Jump Light Punch]
type = ChangeState
value = 600
triggerall = command = "x"
trigger1 = statetype = A
trigger1 = ctrl
;trigger2 = stateno = 600
;trigger2 = statetime >= 7

;---------------------------------------------------------------------------
;空中強パンチ
[State -1, Jump Strong Punch]
type = ChangeState
value = 610
triggerall = command = "y"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 || stateno = 630 ;jump_x or jump_a
trigger2 = movecontact

;---------------------------------------------------------------------------
;空中弱キック
[State -1, Jump Light Kick]
type = ChangeState
value = 630
triggerall = command = "a"
trigger1 = statetype = A
trigger1 = ctrl

;---------------------------------------------------------------------------
;空中強キック
[State -1, Jump Strong Kick]
type = ChangeState
value = 640
triggerall = command = "b"
trigger1 = statetype = A
trigger1 = ctrl
trigger2 = stateno = 600 || stateno = 630 ;jump_x or jump_a
trigger2 = movecontact