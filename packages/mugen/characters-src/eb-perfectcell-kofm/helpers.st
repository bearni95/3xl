
;==============================================================================================
;=======================================< HELPER STATES >========================================
;==============================================================================================
;========================<AI ACTIVATION>=============================
;==============================================================================================

;========================< JUMP DUST >=============================
[Statedef 7100]
physics = N
velset = 0, 0
anim = 9741
[State 7100, Bind]
type = bindtoroot
trigger1 = time
[State 7100, Dust]
type = explod
trigger1 = !time
anim = 7100
ID = 7100
sprpriority = 3
postype = p1
scale = 0.5, 0.5
pausemovetime = -1
supermovetime = -1
[State 7100, Dust]
type = explod
trigger1 = !time || time = 2 || time = 6
anim = 7101
ID = 7100
sprpriority = 3
postype = p1
scale = 0.5, 0.5
pausemovetime = -1
supermovetime = -1
[State 7100, Assert]
type = assertspecial
trigger1 = 1
flag = invisible
[State 7100, End]
type = destroyself
trigger1 = time >= 7



;---------------------------------------------------------------------------
; Ki Blast
[Statedef 1005]
type    = S
movetype= A
physics = N
ctrl = 0
anim = 1005
velset = 0,0
sprpriority = 5

[State 1005, HitOverride]
type = hitoverride
trigger1 = 1
time = -1
attr = SCA, AA, AP, AT
stateno = 1006
ignorehitpause = 1
[State 1005, HB]
type = hitby
trigger1 = 1
time = -1
value = SCA, NP, SP, HP
ignorehitpause = 1
[State 0, AssertSpecial]
type = AssertSpecial
trigger1 =1
flag = noshadow
ignorehitpause =1

[State 1005, Strength]
type = varset
trigger1 = !time
var(10) = root, var(10)

[State 1005, movehitvar]
type = varset
trigger1 = movecontact && numtarget
trigger1 = !(target, ishelper)
var(3) = 1
ignorehitpause = 1

[State 1005, Vel]
type = velset
trigger1 = 1
x = 3+1*var(10)
y = 0



[State 0, PlaySnd]
type = PlaySnd
trigger1 = !time
value = S400,1
volumescale = 100
channel = -1

;[State 0, AngleDraw]
;type = AngleDraw
;trigger1 = 1
;value = -(vel y)*5


[State 300, Hitdef]
type = HitDef
trigger1 = Time = 0
attr = A, SP
damage = 82, 5
animtype = Medium
guardflag = MA
hitflag = MAF
priority = 3, Hit
pausetime = 0, 4
guard.pausetime = 0,0
sparkno = s7030 + (random % 8)
guard.sparkno =  s7001
sparkxy = 0 + 0*(var(16):=50), var(17):=0
hitsound = s2, 4
guardsound = s2, 10
ground.type = Low
air.type = Low
ground.slidetime = 5
ground.velocity = -6
air.velocity = -1.4,-3
ground.hittime  = 11
air.hittime = 11
airguard.velocity = -1.9,-.8
ground.cornerpush.veloff = 0
air.cornerpush.veloff = 0
down.cornerpush.veloff = 0
guard.cornerpush.veloff = 0
airguard.cornerpush.veloff = 0
fall = 0
getpower = 0,0


[State 1005, end]
type=changestate
trigger1= movecontact
value=1006
ignorehitpause=1

[State 1006, end]
type=destroyself
trigger1=pos x!=[-240,240]
;---------------------------------------------------------------------------
; Ki Blast Hit
[Statedef 1006]
type    = A
movetype= A
physics = N
ctrl = 0
anim = 1006
velset = 0,0
sprpriority = 5

[State 0, Trans]
type = Trans
trigger1 = 1
trans = add
ignorehitpause = 1

[State 0, AfterImageTime]
type = AfterImageTime
trigger1 = !time
time = 0

[State 0, PlaySnd]
type = PlaySnd
trigger1 = !time
value = S400,0
volumescale = 100
channel = -1

[State 0, AngleDraw]
type = AngleDraw
trigger1 = 1
value = -(vel y)*5

[State 0, DestroySelf]
type = DestroySelf
trigger1 = !animtime
;======================================================================
;special beam
[Statedef 1011]
type   = S
movetype= A
physics = S
velset = 0,0
ctrl = 0
poweradd= 0
anim = 2901;1011
sprpriority = 3
juggle = 5


[State 0,HitDef]
type= HitDef
trigger1= !time
attr	= S, SP
hitflag= MAF
guardflag= MA
animtype= Hard
air.animtype= Back
priority= 5, Hit
damage	= 70*root,fvar(10),7
pausetime= 2,13
sparkno	= s7020
guard.sparkno = -1
sparkxy = -15,-70
hitsound= -1
guardsound= -1
ground.type= High
air.type= high
ground.velocity	= -0.4,-8.5
guard.velocity= -0.2
ground.slidetime= 5
ground.hittime	= 250
fall = 1
fall.recover = 0
air.hittime= 25
air.velocity= -0.5,-9
airguard.velocity= -0.5-7
ground.cornerpush.veloff =0
envshake.time  = 13
envshake.ampl  = -4
;envshake.freq  = 120
getpower = 0,0
givepower = 40,40




[State 0, AssertSpecial]
type = AssertSpecial
trigger1 = 1
flag = noshadow
ignorehitpause = 1

[State 0, DestroySelf]
type = DestroySelf
trigger1=animtime=0;	= movecontact = 1;(Parent, NumProjID(1002) = 0)
trigger2                = animtime = 0

;EX KI BLAST HELPER (G-PRESSURE)
[Statedef 1021]
type    = S
movetype= A
physics = N
anim = 1021
sprpriority = 5
hitcountpersist = 1
movehitpersist = 1
juggle = 1


[State 3005, HitOverride]
type = hitoverride
trigger1 = 1
time = -1
attr = SCA, AA, AP, AT
stateno =1021; ifelse(var(2) < 6, 3005, 3006)
ignorehitpause = 1
[State 3005, hitby]
type = hitby
trigger1 = 1
time = -1
value = SCA, NP, SP, HP
ignorehitpause = 1
[State 0, AssertSpecial]
type = AssertSpecial
trigger1 =1
flag = noshadow
ignorehitpause =1
[State 0, AttackMulSet]
type = AttackMulSet
trigger1 = 1
value = 1+root,fvar(2)+root,fvar(3)
[State 0, AssertSpecial]
type = AssertSpecial
trigger1 =1
flag = noshadow
ignorehitpause =1

[State 1061, NoShadow]
type = AssertSpecial
trigger1 = 1
flag = noshadow

[State 1061, NoShadow]
type = Trans
trigger1 = root,var(2)=0
trans = none
ignorehitpause = 1

[State 1061, NoJuggle]
type = parentvarset
trigger1 = time = 0
v = 18
value = 1

[State 1061, Velocity]
type = VelSet
trigger1 = Time = 0
x = 0

[State 1061, Velocity]
type = VelSet
trigger1 = Movehit
x = 0

[State 1061, NotHitBy]
type = NotHitBy
trigger1 = Time >= 0
time = 1
value = SCA, NA, SA, HA, NT, ST, HT
ignorehitpause = 1

[State 1061, HitBy]
type = HitBy
trigger1 = Time >= 0
value = SCA, NP, SP, HP
time = 1
ignorehitpause = 1

[State 1061, HitOverride]
type = HitOverride
trigger1 = Time >= 0
slot = 1
time = 1
stateno = 1022
attr = SCA, AA, AP, AT
ignorehitpause = 1

[State 1061, Hitdef];bounce juggles
type = HitDef
trigger1 = root,var(12)=0
attr = S, SP
animtype  = hard
damage    = 31*root,fvar(10),7
priority  = 4, Hit
animtype = Hard
guardflag = M
hitflag = MAF
priority = 4, Hit
pausetime = 12, 12
sparkno = -1;s7020 + (random % 8)
guard.sparkno = s7001
sparkxy = -1;-10, -78
hitsound = s5, 21
guardsound = s2, 0
ground.type = High
ground.slidetime = 16
ground.hittime = 16
ground.velocity = -12, -6
air.type = Low
air.velocity = -15, -6
air.cornerpush.veloff = 0
ground.cornerpush.veloff = 0
guard.velocity = -10.52
guard.cornerpush.veloff = 0;-12.74
getpower = 0
p2stateno = 1111300;5400
givepower = 36, 36
envshake.time = 16
envshake.freq = 120
envshake.ampl = 6
p2facing = 1
fall.recover = 1
fall.recovertime = 120
forcestand = 1
yaccel = 0.5
fall = 1     ;Force to face p1

[State 1061, Hitdef]
type = HitDef
trigger1 = root,var(12)>0
attr = S, SP
animtype  = hard
damage    = 31*root,fvar(10),7
priority  = 4, Hit
animtype = Hard
guardflag = M
hitflag = MAF
priority = 4, Hit
pausetime = 12, 12 
sparkno = -1;s7020 + (random % 8)
guard.sparkno = s7001
sparkxy = -1;-10, -78
hitsound = s2, 4
guardsound = s2, 10
ground.type = High
ground.slidetime = 16
ground.hittime = 16
ground.velocity = -12, -6
air.type = Low
air.velocity = -15, -6
air.cornerpush.veloff = 0
ground.cornerpush.veloff = 0
guard.velocity = -10.52
guard.cornerpush.veloff = 0;-12.74
getpower = 0
p2stateno = 1111300;5400
givepower = 36, 36
envshake.time = 16
envshake.freq = 120
envshake.ampl = 6
p2facing = 1
fall.recover = 1
fall.recovertime = 120
forcestand = 1
yaccel = 0.5
fall = 1

[State 1005, Sparks]
type = explod
trigger1 = movehit && numtarget
trigger1 = (target, movetype = H) && !(target, time)
anim = 7020 + (random % 8)
ID = 7000
sprpriority = 5
postype = left
pos = ceil((target, pos x) -((target, const(size.ground.front) -10) * facing) + 160), ceil(screenpos y)
removetime = -2
ownpal = 1
facing = -1
ignorehitpause = 1
persistent = 0
pausemovetime = 100
supermovetime = 100

[State 3001, Guardshake]
type = envshake
trigger1 = moveguarded
time = 4
ampl = 6
freq = 176
ignorehitpause = 1

[State 1061, No Multi-hit]
type = parentvarset
trigger1 = movehit
var(12) = 1

[State 1061, NoJuggle]
type = parentvarset
trigger1 = movecontact 
v = 18
value = 0

;[State 1061, End]
;type = destroyself
;trigger1 = (pos x!=[-240,240])
;trigger2 = time>180

[State 200, End]
type = Destroyself
trigger1 = movecontact
trigger2 = root,stateno != 1010

;ii[State 1061, Fade]
;type = changestate
;trigger1 = movecontact
;value = 1052
;ignorehitpause=1

;--------------------------------------------------------------
;Bakushin-explosion

;----------------------------------------------------
;Bakushin-explosion
[Statedef 1104]
type     = S
movetype = A
physics  = S
anim     = 8300;1105
juggle   = 8
ctrl     = 0
velset   = 0,0
sprpriority = 5

;[State 1105, Bind]
;type = BindToParent
;trigger1 = 1
;pos = 0,0
;ignorehitpause = 1

[State 0, HitOverride]
type=hitoverride
trigger1= 1
attr=SCA,AA,AP,AT
time=-1
stateno=1106
ignorehitpause=1
[State 0, HB]
type=hitby
trigger1= 1
value=SCA,NP,SP,HP
time=-1
ignorehitpause=1

