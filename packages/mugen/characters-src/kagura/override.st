;---------------------------------------------------------------------------
; Override common states (use same number to override) :
;---------------------------------------------------------------------------

;---------------------------------------------------------------------------
; Initialize (at the start of the round)
[Statedef 5900]
type = S

[State 5900, 1] ;Clear all int variables
type = VarRangeSet
trigger1 = roundsexisted = 0
value = 0

[State 5900, 2] ;Clear all float variables
type = VarRangeSet
trigger1 = roundsexisted = 0
fvalue = 0
last = 11

[State 5900, 2] ;Clear all float variables
type = VarSet
trigger1 = 1
fv = 12
value = 1.0

[State 5900, 2] ;Clear all float variables
type = VarRangeSet
trigger1 = roundsexisted = 0
fvalue = 0
first = 13

[State 5900, 3] ;Intro for round 1
type = ChangeState
trigger1 = roundno = 1
trigger2 = roundsexisted = 0
trigger2 = teammode = turns
trigger2 = roundno > 1
value = 190

;---------------------------------------------------------------------------
; Jump Land
[Statedef 52]
type    = S
physics = S
ctrl = 0
anim = 47

[State 52, 1]
type = VelSet
trigger1 = Time = 0
y = 0

[State 52, 2]
type = PosSet
trigger1 = Time = 0
y = 0

[State 52, 3]
type = CtrlSet
trigger1 = Time = 3
value = 1

[State 52, 4]
type = ChangeState
trigger1 = AnimTime = 0
trigger1 = command != "holddown"
trigger1 = command != "holdback"
value = 0
ctrl = 1

[State 52, crouch]
type = ChangeState
trigger1 = AnimTime = 0
trigger1 = command = "holddown"
value = 11
ctrl = 1

[State 52, go back]
type = ChangeState
trigger1 = AnimTime = 0
trigger1 = command = "holdback"
value = 20
ctrl = 1

;---------------------------------------------------------------------------
; HIT_GETUP
[Statedef 5120]
type    = L
movetype= I
physics = N

[State 5120, 1a] ;Get up anim (normal)
type = ChangeAnim
triggerall = time = 0
trigger1 = anim != [5111,5119]
trigger2 = !SelfAnimExist(5120 + (anim % 10))
value = 5120

[State 5120, 1b] ;Get up anim (for hit up/diag-up)
type = ChangeAnim
triggerall = time = 0
trigger1 = anim = [5111,5119]
trigger1 = SelfAnimExist(5120 + (anim % 10))
value = 5120 + (anim % 10)

[State 5120, 2]
type = VelSet
trigger1 = Time = 0
x = 0

[State 5120, 3]
type = NotHitBy
trigger1 = 1
value = SCA
time = 1

[State 5120, 4]
type = HitFallSet
trigger1 = AnimTime = 0
value = 1

[State 5120, CA]
type = changestate
triggerall = animelem = 13
trigger1 = command = "holdfwd"
trigger1 = command != "holdback"
value = 5121

[State 5120, CA]
type = changestate
triggerall = animelem = 13
trigger1 = command != "holdfwd"
trigger1 = command = "holdback"
value = 5122

[State 5120, 5] ;Can't be thrown right after getting up
type = NotHitBy
trigger1 = AnimTime = 0
value = , NT,ST,HT
time = 12

[State 5120, 6] ;Can't be hit right after getting up (short time)
type = NotHitBy
trigger1 = AnimTime = 0
value2 = SCA
time = 3

[State 5120, 7]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------
;Recovery Roll Forward
[Statedef 5121]
type = L
movetype = I
physics = A
ctrl = 0
anim = 5121
sprpriority = 1

[State 5122, PP]
type = playerpush
trigger1 = 1
value = 0

[State 5122, PP]
type = playerpush
trigger1 = 1
value = 0

[State 5120, 3]
type = NotHitBy
trigger1 = 1
value = SCA
time = 1

