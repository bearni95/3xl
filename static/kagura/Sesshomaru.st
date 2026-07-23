;==========================
; Sesshomaru Helper States
;==========================

;-----------------------
; Sesshomaru Enters
[Statedef 3400]
movetype = I
physics = A
velset = 0,0
anim = 3400
sprpriority = 2

[State 3400, SND]
type = playsnd
trigger1 = time = 0
trigger1 = ishelper(3400)
value = 3400,4

;[State 3400, SND]
;type = playsnd
;trigger1 = time = 0
;trigger1 = ishelper(3450)
;value = 3450,0

[State 3400, PS]
type = posset
trigger1 = time = 0
y = -400

[State 3400, CS]
type = changestate
trigger1 = pos y >= -10
value = ifelse(ishelper(3450),3451,3401)

;-----------------------
; Sesshomaru Striker - Poison Claw
[Statedef 3401]
type = S
movetype = A
physics = S
velset = 0,0
ctrl = 0
anim = 3401
sprpriority = 2

[State 3401, NHB]
type = nothitby
trigger1 = time >= 84
value = SCA, AA, AP, AT

[State 3401, T]
type = turn
trigger1 = time = 0
trigger1 = p2dist x < 0

[State 3401, PP]
type = playerpush
trigger1 = 1
value = 1

[State 2100, HOR]
type = hitoverride
trigger1 = 1
attr = SCA,AA,AP,AT
time = -1
slot = 6
stateno = 3420
ignorehitpause = 1

[State 3400, PS]
type = posset
trigger1 = time = 0
y = 0

[State 3400, PSND]
; "Poison Claw"
type = playsnd
trigger1 = time = 0
value = 3400,0

[State 3400, CA]
type = changeanim
trigger1 = anim = 3401
trigger1 = time >= 40
value = 3402

[State 240, 3]
type = HitDef
trigger1 = Time = 0
attr = S, NA
damage = 110,0
hitflag = MAF
guardflag = MA
pausetime = 8,3
sparkno = s8021
guard.sparkno = s8030
sparkxy = -15,-55
hitsound   = s240,1
guardsound = s6,0
ground.type = High
animtype = Up
ground.slidetime = 10
ground.hittime  = 5
ground.velocity = -2,-8.5
air.velocity = -2,-7
guard.velocity = -5
fall = 1
getpower = 70,0
palfx.time = 120
palfx.mul=128,128,0
palfx.add=0,0,0

[State 3400, W]
type = width
triggerall = anim = 3402
trigger1 = animelem = 7
trigger2 = animelem = 8
trigger3 = animelem = 9
trigger4 = animelem = 10
trigger5 = animelem = 11
trigger6 = animelem = 12
trigger7 = animelem = 13
trigger8 = animelem = 14
value = 40, -10

[State 3400, VelS]
type = velset
trigger1 = anim = 3402
trigger1 = animelem = 6
x = 20

[State 3400, PSND]
; "POISON CLAW!"
type = playsnd
trigger1 = anim = 3402
trigger1 = animelem = 7
value = 3400,1

[State 3400, Escape]
type = changestate
trigger1 = anim = 3402
trigger1 = animtime = 0
value = 3402

;-----------------------
; Sesshomaru Leaves
[Statedef 3402]
type = S
movetype = I
physics = S
anim = 3403
sprpriority = 2

[State 3402, EXPLOD]
type = explod
trigger1 = time = 0
anim = 3410
pos = ifelse(parent,teamside=1,0,320),50
postype = left
removetime = 600
ontop = 1
bindtime = -1
facing = ifelse(parent,teamside=1,1,-1)

[State 3402, T]
type = turn
trigger1 = time = 0

[State 3400, PSND]
type = playsnd
trigger1 = time = 30
value = 3400,3

[State 3400, VelS]
type = velset
trigger1 = 1
x = 3.2

[State 3400, destroyself]
type = destroyself
trigger1 = time >= 600

;-----------------------
; Sesshomaru Winpose
[Statedef 3403]
type = S
movetype = I
physics = S
anim = 3401
sprpriority = 0

[state 3403, PSND]
type = playsnd
trigger1 = time = 50
value = 3400, 6+(random%2)

[State 3403, NHB]
type = nothitby
trigger1 = 1
value = SCA, AA, AP, AT

;-----------------------
; Sesshomaru Gethit
[Statedef 3420]
type = S
movetype = H
physics = S
velset = 0,0
anim = 3420
sprpriority = 2