[State 0, VarSet]
type = VarSet
trigger1 =!time
var(5)=root,var(5)
ignorehitpause =1
[State 0, VarSet]
type = VarSet
trigger1 =!time
var(2)=root,var(2)
ignorehitpause =1
[State 1105]
type = assertspecial
trigger1 = 1
flag = noshadow
ignorehitpause = 1
[State 1105,SND]
type = PlaySnd
trigger1 = !time
value = s12,10
channel = 1

[State 1105, Hit]
type = HitDef
trigger1 = !Numtarget(1105)&&time = 0
id=1105
attr = S, SP
damage =Ifelse(var(2),20,90)+5*var(5), 15
animtype = Diagup
hitflag = MAF
guardflag = M
priority = 4, Hit
pausetime = 6, 10
sparkno = s7020+random%8
guard.sparkno = s7105
sparkxy = -10,-80
hitsound = s1,6
guardsound = s2,1
ground.type = High
ground.slidetime = 20
ground.hittime  = 32
ground.velocity = -12,-8
air.type = High
air.velocity = -12,-6
air.hittime = 32
fall = 1
fall.recover = 0
yaccel=.5
envshake.time = 12
envshake.ampl = 4

[State 1105, End]
type = changestate
trigger1=movecontact
trigger2=animelem=6
value = 1106
[State 1105, End]
type = destroyself
trigger1=root,Movetype=H
trigger2=root,stateno!=1100
trigger3=!animtime

;---------------------------------------------------------------------------
;Bakushin-explosion
[Statedef 1105]
type     = S
movetype = A
physics  = S
anim     = 8304;1105
juggle   = 8
ctrl     = 0
velset   = 0,0
sprpriority = 5

;[State 1105, Bind]
;type = BindToParent
;trigger1 = 1
;pos = 0,0
;ignorehitpause = 1

[State 0, HitOverride]
type=hitoverride
trigger1= 1
attr=SCA,AA,AP,AT
time=-1
stateno=1106
ignorehitpause=1
[State 0, HB]
type=hitby
trigger1= 1
value=SCA,NP,SP,HP
time=-1
ignorehitpause=1

[State 0, VarSet]
type = VarSet
trigger1 =!time
var(5)=root,var(5)
ignorehitpause =1
[State 0, VarSet]
type = VarSet
trigger1 =!time
var(2)=root,var(2)
ignorehitpause =1
[State 1105]
type = assertspecial
trigger1 = 1
flag = noshadow
ignorehitpause = 1
[State 1105,SND]
type = PlaySnd
trigger1 = !time
value = s12,10
channel = 1

[State 1105, Hit]
type = HitDef
trigger1 = !Numtarget(1105)&&time = 0
id=1105
attr = S, SP
damage =Ifelse(var(2),20,90)+5*var(5), 15
animtype = Diagup
hitflag = MAF
guardflag = M
priority = 4, Hit
pausetime = 6, 10
sparkno = s7020+random%8
guard.sparkno = s7105
sparkxy = -10,-80
hitsound = s1,6
guardsound = s2,1
ground.type = High
ground.slidetime = 20
ground.hittime  = 32
ground.velocity = -12,-8
air.type = High
air.velocity = -12,-6
air.hittime = 32
fall = 1
fall.recover = 0
yaccel=.5
envshake.time = 12
envshake.ampl = 4

[State 1105, End]
type = changestate
trigger1=movecontact
trigger2=animelem=6
value = 1106
[State 1105, End]
type = destroyself
trigger1=root,Movetype=H
trigger2=root,stateno!=1100
trigger3=!animtime
;------------------------------------------------------------------------
[Statedef 1106]
type = A
physics = N
movetype = I
ctrl = 0
velset = 0,0
sprpriority = 5
anim = 8302

[State 1105, Bind]
type = BindToParent
trigger1 = 1
pos = 10,0
ignorehitpause = 1
[State 0, NotHitBy]
type = NotHitBy
trigger1 =1
value = SCA
ignorehitpause =1

[State 1500, assertspecial]
type = assertspecial
trigger1 = 1
flag = noshadow
ignorehitpause = 1

[State 1500, end]
type = destroyself
trigger1= !animtime
trigger2= root,Movetype=H

;---------------------------------------------------------------------------
;Kamehameha helper
[Statedef 3005]
type = S
physics = N
movetype = A
anim = 3005
ctrl = 0
velset = 0, 0
sprpriority = 4

[State 3005, HitOverride]
type = hitoverride
trigger1 = 1
time = -1
attr = SCA, AA, AP, AT
stateno =3005
ignorehitpause = 1
[State 3005, hitby]
type = hitby
trigger1 = 1
time = -1
value = SCA, NP, SP, HP
ignorehitpause = 1

[State 0, BindToParent]
type = BindToroot
trigger1 = 1
pos = 40,-72;353,-42

[State 0, VarSet]
type = VarSet
trigger1 = time = 0
fv = 12
value = 0

[State 0, VarSet]
type = Varadd
trigger1 = time > 110
fv = 12
value = .05


[State 3055, Strength]
type = varset
trigger1 = var(10) != 7
var(10) = 7
[State 3055, Anim]
type = changeanim
trigger1 = !time && !prevstateno
value = 3005

[State 3055, movehitvar]
type = varset
trigger1 = movecontact && numtarget
trigger1 = !(target, ishelper)
var(3) = 1
ignorehitpause = 1
[State 3055, movehitvar2]
type = varset
trigger1 = !time && prevstateno
var(4) = animelemno(0)
ignorehitpause = 1

[State 200, 1]
type = HitDef
trigger1=1
priority = 4,hit
attr=S,NA
animtype  = Hard
damage    = 10*root,fvar(10),3
Hitflag = MAF
guardflag = MA
pausetime = 0,0
sparkno = s7030+(random%8)
guard.sparkno = s7001
sparkxy = -15,0
hitsound   = S5,ifelse(time > 102,26,2666)
guardsound = s2,7
ground.type=Low
ground.slidetime=16
ground.hittime=16
ground.velocity=-20,-1
air.type=Low
air.hittime=12
air.velocity=-20,-.5
ground.cornerpush.veloff = 0
air.cornerpush.veloff = 0
down.cornerpush.veloff = 0
guard.cornerpush.veloff = 0
airguard.cornerpush.veloff = 0
yaccel=.5
persistent=1
envshake.time = 9
envshake.ampl = 3
fall=1
air.fall=1
fall.recover=0
air.juggle = 0
getpower=0


[State 0, EnvShake]
type = EnvShake
triggerall = time < 110
trigger1 = timemod = 5,0
time = 5
ampl = -8


[State 200, End]
type = Destroyself
trigger1 = time = 25
trigger2 = root,stateno != 3000


;---------------------------------------------------------------------------
[Statedef 3015, BIG BANG ATTACK]
type=S
physics=N
movetype=A
ctrl=0
velset=0,0
sprpriority=4
 
[State 3005, hitoverride]
type=hitoverride
trigger1= 1
time=-1
attr=SCA,AA,AP,AT
stateno=ifelse(var(2)<8,3015,3016)
ignorehitpause=1

[State 3005,hitby]
type=hitby
trigger1= 1
time=-1
value=SCA,NP,SP,HP
ignorehitpause=1

[State 3005,Unguardable var]
type = Varset
trigger1 = !time && !PrevStateNo
var(17) = Parent,var(17)

[State 3005, Assert: UnGuardable Ticks]
type = AssertSpecial
trigger1 = var(17) > 0
trigger1 = var(17) := (var(17) - 1)
flag = UnGuardable
ignoreHitPause = 1

[State 3005, strengthvar]
type=varset
trigger1= !time && !prevstateno
var(10)=5

[State 3005, anim]
type=changeanim
trigger1= !time && !prevstateno
value=3006

[State 3005, hitvar]
type=varadd
trigger1= !time
var(2)=1

[State 3005, movehitvar]
type=varset
trigger1= movecontact && numtarget
trigger1= !(target,ishelper)
var(3)=1
ignorehitpause=1

[State 3005, Add Combo Number to Parent]
type=parentvaradd
triggerall= var(2)=1
trigger1= movecontact && numtarget
trigger1= !(Target,Ishelper)
trigger1= target,time = 0
var(27)=1
ignorehitpause=1
presistent=0

[State 3005, vel]
type=velset
trigger1= 1
x=ifelse((time<2 && var(2)>1),1,9)
y=0

[State 3005, trans]
type=trans
trigger1= 1
trans=addalpha
alpha=256,256
ignorehitpause=1

[State 3005, hitsnd]
type=playsnd
trigger1= movehit && numtarget
trigger1= !(target,time) && target,movetype=H
value=2,7
channel=4
persistent=0
ignorehitpause=1

[State 3005, hit]
type=hitdef
trigger1= 1
priority=4,Hit
attr=S,HP
damage= Ceil(25*Parent,fvar(12)),5
animtype=Back
hitflag=MAF
guardflag=MA
pausetime=4*(var(2)<8),8
sparkno=-1
sparkxy=-10,0
guard.sparkno=s7001
guardsound=s2,0
ground.type=High
ground.slidetime=16
ground.hittime=16
ground.velocity= ifelse(var(2)<8, -10.52, -6), ifelse(var(2)<8, 0, -4)
ground.cornerpush.veloff=0
air.velocity=-6,-4
guard.velocity= -10.52
fall=(var(2)>=8)
air.fall=1
fall.recover=0
getpower=0
givepower=36,36
envshake.time=16
envshake.freq=100
envshake.ampl=6
palfx.sinadd=64,64,64,4
palfx.mul=128,128,128
palfx.time=32
sprpriority=4
airguard.ctrltime= 16
airguard.velocity= ifelse((root,var(20)),-4,-8), -1.5
forcestand=1
kill = 1

[State 3005, sparks]
type=explod
trigger1= movehit && numtarget
trigger1= !(target,time) && target,movetype=H
anim=7030+(random%8)
ID=7000
sprpriority=5
postype=left
pos=ceil((target,pos x)-((target,const(size.ground.front)-10)*facing)+160),ceil(screenpos y)
removetime=-2
ownpal=1
facing=-1
ignorehitpause=1
persistent=0
pausemovetime=100
supermovetime=100

[State 3005, flames]
type=helper
trigger1= movehit && numtarget && numhelper(7181)<1
trigger1= !(target,time) && (target,movetype=H) && !var(16)
helpertype=normal
stateno=7181
ID=7181
name="flames"
postype=p2
bindtime=1000
ownpal=1
facing=-1
size.ground.front=0
size.ground.back=0
ignorehitpause=1

[State 3005, end]
type=changestate
trigger1= movecontact
value=ifelse(var(2)<8,3015,3016)
[State 3005, end]
type=destroyself
trigger1=pos x!=[-280,280]
; big bang attack explosion
[Statedef 3016]
type=A
physics=N
movetype=I
anim=3007
ctrl=0
velset=0,0
sprpriority=4
[State 3006, trans]
type=trans
trigger1= 1
trans=addalpha
alpha=256,256
ignorehitpause=1
[State 3006, snd]
type=playsnd
trigger1= !time
value=5,1
channel=5
ignorehitpause=1
persistent=0
[State 3006, end]
type=destroyself
trigger1= !animtime

;---------------------------------------------------------------------------
[Statedef 2022]
type    = S
movetype= I
physics = S
juggle  = 0
velset = 0,0
ctrl = 0
anim = 9999
poweradd = 0
sprpriority = 2

[State 0, BindToRoot]
type = BindToRoot
trigger1 = IfElse(power >= 1500,(time%3),(time%6))
time = 1
pos = Ceil(-60+random%120),floor(-130+random%130)

