;---------------------------------------------------------------------------
; Ki 1
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
trigger1 = animelem = 5
anim = 1007
ID = 1007
pos = 40,-80
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
trigger1 =animelem = 5
helpertype = normal
name = "Ki Blasts"
ID = 1000
stateno = 1005
pos = 50,-80
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


;========================<TENMA SHURETTOU>=============================
;---POSE---
[Statedef 1100]
type=S
physics=S
movetype=A
anim=1100
ctrl=0
velset=0,0
facep2=1
sprpriority=1


[State 1100, reversal]
type=reversaldef
trigger1= anim=1100 && animelem=3
reversal.attr=SCA,AA
p1stateno=1101
pausetime=0,20
hitsound=s2,0
sparkno=s7001
sparkxy=0,0
numhits=0

[State 0, HitOverride]
type = HitOverride
trigger1 = !time
attr =SCA,AA; SCA,NA,SA        ;SCA,NA,SA,HA,NP,SP,HP,NT,ST,HT
stateno = 1101
time = 38


[State Idle]
type=statetypeset
trigger1= animelemtime(4)>=0
movetype=I

[State 1100, end]
type=changestate
trigger1= !animtime
value=0
ctrl=1


;---GOUHA KEN---
[Statedef 1101]
type=S
movetype=A
physics=S
juggle=ifelse((p2movetype=H && p2statetype=A),6,0)
anim=1101
velset=0,0
poweradd=72*!var(20)
sprpriority=1
ctrl=0

[State 1101, width]
type=width
trigger1= animelemtime(2)>=0 && animelemtime(6)<0
value=35,0
ignorehitpause=1

[State 1101, snd]
type=playsnd
trigger1= animelem=4
value=1,3
channel=3
[State 1101, snd]
type=playsnd
trigger1= !time
value=4,13
channel=0

[State 1101, snd]
type=playsnd
trigger1= animelem=3
value=5,4
channel=2
ignorehitpause=1
[State 1101, dust]
type=explod
trigger1= animelem=3
anim=7100
ID=7100
sprpriority=2
postype=p1
pos=48,0
ownpal=1
ignorehitpause=1
pausemovetime=-1
supermovetime=-1
[State 1101, dust]
type=explod
trigger1= animelem=3
anim=7104
ID=7104
sprpriority=-2
postype=p1
pos=48,0
scale=.75,.75
ownpal=1
ignorehitpause=1
pausemovetime=-1
supermovetime=-1
[State 1101, shake]
type=envshake
trigger1= animelem=3
time=18
freq=60
ampl=4
ignorehitpause=1

[State 1101, hit]
type=hitdef
trigger1= animelem=3
ID=1101
attr=S,SA
damage=116,14
animtype=Diagup
guardflag=MA
hitflag=MAF
priority=6,Hit
pausetime= ifelse(var(20),6,12), ifelse(var(20),6,12)
sparkno=s7020+(random%8)
guard.sparkno=s7001
sparkxy=-10,-74
hitsound=s2,3
guardsound=s2,0
ground.type=High
ground.slidetime=16
ground.hittime=16
ground.velocity=-6,-6
air.type=Low
air.velocity=-6,-6
ground.cornerpush.veloff= 0
guard.velocity= -10.52
guard.cornerpush.veloff= -12.74
getpower= ifelse(p2movetype=H,72,144)*!var(20), 36*!var(20)
givepower=36,36
envshake.time=18
envshake.freq=60
envshake.ampl=6
fall=1
fall.recover=0;!var(20)
;fall.recovertime=31
airguard.ctrltime= 16
airguard.velocity= ifelse(var(20),-4,-8), -1.5
forcestand=1
airguard.cornerpush.veloff= 0

[State Idle]
type=statetypeset
trigger1= animelemtime(7)>=0
movetype=I

[State 1101, end]
type=changestate
trigger1= !animtime
value=0
ctrl=1

;---------------------------------------------------------------------------
;FOR MASTER GOHAN!!
[Statedef 1200]
type    = S
movetype= A
physics = S
juggle  = 4
velset = 0,0
ctrl = 0
anim = 1200
poweradd = 40
sprpriority = 2
facep2=1