[State 3400, VelS]
type = velset
trigger1 = time = 0
x = gethitvar(xvel)

[State 3400, SND]
type = playsnd
trigger1 = time = 0
value = 3400,5

[State 3400, CS]
type = changestate
trigger1 = animtime = 0
value = 3402

;-----------------------
; Sesshomaru Desperation Assist - Dragon Strike
[Statedef 3451]
type = S
movetype = A
physics = S
velset = 0,0
ctrl = 0
anim = 3450
sprpriority = 0

[State 3451, HOR]
type = hitoverride
trigger1 = 1
attr = SCA,AA,AP,AT
time = -1
slot = 6
stateno = 3420
ignorehitpause = 1

[State 3451, CS]
type = changestate
trigger1 = time = 0
trigger1 = root,stateno != 3300
value = 3402

[State 3401, NHB]
type = nothitby
trigger1 = time >= 84
value = SCA, AA, AP, AT

[State 3401, T]
type = turn
trigger1 = time = 0
trigger1 = p2dist x < 0

[State 3401, PP]
type = playerpush
trigger1 = 1
value = 1

[State 3400, PS]
type = posset
trigger1 = time = 0
y = 0

[State 3400, PSND]
; "BEHOLD!"
type = playsnd
trigger1 = time = 0
value = 3450,0

[State 3400, PSND]
; "BEHOLD!"
type = playsnd
trigger1 = animelem = 8
value = 3450,1

[state 1010, Za Warudo!]
type = SuperPause
trigger1 = animelem = 4;7
time = 262
anim = -1
;sound = S900, 0
p2defmul = 1
unhittable = 1
movetime = 262
darken = 0

[State 3450, ES]
type = envshake
trigger1 = animelem = 5
time = 20
freq = 180
ampl = -4

[State 3450, PSND]
type = playsnd
trigger1 = time = 80
value = S900, 0

[State 1010, Explod]
type = Explod
trigger1 = time = 80
anim = 3301
ID = 3300
pos = -100,0
vel = 3,0
postype = back
supermovetime = 60
removetime = 60

[State 1010, Explod]
type = Explod
trigger1 = time = 80
anim = 3300
ID = 3300
pos = 420,0
vel = -3,0
postype = back
supermovetime = 60
removetime = 60

[State 3450, Thunder]
type = helper
trigger1 = time = 80
trigger2 = time = 96
name = "Beam1"
ID = 3453
pos = 0,0
postype = p1
stateno = 3453
ownpal = 1
supermovetime = 999
facing = 1
[State 3450, Thunder]
type = helper
trigger1 = time = 80
trigger2 = time = 96
name = "Beam2"
ID = 3454
pos = 0,0
postype = p1
stateno = 3453
ownpal = 1
supermovetime = 999
facing = 1

[State 3450, BGFX]
type = bgpalfx
trigger1 = time < 112
time = 1
mul = 256-(2*time),256-(2*time),256-(2*time)

[State 3450, BGFX]
type = bgpalfx
trigger1 = time >= 112
trigger1 = time < 411
time = 1
mul = 32,32,32

[State 3450, BGFX]
type = bgpalfx
trigger1 = time >= 411
trigger1 = time < 427
time = 1
mul = 32+16*(time-411),32+16*(time-411),32+16*(time-411)

[State 3450, PFX]
type = palfx
trigger1 = time >= 109
trigger1 = time < 229
trigger1 = ((time)%40 = 0) || ((time)%40 = 7)
trigger2 = time = 150 || time = 157
time = 3
add = 256,256,256
mul = 512,512,512
invertall = 1

[State 3450, ES]
type = envshake
trigger1 = time >= 109
trigger1 = time < 229
trigger1 = ((time)%40 = 0)
trigger2 = time = 150
time = 7
freq = 180
ampl = -4

[State 3450, Thunder]
type = playsnd
trigger1 = time >= 109
trigger1 = time < 229
trigger1 = (time)%40 = 0
trigger2 = time = 150
value = 3451,0

[State 194, Thunder]
type = Explod
trigger1 = time >= 109
trigger1 = time < 229
trigger1 = (time)%40 = 0
trigger2 = time = 150
pausemovetime = 12
supermovetime = 12
anim = 3451
ownpal = 1
pos = 0,0
random = 100,0
postype = p1
removetime = 12
sprpriority = 4