[State 0, Explod]
type = Explod
trigger1 = IfElse(power >= 1500,(!(time%3)),(!(time%6)))
anim = Ifelse(root,var(1),7224,7223)
ID = 7223
pos = 0,0
postype = p1  ;p2,front,back,left,right
facing = 1
vfacing = 1
bindtime = 1
vel = (rootdist x -2)/15,(rootdist Y-60)/15;IfElse(rootdist Y <= 0 && vel y <= 0,0,(((rootdist Y)-60)/14))
removetime = 15
scale = 0.35,0.35
sprpriority = Ifelse(random < 800,2,-2);([-2,2])
ontop = 1
shadow = 0,0,0
ownpal = 1
removeongethit = 0

[State 0, DestroySelf]
type = DestroySelf
trigger1 = (root, stateno != 88887)
trigger2 = (root, movetype = H)
;---------------------------------------------------------------------------
[Statedef 2061]
physics=N
velset=0,0
anim=9999

[State 3000, Black BG]
type = Explod
trigger1 = Time = 0
removetime = 59
id = 6035
anim = 6035
pos = 0,0
postype = Left
scale = 1,1
sprpriority = -1000
facing = 1
vfacing = 1
ownpal = 1
bindtime = -1
ontop = 0
ownpal = 1
supermove = 1
pausemove = 1
removeongethit = 1
ignorehitpause = 1
persistent = 0
supermovetime = 60
pausemovetime =  60

[State 0, Helper]
type = Helper
trigger1 = !time&&Numhelper(2064)=0
helpertype = normal ;player
name = "charge"
ID = 2064
stateno = 2064
pos = 0,0
postype = p1    ;p2,front,back,left,right
facing = 1
keyctrl = 0
ownpal = 1
ontop=1
sprpriority=999
supermovetime=999999
pausemovetime=999999
ignorehitpause=1
size.xscale=1
size.yscale=1
[State 0, Helper]
type = Helper
trigger1 = !time&&Numhelper(2065)=0
helpertype = normal ;player
name = "charge2"
ID = 2065
stateno = 2065
pos = 0,0
postype = p1    ;p2,front,back,left,right
facing = 1
keyctrl = 0
ownpal = 1
ontop=1
sprpriority=999
supermovetime=999999
pausemovetime=999999
ignorehitpause=1
size.xscale=1
size.yscale=1
[State 0, Helper]
type = Helper
trigger1 = !time&&Numhelper(2066)=0
helpertype = normal ;player
name = "charge3"
ID = 2066
stateno = 2066
pos = 0,0
postype = p1    ;p2,front,back,left,right
facing = 1
keyctrl = 0
ownpal = 1
ontop=1
sprpriority=999
supermovetime=999999
pausemovetime=999999
ignorehitpause=1
size.xscale=.5
size.yscale=.5
[State 7260, main]
type=explod
trigger1= !time
anim=7631
ID=7260
sprpriority=5
postype=p1
removetime=20
pausemovetime=300

[State 7260, shrinkcircle]
type=modifyexplod
trigger1= 1
ID=7260
scale=2-(.05*time),2-(.05*time)

[State 7260, noshadow]
type=assertspecial
trigger1= 1
flag=noshadow
flag2=invisible
ignorehitpause=1

[State 7260, bound]
type=screenbound
trigger1= 1
value=0
[State 6110, end]
type=removeexplod
trigger1= time>=40
[State 6110, end]
type=destroyself
trigger1= time>=40
;---------------------------------------------------------------------------
[Statedef 2062]
physics=N
velset=0,0
anim=9999

[State 3000, Black BG]
type = Explod
trigger1 = Time = 0
removetime = 59
id = 6035
anim = 6035
pos = 0,0
postype = Left
scale = 1,1
sprpriority = -1000
facing = 1
vfacing = 1
ownpal = 1
bindtime = -1
ontop = 0
ownpal = 1
supermove = 1
pausemove = 1
removeongethit = 1
ignorehitpause = 1
persistent = 0
supermovetime = 60
pausemovetime =  60

[State 0, Helper]
type = Helper
trigger1 = !time&&Numhelper(2064)=0
helpertype = normal ;player
name = "charge"
ID = 2064
stateno = 2064
pos = 0,0
postype = p1    ;p2,front,back,left,right
facing = 1
keyctrl = 0
ownpal = 1
ontop=1
sprpriority=999
supermovetime=999999
pausemovetime=999999
ignorehitpause=1
size.xscale=1
size.yscale=1
[State 0, Helper]
type = Helper
trigger1 = !time&&Numhelper(2065)=0
helpertype = normal ;player
name = "charge2"
ID = 2065
stateno = 2065
pos = 0,0
postype = p1    ;p2,front,back,left,right
facing = 1
keyctrl = 0
ownpal = 1
ontop=1
sprpriority=999
supermovetime=999999
pausemovetime=999999
ignorehitpause=1
size.xscale=1
size.yscale=1
[State 0, Helper]
type = Helper
trigger1 = !time&&Numhelper(2066)=0
helpertype = normal ;player
name = "charge3"
ID = 2066
stateno = 2066
pos = 0,0
postype = p1    ;p2,front,back,left,right
facing = 1
keyctrl = 0
ownpal = 1
ontop=1
sprpriority=999
supermovetime=999999
pausemovetime=999999
ignorehitpause=1
size.xscale=.5
size.yscale=.5
[State 7260, main]
type=explod
trigger1= !time
anim=7641
ID=7260
sprpriority=5
postype=p1
removetime=20
pausemovetime=300

[State 7260, shrinkcircle]
type=modifyexplod
trigger1= 1
ID=7260
scale=1-(.025*time),1-(.025*time)

[State 7260, noshadow]
type=assertspecial
trigger1= 1
flag=noshadow
flag2=invisible
ignorehitpause=1

[State 7260, bound]
type=screenbound
trigger1= 1
value=0
[State 6110, end]
type=removeexplod
trigger1= time>=40
[State 6110, end]
type=destroyself
trigger1= time>=40
;---------------------------------------------------------------------------
[Statedef 2063]
physics=N
velset=0,0
anim=7652

[State 3000, Black BG]
type = Explod
trigger1 = Time = 0
removetime = 60
id = 6035
anim = 6035
pos = 0,0
postype = Left
scale = 1,1
sprpriority = -1000
facing = 1
vfacing = 1
ownpal = 1
bindtime = -1
ontop = 0
ownpal = 1
supermove = 1
pausemove = 1
removeongethit = 1
ignorehitpause = 1
persistent = 0
supermovetime = 60
pausemovetime =  60

[State 0, Helper]
type = Helper
trigger1 = !time&&Numhelper(2064)=0
helpertype = normal ;player
name = "charge"
ID = 2064
stateno = 2064
pos = 0,0
postype = p1    ;p2,front,back,left,right
facing = 1
keyctrl = 0
ownpal = 1
ontop=1
sprpriority=999
supermovetime=999999
pausemovetime=999999
ignorehitpause=1
size.xscale=1
size.yscale=1
[State 0, Helper]
type = Helper
trigger1 = !time&&Numhelper(2065)=0
helpertype = normal ;player
name = "charge2"
ID = 2065
stateno = 2065
pos = 0,0
postype = p1    ;p2,front,back,left,right
facing = 1
keyctrl = 0
ownpal = 1
ontop=1
sprpriority=999
supermovetime=999999
pausemovetime=999999
ignorehitpause=1
size.xscale=1
size.yscale=1
[State 0, Helper]
type = Helper
trigger1 = !time&&Numhelper(2066)=0
helpertype = normal ;player
name = "charge3"
ID = 2066
stateno = 2066
pos = 0,0
postype = p1    ;p2,front,back,left,right
facing = 1
keyctrl = 0
ownpal = 1
ontop=1
sprpriority=999
supermovetime=999999
pausemovetime=999999
ignorehitpause=1
size.xscale=.5
size.yscale=.5
[State 7260, main]
type=explod
trigger1= !time
anim=7651
ID=7260
sprpriority=5
postype=p1
removetime=20
pausemovetime=300

[State 7260, shrinkcircle]
type=modifyexplod
trigger1= 1
ID=7260
scale=2-(.05*time),2-(.05*time)

[State 2064, noshadow]
type=assertspecial
trigger1= 1
flag=noshadow
ignorehitpause=1

[State xxxx, Rotate]
type=angleset
trigger1= !time
value=6*(random%60)
[State xxxx, Rotate]
type=angleadd
trigger1= 1
value=-6

[State xxxx, Scale]
type=angledraw
trigger1= time<16
scale= (.075*time), (.075*time)
[State xxxx, Scale]
type=angledraw
trigger1= time>=16
scale=.0125*time,.0125*time
[State xxxx, Trans]
type=trans
trigger1= 1
trans=addalpha
alpha=256,256

[State 2064, bound]
type=screenbound
trigger1= 1
value=0
[State 6110, end]
type=removeexplod
trigger1= time>=40
[State 6110, end]
type=destroyself
trigger1= time>=40
;---------------------------------------------------------------------------
[Statedef 2064]
physics=N
velset=0,0
anim=ifelse(parent,stateno=2063,7650,ifelse(parent,stateno=2062,7640,7630))

[State 2065, noshadow]
type=assertspecial
trigger1= 1
flag=noshadow
ignorehitpause=1

[State xxxx, Rotate]
type=angleset
trigger1= !time
value=6*(random%60)
[State xxxx, Rotate]
type=angleadd
trigger1= 1
value=-6

[State xxxx, Scale]
type=angledraw
trigger1= time<16
scale= (.075*time), (.075*time)
[State 2065, shrinkcircle]
type=angledraw
trigger1= parent,stateno!=2063&&time>=20
scale=.25+(.075*(time-3)),.25+(.075*(time-3))
[State 2065, shrinkcircle]
type=angledraw
trigger1= parent,stateno=2063&&time>=20
scale=.025+(.05*(time-3)),.025+(.05*(time-3))
[State 2065, DestroySelf]
type = PalFx
trigger1=time>=20
add=-time*5,-time*5,-time*5
time=1

[State xxxx, Trans]
type=trans
trigger1= 1
trans=addalpha
alpha=256,256

[State 2065, bound]
type=screenbound
trigger1= 1
value=0

[State 2065, safety]
type=removeexplod
trigger1= time>=40

[State 2065, end]
type=destroyself
trigger1= time>=40
;---------------------------------------------------------------------------
[Statedef 2065]
physics=N
velset=0,0
anim=ifelse(parent,stateno=2063,7652,ifelse(parent,stateno=2062,7642,7632))

[State 2065, noshadow]
type=assertspecial
trigger1= 1
flag=noshadow
ignorehitpause=1

[State xxxx, Rotate]
type=angleset
trigger1= !time
value=6*(random%60)
[State xxxx, Rotate]
type=angleadd
trigger1= 1
value=-6

[State xxxx, Scale]
type=angledraw
trigger1=1
scale= 1-(.125*time), 1-(.125*time)

[State 2065, DestroySelf]
type = PalFx
trigger1=time=[20,42]
add=-time*20,-time*20,-time*20
time=1

[State xxxx, Trans]
type=trans
trigger1= 1
trans=addalpha
alpha=256,256

[State 2065, bound]
type=screenbound
trigger1= 1
value=0

[State 2065, safety]
type=removeexplod
trigger1= time>=40

[State 2065, end]
type=destroyself
trigger1= time>=40
;---------------------------------------------------------------------------
[Statedef 2066]
physics=N
velset=0,0
anim=ifelse(parent,stateno=2063,7653,ifelse(parent,stateno=2062,7643,7633))
sprpriority=99

[State 2064, noshadow]
type=assertspecial
trigger1= 1
flag=noshadow
ignorehitpause=1

[State xxxx, Rotate]
type=angleset
trigger1= !time
value=6*(random%60)
[State xxxx, Rotate]
type=angleadd
trigger1= 1
value=-6