[State 100, 2]
type = PlaySnd
trigger1 =!time
value = 1,3

[State 100, dash dust]
type = Explod
trigger1 = !time
anim = 2216
ID = 2216
pos = -50,6
scale = 1,0.5
sprpriority = 8
ownpal = 1
ignorehitpause = 1

[State xxx, VarSet]
type = Veladd
trigger1 =!AILevel&& time =0
x = ifelse(command="a",5,ifelse(command="b",12,17))
ignorehitpause = 1
[State xxx, VarSet]
type = Veladd
trigger1 =AILevel&& time =0
x= ifelse(random<300,8,12)
ignorehitpause = 1
[State 0, VarSet]
type = Veladd
trigger1 =!time
x=Ifelse(enemynear,Movetype=H,12,5)
ignorehitpause = 1

[State 0, Position]
type = PosSet
trigger1 = !Time
y = 0


[State 0, VelSet]
type = VelSet
trigger1 =animelemtime(2)>=0
x=Ifelse(var(50),7,6)

[State 0, ChangeState]
type = ChangeState
trigger1 = p2bodydist X < 25
value = 1201
ctrl = 0
[State 0, ChangeState]
type = ChangeState
trigger1 = !var(5)&&time = 25
trigger2 = var(5)=1&&time = 35
trigger3 = var(5)=2&&time = 45
value = 101
ctrl = 0
;---------------------------------------------------------------------------
[Statedef 1201]
type    = S
movetype= A
physics = S
juggle  = 1
velset = 0,0
ctrl = 0
anim = 1201
poweradd = 30
sprpriority = 2

[State 200, 1]
type = HitDef
trigger1 = Time = 0
id=1200
attr = S, SA
damage = 45+5*var(5),10
animtype = hard
guardflag = MA
hitflag = MAF
priority = 3, Hit
pausetime = 10, 11
sparkno = s7020+(random%8)
sparkxy = -18, -65
hitsound = s32,1
guardsound = s120, 1
guard.sparkno = s7121
ground.type = low
ground.slidetime = 11
ground.hittime  = 11
ground.velocity = -5
airguard.velocity = -4,-1
air.type = low
air.velocity = -1.4,-3
air.hittime = 12
getpower = 15,10
givepower = 35,35
id = 50
EnvShake.time = 12
EnvShake.ampl = 6

[State 0, p2state]
type=targetstate
trigger1= movehit && numtarget(1200)
trigger1= target(1200),Movetype=H
ID=1200
value=1545
ignorehitpause=1
[State 0, p1state]
type=changestate
trigger1= movehit && numtarget(1200)
trigger1= target(1200),Movetype=H
value=1203
ignorehitpause=1

[State 0, ChangeState]
type = ChangeState
trigger1 = moveguarded
value = 1202
ctrl = 0

[State 0, ChangeState]
type = ChangeState
trigger1 = !animtime
value = 0
ctrl = 1
;---------------------------------------------------------------------------
[Statedef 1202]
type    = S
movetype= A
physics = S
juggle  = 1
velset = 0,0
ctrl = 0
anim = 1202
poweradd = 20
sprpriority = 2

[State 200, 1]
type = HitDef
trigger1 = Time = 0
attr = S, SA
damage = 40+5*var(5),8
animtype = hard
guardflag = MA
hitflag = MAF
priority = 3, Hit
pausetime = 10, 11
sparkno = s7020+(random%8)
sparkxy = -15, -67
hitsound = s32,1
guardsound = s120, 1
guard.sparkno = s7121
ground.type = high
ground.slidetime = 11
ground.hittime  = 11
ground.velocity = -5
airguard.velocity = -4,-1
air.type = high
air.velocity = -1.4,-3
air.hittime = 12
getpower = 15,10
givepower = 35,35
id = 50
EnvShake.time = 16
EnvShake.ampl = 6