[State 105, 1]
type = VelSet
trigger1 = Time = 0
x = (-1.2)*const(velocity.run.back.x)
y = const(velocity.run.back.y)

[State 105, 2]
type = null;CtrlSet
trigger1 = Time = 2
value = 1

[State 105, 3]
type = ChangeState
trigger1 = Vel Y > 0
trigger1 = Pos Y >= 0
value = 106

[State 700, Explod]
type = Explod
trigger1 = Time = 0
ID = 700
anim = 701
pos = -50,-50
removetime = 11
sprpriority = 1
facing = 1

[State 900, Kanna]
type = helper
trigger1 = time = 0
helpertype = normal
name = "Dash_FX"
ID = 700
pos = 15,-50
postype = p1
stateno = 700
ownpal = 1

[State 100, Snd]
type = PlaySnd
trigger1 = Time = 0
value = 0, 4
channel = 0

[State 100, Snd]
type = PlaySnd
trigger1 = Time = 0
value = 105, 0

;---------------------------------------------------------------------------
; HIT_FALLRECOVER (still falling)
[Statedef 5200]
type    = A
movetype= H
physics = N

[State 5200, 1] ;Change anim if done with transition
type = ChangeAnim
trigger1 = Anim = 5035
trigger1 = AnimTime = 0
value = 5050

[State 5200, 2]
type = VelAdd
trigger1 = 1
y = GetHitVar(yaccel)

[State 5200, 3]
type = SelfState
trigger1 = Vel Y > 0
trigger1 = Pos Y >= 10
value = 5201

;---------------------------------------------------------------------------
; HIT_FALLRECOVER (on the ground)
[Statedef 5201]
type    = A
movetype= H
physics = A
anim = 5200

[State 5201, 1] ;Turn if not facing opponent
type = Turn
trigger1 = Time = 0
trigger1 = p2dist X < -5

[State 210, 1]
type = PlaySnd
trigger1 = animelem = 3
value = 950, 0

[State 5201, 2]
type = VelSet
trigger1 = Time = 0
x = -.15
y = -3.5

[State 5201, 3]
type = PosSet
trigger1 = Time = 0
y = 0

[State 5201, 4]
type = NotHitBy
trigger1 = 1
value = SCA
time = 1

[State 5201, 5] ;Blink white
type = PalFX
trigger1 = Time = 0
time = 3
add = 128,128,128 ;256,256,256

[State 5201, 6]
type = GameMakeAnim
trigger1 = Time = 1
value = 60
pos = 0, 0
under = 1

;---------------------------------------------------------------------------
; HIT_AIRFALLRECOVER
[Statedef 5210]
type    = A
movetype= I
physics = N
anim = 5210
ctrl = 0

[State 210, 1]
type = PlaySnd
trigger1 = animelem = 3
value = 950, 0

[State 5210, 1] ;Blink white
type = PalFX
trigger1 = Time = 0
time = 3
add = 128,128,128 ;256,256,256

[State 5210, 1]
type = PosFreeze
trigger1 = Time = 0
value = 4

[State 5210, 2] ;Turn if not facing opponent
type = Turn
trigger1 = Time = 0
trigger1 = p2dist X < -20

[State 5210, 1]
type = VelMul
trigger1 = Time = 4
x = .8
y = .8

[State 5210, 1]
type = VelAdd
trigger1 = Time = 4
y = -4.5

[State 5210, 1]
type = VelMul
trigger1 = Time = 4
trigger1 = Vel Y > 0
y = .5

[State 5210, 1]
type = VelAdd
trigger1 = Time = 4
trigger1 = Vel Y > -3
y = -2

[State 5210, 1]
type = VelAdd
trigger1 = Time = 4
trigger1 = Vel Y > -2
y = -1

[State 5210, 2] ;Go up
type = VelAdd
trigger1 = Time = 4
trigger1 = Command = "holdup"
y = -2