[State xxxx, Scale]
type=angledraw
trigger1= time<16
scale= (.075*time), (.075*time)
[State xxxx, Scale]
type=angledraw
trigger1= time>=16
scale= 1, 1
[State xxxx, Trans]
type=trans
trigger1= 1
trans=addalpha
alpha=256,256
[State 3000, DestroySelf]
type = PalFx
trigger1=time>=35
add=-time*8,-time*8,-time*8
time=1

[State 2064, bound]
type=screenbound
trigger1= 1
value=0

[State 2064, safety]
type=removeexplod
trigger1= time>=40
[State 2064, end]
type=destroyself
trigger1= time>=45


;---------------------------------------------------------------------------------
[Statedef 3150, cho kamehameha]
type    = S
movetype= I
physics = N
juggle  = 2
velset = 0,0
ctrl = 0
anim = 3150
sprpriority = 5

[State 3005, HitOverride]
type = hitoverride
trigger1 = 1
time = -1
attr = SCA, AA, AP, AT
stateno =3150; ifelse(var(2) < 6, 3005, 3006)
ignorehitpause = 1
[State 3005, hitby]
type = hitby
trigger1 = 1
time = -1
value = SCA, NP, SP, HP
ignorehitpause = 1
[State 0, AssertSpecial]
type = AssertSpecial
trigger1 =1
flag = noshadow
ignorehitpause =1

[State 0, AngleDraw]
type = AngleDraw
trigger1 = time
value = 25
scale = 2,2
ignorehitpause = 1
;persistent = 



[State 0, AttackMulSet]
type = AttackMulSet
trigger1 = 1
value = 1;+root,fvar(2)+root,fvar(3)

[State 0, StateTypeSet]
type = StateTypeSet
trigger1 = time = 4
statetype = S
movetype = A
physics = N

[State 0, StateTypeSet]
type = StateTypeSet
trigger1 = time = 104
statetype = S
movetype = I
physics = N

[State 0, BindToParent]
type = BindToroot
trigger1 = 1
pos =60,-100; 20,-90;353,-42

[State 0, VarSet]
type = VarSet
trigger1 = time = 0
fv = 12
value = 0

[State 0, VarSet]
type = Varadd
trigger1 = time > 110
fv = 12
value = .05

;[State 0, AngleDraw]
;type = AngleDraw
;trigger1 = 1
;scale = .6,.6-fvar(12)

[State 0, Trans]
type = Trans
trigger1 = 1
trans = addalpha
alpha = 3000-time*25,256
ignorehitpause=1

[State 0, AssertSpecial]
type = AssertSpecial
trigger1 = 1
flag = Noshadow
ignorehitpause=1

[State 0, PlaySnd]
type = PlaySnd
trigger1 = time = 0
value = S5,18
volume = 50

[State 200, 1]
type = HitDef
trigger1 = time%6=0 && time < 70
attr = A, HA
animtype  = heavy
damage    = ceil(13*root,fvar(10)), 5;5,2
Hitflag = MAF;DE
guardflag = MA
pausetime =1,1; 0,0
sparkno = s7030+(random%8);-1
guard.sparkno = s7001
sparkxy =  -15,ceil (p2dist y) 
hitsound   = S2,2;,ifelse(time > 102,26,2666)
guardsound = s2,0;ifelse(time > 102,5,4),ifelse(time > 102,26,1)
ground.type = Low
air.type = Low
ground.slidetime = 5
ground.velocity = -5,-3
air.velocity = -1.4,-3
ground.hittime  = 30
air.hittime = 30
airguard.velocity = -1.9,-.8
ground.cornerpush.veloff = 0
air.cornerpush.veloff = 0
down.cornerpush.veloff = 0
guard.cornerpush.veloff = 0
airguard.cornerpush.veloff = 0
fall = 1
getpower = 0,0
envshake.time = 6
envshake.freq = 60
envshake.ampl = -6
envshake.phase = 90

[State 0, EnvShake]
type = EnvShake
triggerall = time < 110
trigger1 = timemod = 5,0
time = 5
ampl = -8


[State 3055, flames]
type=helper
trigger1= movehit && numtarget && numhelper(7181)<1
trigger1= !(target,time) && (target,movetype=H) && !var(16)
helpertype=normal
stateno=7181
ID=7181
name="flames"
postype=p2
bindtime=1000
ownpal=1
facing=-1
size.ground.front=0
size.ground.back=0
ignorehitpause=1

[State 0, Camara Lenta]
type = Helper
triggerall = time > 202
Triggerall = numhelper(7590) = 0
trigger1 = movehit = 1
helpertype = normal
name = "Camara Lenta"
ID = 7590
stateno = 7590
pos = 999,999
postype = p1
facing = 1
keyctrl = 0
ownpal = 0

[State 200, End]
type = Destroyself
trigger1 = time = 70
trigger2 = root,stateno != 3102
[Statedef 3250, final kamehameha]
type    = S
movetype= I
physics = N
juggle  = 2
velset = 0,0
ctrl = 0
anim = 3250
sprpriority = 5

[State 3005, HitOverride]
type = hitoverride
trigger1 = 1
time = -1
attr = SCA, AA, AP, AT
stateno =3250; ifelse(var(2) < 6, 3005, 3006)
ignorehitpause = 1
[State 3005, hitby]
type = hitby
trigger1 = 1
time = -1
value = SCA, NP, SP, HP
ignorehitpause = 1
[State 0, AssertSpecial]
type = AssertSpecial
trigger1 =1
flag = noshadow
ignorehitpause =1

[State 0, AngleDraw]
type = AngleDraw
trigger1 = time
value = -15
scale = 3,3
ignorehitpause = 1
;persistent = 



[State 0, AttackMulSet]
type = AttackMulSet
trigger1 = 1
value = 1;+root,fvar(2)+root,fvar(3)

[State 0, StateTypeSet]
type = StateTypeSet
trigger1 = time = 4
statetype = S
movetype = A
physics = N

[State 0, StateTypeSet]
type = StateTypeSet
trigger1 = time = 104
statetype = S
movetype = I
physics = N

[State 0, BindToParent]
type = BindToroot
trigger1 = 1
pos =100,-70; 20,-90;353,-42

[State 0, VarSet]
type = VarSet
trigger1 = time = 0
fv = 12
value = 0

[State 0, VarSet]
type = Varadd
trigger1 = time > 110
fv = 12
value = .05

;[State 0, AngleDraw]
;type = AngleDraw
;trigger1 = 1
;scale = .6,.6-fvar(12)

[State 0, Trans]
type = Trans
trigger1 = 1
trans = addalpha
alpha = 3000-time*25,256
ignorehitpause=1

[State 0, AssertSpecial]
type = AssertSpecial
trigger1 = 1
flag = Noshadow
ignorehitpause=1

[State 0, PlaySnd]
type = PlaySnd
trigger1 = time = 0
value = S5,18
volume = 50

[State 3705, Hit]
type=hitdef
trigger1= !var(7)
id=3705
priority=4,Hit
attr=S,HP
damage=Ifelse(root,var(9),25,25),5
animtype=Back
hitflag=MAF
guardflag=M
pausetime=4,4
sparkno=-1
guard.sparkno=-1
sparkxy=-10,0
hitsound=S5,Ifelse(root,var(1),20,1)
guardsound=s2,0
ground.type=Low
ground.slidetime=4
ground.hittime=12
ground.velocity= ifelse(var(2)<28, -12, -40), ifelse(var(2)<28, 0, -6)
ground.cornerpush.veloff=0
air.velocity=Ifelse(var(2)<28,-14,-40),Ifelse(var(2)<28,0,-5)
guard.velocity= -12.65
fall=1
recover=0
fall.recover=0
getpower=0
givepower=15,15
envshake.time=18
envshake.ampl=6
sprpriority=5
yaccel=Ifelse(var(2)<28,.5,.3)
forcestand=1

[State 3705, Hit]
type=hitdef
trigger1= var(7)
id=3705
priority=4,Hit
attr=A,HP
damage=Ifelse(root,var(9),25,25),5
animtype=Back
hitflag=MAFD
guardflag=M
pausetime=4,4
sparkno=-1
guard.sparkno=-1
sparkxy=-10,0
hitsound=S5,Ifelse(root,var(1),20,1)
guardsound=s2,0
ground.type=Low
ground.slidetime=4
ground.hittime=12
ground.velocity=Ifelse(var(2)<28,-8,-10),Ifelse(var(2)<28,0,-1)
ground.cornerpush.veloff=0
air.velocity=Ifelse(var(2)<28,-10,-410),Ifelse(var(2)<28,4,6)
guard.velocity= -12.65
airguard.velocity= -3,-6
fall=1
recover=0
getpower=0
down.velocity=0,0
givepower=15,15
envshake.time=18
envshake.ampl=6
sprpriority=4
yaccel=Ifelse(var(2)<28,.5,.3)
forcestand=1

[State 0, p2state]
type=targetstate
trigger1= var(2)=28&&movehit && numtarget(3705)
trigger1= target(3705),Movetype=H
ID=3705
value=Ifelse(var(7),4310,4060)
ignorehitpause=1

[State 3705, Sparks]
type = explod
trigger1 = movecontact = 1 && numtarget
trigger1 = (target, movetype = H) && !(target, time)
anim = ifelse(moveguarded, 7001, 7030+ (random % 8))
ID = 7030
sprpriority = 5
postype = p2
pos = (target, const(size.ground.front) -10), (target, const(size.mid.pos.y))
removetime = -2
ownpal = 0
facing = -1
ignorehitpause = 1
pausemovetime = 100
supermovetime = 100

[State 3055, flames]
type=helper
trigger1= movehit && numtarget && numhelper(7181)<1
trigger1= !(target,time) && (target,movetype=H) && !var(16)
helpertype=normal
stateno=7181
ID=7181
name="flames"
postype=p2
bindtime=1000
ownpal=1
facing=-1
size.ground.front=0
size.ground.back=0
ignorehitpause=1

[State 0, Camara Lenta]
type = Helper
triggerall = time > 202
Triggerall = numhelper(7590) = 0
trigger1 = movehit = 1
helpertype = normal
name = "Camara Lenta"
ID = 7590
stateno = 7590
pos = 999,999
postype = p1
facing = 1
keyctrl = 0
ownpal = 0

[State 200, End]
type = Destroyself
trigger1 = time = 100
trigger2 = root,stateno != 3202

;========================< B&W DUST >=============================
[Statedef 3125]
physics = N
anim = 9741
[State 3125, Assert]
type = assertspecial
trigger1 = 1
flag = noshadow
ignorehitpause = 1
[State 3125, Dust]
type = explod
trigger1 = !time
anim = 3125
ID = 3125
sprpriority = -2
postype = p1
removetime = 16
[State 3125, Fade]
type = palfx
trigger1 = !time
color = 0
mul = 384, 384, 384
sinadd = -255, -255, -255, 64
time = 16
[State 3125, Shrink]
type = modifyexplod
trigger1 = 1
ID = 3125
scale = 0.2 + (0.05 * time) * const(size.xscale), 0.05 + (0.0125 * time) * const(size.yscale)
[State 3125, End]
type = destroyself
trigger1 = time >= 17


;========================< METSU SHORYUU KEN >=============================
[Statedef 3165]
physics = N
velset = 0, 0
anim = 3165
sprpriority = 3
[State 3165, Assert]
type = trans
trigger1 = 1
trans = addalpha
alpha = 256, 256
ignorehitpause = 1
[State 3165, Bind]
type = bindtoroot
trigger1 = 1
[State 3165, Shadows]
type = afterimage
trigger1 = !time && !prevstateno
time = 999
timegap = 1
framegap = 1
length = 3
palcontrast = 120, 30, 30
trans = add
[State 3165, End]
type = destroyself
trigger1 = !animtime





;-------------------------------------------------------------------------------
;Hyper BG Diagonal
[Statedef 6029]
physics=N
anim=6034
Sprpriority=-99999