[State 0, ChangeState]
type = ChangeState
trigger1 = !animtime
value = 0
ctrl = 1
;---------------------------------------------------------------------------
[Statedef 1203]
type    = S
movetype= A
physics = S
juggle  = 1
velset = 0,0
ctrl = 0
anim = 1203
poweradd = 50
sprpriority = 2


[State 0, NotHitBy]
type = NotHitBy
trigger1 = time >= 7 && time <= 27
value = SCA
[State 0, TargetBind]
type = TargetBind
trigger1=animelemtime(3)<=0
id = 1200
pos = 72,0
[State 0, TargetBind]
type = TargetBind
trigger1=animelem=3
time = 2
id = 1200
pos = 72,0
[State 0, TargetBind]
type = TargetBind
trigger1=animelem=4
time = 3
id = 1200
pos = 75,0
;[State 0, TargetBind]
;type = TargetBind
;trigger1=animelem=5
;time = 15
;id = 1200
;pos = 66,0


[State 1200, spark1]
type = Explod
trigger1 = animelem = 4
anim = 1503
ID = 1503
postype = p1
pos = 40,-77
removetime = -2
pausemovetime = 0
supermovetime = 0
scale = .5,.5
sprpriority = 5
ownpal = 1

[State 1520, 3]
type = PlaySnd
trigger1 = AnimElem = 4
value = s200,2

[State 1520, 3]
type = PlaySnd
trigger1 = AnimElem = 4
value = s2000,2

[State 1530, 1]
type = HitDef
trigger1 = time=0
attr = S, SA
animtype  = Hard
damage    = 20
getpower = 30,30
givepower = 20,20
hitflag = AFD
guardflag = -1
pausetime = 26,26
sparkno = S7020+random%8
guard.sparkno = S7105
sparkxy = -15,-87
p2stateno = 1111300
hitsound = S300, 5
guardsound = S0, 0
ground.type = High
ground.slidetime = 25
ground.hittime  = 11
ground.velocity = -6.5,-3.2
air.velocity = -6.2,-3.2
ground.cornerpush.veloff = -13.5
fall = 1
recover = 0
envshake.ampl = 14
envshake.time = 6
fall.envshake.ampl = 22
fall.envshake.time = 8

[State 1530, 2]
type = NotHitBy
trigger1 = 1
value = SCA
[State 0, ChangeState]
type = ChangeState
trigger1 = !animtime
value = 0
ctrl = 1

;sword move used against frieza's men
[StateDef 1300]
type = S
movetype= A
physics = N
juggle  = 7
velset = 0,0
ctrl = 0
anim = 1300
poweradd = 100
sprpriority = 2

[State 100, 2]
type = PlaySnd
trigger1 =!time
value = 1,3

[State 100, dash dust]
type = Explod
trigger1 = !time
anim = 2216
ID = 2216
pos = -50,6
scale = 1,0.5
sprpriority = 8
ownpal = 1
ignorehitpause = 1

[State 0, PosAdd]
type = PosAdd
trigger1 = animelemtime(4)=0
x = 25

[State 0, Explod]
type = Explod
trigger1 = animelemtime(3)=0
anim =1310
ID = 1310
pos = -5,0
postype = p1
bindtime =-1
removetime = -2
scale = 1,1
sprpriority = 2
ontop = 0
shadow = 0,0,0
ownpal = 1
removeongethit = 1
ignorehitpause = 1

[State 0, PlaySnd]
type = PlaySnd
trigger1 = animelem = 1
value = S700,0
volume = 50
channel = 1

[State 0, StopSnd]
type = StopSnd
trigger1 = animelem = 7
channel = 1


[State 0, PlaySnd]
type = PlaySnd
trigger1 = animelem = 3
value = S2000,16
volume = 250
channel = 16
freqmul = 2.0

[State 0, PlaySnd]
type = PlaySnd
trigger1 = animelem = 3
value = S3,0
volume = 0
channel = 1

[State 0, VelSet]
type = VelSet
trigger1 = animelem = 3
x = 16

[State 0, VelSet]
type = VelSet
trigger1 = animelem = 4
x = 0