[State 5210, 2] ;Go down
type = VelAdd
trigger1 = Time = 4
trigger1 = Command = "holddown"
y = 1.5

[State 5210, 2] ;Go fwd
type = VelMul
trigger1 = Time = 4
trigger1 = Command = "holdfwd"
x = 1

[State 5210, 2] ;Go back
type = VelAdd
trigger1 = Time = 4
trigger1 = Command = "holdback"
x = -1

[State 5210, 3]
type = NotHitBy
trigger1 = Time = 0
value = SCA
time = 15

[State 5210, 4]
type = CtrlSet
trigger1 = Time = 20
value = 1

[State 5210, 5]
type = VelAdd;Gravity
trigger1 = Time >= 4
y = .35

[State 5210, 5] ;Land on ground
type = ChangeState
trigger1 = Vel Y > 0
trigger1 = Pos Y >= 0
value = 52 ;JUMP_LAND
ctrl = 1

;---------------------
;Recovery Roll Back
[Statedef 5122]
type = L
movetype = I
physics = A
ctrl = 0
anim = 105
sprpriority = 1

[State 100, Snd]
type = PlaySnd
trigger1 = Time = 0
value = 0, 4
channel = 0

[State 5122, PP]
type = playerpush
trigger1 = 1
value = 0

[State 5120, 3]
type = NotHitBy
trigger1 = 1
value = SCA
time = 1

[State 5122, CA]
type = changeanim
trigger1 = time <= 0
value = 105
elem = 4

[State 105, 1]
type = VelSet
trigger1 = Time = 0
x = (1.2)*const(velocity.run.back.x)
y = const(velocity.run.back.y)

[State 105, 2]
type = null;CtrlSet
trigger1 = Time = 2
value = 1

[State 105, 3]
type = ChangeState
trigger1 = Vel Y > 0
trigger1 = Pos Y >= 0
value = 106

[State 700, Explod]
type = Explod
trigger1 = Time = 0
ID = 700
anim = 701
pos = -50,-50
removetime = 11
sprpriority = 1
facing = 1

[State 900, Kanna]
type = helper
trigger1 = time = 0
helpertype = normal
name = "Dash_FX"
ID = 700
pos = 15,-50
postype = p1
stateno = 700
ownpal = 1

[State 100, Snd]
type = PlaySnd
trigger1 = Time = 0
value = 105, 0

;---------------------------------------------------------------------------
; Jump Start
[Statedef 40]
type    = S
physics = S
anim = 40
ctrl = 0
sprpriority = 1

[State 100, Feather]
type = projectile
trigger1 = time = 0
trigger1 = prevstateno = 100
projanim = 102
projremovetime = 8
velocity = const(velocity.run.fwd.x),0

[State 40, 1]
type = VarSet
trigger1 = Time = 0
sysvar(1) = 0

[State 40, 2]
type = VarSet
trigger1 = command = "holdfwd"
sysvar(1) = 1

[State 40, 3]
type = VarSet
trigger1 = command = "holdback"
sysvar(1) = -1

[State 40, 4]
type = VelSet
trigger1 = AnimTime = 0
x = ifelse(sysvar(1)=0, const(velocity.jump.neu.x), ifelse(sysvar(1)=1, const(velocity.jump.fwd.x), const(velocity.jump.back.x)))
y = const(velocity.jump.y)

[State 40, 5]
type = VelSet
trigger1 = AnimTime = 0
trigger1 = prevstateno = 100 ;RUN_FWD
trigger1 = sysvar(1) = 1
x = const(velocity.runjump.fwd.x)*1.7

[State 40, 6]
type = ChangeState
trigger1 = AnimTime = 0
value = 50
ctrl = 1


;-------------------------
; RUN_FWD
[Statedef 100]
type    = A
physics = A
ctrl = 0
anim = 100
sprpriority = 1

[State 105, 1]
type = VelSet
trigger1 = Time = 0
x = const(velocity.run.fwd.x)
y = const(velocity.run.fwd.y)