[State 0, AngleDraw]
type = AngleDraw
trigger1 =1
value = -25
ignorehitpause =1
[State 0, ScreenBound]
type = ScreenBound
trigger1 =1
value = 1
ignorehitpause =1
[State 0, PosSet]
type = PosSet
trigger1 =1
x =ceil(pos x-screenpos x+160)
y =ceil(pos y-screenpos y+120)
ignorehitpause=1

[State 6030, end]
type=destroyself
trigger1 = root,MoveType = H
trigger2 = Root,StateNo != [3000,4999]
trigger3 = winko
trigger4 = Numhelper(6032)
trigger5 = Enemy,Numhelper(6032)
trigger6 = Enemy,Numhelper(6034)
trigger7 = Enemy,Numhelper(7510)
trigger8 = Numhelper(6029)>=2
ignorehitpause=1
;-------------------------------------------------------------------------------
;Hyper BG Diagonal
[Statedef 6030]
physics=N
anim=6034
Sprpriority=-99999

[State 0, AngleDraw]
type = AngleDraw
trigger1 =1
value = -45
ignorehitpause =1
[State 0, ScreenBound]
type = ScreenBound
trigger1 =1
value = 1
ignorehitpause =1
[State 0, PosSet]
type = PosSet
trigger1 =1
x =ceil(pos x-screenpos x+160)
y =ceil(pos y-screenpos y+120)
ignorehitpause=1

[State 6030, end]
type=destroyself
trigger1 = root,MoveType = H
trigger2 = Root,StateNo != [3000,4999]
trigger3 = winko
trigger4 = Numhelper(6032)
trigger5 = Enemy,Numhelper(6032)
trigger6 = Enemy,Numhelper(6034)
trigger7 = Enemy,Numhelper(7510)
trigger8 = Numhelper(6030)>=2
ignorehitpause=1
;-------------------------------------------------------------------------------
;Hyper BG Horizontal
[Statedef 6031]
physics=N
anim=6034
Sprpriority=-99999

[State 0, ScreenBound]
type = ScreenBound
trigger1 =1
value = 1
[State 0, PosSet]
type = PosSet
trigger1 =1
x =ceil(pos x-screenpos x+160)
y =ceil(pos y-screenpos y+120)
ignorehitpause=1

[State 6031, end]
type=destroyself
trigger1 = root,MoveType = H
trigger2 = Root,StateNo != [3000,4999]
trigger3 = winko
trigger4 = Numhelper(6032)
trigger5 = Enemy,Numhelper(6032)
trigger6 = Enemy,Numhelper(6034)
trigger7 = Enemy,Numhelper(7510)
trigger8 = Numhelper(6034)>=2
ignorehitpause=1
;-------------------------------------------------------------------------------
;Hyper BG Vertical
[Statedef 6032]
physics=N
anim=6032
Sprpriority=-99998

[State 0, ScreenBound]
type = ScreenBound
trigger1 =1
value = 1
[State 0, PosSet]
type = PosSet
trigger1 =1
x = ceil(pos x-screenpos x+160)
y = ceil(pos y-screenpos y+120)
ignorehitpause=1

[State 6032, end]
type=destroyself
trigger1 = root,MoveType = H
trigger2 = Root,StateNo != [3000,4999]
trigger3 = winko
trigger4 = Enemy,Numhelper(6032)
trigger5 = Enemy,Numhelper(6034)
trigger6 = Enemy,Numhelper(7510)
trigger7 = Numhelper(6032)>=2
trigger8=root,stateno=3602
ignorehitpause=1
;---------------------------------------------------------------------------
;Lv1 Portrait
[Statedef 6033]
physics=N
velset=0,0
anim=6033;Ifelse(root,var(2),6037,6033)
sprpriority = -999
[State 6033, Black BG]
type = Explod
trigger1 = Time = 0
removetime = 59
id = 6035
anim = 6035
pos = 0,0
postype = Left
scale = 1,1
sprpriority = -1000
facing = 1
vfacing = 1
ownpal = 1
bindtime = -1
ontop = 0
ownpal = 1
supermove = 1
pausemove = 1
removeongethit = 1
ignorehitpause = 1
persistent = 0
supermovetime = 60
pausemovetime =  6
[State 6033, Bind]
type=posset
trigger1= 1
y=ceil(pos y-screenpos y)
[State 6033, noshadow]
type=assertspecial
trigger1= 1
flag=noshadow
ignorehitpause=1
[State 6033, Scale]
type=angledraw
trigger1= time>=22
scale= .75+.0125*time, .75+.0125*time
[State 6033, DestroySelf]
type = PalFx
trigger1=time>=41
add=-time*3,-time*3,-time*3
time=1
[State 6033, safe]
type=removeexplod
trigger1= time>=60
trigger2=root,movetype=H
[State 6033, Final]
type=destroyself
trigger1= time>=60
trigger2=root,movetype=H

;---------------------------------------------------------------------------
;Lv2 Portrait
[Statedef 6036]
physics=N
velset=0,0
anim=6036
sprpriority = -999
[State 6036, Black BG]
type = Explod
trigger1 = Time = 0
removetime = 59
id = 6035
anim = 6035
pos = 0,0
postype = Left
scale = 1,1
sprpriority = -1000
facing = 1
vfacing = 1
ownpal = 1
bindtime = -1
ontop = 0
ownpal = 1
supermove = 1
pausemove = 1
removeongethit = 1
ignorehitpause = 1
persistent = 0
supermovetime = 60
pausemovetime =  6
[State 6036, Bind]
type=posset
trigger1= 1
y=ceil(pos y-screenpos y)
[State 6036, noshadow]
type=assertspecial
trigger1= 1
flag=noshadow
ignorehitpause=1
[State 6036, Scale]
type=angledraw
trigger1= time>=22
scale= .75+.0125*time, .75+.0125*time
[State 6036, DestroySelf]
type = PalFx
trigger1=time>=41
add=-time*3,-time*3,-time*3
time=1
[State 6036, safe]
type=removeexplod
trigger1= time>=60
trigger2=root,movetype=H
[State 6036, Final]
type=destroyself
trigger1= time>=60
trigger2=root,movetype=H
;-----------------------------------------------------------------------------
;Hadou- Portrait
[Statedef 6037]
physics=N
velset=0,0
anim=Ifelse(root,var(1),6025,6024)
sprpriority = -999
[State 6033, Black BG]
type = Explod
trigger1 = Time = 0
removetime = 59
id = 6035
anim = 6035
pos = 0,0
postype = Left
scale = 1,1
sprpriority = -1000
facing = 1
vfacing = 1
ownpal = 1
bindtime = -1
ontop = 0
ownpal = 1
supermove = 1
pausemove = 1
removeongethit = 1
ignorehitpause = 1
persistent = 0
supermovetime = 60
pausemovetime =  6
[State 6033, Bind]
type=posset
trigger1= 1
y=ceil(pos y-screenpos y)
[State 6033, noshadow]
type=assertspecial
trigger1= 1
flag=noshadow
ignorehitpause=1
[State 6033, Scale]
type=angledraw
trigger1= time>=22
scale= .75+.0125*time, .75+.0125*time
[State 6033, DestroySelf]
type = PalFx
trigger1=time>=41
add=-time*3,-time*3,-time*3
time=1
[State 6033, safe]
type=removeexplod
trigger1= time>=60
trigger2=root,movetype=H
[State 6033, Final]
type=destroyself
trigger1= time>=60
trigger2=root,movetype=H
;========================< DIZZY FX >=============================
[Statedef 3033]
physics = N
velset = 0, 0
anim = 9741
sprpriority = 4
[State 3033, Assert]
type = assertspecial
trigger1 = 1
flag = invisible
ignorehitpause = 1
[State 3033, Pos]
type = posadd
trigger1 = 1
x = ceil(p2dist x)
y = ceil(p2dist y)
[State 3033, Snd]
type = playsnd
trigger1 = enemynear, stateno = 5300
value = 0, ifelse(random < 500, 5300, 5301)
persistent = 0
[State 3033, End]
type = destroyself
trigger1 = enemynear, ctrl
trigger1 = (enemynear, movetype != H) && (enemynear, stateno != 5300)

;========================< FIRE >=============================
;--- RED ---
[Statedef 7180]
physics = N
velset = 0, 0
anim = 9741
sprpriority = 4
[State 7180, Assert]
type = assertspecial
trigger1 = 1
flag = noshadow
ignorehitpause = 1
[State 7180, flames]
type = explod
trigger1 = 1
anim = 7180
ID = 7180
sprpriority = 3
postype = p2
vel = -.2, -.75
pos = (enemynear, const(size.mid.pos.x)), ifelse((enemynear, statetype = L), 0, (enemynear, const(size.mid.pos.y) + 10))
random = 40, 40
scale = 0.5, 0.5
ownpal = 1
[State 7180, Pos]
type = posadd
trigger1 = 1
x = ceil(p2dist x)
y = ceil(p2dist y)
[State End]
type = destroyself
triggerall = numenemy
trigger1 = enemynear, ctrl
trigger2 = enemynear, movetype != H || enemynear, stateno = 5300
trigger3 = enemynear, statetype = L && (enemynear, stateno != [5080, 5081])
[State End]
type = destroyself
trigger1 = !numenemy || time >= 120


;--- SHARED ---
[Statedef 7181]
physics = N
velset = 0, 0
anim = 9741
sprpriority = 4
[State 7181, Assert]
type = assertspecial
trigger1 = 1
flag = noshadow
ignorehitpause = 1
[State 7181, flames]
type = explod
trigger1 = 1
anim = 7181
ID = 7181
sprpriority = 3
postype = p2
vel = -.2, -.75
pos = (enemynear, const(size.mid.pos.x)), ifelse((enemynear, statetype = L), 0, (enemynear, const(size.mid.pos.y) + 10))
random = 40, 40
removetime = -2
scale = 0.5, 0.5
ownpal = 1
[State 7181, Pos]
type = posadd
trigger1 = 1
x = ceil(p2dist x)
y = ceil(p2dist y)
[State End]
type = destroyself
triggerall = numenemy
trigger1 = enemynear, ctrl
trigger2 = enemynear, movetype != H || enemynear, stateno = 5300
trigger3 = enemynear, statetype = L && (enemynear, stateno != [5080, 5081])
[State End]
type = destroyself
trigger1 = !numenemy || time >= 120


;========================< SHIN SHORYUUKEN SHOCKWAVE >=============================
[Statedef 7050]
physics = N
velset = 0, 0
anim = 9741
[State 7050, palfx]
type = palfx
trigger1 = time = 5
time = 10
add = 0, 0, 0
sinadd = -255, -255, -255, 40
[State 7050, Circle]
type = explod
trigger1 = !time
anim = 7051
ID = 7051
sprpriority = 5
postype = p1
removetime = 15
pausemovetime = -1
supermovetime = -1
[State 7050, Circle]
type = explod
trigger1 = !time
anim = 7050
ID = 7050
sprpriority = 5
postype = p1
removetime = 15
pausemovetime = -1
supermovetime = -1
[State 7050, Shrink]
type = modifyexplod
trigger1 = 1
ID = 7051
scale = 0.15 * time, 0.15 * time
[State 7050, Shrink]
type = modifyexplod
trigger1 = 1
ID = 7050
scale = 0.05 * time, 0.05 * time
[State 7050, No Shadow]
type = assertspecial
trigger1 = 1
flag = invisible
ignorehitpause = 1
[State 7050, Safety]
type = removeexplod
trigger1 = time >= 15
ID = 7050
[State 7050, End]
type = destroyself
trigger1 = time >= 15


;========================< POWER CHARGE >=============================
;--- MAIN FX ---
[Statedef 7240]
type = S
anim = 7240
velset = 0, 0
ctrl = 0

