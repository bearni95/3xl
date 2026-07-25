;======================
; Naraku Helper States
;======================

;-----------------------
; Naraku Enters
[Statedef 3500]
movetype = I
physics = A
velset = 0,0
anim = 3501
sprpriority = 2

[State 3500, NHB]
type = nothitby
trigger1 = 1
value = SCA, AA, AP, AT

[State 3500, SND]
type = playsnd
trigger1 = time = 0
trigger1 = ishelper(3500)
value = 3500,0

[State 3500, PS]
type = posset
trigger1 = time = 0
y = -400

[State 3500, CS]
type = changestate
trigger1 = pos y >= -10
value = ifelse(ishelper(3550),3551,3501)

;-----------------------
; Naraku Striker - Miasma
[Statedef 3501]
type = S
movetype = A
physics = S
velset = 0,0
ctrl = 0
anim = 3501
sprpriority = 0

[State 3501, NHB]
type = nothitby
trigger1 = time >= 24
value = SCA, AA, AP, AT

[State 3501, T]
type = turn
trigger1 = time = 0
trigger1 = p2dist x < 0

[State 3501, PP]
type = playerpush
trigger1 = 1
value = 1

[State 2100, HOR]
type = hitoverride
trigger1 = 1
attr = SCA,AA,AP,AT
time = -1
slot = 6
stateno = 3520
ignorehitpause = 1

[State 3500, PS]
type = posset
trigger1 = time = 0
y = 0

;[State 3400, PSND]
; "Laugh"
;type = playsnd
;trigger1 = time = 24
;value = 3500,4

[State 900, Kanna]
type = helper
trigger1 = time = 24
helpertype = normal
name = "Miasma"
ID = 3503
pos = 0,0
postype = p1
stateno = 3503
ownpal = 1

[State 3400, PSND]
type = playsnd
trigger1 = time = 90
value = 3500,4

[State 3501, Escape]
type = changestate
trigger1 = animtime = 0
value = 3502

;-----------------------
; Naraku Leaves
[Statedef 3502]
type = S
movetype = I
physics = S
anim = 3502
sprpriority = 0

[State 3402, PSND]
type = playsnd
trigger1 = prevstateno != 3501
trigger1 = time = 0
value = s3500,ifelse(prevstateno = 3520,8,9)

[State 3402, EXPLOD]
type = explod
trigger1 = time = 0
anim = 3510
pos = ifelse(parent,teamside=1,0,320),50
postype = left
removetime = 600
ontop = 1
bindtime = -1
facing = ifelse(parent,teamside=1,1,-1)

[State 3400, VelS]
type = velset
trigger1 = time >= 49
x = -10.0
y = -4.7

[State 3400, destroyself]
type = destroyself
trigger1 = time >= 600

;-----------------------
; Miasma Gas
[Statedef 3503]
movetype = A
physics = n
anim = 3503
sprpriority = 5

[State 3503, Ass]
type = assertspecial
trigger1 = 1
flag = noshadow
flag = unguardable
ignorehitpause = 1

[State 3503, HOR]
type = hitoverride
trigger1 = 1
attr = SCA,AA,AP,AT
time = -1
stateno = -1
slot = 6
ignorehitpause = 1

[State 240, 3]
type = HitDef
trigger1 = Time = 0
affectteam = B
attr = S, SA
damage = 120,120
hitflag = MA-
guardflag = MA
pausetime = 0,3
animtype = Low
sparkno = -1;s8021
guard.sparkno = -1;s8030
sparkxy = -15,-55
hitsound   = s240,1
guardsound = 6,0
ground.type = Trip
ground.slidetime = 10
ground.hittime  = 120
ground.velocity = -2,0;-8.5
air.velocity = -2,0;-7
guard.velocity = -5
fall = 1
getpower = 70,0
palfx.time = 90
palfx.mul=0,64,64
palfx.add=0,0,0
sprpriority = 5

[State 3503, AD]
type = angledraw
trigger1 = time >= 30
scale = 1.0+(0.05*(time-30)),1.0+(0.005*(time-30))

[State 3503, T]
type = trans
trigger1 = time < 148
trans = add
ignorehitpause = 1