;[State 105, 2]
;type = CtrlSet
;trigger1 = Time = 2
;value = 1

[State 105, 3]
type = ChangeState
trigger1 = Vel Y > 0
trigger1 = Pos Y >= 0
value = 106

[State 700, Explod]
type = Explod
trigger1 = Time = 0
ID = 700
anim = 701
pos = -50,-50
removetime = 11
sprpriority = 1
facing = 1

[State 900, Kanna]
type = helper
trigger1 = time = 0
helpertype = normal
name = "Dash_FX"
ID = 700
pos = 15,-50
postype = p1
stateno = 700
ownpal = 1


[State 100, Snd]
type = PlaySnd
trigger1 = Time = 0
value = 105, 0

;[State 100, CS]
;type = changestate
;trigger1 = animelem = 0
;value = ifelse(statetype=A,50,47)

;-------------------------
; RUN_BACK
[Statedef 105]
type    = A
physics = A
ctrl = 0
anim = 105
sprpriority = 1

[State 105, 1]
type = VelSet
trigger1 = Time = 0
x = const(velocity.run.back.x)
y = const(velocity.run.back.y)

[State 105, 2]
type = CtrlSet
trigger1 = Time = 2
value = 1

[State 105, 3]
type = ChangeState
trigger1 = Vel Y > 0
trigger1 = Pos Y >= 0
value = 106

[State 700, Explod]
type = Explod
trigger1 = Time = 0
ID = 700
anim = 701
pos = 50,-50
removetime = 11
sprpriority = 1
facing = -1

[State 900, Kanna]
type = helper
trigger1 = time = 0
helpertype = normal
name = "Dash_FX"
ID = 700
pos = -15,-50
postype = p1
stateno = 700
ownpal = 1
facing = -1

[State 100, Snd]
type = PlaySnd
trigger1 = Time = 0
value = 105, 0

;---------------------------------------------------------------------------
; RUN_BACK2 (land)
[Statedef 106]
type    = S
physics = S
ctrl = 0
anim = 47

[State 106, 1]
type = VelSet
trigger1 = Time = 0
y = 0

[State 106, 2]
type = PosSet
trigger1 = Time = 0
y = 0

[State 106, 3]
type = MakeDust
trigger1 = Time = 2
pos = -5,-2
spacing = 1

[State 106, 4]
type = ChangeState
trigger1 = Time = 7
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; States that are always executed (use statedef -2)
;---------------------------------------------------------------------------
[Statedef -2]
;---------------------
; Debugging Utilities
;---------------------
[State -2, DTCB]
type = displaytoclipboard
trigger1 = 1
text = "Kanna Hits: %d \t Kanna Damage: %d \t Striker Select: %d \t Parry: %d"
params = var(18), var(19), var(47), var(9)

;-----------------------
;Kanna Projectile Limits
;-----------------------
[State -2, Varset]
type = Varset
trigger1 = var(18) >= 25
v = 18
value = 23

[State -2, Varset]
type = Varset
trigger1 = var(19) >= 250
v = 19
value = 230

;----------------
; Striker Summon
;----------------

;Double Team Selector
[State -2, Helper]
type = Helper
trigger1 = time = 0
trigger1 = roundstate = 0 ;Intro
trigger1 = roundsexisted <= 0 ;First round only
ID = 10000 ;ID
stateno = 10000 ;State No of the groove which i will explain later
postype = p1
pos = 0,-75 ;DO NOT CHANGE THIS,its just an invisible helper
name = "Tag Select" ;Name of the invis helper
ontop = 1
bindtime = -1

[State -2, Sesshomaru]
type = helper
trigger1 = roundstate = 2
trigger1 = var(47) = 1 ;Sesshomaru must be selected in round 1
trigger1 = movetype = I
trigger1 = numhelper(3400) = 0
trigger1 = numhelper(3450) = 0
trigger1 = command = "a"
trigger1 = command != "Desperation"
helpertype = normal
name = "Sesshomaru"
ID = 3400
pos = 15,0
postype = p1
stateno = 3400
ownpal = 1