[State 7240, Bind]
type = bindtoroot
trigger1 = (root, stateno = 740) && (root, anim = 740)
pos = -10, 0
[State 7240, Snd]
type = playsnd
trigger1 = !time
value = 7, 4
channel = 0

[State 7240, Aura]
type = explod
trigger1 = !numexplod(7242)
ID = 7242
anim = 7242
sprpriority = 3
postype = p1
bindtime = -1
removetime = -1
pausemovetime = -1
supermovetime = -1
scale = 0.5, 0.5
ownpal = 1

[State 7240, FX]
type = modifyexplod
trigger1 = numexplod(7242) && (root, power < 3000)
ID = 7242
scale = 0.5, 0.1 + .4 * (root, power / 3000.0)
[State 7240, FX]
type = modifyexplod
trigger1 = numexplod(7242) && (root, power >= 3000)
ID = 7242
scale = 0.5, 0.5

[State 7240, No Shadow]
type = assertspecial
trigger1 = 1
flag = noshadow

[State 7240, End]
type = stopsnd
trigger1 = (root, stateno != 740) || (root, anim != 740) || (root, movetype = H)
channel = 0
[State 7240, End]
type = removeexplod
trigger1 = (root, stateno != 740) || (root, anim != 740) || (root, movetype = H)
[State 7240, End]
type = destroyself
trigger1 = (root, stateno != 740) || (root, anim != 740) || (root, movetype = H)


;--- PARTICLES ---
[Statedef 7243]
type = S
anim = 9741
velset = 0, 0
ctrl = 0

[State 7243, Bind]
type = bindtoroot
trigger1 = !(time % 4)
pos = ceil(-90 + (random / 6.25)), ceil(20 -(random / 6.25))

[State 7243, Particle]
type = explod
trigger1 = (time % 4) = 1
anim = 7243
sprpriority = ifelse(random < 750, 5, -1)
postype = p1
vel = ((rootdist x -10) / 16.0), ((rootdist y -60) / 16.0)
scale = ifelse(random < 500, 0.5, -.5), ifelse(random < 500, 0.5, -.5)
removetime = 16
pausemovetime = -1
supermovetime = -1
ownpal = 1

[State 7243, End]
type = removeexplod
trigger1 = (root, stateno != 740) || (root, anim != 740) || (root, movetype = H)
[State 7243, End]
type = destroyself
trigger1 = (root, stateno != 740) || (root, anim != 740) || (root, movetype = H)


;========================< ZERO COUNTER CHARGE >=============================
[Statedef 7250]
physics = N
velset = 0, 0
anim = 9741

[State 7250, BG PalFX]
type = bgpalfx
trigger1 = !time
time = 20
add = -255, -128, -64
sinadd = 255, 128, 64, 80
persistent = 0
[State 7250, palfx]
type = palfx
trigger1 = !time
time = 20
sinadd = -255, -255, -255, 80

[State 7250, Dust]
type = explod
trigger1 = !time
anim = 7104
ID = 7104
sprpriority = -2
postype = p1
pos = 0, -ceil(pos y)
supermovetime = 30
ownpal = 1
[State 7250, thunder]
type = explod
trigger1 = !time
anim = 7250
ID = 7250
sprpriority = -2
postype = p1
pos = 0, -ceil(pos y)
removetime = -2
supermovetime = 30
ownpal = 1
[State 7250, Circle]
type = explod
trigger1 = !time
anim = 7251
ID = 7251
sprpriority = 3
postype = p1
removetime = 20
supermovetime = 30

[State 7250, Shrink]
type = modifyexplod
trigger1 = numexplod(7251)
ID = 7251
scale = 0.2 + (0.09 * time), 0.2 + (0.09 * time)
[State 7250, No Shadow]
type = assertspecial
trigger1 = 1
flag = noshadow
flag2 = invisible
ignorehitpause = 1
[State 7250, End]
type = destroyself
trigger1 = time >= 20


;========================< ORIGINAL COMBO CHARGE >=============================
[Statedef 7260]
physics = N
velset = 0, 0
anim = 9741

[State 7260, BG PalFX]
type = bgpalfx
trigger1 = !time
time = 30
add = -255, -255, -128
sinadd = 255, 255, 128, 120
[State 7260, palfx]
type = palfx
trigger1 = time = 20
time = 11
sinadd = -255, -255, -255, 40
persistent = 0

[State 7260, main]
type = explod
trigger1 = !time
anim = 7260
ID = 7260
sprpriority = 5
postype = p1
removetime = 20
supermovetime = 300
[State 7260, sphere]
type = explod
trigger1 = !time
anim = 7500
ID = 7261
sprpriority = 5
postype = p1
removetime = -1
supermovetime = 300
[State 7260, Circle]
type = explod
trigger1 = time = 20
anim = 7501
ID = 7262
sprpriority = 5
postype = p1
removetime = -1
supermovetime = 300

[State 7260, shrinkcircle]
type = modifyexplod
trigger1 = 1
ID = 7260
scale = 2 -(0.1 * time), 2 -(0.1 * time)
[State 7260, shrinkcircle]
type = modifyexplod
trigger1 = 1
ID = 7261
scale = 0.017 * time, 0.017 * time
[State 7260, shrinkcircle]
type = modifyexplod
trigger1 = time >= 20
ID = 7262
scale = 0.1 + (0.1 * (time -20)), 0.1 + (0.1 * (time -20))

[State 7260, No Shadow]
type = assertspecial
trigger1 = 1
flag = noshadow
flag2 = invisible
ignorehitpause = 1
[State 7260, bound]
type = screenbound
trigger1 = 1
value = 0
[State 7260, Safety]
type = removeexplod
trigger1 = time >= 30
[State 6110, End]
type = destroyself
trigger1 = time >= 30


;========================< SUPER CHARGE >=============================
[Statedef 7500]
physics = N
velset = 0, 0
anim = 9741

[State 0, Explod]
type = Explod
triggerall= parent,stateno !=4000
triggerall= parent,stateno !=3040
trigger1 = time =0
anim = 7009
ID =  7009
pos = 73,133
postype = back ;p2,front,back,left,right
facing = 1
vfacing = 1
bindtime = 5
vel = 0,0
accel = 0,0
random = 0,0
removetime = 10
supermovetime=9999
pausemovetime=9999
supermove = 9999
pausemove = 9999
scale = .5,.5
;sprpriority = -4
;ontop = 0
shadow = 0,0,0
ownpal = 1
removeongethit = 1

[State 0, Explod]
type = Explod
triggerall= parent,stateno !=3040
triggerall= parent,stateno !=4000
trigger1 = time =10
anim = 7009
ID =  7010
pos = 73,133
postype = back ;p2,front,back,left,right
facing = 1
vfacing = 1
bindtime = 5
vel = -.15,0
accel = 0,0
random = 0,0
removetime = 50
supermovetime=9999
pausemovetime=9999
supermove = 9999
pausemove = 9999
scale = .5,.5
sprpriority = -4
ontop = 0
shadow = 0,0,0
ownpal = 1
removeongethit = 1

[State 10050, shrink]
type=modifyexplod
trigger1=numexplod(7009) && time <=10
ID=7009
scale = 2.5-(.21*(time)),2.5-(.21*(time))

[State 10050, shrink]
type=modifyexplod
trigger1=numexplod(7009) && time >10
ID=7010
scale = .5,.5

[State 7500, Lv1]
type = bgpalfx
trigger1 = time <= 10 && root, var(10) = 5
time = 1
add = 256 -ceil(25.6 * time), 256 -ceil(25.6 * time), 256 -ceil(25.6 * time)
mul = 256 -floor(25.6 * time), 256 -floor(25.6 * time), 256
color = 256 -floor(25.6 * time)
[State 7500, Lv1]
type = bgpalfx
trigger1 = (time = [11, 39]) && root, var(10) = 5
time = 1
mul = 0, 0, 256
color = 0
[State 7500, Lv1]
type = bgpalfx
trigger1 = time >= 40 && root, var(10) = 5
time = 1
mul = ceil(51.2 * (time -40)), ceil(51.2 * (time -40)), 256
color = floor(51.2 * (time -40))

[State 7500, Lv2]
type = bgpalfx
trigger1 = time <= 15 && root, var(10) = 6
time = 1
add = 256 -ceil(17.07 * time), 256 -ceil(17.07 * time), 256 -ceil(17.07 * time)
mul = 256 -floor(17.07 * time), 256 -floor(17.07 * time), 256
color = 256 -floor(17.07 * time)
[State 7500, Lv2]
type = bgpalfx
trigger1 = (time = [16, 47]) && root, var(10) = 6
time = 1
mul = 0, 0, 256
color = 0
[State 7500, Lv2]
type = bgpalfx
trigger1 = time >= 48 && root, var(10) = 6
time = 1
mul = ceil(51.2 * (time -48)), ceil(51.2 * (time -48)), 256
color = floor(51.2 * (time -48))

[State 7500, Lv3]
type = bgpalfx
trigger1 = time <= 20 && root, var(10) = 7
time = 1
add = 256 -ceil(12.8 * time), 256 -ceil(12.8 * time), 256 -ceil(12.8 * time)
mul = 256 -floor(12.8 * time), 256 -floor(12.8 * time), 256 -floor(12.8 * time)
color = 256 -floor(12.8 * time)
[State 7500, Lv3]
type = bgpalfx
trigger1 = (time = [21, 54]) && root, var(10) = 7
time = 1
mul = 0, 0, 0
color = 0
[State 7500, Lv3]
type = bgpalfx
trigger1 = time >= 55 && root, var(10) = 7
time = 1
mul = ceil(51.2 * (time -55)), ceil(51.2 * (time -55)), ceil(51.2 * (time -55))
color = floor(51.2 * (time -55))

[State 7500, Spiral]
type = helper
trigger1 = !time && root, var(10) >= 6
helpertype = normal
stateno = 7509
ID = 7509
name = "Super Charge Spiral"
postype = p1
pausemovetime = 255
supermovetime = 255
ownpal = 1

[State 7500, Main]
type = explod
trigger1 = !time
anim = 7500
ID = 7500
sprpriority = 5
postype = p1
removetime = -1
pausemovetime = -1
supermovetime = -1
[State 7500, Large Circle]
type = explod
trigger1 = !time
anim = 7501
ID = 7501
sprpriority = 5
postype = p1
pausemovetime = -1
supermovetime = -1

[State 7500, Portrait]
type = explod
trigger1 = time = 1 && root, var(10) = 7
anim = ifelse((root, var(1) = 2), 7511, 7510)
ID = 7510
postype = back
pos = 160, 120
sprpriority = -16
bindtime = -1
pausemovetime = -1
supermovetime = -1

[State 7500, Circle]
type = explod
trigger1 = !time
anim = 7502
ID = 75021
sprpriority = 5
postype = p1
pausemovetime = -1
supermovetime = -1
[State 7500, Circle]
type = explod
trigger1 = time = 7
anim = 7502
ID = 75022
sprpriority = 5
postype = p1
pausemovetime = -1
supermovetime = -1
[State 7500, Circle]
type = explod
trigger1 = time = 14
anim = 7502
ID = 75023
sprpriority = 5
postype = p1
pausemovetime = -1
supermovetime = -1
[State 7500, Circle]
type = explod
trigger1 = time = 21
anim = 7502
ID = 75024
sprpriority = 5
postype = p1
pausemovetime = -1
supermovetime = -1
[State 7500, Circle]
type = explod
trigger1 = time = 28
anim = 7502
ID = 75025
sprpriority = 5
postype = p1
pausemovetime = -1
supermovetime = -1