[State 3503, T]
type = trans
trigger1 = time >= 148
trans = addalpha
alpha = 256-8*(time-148),256;8*(time-178),256-8*(time-178)
ignorehitpause = 1

[State 3503, Zeeky]
type = destroyself
trigger1 = time >= 180

;-----------------------
; Naraku Gethit
[Statedef 3520]
type = S
movetype = H
physics = S
velset = 0,0
anim = 3520
sprpriority = 2

[State 3400, VelS]
type = velset
trigger1 = time = 0
x = gethitvar(xvel)

[State 3400, SND]
type = playsnd
trigger1 = time = 0
value = 3500,7

[State 3400, CS]
type = changestate
trigger1 = animtime = 0
value = 3502

;-----------------------
; Naraku Desperation Assist - Illusory Death/Shun Naraku Satsu
[Statedef 3551]
type = S
movetype = A
physics = S
velset = 0,0
ctrl = 0
anim = 3550
sprpriority = 0

[State 3450, PSND]
type = playsnd
trigger1 = time = 0
value = S3550, 0
channel = 0

[State 3551, HOR]
type = hitoverride
trigger1 = 1
attr = SCA,AA,AP,AT
time = -1
slot = 6
stateno = 3520
ignorehitpause = 1

[State 3551, CS]
type = changestate
trigger1 = time = 0
trigger1 = root,stateno != 3350
value = 3502

[State 3501, T]
type = turn
trigger1 = time = 0
trigger1 = p2dist x < 0

[State 3501, PP]
type = playerpush
trigger1 = 1
value = 1

[State 3500, PS]
type = posset
trigger1 = time = 0
y = 0

[state 1010, Za Warudo!]
type = SuperPause
trigger1 = animelem = 8;7
time = 60
anim = -1
;sound = S900, 0
p2defmul = 1
unhittable = 1
darken = 1

[State 3450, PSND]
type = playsnd
trigger1 = animelem = 8
value = S900, 0

[State 1010, Explod]
type = Explod
trigger1 = animelem = 8
anim = 3302
ID = 3300
pos = -100,0
vel = 3,0
postype = back
supermovetime = 60
removetime = 60

[State 1010, Explod]
type = Explod
trigger1 = animelem = 8
anim = 3300
ID = 3300
pos = 420,0
vel = -3,0
postype = back
supermovetime = 60
removetime = 60

[State 3450, PSND]
type = playsnd
trigger1 = animelem = 10
value = S3500, 2
channel = 0

[State 3450, Tentacles]
type = helper
trigger1 = animelem = 16
name = "Tentacles"
ID = 3552
pos = floor(p2dist x),0
postype = p1
stateno = 3552
ownpal = 1
supermovetime = 999

[State 3350, NHB]
type = nothitby
trigger1 = numhelper(3552) = 1
trigger1 = helper(3552),stateno = 3560
value = SCA, AA, AP, AT

[State 3550, Escape]
type = changestate
triggerall = time >= 171
triggerall = numhelper(3552) = 0
;triggerall = animelem = 57
triggerall = anim = 3550
trigger1 = roundstate = 2
trigger2 = parent,alive = 0
value = 3502

[State 3550, Win Pre-Animation]
type = changeanim
trigger1 = anim = 3550
trigger1 = time >= 171
trigger1 = roundstate != 2
trigger1 = win = 1
value = 3504

[State 3550, Naraku Winpose]
type = changestate
trigger1 = anim = 3504
trigger1 = roundstate = 4
trigger1 = root,stateno = 183
value = 3504

;-----------------------
; Naraku's Tentacles
[Statedef 3552]
type = S
movetype = A
physics = S
velset = 0,0
ctrl = 0
anim = 3551
sprpriority = 1

[State 2100, HOR]
type = hitoverride
trigger1 = 1
attr = SCA,AA,AP,AT
time = -1
slot = 7
ignorehitpause = 1

[State 1102, Hitdef]
type = Hitdef
trigger1 = 1
attr = C, HT
hitflag = MFD
guardflag = A
p1stateno = 3560
p2stateno = 3561

