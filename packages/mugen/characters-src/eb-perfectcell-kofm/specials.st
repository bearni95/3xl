;KIBLAST
[Statedef 1000]
type=S
physics=S
movetype=A
anim=1000
ctrl=0
velset=0,0
poweradd=72
sprpriority=1
facep2=1


[State 1000, Strength]
type = varset
trigger1 = !time && !AIlevel
var(10) = ifelse(command = "z", 3, ifelse(command = "y", 2, 1))
[State 1000, Strength AI]
type = varset
trigger1 = !time && AIlevel
var(10) = ifelse((p2movetype = H || random < 500), 3, ifelse(random < 500, 2, 1))

[State 1000, width]
type = width
trigger1 = animelemtime(5) = -1
value = 30,0

[State 0, Explod]
type = Explod
trigger1 = animelem = 3
anim = 1007
ID = 1007
pos = 40,-79
postype = p1
removetime = -2
pausemovetime = 0
supermovetime = 0
scale = .5,.5
sprpriority = 5
ownpal = 1

[State 1205, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 1100,0

[State 1205, 1]
type = PlaySnd
trigger1 = AnimElem = 3
value = 1100,1

[State 0, Helper]
type = Helper
trigger1 = animelemtime(3)=1;animelem = 3
helpertype = normal
name = "kiblast"
ID = 1000
stateno = 1005
pos = 40,-79
postype = p1
ownpal = 1
supermovetime = 0
pausemovetime = 0
size.xscale = 1
size.yscale = 1


[State 1000, End]
type = changestate
trigger1 = !animtime
value = 0
ctrl = 1

;KI/FORCE PUSH
[Statedef 1010]
type    = S
movetype= A
physics = N
juggle  = 7
velset = 0,0
anim = 1010
ctrl = 0
sprpriority = 2
poweradd=72*!var(20)

[State 1000, width]
type = width
trigger1 = animelemtime(3) = 2
player= 30, 0
edge=50,0
value = 30,0


[State 220, snd]
type = playsnd
triggerall = var(55)=0		;Voice=Japan
trigger1 = animelem=3
value = 3,5+random%3
channel = 0

[State 200, 1];voice
type = PlaySnd
triggerall = var(55)=1		;Voice=English
trigger1 = animelem=3
value = 3,105+random%2
channel = 0


[State 200, 1]
type = PlaySnd
trigger1 = AnimElemtime(3)=0
value = 1,33

[State 0, Explod]
type = Explod
trigger1 = animelem =3
anim = 1007
ID = 1007
pos = 60,-100
postype = p1
removetime = -2
pausemovetime = 0
supermovetime = 0
scale = .5,.5
sprpriority = 5
ownpal = 1

[State 1000, lkb]
type = Helper
helpertype = normal
trigger1 = animelem = 3
name = "kipush"
postype = P1
pos = 80,-80
ownpal = 1
stateno = 1021
id = 1021

[State 1000, Relax]
type = statetypeset
trigger1 = animelem = 4
movetype = I

[State 1000, 7]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;============================================================
;FORCE BARRIER 
[Statedef 1100]
type = S
movetype = A
physics = S
anim = 1100
juggle  = 7
velset = 0,0
ctrl = 0
sprpriority = 2
poweradd=72*!var(20)

[state 2100]
type = nothitby
trigger1 = time = 12
value = SCA,NP,SP,HP
time = 28

[State 2100, dust1]
type = Explod
trigger1 = time = 1
anim = 8103
sprpriority = 5
postype = p1
pos = -10,0
bindtime = -1
removetime = 33
removeongethit = 1
facing = -1

[State 2100, dust2]
type = Explod
trigger1 = time = 35
anim = 8106
sprpriority = 5
postype = p1
pos = 25,10
bindtime = -1
removetime = 25
removeongethit = 1
facing = -1

[State 2100, sound2]
type = PlaySnd
trigger1 = time = 1
value = 1000,7

[State 2100, voice]
type = PlaySnd
trigger1 = time = 1
value = 1000,2
volume = 255

[State 0, Helper]
type = Helper
trigger1 =time=1&&!Numhelper(1105)
helpertype = normal
name ="Bakushin"
ID =1104
stateno =1104
pos = 0,0
postype = p1
facing = 1
keyctrl = 0
ownpal = 1
size.xscale =1
size.yscale =1
[State 0, Helper]
type = Helper
trigger1 =time=16&&!Numhelper(1105)
helpertype = normal
name ="Bakushin"
ID =1105
stateno =1105
pos = 0,0
postype = p1
facing = 1
keyctrl = 0
ownpal = 1
size.xscale =1
size.yscale =1

[State 2100, barrier]
type = Explod
trigger1 = time = 16
anim = 8303
sprpriority = 3
postype = p1
pos = 0,0
bindtime = -1
removetime = 28
removeongethit = 1
ownpal = 1

[State 2100, spark]
type = Explod
trigger1 = time = 16
anim = 8301
sprpriority = 5
postype = p1
pos = 0,0
bindtime = -1
removetime = 28
removeongethit = 1
ownpal = 1
shadow = 150,150,150



[State 2010, 3]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;============================================================
;---------------------ƒGƒlƒ‹ƒM[ƒtƒB[ƒ‹ƒh (Žã)
;EX FORCE BARRIER
[Statedef 1101]
type = S
movetype = A
physics = S
anim = 1101
juggle  = 7
velset = 0,0
ctrl = 0
sprpriority = 2
poweradd=72*!var(20)

[state 2101]
type = nothitby
trigger1 = time = 11
value = SCA,NP,SP,HP
time = 18

[State 2101, dust1]
type = Explod
trigger1 = time = 1
anim = 8103
sprpriority = 5
postype = p1
pos = -10,0
bindtime = -1
removetime = 33
removeongethit = 1
facing = -1

[State 2101, dust2]
type = Explod
trigger1 = time = 25
anim = 8106
sprpriority = 5
postype = p1
pos = 25,10
bindtime = -1
removetime = 25
removeongethit = 1
facing = -1

[State 2101, sound2]
type = PlaySnd
trigger1 = time = 1
value = 1000,7

[State 2101, voice]
type = PlaySnd
trigger1 = time = 1
value = 1000,2
volume = 255

[State 2101, fadeout]
type = Explod
trigger1 = time = 34
anim = 8302
sprpriority = 3
postype = p1
pos = -4,0
bindtime = -1
removetime = 16
removeongethit = 1
ownpal = 1

[State 2101, fadeout]
type = Explod
trigger1 = time = 34
anim = 8302
sprpriority = 3
postype = p1
pos = 4,0
bindtime = -1
removetime = 16
removeongethit = 1
ownpal = 1
facing = -1

[State 2101, 3]
type = Projectile
trigger1 = time = 1
projanim = 8300
projhitanim = -1;2003
projremove = 0
projremovetime = 16
projID = 2000
velocity = 0
projshadow = 150,150,150
projpriority = 1
projhits = 45
projmisstime = 15
postype = p1
offset = 0,0
attr = S, SP
damage = 50,5
animtype = medium
hitflag = MAFP
guardflag = MA
sparkno = -1;S8003
guard.sparkno = -1;S8000
sparkxy = ceil (p2dist x) + -10, -80
hitsound = S1,0
getpower = 0
guardsound = S3,0
pausetime = 0,13
ground.hittime = 15
ground.type = high
ground.slidetime = 15
ground.velocity = -12.5
air.velocity = -4,-4
air.fall = 1
fall.recover = 0
fall=1
air.juggle = 10
yaccel = .5
envshake.time = 20
envshake.freq = 10
envshake.ampl = -7
kill = 1

[State 2101, 3]
type = Projectile
trigger1 = time = 16
projanim = 8304
projhitanim = -1;2003
projremove = 0
projremovetime = 18
projID = 2000
velocity = 0
;projshadow = 150,150,150
projpriority = 1
;projhits = 45
;projmisstime = 5
postype = p1
offset = 0,0
attr = S, SP
damage = 50,5
animtype = diagup
hitflag = MAFP
guardflag = MA
hitsound   = S1,2
guardsound = S3,0
sparkno = -1;S8003
guard.sparkno = -1;s8000
sparkxy = 80, -80
getpower = 0
pausetime = 0,2
ground.hittime = 15
ground.type = high
ground.slidetime = 15
ground.velocity = -12.5
air.velocity = -6,-10
air.fall = 1
fall.recover = 0
fall=1
air.juggle = 10
yaccel = .5
envshake.time = 20
envshake.freq = 10
envshake.ampl = -7
bindtime = -1

[State 2101, barrier]
type = Explod
trigger1 = time = 16
anim = 8303
sprpriority = 3
postype = p1
pos = 0,0
bindtime = -1
removetime = 18
removeongethit = 1
ownpal = 1

[State 2101, spark]
type = Explod
trigger1 = time = 16
anim = 8301
sprpriority = 4
postype = p1
pos = 0,0
bindtime = -1
removetime = 18
removeongethit = 1
ownpal = 1
shadow = 150,150,150

[state 2101, hitspark]
type = explod
trigger1 = projhittime(2000) = 1
anim = 8003
pos = 0,-70
postype = p2
bindtime = 1
ontop = 1
ownpal = 1
facing = -1
supermove = 1

[state 2101, guardspark]
type = explod
trigger1 = ProjGuarded(2000) = 1
anim = 8000
pos = 0,-70
postype = p2
bindtime = 1
ontop = 1
ownpal = 1
facing = -1
supermove = 1

[State 2101, 3]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;special beam
[Statedef 1200]
type    = S
movetype= A
physics = N
juggle  = 0
velset = 0,0
anim = 1200
ctrl = 0
sprpriority = 2
poweradd=72*!var(20)

[State 1000, width]
type = width
trigger1 = animelemtime(3) = 2
player= 30, 0
edge=50,0
value = 30,0



[State 200, 1]
type = PlaySnd
trigger1 = AnimElemtime(3)=0
value =s2000,1


[State 1000, lkb]
type = Helper
helpertype = normal
trigger1 =animelem=3; AnimElemtime(3)=0
name = "specialbeam"
postype = P1
pos = 10,-25
ownpal = 1
stateno = 1011
id = 1011
ignorehitpause=1
sprpriority = 4

[State 1000, Relax]
type = statetypeset
trigger1 = animelem = 4
movetype = I

[State 1000, 7]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;TACKLE
[StateDef 1300]
type = S
physics = N
moveType = A
anim = 1300
ctrl = 0
velSet = 0,0
sprPriority = 1
powerAdd = 72 * !var(20)
faceP2 = 1

[State 1300, Width]
type = Width
trigger1 = AnimElem = 2
edge = 15,0


[State 1100, Button Detect (AI)]
type = VarSet
trigger1 = !Time && AILevel
var(10) = ifElse(P2Dist x > 100, 2, ifElse(P2Dist x > 88, 1, 0))

[State 1100, ChangeAnim]
type = ChangeAnim
trigger1 = !Time
value = ifElse(command="b", 1301, 1300)

[State 1100, Voice]
type = PlaySnd
trigger1 = AnimElem = 2
value = 200,6
channel = 0

[State 1100, Jump Sound]
type = PlaySnd
trigger1 = AnimElem = 3
value = 41,0
channel = 1

[State 1100, Landing Sound]
type = PlaySnd
trigger1 = AnimElem = 8
value = 52,0
channel = 3

[State 1100, Skid Dust]
type = Explod
trigger1 = AnimElemTime(3) >= 0 && AnimElemTime(7) < 0
trigger1 = !(AnimElemTime(3) % 3)
anim = 8104
sprPriority = 3
posType = P1
vel = 0,0
scale = 0.5,0.5
pauseMovetime = -1
superMoveTime = -1
ownpal = 1

[State 1000, FX]
type = Explod
trigger1 = AnimElem = 2
anim = 1303
postype = P1
pos = -20, 20
persistent = 0
sprpriority = 5
ownpal = 1
scale = 1,.5

[State 1100, VelSet]
type = VelSet
trigger1 = AnimElem = 2
x = 9

[State 1100, VelSet]
type = VelSet
trigger1 = AnimElem = 3
x = 10.7+(var(10)*2.134)

[State 1100, VelMul]
type = VelMul
trigger1 = AnimElemTime(3) >= 1
x = 0.901231

[State 1100, VelSet]
type = VelSet
trigger1 = AnimElem = 4
x = 0

[State 1100, HitDef]
type = HitDef
;trigger1 = !var(16) && (var(15) < 5 || var(20))
trigger1 = time=0
;forceNoFall = !var(20)
attr = S, SA
hitFlag = MAF
guardFlag = M
priority = 3, Hit
damage = 56,7
getPower = ifElse(!var(13), 72, 36) * !var(20), 12 * !var(20)
givePower = 36, 36
pauseTime = ifElse(var(20), 6, 12), ifElse(var(20), 6, 12)
guard.pauseTime = ifElse(var(20), 6, 12), ifElse(var(20), 6, 12)
animType = Hard
air.animType = Back
fall.animType = Back
ground.type = High
air.type = Low
ground.hitTime = 24
ground.slideTime = 18
guard.hitTime = 18
air.hitTime = 120
ground.velocity = -11.23, 0
ground.cornerPush.velOff = 0
guard.velocity = -10.52
guard.cornerPush.velOff = 0
air.velocity = -4.32, -7.49
air.cornerPush.velOff = 0
yAccel = 0.65
fall = 0
air.fall = 1
fall.recover = 0
fall.recoverTime = 120
forceStand = 1
hitSound = -1 + 0 * (var(31) := 2)
guardSound = -1 + 0 * (var(32) := 0)
sparkno = s7020 + (random % 8)
guard.sparkno = s7000
sparkXY = -10 + 0 * (var(35) := 78), var(36) := -76
envShake.time = 14
envShake.ampl = 4
envShake.freq = 120


[State 1100, End]
type = ChangeState
trigger1 = !AnimTime
value = 0
ctrl = 1

;========================<EX TACKLE>=============================
[StateDef 1302, EX TACKLE]
type = S
physics = N
moveType = A
anim = 1302
juggle  = 7
velset = 0,0
ctrl = 0
sprpriority = 2
poweradd=72*!var(20)

[State 1150, Width]
type = Width
trigger1 = AnimElem = 2 || AnimElem = 6
edge = 15,10

[State 1150, Custom Combo Juggle Points Reset]
type = VarSet
trigger1 = !Time && var(20)
var(15) = 0
ignoreHitPause = 1

[State 1150, Custom Combo Reset]
type = PalFX
trigger1 = !Time
trigger1 = var(20) := -1
time = 1

[State 1150, EX Flash]
type = VarSet
trigger1 = !Time
var(25) = 32


[State 1150, Voice]
type = PlaySnd
trigger1 = AnimElem = 2
value = s200,4
channel = 0

[State 1100, Voice]
type = PlaySnd
trigger1 = AnimElem = 6
value = s200,6
channel = 0

[State 1150, Jump Sound]
type = PlaySnd
trigger1 = AnimElem = 1||animelem=5
value = s1,3
channel = 1

[State 1150, Landing Sound]
type = PlaySnd
trigger1 = AnimElem = 8
value = 52,0
channel = 4

[State 1150, Skid Dust]
type = Explod
trigger1 = (AnimElemTime(3) >= 0 || AnimElemTime(8) >= 0) && AnimElemTime(13) < 0
trigger1 = !(AnimElemTime(3) % 3)
anim = 2216
sprPriority = 3
posType = P1
vel = 0,0
scale = 0.5,0.5
pauseMovetime = -1
superMoveTime = -1
ownpal = 1

[State 1150, NotHitBy]
type = NotHitBy
trigger1 = AnimElemTime(4) < 0
value = SCA
time = 1

[State 1150, VelSet]
type = VelSet
trigger1 = AnimElem = 2 || AnimElem = 6
x = 9

[State 1150, VelSet]
type = VelSet
trigger1 = AnimElem = 4
x = 6

[State 1150, VelSet]
type = VelSet
trigger1 = AnimElem = 2 || AnimElem = 6
x = 15

[State 1150, VelMul]
type = VelMul
trigger1 = AnimElemTime(2) >= 1 || AnimElemTime(6) >= 1
x = 0.87

[State 1150, VelSet]
type = VelSet
trigger1 = AnimElem = 10 
x = 0

[State 1000, FX]
type = Explod
trigger1 = AnimElem = 2
anim = 1303
postype = P1
pos = -20, 20
persistent = 0
sprpriority = 5
ownpal = 1
scale = 1,.5

[State 1000, FX]
type = Explod
trigger1 = AnimElem = 5
anim = 1303
postype = P1
pos = -20, 20
persistent = 0
sprpriority = 5
ownpal = 1
scale = 1,.5

[State 1150, HitDef]
type = HitDef
trigger1 = AnimElem = 2
ID = 1302
attr = S, SA
hitFlag = MAF
guardFlag = M
priority = 3, Hit
damage = 56,7
getPower = 0,0
givePower = 36, 36
pauseTime = 12,12
guard.pauseTime = 6,6
animType = Hard
air.animType = Back
fall.animType = Back
ground.type = High
air.type = Low
ground.hitTime = 21
ground.slideTime = 18
guard.hitTime = 18
air.hitTime = 120
ground.velocity = -4.32, 0
ground.cornerPush.velOff = 0
guard.velocity = -10.52
guard.cornerPush.velOff = 0
air.velocity = -4.32, -7.49
air.cornerPush.velOff = 0
yAccel = 0.65
fall = 0
air.fall = 1
fall.recover = 0
fall.recoverTime = 120
forceStand = 1
hitSound = s2,5
guardSound =s2,0
sparkno = s7020 + (random % 8)
guard.sparkno = s7000
sparkXY = -10 + 0 * (var(35) := 40), var(36) := -70
envShake.time = 14
envShake.ampl = 4
envShake.freq = 120

[State 1150, HitDef]
type = HitDef
trigger1 = AnimElem = 6
ID = 1302
attr = S, SA
hitFlag = MAF
guardFlag = M
priority = 4, Hit
damage = 56,7
getPower = 0,0
givePower = 36, 36
pauseTime = 12,12
guard.pauseTime = 6,6
animType = Back
air.animType = Back
fall.animType = Back
ground.type = High
air.type = Low
ground.hitTime = 18
ground.slideTime = 18
guard.hitTime = 18
air.hitTime = 120
ground.velocity = -2.16, -12.81
ground.cornerPush.velOff = 0
guard.velocity = -12.64
guard.cornerPush.velOff = 0
air.velocity = -2.16, -12.81
air.cornerPush.velOff = 0
yAccel = 0.5
fall = 1
fall.recover = 1
fall.recoverTime = 120
forceStand = 1
hitSound =s2,6
guardSound = s2,0
sparkno = s7020 + (random % 8)
guard.sparkno = s7000
sparkXY = -10 + 0 * (var(35) := 40), var(36) := -70
envShake.time = 14
envShake.ampl = 4
envShake.freq = 120

[State 1150, StateTypeSet: Idle]
type = StateTypeSet
trigger1 = AnimElemTime(10) >= 0
moveType = I

[State 1150, End]
type = ChangeState
trigger1 = !AnimTime
value = 0
ctrl = 1