[State 1100, HitDef]
type = HitDef
trigger1 =1
attr = S, SA
animtype  = Heavy
air.animtype  = Back
damage=160,10
priority = 5,Hit
hitflag = MAF
guardflag = MA
pausetime=ceil(0*(ifelse(!var(20),1,.5))),ceil(4*(ifelse(!var(20),1,.5)))
sparkno = S7020+(random%8)
guard.sparkno =  s7001
sparkxy = -10 + 0*(var(35):=50), var(36):=-68
hitsound   = s1100,3
guardsound = S2,1
ground.type = Low
ground.slidetime = 20
ground.hittime  = 20
guard.ctrltime = 20
ground.velocity =0,-9.5
guard.velocity = -8
air.velocity =  0,-9.5
airguard.velocity = -6.67,-1
ground.cornerpush.veloff = 0
guard.cornerpush.veloff = -11.2
air.cornerpush.veloff = 0
airguard.cornerpush.veloff = 0
;envshake.time = 10
;envshake.ampl = 3
fall = 1
fall.recover = 0
air.fall = 1
air.recover = 0
yaccel = .5
persistent = 0
getpower = 0,0
givepower = 24, 24
numhits=0
p2stateno = 1350
id = 1300
persistent=0


[State 0, Helper]
type = Helper
trigger1= (movehit = 1) && numtarget(1300)
helpertype=normal
stateno=2280
ID=2280
name="Sparks"
postype=p1
pos= 0,0
facing= -1
ownpal=1
ignorehitpause=1
persistent = 0

[State 0, StateTypeSet]
type = StateTypeSet
trigger1 = animelem = 11
movetype = I

[State 1700, end]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1


;---------------------------------------------------
;p2 state
[Statedef 1350]
type    = S
physics = N
movetype = H
ctrl = 0
velset = 0,0


[State 0, NotHitBy]
type = NotHitBy
trigger1 =  1
value = SCA,NA,SA,HA,NP,SP,HP,NT,ST,HT
time = 1

[State 0, ChangeAnim2]
type = ChangeAnim2
trigger1 = time = 0
value = 1350

[State 52, 4]
type = changestate
trigger1 = AnimTime = 0
value = 1351
ctrl = 0
;---------------------------------------------------
;p2 state
[Statedef 1351]
type    = A
physics = N
movetype = H
ctrl = 0
velset = 0,-2.5

[State 0, NotHitBy]
type = NotHitBy
trigger1 =  1
value = SCA,NA,SA,HA,NP,SP,HP,NT,ST,HT
time = 1

[State 0, VelAdd]
type = VelAdd
trigger1 = time >1
y = .35

[State 0, anim]
type=changeanim2
trigger1 =time = 0
value=1351

[State 52, 4]
type = selfstate
trigger1 = Pos Y >= 0 && Vel Y > 0
value = 5100
ctrl = 0

;-------------------------------------------------------------------------------
;sword combo
[Statedef 1500]
type = A
movetype = A
physics = N
juggle  = 0
ctrl = 0
anim = 1500
poweradd= 60
velset = 10, 0
facep2=1

[State 1000, Strength]
type = Velset
trigger1 = !time && !AIlevel
X = ifelse(command = "c", 8, ifelse(command = "b", 6,4))
[State 1000, Strength AI]
type = Velset
trigger1 = !time && AIlevel
X= ifelse((p2movetype = H || random < 500), 8, ifelse(random < 500, 6, 4))

;[State xxx, Velocity]
;type = VelSet
;trigger1 = time=0
;X = 8;ifelse(!var(5), 2, ifelse(var(5) = 1, 8, 12))
[State xxx, Velocity]
type = VelSet
trigger1 = Movecontact
X = 0
ignorehitpause=1
[State 1300, 1]
type = VelAdd
trigger1 = animelemtime(1)=1
y = -4



[State 1500, 1]
type = PlaySnd
trigger1 = AnimElem = 4
value = 1100, 3
channel = 0
volume = 70