[State 7500, Scale]
type = modifyexplod
trigger1 = root, var(10) = 5
ID = 7500
scale = 1.5 -(0.0333 * time), 1.5 -(0.0333 * time)
[State 7500, Scale]
type = modifyexplod
trigger1 = root, var(10) = 6
ID = 7500
scale = 1.5 -(0.0283 * time), 1.5 -(0.0283 * time)
[State 7500, Scale]
type = modifyexplod
trigger1 = root, var(10) = 7
ID = 7500
scale = 1.5 -(0.025 * time), 1.5 -(0.025 * time)

[State 7500, Scale]
type = modifyexplod
trigger1 = numexplod(7501)
ID = 7501
scale = 0.25 + (0.075 * time), 0.25 + (0.075 * time)
trans = addalpha
alpha = ceil(256 -6.4 * time), 256

[State 7500, Scale]
type = modifyexplod
trigger1 = numexplod(7510) && time < 8
ID = 7510
postype = back
pos = -160 + (40 * time), 120
scale = 0.5, 0.5
trans = addalpha
alpha = (32 * time), 256
[State 7500, Scale]
type = modifyexplod
trigger1 = numexplod(7510) && (time = [8, 50])
ID = 7510
postype = back
pos = 160, 120
scale = 0.5, 0.5
trans = addalpha
alpha = 256, 256
[State 7500, Scale]
type = modifyexplod
trigger1 = numexplod(7510) && time >= 50 && root, var(1) != 2
ID = 7510
postype = back
pos = 160 -(20 * (time -50)), 120 + (40 * (time -50))
scale = 0.5 + (0.25 * (time -50)), 0.5 + (0.25 * (time -50))
trans = addalpha
alpha = 256 -ceil(25.6 * (time -50)), 256
[State 7500, Scale]
type = modifyexplod
trigger1 = numexplod(7510) && time >= 50 && root, var(1) = 2
ID = 7510
postype = back
pos = 160 -(18 * (time -50)), 120 + (32 * (time -50))
scale = 0.5 + (0.25 * (time -50)), 0.5 + (0.25 * (time -50))
trans = addalpha
alpha = 256 -ceil(25.6 * (time -50)), 256

[State 7500, Scale]
type = modifyexplod
trigger1 = numexplod(75021)
ID = 75021
scale = 0.25 + (0.0375 * time), 0.25 + (0.0375 * time)
[State 7500, Scale]
type = modifyexplod
trigger1 = numexplod(75022)
ID = 75022
scale = 0.25 + (0.0375 * (time -7)), 0.25 + (0.0375 * (time -7))
[State 7500, Scale]
type = modifyexplod
trigger1 = numexplod(75023)
ID = 75023
scale = 0.25 + (0.0375 * (time -14)), 0.25 + (0.0375 * (time -14))
[State 7500, Scale]
type = modifyexplod
trigger1 = numexplod(75024)
ID = 75024
scale = 0.25 + (0.0375 * (time -21)), 0.25 + (0.0375 * (time -21))
[State 7500, Scale]
type = modifyexplod
trigger1 = numexplod(75025)
ID = 75025
scale = 0.25 + (0.0375 * (time -28)), 0.25 + (0.0375 * (time -28))

[State 7500, Safety]
type = assertspecial
trigger1 = 1
flag = noshadow
flag2 = invisible
[State 7500, No bars]
type = assertspecial
trigger1 = root, var(10) = 7
flag = nobardisplay
flag2 = noFG

[State 7500, Safety]
type = removeexplod
trigger1 = root, var(10) = 5 && time >= 45
trigger2 = root, var(10) = 6 && time >= 53
trigger3 = time >= 60
[State 7500, End]
type = destroyself
trigger1 = root, var(10) = 5 && time >= 45
trigger2 = root, var(10) = 6 && time >= 53
trigger3 = time >= 60


;--- Spiral ---
[Statedef 7509]
physics = N
anim = 7509
sprpriority = 5
[State 7509, Assert]
type = assertspecial
trigger1 = 1
flag = noshadow

[State 7509, Spin]
type = angleset
trigger1 = !time
value = -15 * (random % 24)
[State 7509, Spin]
type = angleadd
trigger1 = 1
value = -15

[State 7509, Angle]
type = angledraw
trigger1 = root, var(10) = 6
scale = 1 -(time / 53.0), 1 -(time / 53.0)
[State 7509, Trans]
type = trans
trigger1 = root, var(10) = 6
trans = addalpha
alpha = floor(4.83 * time), 256

[State 7509, Angle]
type = angledraw
trigger1 = root, var(10) = 7
scale = 1 -(time / 60.0), 1 -(time / 60.0)
[State 7509, Trans]
type = trans
trigger1 = root, var(10) = 7
trans = addalpha
alpha = floor(4.267 * time), 256

[State 7509, End]
type = destroyself
trigger1 = root, var(10) = 6 && time >= 53
trigger2 = time >= 60


;========================< COUNTER F.X. >=============================
[Statedef 7400]
type = A
physics = N
anim = 9741

[State 7400, superchargebgpalfx]
type = allpalfx
trigger1 = !time
time = 8
add = 255, 255, 255
sinadd = -255, -255, -255, 32

[State 7400, slow]
type = pause
trigger1 = time < 8
time = 1

[State 7400, End]
type = destroyself
trigger1 = time >= 8


;========================< SUPER FINISH >=============================
[Statedef 7600]
type = A
velset = 0, 0
anim = 9741
[State 7600, Bind]
type = posset
trigger1 = 1
x = 0
y = ceil(pos y -screenpos y) + 120

[State 7600, Snd]
type = playsnd
trigger1 = !time
value = 7, 7
channel = 1

[State 7600, Snd]
type = sndpan
trigger1 = time <= 80
channel = 1
abspan = ceil(sin(gametime / 20.0 * pi) * 160)

[State 7600, Snd]
type = assertspecial
trigger1 = time <= 80
flag = nomusic

[State 7600, BG PalFX]
type = bgpalfx
trigger1 = time < 10
time = 1
mul = 0, 0, 0
[State 7600, BG PalFX]
type = bgpalfx
trigger1 = time = [10, 20]
time = 1
mul = (time -10) * 25, (time -10) * 25, (time -10) * 25

[State 7600, MvC]
type = explod
trigger1 = !time
anim = 7601
ID = 7601
ontop = 1
postype = left
pos = 0, 0
scale = 1, (1.3333333 * gameheight / gamewidth)
bindtime = -1
removetime = 20
pausemovetime = -1
supermovetime = -1

[State 7600, Fade]
type = modifyexplod
trigger1 = numexplod(7601)
ID = 7601
trans = addalpha
alpha = ifelse(time < 10, 256, ceil(256 -(time -10) * 25.6)), 256

[State 7600, Circle]
type = explod
trigger1 = !time
anim = 7600
ID = 7600
sprpriority = -255
postype = left
pos = 160, floor((1.3333333 * gameheight / gamewidth) * 120)
bindtime = -1
removetime = 20
pausemovetime = -1
supermovetime = -1

[State 7600, Scale]
type = modifyexplod
trigger1 = numexplod(7600)
ID = 7600
scale = (0.25 * time) * (1.3333333 * gameheight / gamewidth), (0.25 * time) * (1.3333333 * gameheight / gamewidth)
trans = addalpha
alpha = ceil(256 -12.8 * time), 256

[State 7600, Safety]
type = removeexplod
trigger1 = time > 20 && numexplod
trigger2 = roundstate < 3
[State 7600, nobars]
type = assertspecial
trigger1 = time <= 20
flag = nobardisplay
flag2 = noFG
flag3 = globalnoshadow

[State 7600, End]
type = destroyself
trigger1 = roundstate < 3


;========================< KANJI B.G. >=============================
[Statedef 7610]
physics = N
velset = 0, 0
anim = 9741

[State 7610, Assert]
type = assertspecial
trigger1 = time < 120
flag = nomusic

[State 7610, Snd]
type = playsnd
trigger1 = !time
value = 7, 8

[State 7610, black]
type = bgpalfx
trigger1 = time < 120
time = 2
add = -255, -255, -255

[State 7610, black]
type = bgpalfx
trigger1 = time = 120
time = 60
add = -255, -255, -255
sinadd = 255, 255, 255, 240

[State 7610, Fade]
type = palfx
trigger1 = time = 120
time = 60
sinadd = -255, -255, -255, 240

[State 7610, Kanji]
type = explod
trigger1 = !time
anim = 7610
ID = 7610
sprpriority = -5
postype = left
pos = 160, 94
scale = 0.5 * (1.3333333 * gameheight / gamewidth), 0.5 * (1.3333333 * gameheight / gamewidth)
bindtime = -1

[State 7610, Shrink]
type = modifyexplod
trigger1 = time < 6
ID = 7610
scale = (5.5 - time) * (1.3333333 * gameheight / gamewidth), (5.5 - time) * (1.3333333 * gameheight / gamewidth)

[State 7610, Shrink]
type = modifyexplod
trigger1 = time >= 6
ID = 7610
scale = 0.5 * (1.3333333 * gameheight / gamewidth), 0.5 * (1.3333333 * gameheight / gamewidth)

[State 7610, flamebg]
type = explod
trigger1 = !time
anim = 7611
ID = 7611
sprpriority = 5
postype = left
pos = 0, floor((gameheight / gamewidth) * 80) - 60
bindtime = -1
removetime = -1
pausemovetime = 300
supermovetime = 300

[State 7610, Assert]
type = assertspecial
trigger1 = 1
flag = invisible
flag2 = nobardisplay
ignorehitpause = 1

[State 7610, Assert]
type = assertspecial
trigger1 = time < 120
flag = noFG
ignorehitpause = 1

[State 7610, Safety]
type = removeexplod
trigger1 = time >= 180

[State 7610, End]
type = destroyself
trigger1 = time >= 180


;========================< CAMERA CONTROL >=============================
[Statedef 7650]
physics = N
velset = 0, 0
anim = 9741
[State 7650, bound]
type = screenbound
trigger1 = 1
value = 0
movecamera = 1, 1
[State 7650, End]
type = destroyself
trigger1 = roundstate = 2

;-------------------------------------------------------------------------------
; Camara Lenta
[Statedef 7590]
type    = S
movetype= I
physics = S
juggle  = 1
velset = 0,0
ctrl = 0
anim = 9741
sprpriority = 2

[State 0, Pause]
type = Pause
trigger1 = time = [0,10]
time = 1