[State 194, Thunder]
type = Explod
trigger1 = time >= 109
trigger1 = time < 229
trigger1 = (time)%40 = 0
trigger2 = time = 150
pausemovetime = 16
supermovetime = 16
anim = 3453
ownpal = 1
scale = 0.5,0.5
pos = 160,120
postype = back
removetime = 16
sprpriority = -1

[State 3450, Thunder]
type = playsnd
trigger1 = time = 229
value = 3451,1

[State 3400, PSND]
; "DRAGON STRIKE!"
type = playsnd
trigger1 = animelem = 9
value = 3450,2
volume = 255

[State 3450, Thunder]
type = helper
trigger1 = animelem = 13
trigger2 = time = [287,406]
trigger2 = time%7 = 0
name = "Thunder"
ID = ifelse(time=406,3455,3452)
pos = floor(p2dist x)+(45-(random%90)),10
postype = p1
stateno = 3452
ownpal = 1
supermovetime = 999
facing = ifelse(random<=499,1,-1)

[State 3400, Escape]
type = changestate
triggerall = animtime = 0
triggerall = anim = 3450
trigger1 = roundstate = 2
trigger2 = parent,alive = 0
value = 3402

[State 3400, Escape]
type = changeanim
trigger1 = anim = 3450
trigger1 = animtime = 0
trigger1 = roundstate != 2
trigger1 = win = 1
value = 3404

[State 3400, Escape]
type = changestate
trigger1 = anim = 3404
trigger1 = roundstate = 4
trigger1 = root,stateno = 182
value = 3403

;-----------------------
; Dragon Strike Thunder
[Statedef 3452]
type = S
movetype = A
physics = S
anim = 3451
sprpriority = 4

[State 200, 1]
type = HitDef
trigger1 = time = 0
attr = S, HA
damage = ceil(60*root,fvar(10)), 4
kill = ifelse(ishelper(3455),1,0)
animtype = back
guardflag = MA
hitflag = MAFD
priority = 3, Hit
pausetime = 1, 1
sparkno = -1
guard.sparkno = s8030
sparkxy = -10, -76
hitsound = s3451, 1
guardsound = s6, 0
ground.type = low;High
ground.slidetime = 2
ground.hittime  = 12
ground.velocity = -2,3
airguard.velocity = -1.9,2.8
air.type = low;High
fall = 1
fall.recover = 0
fall.yvelocity = 0
air.velocity = -1,0;3
air.hittime = 15
getpower = 0,0
;down.velocity = -2,-3
down.hittime = 60
palfx.time = 3
palfx.mul = 512,512,512
palfx.add = 256,256,256

;[State 3452, PS]
;type = null;posset
;trigger1 = time = 0
;x = (random%300)-150

[State 3450, ES]
type = envshake
trigger1 = time = 0
time = 7
freq = 180
ampl = -4

[State 3450, Thunder]
type = playsnd
trigger1 = time = 0
value = 3451,0
volume = -256
channel = 1

[State 2100, HOR]
type = hitoverride
trigger1 = 1
attr = SCA,AA,AP,AT
time = -1
stateno = -1
slot = 6
ignorehitpause = 1

[State 3452, Zeeky]
type = destroyself
trigger1 = animtime = 0

;-----------------------
; Dragon Strike Thunder Beam
; Var(1) = Direction
;  1 = forward
; -1 = backward
; Var(2) = position
[Statedef 3453]
movetype = I
physics = N
anim = 3452

[State 3453, AD]
type = angledraw
trigger1 = 1
scale = 0.125,1.0

[State 3453, T]
type = trans
trigger1 = 1
trans = addalpha
alpha = 228,256

[State 3452, SPR]
type = sprpriority
trigger1 = 1
value = ifelse(vel x >= 0,1,-1)

[State 3452, VelS]
type = velset
trigger1 = 1
x = 10*var(1)*(96-abs(parentdist x))/95.0

[State 3453, VarS]
type = null
trigger1 = var(1) = 1
trigger1 = parentdist x < -(5+90*sin(time*pi/180.0))
trigger1 = var(1) := -1
trigger2 = var(1) = -1
trigger2 = parentdist x > 5+90*sin(time*pi/180.0)
trigger2 = var(1) := 1
trigger3 = time = 0
trigger3 = var(1) := ifelse(ishelper(3453),1,-1)

[state 3453, Zeeky]
type = destroyself
trigger1 = time >= 180