[State 1500, 2]
type = PlaySnd
trigger1 = AnimElem = 4 
value = 200, 3
volume = 20

[State 1500, 3]
type = Hitdef
trigger1 = AnimElem = 4 
attr = S, NA;ST
pausetime=8,8
damage    =20,10
priority = 3,hit
getpower = 80,80
givepower = 100,100
hitflag = MAF
guardflag = M
;numhits = 1
sparkno = -1
p1facing = 1
p2facing = 1
p2stateno = 1540
p2getp1state = 1
hitsound = S300, 5
sparkno = S7020
guard.sparkno = S7001
sparkxy = -27,-65
guardsound = S0, 0
guard.pausetime = 3,0
guard.slidetime = 10
guard.hittime  = 1
guard.velocity = -11.5
airguard.velocity = -4.2,-4.5
fall = 1
recover = 0
snap = 45,-10
yaccel = .54
envshake.time = 10
envshake.ampl = 5


[State 1100, Gravity]
type = Veladd
trigger1 = AnimElemTime(3) > 0
y = .6

[State 1100, Velocity]
type = VelMul
trigger1 = AnimElemTime(4) >= 0
x = .98
persistent = 1

[State 0, ChangeState]
type = ChangeState
trigger1 = pos y > 0 && vel y > 0
value = 1105
ctrl = 0

[State 0, ChangeState]
type = ChangeState
trigger1 = movehit
value = 1520
ctrl = 0


;--------------------------------------------------------------------------------
;Land
[Statedef 1105]
type=S
physics=S
movetype=A
anim=1105
ctrl=0
velset=0,0
sprpriority=2
facep2=1

[State 1105, Landing Sound]
type = PlaySnd
trigger1 = !Time
value = 52,0

[State 1105, Landing Dust Explod]
type = Explod
trigger1 = !Time
anim = 7106
sprPriority = -3
posType = P1
scale = 0.5,0.5
pauseMoveTime = -1
superMoveTime = -1
ownPal = 1

[State 1105, PosSet]
type = PosSet
trigger1 = 1
y = 0

[State 1105, ChangeState]
type = ChangeState
trigger1 = !animtime
value = 0
ctrl = 1

;P1 state
[Statedef 1520]
type = A
movetype = A
physics = S
anim = 1501
velset = 0, 0
poweradd = 0

[State 1520, 1]
type = NotHitBy
trigger1 = 1
value = SCA

[State 1520, 2]
type = PosFreeze
trigger1 = 1

[State 1520, 3]
type = PlaySnd
trigger1 = AnimElem = 3 || AnimElem = 4 || AnimElem = 5
trigger2 = AnimElem = 6 || AnimElem = 7; || AnimElem = 13
;trigger3 = AnimElem = 15 || AnimElem = 16 
value = 1100, 3
volume = 255
channel=1
[State 1520, 3]
type = PlaySnd
trigger1 = AnimElem = 3 || AnimElem = 4 || AnimElem = 5
trigger2 = AnimElem = 6 || AnimElem = 7; || AnimElem = 13
;trigger3 = AnimElem = 15 || AnimElem = 16 
value = 200, 3
volume = 255
channel=2



[State 1520, 5]
type = TargetLifeAdd
triggerall=Var(12)=0
trigger1 = AnimElem = 3 || AnimElem = 4 || AnimElem = 5
trigger2 = AnimElem = 6 || AnimElem = 7; || AnimElem = 13
;trigger3 = AnimElem = 15 || AnimElem = 16 
value = -15
kill = 0


[State 1520, 6]
type = EnvShake
trigger1 = AnimElem = 3 || AnimElem = 4 || AnimElem = 5
trigger2 = AnimElem = 6 || AnimElem = 7; || AnimElem = 13
;trigger3 = AnimElem = 15 || AnimElem = 16 
time = 10
ampl=8

[State 1520, 7]
type = HitAdd
trigger1 = AnimElem = 3 || AnimElem = 5
trigger2 = AnimElem = 6 || AnimElem = 7; || AnimElem = 13
;trigger3 = AnimElem = 15 || AnimElem = 16 
value = 1