[State 200, End]
type = Destroyself
trigger1 = time = 20
;========================<Lv3 SUPERCHARGE PORTRAIT>=============================
[Statedef 7510]
physics=N
anim=9999
[State 7510, assert]
type=assertspecial
trigger1=1
flag=invisible
flag2=nobardisplay
ignorehitpause=1
[State 6033, Black BG]
type = Explod
trigger1 = Time = 0
removetime = 59
id = 6035
anim = 6035
pos = 0,0
postype = Left
scale = 1,1
sprpriority = -1000
facing = 1
vfacing = 1
ownpal = 1
bindtime = -1
ontop = 0
ownpal = 1
supermove = 1
pausemove = 1
removeongethit = 1
ignorehitpause = 1
persistent = 0
supermovetime = 60
pausemovetime =  6
[State 7510, portrait]
type=explod
trigger1=!time
anim=Ifelse(root,var(2),7511,7510)
ID=7510
postype=back
pos=160,120
sprpriority = -990
bindtime=-1
removetime=60
pausemovetime=300
supermovetime=300
[State 7510, shrink]
type=modifyexplod
trigger1=time<45
ID=7510
scale=.5,.5
[State 7510, shrink]
type=modifyexplod
trigger1=time>=45
ID=7510
scale=.5225+(.13*(time-45)),.5225+(.13*(time-45))
[State 7510, fade]
type=palfx
trigger1=time=45
time=15
sinadd=-255,-255,-255,60
[State 7510, safety]
type=removeexplod
trigger1=time>=61
[State 7510, end]
type=destroyself
trigger1=time>=61
;========================<SDM SUPERCHARGE PORTRAIT>=============================
[Statedef 7511]
physics=N
anim=9741
[State 7510, assert]
type=assertspecial
trigger1=1
flag=invisible
flag2=nobardisplay
ignorehitpause=1
[State 6033, Black BG]
type = Explod
trigger1 = Time = 0
removetime = 59
id = 6035
anim = 6035
pos = 0,0
postype = Left
scale = 1,1
sprpriority = -1000
facing = 1
vfacing = 1
ownpal = 1
bindtime = -1
ontop = 0
ownpal = 1
supermove = 1
pausemove = 1
removeongethit = 1
ignorehitpause = 1
persistent = 0
supermovetime = 60
pausemovetime =  6
[State 7510, portrait]
type=explod
trigger1=!time
anim=7511;Ifelse(root,var(2),7513,7512)
ID=7510
postype=back
pos=160,120
sprpriority = -990
bindtime=-1
removetime=60
pausemovetime=300
supermovetime=300
[State 7510, shrink]
type=modifyexplod
trigger1=time<45
ID=7510
scale=.5,.5
[State 7510, shrink]
type=modifyexplod
trigger1=time>=45
ID=7510
scale=.5225+(.13*(time-45)),.5225+(.13*(time-45))
[State 7510, fade]
type=palfx
trigger1=time=45
time=15
sinadd=-255,-255,-255,60
[State 7510, safety]
type=removeexplod
trigger1=time>=61
[State 7510, end]
type=destroyself
trigger1=time>=61
;============================ JUMP DUST =================
[Statedef 8100]
type=S
anim=9741
velset=0,0

[State 8100, Bind]
type=bindtoroot
trigger1= time

[State 8100, Dust]
type=explod
trigger1= !time
anim=8100
sprpriority=3
postype=p1
pos=0,ceil(pos y)
scale=.5,.5
pausemovetime=-1
supermovetime=-1
ownpal=1

[State 8100, Dust]
type=explod
trigger1= !time || time=2 || time=6
anim=8101
sprpriority=3
postype=p1
scale=.5,.5
pausemovetime=-1
supermovetime=-1
ownpal=1

[State 8100, End]
type=destroyself
trigger1= time>=7
;---------------------------------------------------------------------------
[Statedef 8885]
type = A
movetype = I
physics = N
ctrl = 0
anim = 8885
velset = 0,0
sprpriority = 2

[State 0, EnvShake]
type = EnvShake
trigger1 =timemod=4,0
time = 3
ampl = 3
ignorehitpause =1

[State 6005, BindToParent]
type = BindToParent
trigger1 = 1
pos = 0,5

[State 6005,AssertSpecial]
type = AssertSpecial
trigger1 = 1
flag = NoShadow

[State 6005, 1]
type = Trans
trigger1 = 1
trans = add
ignorehitpause=1

[State 6005, Voice]
type = Playsnd
trigger1 = Timemod=50,0
value = 6000,0
channel = 13

[State 6005, Explod]
type = Explod
trigger1=Time=0&&!NumExplod(8884)
anim=8886
id=8884
pos=0,-5
scale=.45,.45
postype=P1
sprpriority=-1
bindtime=-1
ownpal=1
removetime=-1
facing=1
pausemovetime=-1
supermovetime=-1
persistent=0

[State 6005, scale]
type=AngleDraw
trigger1=1
scale=.4,.1+parent,power*.00015

[State 6005, Voice]
type = Stopsnd
trigger1=Root,StateNo!=88887
channel=13
[State -2, StopSnd]
type = StopSnd
trigger1=Root,StateNo!=88887
channel = 21
[State -2, StopSnd]
type = StopSnd
trigger1=Root,StateNo!=88887
channel = 20

[State 6005, RemoveExplod]
type=RemoveExplod
trigger1=Root,StateNo!=88887
id=8884
ignorehitpause=1

[State 6005, DestroySelf]
type=DestroySelf
trigger1=Root,StateNo!=88887
;---------------------------------------------------------------------------
;---------------------------------------------------------------------------
;Ki Shield Assault Barrier
[Statedef 9938]
type= A
movetype=I
physics=N
velset=0,0
ctrl=0
sprpriority=5

[State 0, HitOverride]
type=hitoverride
trigger1= 1
attr=SCA,AA,AP,AT
time=-1
stateno=Ifelse(var(4)<7,9938,9933)
ignorehitpause=1
[State 0, HB]
type=hitby
trigger1= 1
value=SCA,NP,SP,HP
time=-1
ignorehitpause=1

[State 0, VarAdd]
type = VarAdd
trigger1 =movecontact
var(4)=1
[State 0, ScreenBound]
type = ScreenBound
trigger1 =1
value = 0
ignorehitpause =1

[State 9932,ChangeAnim]
type=ChangeAnim
trigger1=(!Time) && !prevstateno
value=3155
[State 9932,AssertSpecial]
type= AssertSpecial
trigger1 =1
flag=NoShadow
[State 9932,BindToParent]
type=BindToParent
trigger1=1
pos=Ifelse(root,animelemtime(7)>=0,135,90),-65
[State 0, Trans]
type = Trans
trigger1 =root,animelemtime(7)>=6
trans = addalpha
alpha = 192-4*time,256
ignorehitpause =1
[State 0, AngleDraw]
type = AngleDraw
trigger1=root,animelemtime(7)>=6
scale = 1+.00125*time,1+.00125*time
ignorehitpause =1

[State 9932,PlaySnd]
type=PlaySnd
trigger1=timemod=40,0
value=S1,14
channel=16
[State 9932, End]
type = changestate
trigger1 = movecontact
value =Ifelse(var(4)<7,9938,9933)
[State 9932,DestroySelf]
type=DestroySelf
trigger1=(root, MoveType = H)
trigger2=root,stateno!=3150&&root,stateno!=3151
trigger3=(root,stateno=3150&&root,animelemtime(8)>=0)&&(root,stateno=3151&&root,animelemtime(8))

;========================= NORMAL FINISH =================
[Statedef 9994]
ctrl = 0
anim = 9999
sprpriority = -10



[State 0, Pause]
type = SuperPause
trigger1 = time=0
time = 10
movetime =10
anim=-1
darken=0

[State 4001, fadeout]
type=BGpalfx
trigger1= time=0
time=20
sinadd=-255,-255,-255,40
under=-9999

[State 8600, End]
type=destroyself
trigger1= roundstate!=3

;========================= SPECIAL COMBO FINISH =================
[Statedef 9995]
ctrl = 0
anim = 9999
sprpriority = -10



[State 0, PlaySnd]
type = PlaySnd
trigger1 = !time
value = S4000,0
volume = 255
channel = 8
persistent=0

[State 0, Explod]
type = Explod
trigger1 = time = 0
anim = 9996
ID = 9996
pos = 0,0
postype = back
facing = 1
vfacing = 1
bindtime = -1
vel = 0,0
accel = 0,0
random = 0,0
removetime =30
supermovetime = 9999
pausemovetime = 9999
scale = 1.2,1.2
sprpriority = -990
ontop = 0
shadow = 0,0,0
ownpal = 0
removeongethit = 1
ignorehitpause = 1
;persistent =

[State 0, ModifyExplod]
type = ModifyExplod
trigger1 = time>=1
ID = 9996
trans = addalpha
alpha=256-((time)*10),256

[State 8600, End]
type=removeexplod
trigger1= time>=120
trigger2= roundstate<3
[State 8600, End]
type=destroyself
trigger1= roundstate!=3
;==========================SUPER FINISH==================================
[Statedef 9996]
velset=0,0
anim=9999
sprpriority = -10

[State 0, PlaySnd]
type = PlaySnd
trigger1 = !time
value = S4000,1
volume = 255
channel = 8
persistent=0

[State 8600, BG PalFX]
type=bgpalfx
trigger1= time<16
time=1
mul= 0, 0, 0
[State 8600, BG PalFX]
type=bgpalfx
trigger1= time=[16,24)
time=1
mul= 32*(time-16), 32*(time-16), 32*(time-16)

[State 8600, MvC]
type=explod
trigger1= !time
anim=8600
ID=8600
ontop=1
postype=left
pos=160,120
scale=.5,.5
bindtime=-1
removetime=32
pausemovetime=-1
supermovetime=-1

[State 8600, Fade]
type=modifyexplod
trigger1= numexplod(8600)
ID=8600
trans= addalpha
alpha= ifelse(time<16, 256, 256-32*(time-16)), 256

[State 8600, Circle]
type=explod
trigger1= !time
anim=8601
ID=8601
under=1
postype=left
pos=160,120
bindtime=-1
removetime=16
pausemovetime=-1
supermovetime=-1

[State 8600, Fade]
type=modifyexplod
trigger1= numexplod(8601)
ID=8601
scale= (.25*time), (.25*time)
trans= addalpha
alpha= 256 - (16*time), 256

[State 9000, Assert]
type = AssertSpecial
trigger1 = 1
flag = NoMusic
flag2 = nobardisplay
flag3 = nofg
ignorehitpause=1

;[State 8600, End]
;type=removeexplod
;trigger1= time>=120
;trigger2= roundstate<3
;[State 8600, End]
;type=destroyself
;trigger1= roundstate!=3

[State 8600, RemoveExplod]
type = RemoveExplod
trigger1 = Time >= 24
trigger2 = RoundState < 3

[State 8600, End]
type = DestroySelf
trigger1 = RoundState < 3


;-------------------------------------------------------------------------------
; Aura Permanent FP
[Statedef 9560]
type    = S
movetype= I
physics = N
juggle  = 1
velset = 0,0
ctrl = 0
anim = 9741
sprpriority = -1

[State 0, Turn]
type = Turn
trigger1 = facing != root,facing

[State 0, BindToRoot]
type = BindToRoot
trigger1 = 1
pos = 0,0

[State 0, Aura Arriba]
type = Explod
triggerall = root,vel x = 0
trigger1 = timemod = 4,0
anim = 9560
ID = 9560
pos = -15+random%30,-20-random%50
postype = p1
facing = ifelse(random < 500,1,-1)
vfacing = 1
bindtime = 1
vel = 0,-2
accel = 0,0
random = 0,0
removetime = -2
scale = .3,.3
sprpriority = 3
ontop = 1
trans = addalpha
alpha = 150,256
supermove = 999
supermovetime = 999
pausemove = 999
pausemovetime = 999

[State 0, Aura Atras]
type = Explod
triggerall = root,vel x > 0
trigger1 = timemod = 4,0
anim = 9561
ID = 9561
pos = -10+random%30,-20-random%40
postype = p1
facing = -1
vfacing = 1
bindtime = 1
vel = -1,0
accel = 0,0
random = 0,0
removetime = -2
scale = .3,.3
sprpriority = 3
ontop = 1
trans = addalpha
alpha = 150,256
supermove = 999
supermovetime = 999
pausemove = 999
pausemovetime = 999

[State 0, Aura Alante]
type = Explod
triggerall = root,vel x < 0
trigger1 = timemod = 4,0
anim = 9561
ID = 9561
pos = -20+random%30,-30-random%40
postype = p1
facing = 1
vfacing = 1
bindtime = 1
vel = 1,0
accel = 0,0
random = 0,0
removetime = -2
scale = .3,.3
sprpriority = 3
ontop = 1
trans = addalpha
alpha = 150,256
supermove = 999
supermovetime = 999
pausemove = 999
pausemovetime = 999

[State 0, RemoveExplod]
type = RemoveExplod
trigger1 = root,stateno = 5110
id =9560
[State 200, End]
type = Destroyself
trigger1 = root,stateno=5110
;trigger2 = root,var(2) > 0