[State -2, Naraku]
type = helper
trigger1 = roundstate = 2
trigger1 = var(47) = 2 ;Naraku must be selected in round 1
trigger1 = movetype = I
trigger1 = numhelper(3500) = 0
trigger1 = numhelper(3550) = 0
trigger1 = command = "a"
trigger1 = command != "Desperation"
helpertype = normal
name = "Naraku"
ID = 3500
pos = 15,0
postype = p1
stateno = 3500
ownpal = 1

;-------------
; Other Stuff
;-------------
; Bonus power for no strikers
[State 10000, Powerset]
type = powerset
triggerall = power <= 1000
trigger1 = roundstate = 2
trigger1 = stateno = 0
trigger1 = prevstateno = [192,193]
trigger1 = var(47) = 0
value = 1000

[State -2, Varset]
type = Varset
trigger1 = (statetype = S) || (statetype = C)
trigger1 = var(8) = 1
v = 8
value = 0

[State -2, Varset]
type = Varset
trigger1 = (statetype = S) || (statetype = C)
trigger1 = stateno != 1500
trigger1 = var(38) = 1
v = 38
value = 0

; Original damage dampening code kudos to P.o.t.S.
; Modified to reflect double the normal values of Melty Blood
[State -2, Damage based on hits]
type = Null;Varset
trigger1 = numenemy
fvar(10)= ifelse(enemynear,gethitvar(hitcount)<16, (1-(0.05*(enemynear,gethitvar(hitcount)))), 0.2)
ignorehitpause = 1

[State -2, Damage based on hits]
type = Varset
trigger1 = numenemy
fvar(10)= ifelse(enemynear,gethitvar(hitcount)<13, (1-(0.05*(enemynear,gethitvar(hitcount)))), ifelse(enemynear,gethitvar(hitcount)<35,0.35,0.1))
ignorehitpause = 1

[State -2, Reset var when the opponent recovers]
type = Varset
trigger1 = numenemy
trigger1 = (enemynear,movetype!=H)
trigger2 = !numenemy
fvar(10) = 1

[State -2, Dampener itself]
type = Attackmulset
trigger1 = 1
value = fvar(10)
ignorehitpause = 1

;---------------------------------------------------------------------------
; States that are executed when in self's state file (use statedef -3)
;---------------------------------------------------------------------------

[Statedef -3]
[State -3, Hitsound 1]
type = PlaySnd
triggerall = Time = 1
triggerall = Random <= 500
triggerall = Life > 0 ;Too lazy to use Alive trigger
trigger1 = StateNo = 5000
trigger2 = StateNo = 5020
value = 5000, 0
channel = 0

[State -3, Hitsound 2]
type = PlaySnd
triggerall = Time = 1
triggerall = Random <= 500
triggerall = Life > 0 ;Too lazy to use Alive trigger
trigger1 = StateNo = 5010
trigger2 = StateNo = 5070
value = 5000, 1
channel = 0

[State -3, Hitsound 3]
type = PlaySnd
triggerall = Time = 1
triggerall = Random <= 500
triggerall = Life > 0 ;Too lazy to use Alive trigger
trigger1 = StateNo = 5030
value = 5000, 2
channel = 0

[State -3, Kagura gets up]
type = PlaySnd
triggerall = Time = 1
triggerall = Random <= 350
triggerall = Life <= 500
triggerall = Life > 0 ;Too lazy to use Alive trigger
trigger1 = StateNo = 5120
value = 5000, 3
channel = 0

;This controller plays a sound everytime KFM lands from a jump, or
;from his back-dash.
[State -3, Landing Sound]
type = PlaySnd
triggerall = Time = 1
trigger1 = stateno = 52 ;Jump land
trigger2 = stateno = 106 ;Run-back land
value = 40, 0