[State 1520, 7]
type = HitAdd
trigger1 = AnimElem = 3 || AnimElem = 5
trigger2 = AnimElem = 6 || AnimElem = 7; || AnimElem = 13
;trigger3 = AnimElem = 15 || AnimElem = 16 
value = 1

[State 1520, 8]
type = Explod
trigger1 = AnimElem = 3 || AnimElem = 5
anim = (8800+random%64)
ID = 7010
pos = 57,-65
postype = P1
sprpriority = 3
supermove = 1
ownpal = 1
bindtime = -1

[State 1520, 9]
type = Explod
trigger1 = AnimElem = 3 ||  AnimElem = 6 || AnimElem = 7; || AnimElem = 13
;trigger3 = AnimElem = 15 || AnimElem = 16 
anim = (8800+random%64)
ID = 7010
pos = 47,-45
postype = P1
sprpriority = 3
supermove = 1
ownpal = 1
bindtime = -1

[State 1520,10]
type = Explod
trigger1 =  AnimElem = 5|| AnimElem = 6 || AnimElem = 7; || AnimElem = 13
anim =(8800+random%64)
ID = 7010
pos = 47,-95
postype = P1
sprpriority = 3
supermove = 1
ownpal = 1
bindtime = -1

[State 1520,11]
type = TargetState
trigger1 = AnimElem = 35
value = 1545

[State 1520,12]
type = ChangeState
trigger1 = AnimTime = 0
value = 1530

;combo finish
[Statedef 1530]
type = A
movetype = A
physics = S
anim = 1502
velset = 0, 0
ctrl = 0
poweradd = 0

[State 1200, spark1]
type = Explod
trigger1 = anim=1502&&animelem = 4
anim = 1503
ID = 1503
postype = p1
pos = 40,-77
removetime = -2
pausemovetime = 0
supermovetime = 0
scale = .5,.5
sprpriority = 5
ownpal = 1

[State 1520, 3]
type = PlaySnd
trigger1 = AnimElem = 4
value = s200,2

[State 1520, 3]
type = PlaySnd
trigger1 = AnimElem = 4
value = s2000,2

[State 1530, 1]
type = HitDef
trigger1 = time=0
attr = S, SA
animtype  = Hard
damage    = 20
getpower = 30,30
givepower = 20,20
hitflag = AFD
guardflag = -1
pausetime = 26,26
sparkno = S7020+(RANDOM%8)
guard.sparkno = S7105
sparkxy = -15,-87
p2stateno = 1111300
hitsound = S300, 5
guardsound = S0, 0
ground.type = High
ground.slidetime = 25
ground.hittime  = 11
ground.velocity = -6.5,-3.2
air.velocity = -6.2,-3.2
ground.cornerpush.veloff = -13.5
fall = 1
recover = 0
envshake.ampl = 14
envshake.time = 6
fall.envshake.ampl = 22
fall.envshake.time = 8

[State 1530, 2]
type = NotHitBy
trigger1 = 1
value = SCA


[State 1100, Gravity]
type = Veladd
trigger1 = AnimElemTime(7) > 0
y = .6

[State 1100, Velocity]
type = VelMul
trigger1 = AnimElem=6
x = 1
persistent = 1

[State 0, ChangeState]
type = ChangeState
trigger1 = pos y > 0 && vel y > 0
value = 1105
ctrl = 0

;P2 state
[Statedef 1540];èRÇÁÇÍè∏ÇË
type = A
movetype = H
physics = N
velset = 0,0
ctrl = 0

[State 1540, 1]
type = ChangeAnim2
trigger1 = Time = 0
value = 1540

[State 1540, 2]
type = velset
trigger1 = Time = 5
y = 0

[Statedef 1545];à íuå≈íË
type = A
movetype = H
physics = N
velset = 0,0
ctrl = 0

[State 1545, 1]
type = ChangeAnim2
trigger1 = Time = 0
value = 1545

[State 1545, 2]
type = PosFreeze
trigger1 = 1