[State 3552, Zeeky]
type = destroyself
trigger1 = animtime = 0
trigger2 = parent,stateno = 3520

;-----------------------
; Tentacles Grab State
[Statedef 3560]
type = S
movetype = I
physics = S
velset = 0,0
ctrl = 0
sprpriority = -1

[State 3560]
type = pause
trigger1 = time = 0
time = 184
movetime = 184

[State 3450, PSND]
type = playsnd
trigger1 = time = 20
value = S3550, 2
channel = 0

[State 3450, PSND]
type = playsnd
trigger1 = time = 80
value = S3500, 4
channel = 0

[State 3560, EX]
type = Explod
trigger1 = time = 0
pausemovetime = 200
supermovetime = 200
ID = 3552
anim = 3552
ownpal = 1
scale = 1.0,2.0
pos = 160,120
postype = left
removetime = 200
sprpriority = 3

[State 3560, MEX]
type = modifyexplod
trigger1 = time < 184
ID = 3552
scale = 1.0+time,2.0

[State 3560, MEX]
type = modifyexplod
trigger1 = time >= 184
ID = 3552
scale = 200.0-time,2.0

[State 3560, TB]
type = targetbind
trigger1 = 1
time = 1
pos = 0,0

[State 3560, ASS]
type = assertspecial
trigger1 = time >= 40
trigger1 = time < 184
flag = invisible
flag2 = noshadow

[State 3560, EX]
type = Explod
trigger1 = time = 40
pausemovetime = 144
supermovetime = 144
ID = 3560
anim = 3553
ownpal = 1
scale = 0.5,0.5
pos = 160,120
postype = left
removetime = 144
sprpriority = 4

[State 3560, MEX]
type = modifyexplod
trigger1 = 1
ID = 3560
scale = 0.5+0.001*(time)+0.01*sin(time*8),0.5+0.001*(time)+0.01*sin(time*8)

[State 3560, TLA]
type = targetlifeadd
trigger1 = time >= 70
trigger1 = time <= 170
trigger1 = time%5 = 0
value = -34
kill = ifelse(time>=170,1,0)

[State 3450, PSND]
type = playsnd
trigger1 = time >= 70
trigger1 = time <= 170
trigger1 = time%5 = 0
value = S3550, 1
channel = 1

[State 3061, Explod]
type = Explod
trigger1 = time >= 70
trigger1 = time <= 170
trigger1 = time%5 = 0
pausemovetime = 200
pos = 0,-50
random = 60,60
postype = p2
anim = 8005+(random%2)+ifelse(random<=499,10,0)
facing = ifelse(random<=499,1,-1)
sprpriority = 6

[State 3561, TS]
type = targetstate
trigger1 = time = 184
value = 3562

[State 3561, Zeeky]
type = changeanim
trigger1 = anim = 3551
trigger1 = time >= 215
value = 3554

[State 3561, Zeeky]
type = destroyself
trigger1 = anim = 3554
trigger1 = animtime = 0

;-----------------------
; Grabbed by Tentacles State
[Statedef 3561]
type = S
movetype = H
physics = S
velset = 0,0
ctrl = 0
sprpriority = 5

[State 3561, CA2]
type = changeanim
trigger1 = 1
value = 5090
elem = 1

;-----------------------
; Released by Tentacles State
[Statedef 3562]
type = L
movetype = I
physics = S
velset = 0,0
ctrl = 0
sprpriority = 5

[State 3561, CA2]
type = changeanim
trigger1 = 1
value = 5110
elem = 1

[State 3561, CA2]
type = SelfState
trigger1 = time >= 90
trigger1 = alive
value = 5120

[State 3561, CA2]
type = SelfState
trigger1 = !alive
value = 5150

;-----------------------
; Naraku Winpose
[Statedef 3504]
type = S
movetype = I
physics = S
anim = 3505
sprpriority = 0

[state 3403, PSND]
type = playsnd
trigger1 = time = 16
value = 3504, 0;+(random%2)

[State 3404, RNO]
type = assertspecial
trigger1 = time <= 144
flag = roundnotover

[State 3403, NHB]
type = nothitby
trigger1 = 1
value = SCA, AA, AP, AT
