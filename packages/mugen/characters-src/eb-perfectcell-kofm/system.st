
;===================< CUSTOM COMBO >===================
[statedef 990]
type = s
movetype = I
physics = s
velset = 0,0
anim = 990
ctrl = 0
sprpriority = 1

[State 990, PowerAdd]
type = PowerAdd
triggerall = anim = 990 && power<powermax
trigger1 = !AIlevel && command = "holdb" && command = "holdy"  ;!var(30)
trigger2= AIlevel;var(30)=1
value = 2 + ifelse(time < 60, 0, (time -60) / 10) ;ceil(0.13*Time)

[State 740, Snd]
type = playsnd
trigger1 = anim = 990 && time =2
value =1,13; 8,0; 
channel = 0
[State 740, Snd]
type = playsnd
trigger1 = anim = 990 && time = 10
value =8,0; 
channel = 1
[State 740, Snd]
type = playsnd
trigger1 = anim = 990 && time =2
value =2200,1; 8,0; 
channel = 2

[State 740, Shake]
type = envshake
trigger1 = anim = 990 && !(time % 4)
time = 4
freq = 120
ampl = 2

[State 0, EnvShake]
type = EnvShake
trigger1 =timemod=4,0
time = 3
ampl = Ifelse(var(1),5,3)
ignorehitpause =1

[State 990, flash]
type = palfx
trigger1 = 1
time = 1
add =70+ceil(sin(time/8.0*pi)*70),20+ceil(sin(time/8.0*pi)*20),0

[State 990]
type=helper
trigger1= !numhelper(500)
helpertype=normal
stateno=999
ID=500
name="Charging Scale"
postype=p1
pausemovetime=9000
supermovetime=9000
ownpal=1
persistent = 0
[State 740, FX]
type = helper
trigger1 = anim = 990 && animelemtime(2) >= 0
trigger1 = !numhelper(7243)
helpertype = normal
stateno = 7243
ID = 7243
name = "Particles"
postype = p1
pausemovetime = 65535
supermovetime = 65535
ownpal = 1

[State 740, Anim]
type = changeanim
triggerall = anim != 991
trigger1 = !AIlevel && (command != "holdb" || command != "holdy")
trigger2 = power >= const(data.power) || power >= powermax || roundstate != 2
trigger3 = AIlevel && (inguarddist || p2bodydist x < 160)
value = 991
[State 740, End]
type = changestate
trigger1 = anim = 991 && !animtime
value = 0
ctrl = 1

;-------------------------------------------------------------------------------------

[statedef 991]
type = s
movetype = I
physics = s
velset = 0,0
anim = 991
ctrl =0
sprpriority = 5

[State 991, StopSnd]
type = StopSnd
trigger1 = animelem = 1
channel = 2

[State 991, ChangeState]
type = ChangeState
trigger1 = !animtime
value =0
ctrl = 1

[statedef 999]
type = S
anim = 9741;10000
velset = 0,0
ctrl = 0

[State 999]
type = bindtoroot
trigger1 = (root,stateno=990)
pos = 0,5

[State 7240, snd]
type=playsnd
trigger1= !time
value=7,4
channel=1


[State 999, StopSnd]
type = StopSnd
trigger1 = root,stateno!=990
channel = 6

[State 999, StopSnd]
type = StopSnd
trigger1 = root,stateno!=990
channel = 7

[State 999]
type = explod
trigger1 = !numexplod(992)
ID = 992
anim = 992
sprpriority = 4
postype = p1
bindtime = -1
removetime = -1
pausemovetime = -1
supermovetime = -1
pos = 7,0
scale = .7,.8
ownpal = 1

[State 999, Dust]
type = explod
trigger1 = !(time%6)
anim = 993
sprpriority = -3
postype = p1
pos = 0,-floor(pos y)
scale =.7,.7
pos = 7,0
pausemovetime = -1
supermovetime = -1
ownpal = 1


[State 999]
type=modifyexplod
trigger1= numexplod(992) && (root,power<3000)
ID=992
scale=.6,.6*(root,power/3000.0)


[State 999, fx]
type=modifyexplod
trigger1= numexplod(992) && (root,power>=3000)
ID=992
scale=.5,.5

[State 999]
type = assertspecial
trigger1 = 1
flag = noshadow


[State 999, end]
type=removeexplod
trigger1 = (root,stateno!=990) || (root,movetype=H)


[State 999, end]
type=destroyself
trigger1 = (root,stateno!=990) || (root,movetype=H)



[Statedef 710]
type = S
physics = S
anim = 360
poweradd = 0
sprpriority = -1
velset = 0,0
ctrl = 0

[State 360, push]
type = PlayerPush
trigger1 = 1
value = 0

[State 360, hit]
type = HitBy
trigger1 = 1
value =  , AT

[State 360, hit]
type = NotHitBy
trigger1 = 1
value = , AA, AP

[State 360, snd]
type = PlaySnd
trigger1 = AnimElem = 2
value = 8,1

[State 360, snd]
type = Poweradd
trigger1 = prevstateno = 150 || prevstateno = 151
trigger1 = AnimElem = 1
value = -1000

[State 360, 51]
type = EnvColor
trigger1 = animelem = 1
trigger1 = prevstateno = 150 || prevstateno = 151
value = 200,200,200
time = 3

[State 360, 1]
type = velset
trigger1 = Time = [10,25]
x = -5

[state 360, 1]
type = explod
trigger1 = animelem = 1
postype = p1
bindtime = 1
removetime = 8
removeongethit = 1
pos = 0,0
anim = 362
sprpriority = 3

[state 360, 1]
type = explod
trigger1 = time = 20
postype = p1
bindtime = 1
removetime = 8
removeongethit = 1
pos = -40,0
anim = 362
sprpriority = 3

[State 360, 3]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

[Statedef 720]
type = S
physics = S
anim = 361
sprpriority = -1
poweradd = 0
velset = 0,0
ctrl = 0

[State 361, push]
type = PlayerPush
trigger1 = 1
value = 0

[State 361, snd]
type = PlaySnd
trigger1 = AnimElem = 2
value = 8,1

[State 361, hit]
type = HitBy
trigger1 = 1
value =  , AT

[State 361, hit]
type = NotHitBy
trigger1 = 1
value = , AA, AP

[State 361, snd]
type = Poweradd
trigger1 = prevstateno = 150 || prevstateno = 151
trigger1 = AnimElem = 1
value = -1000

[State 361, 51]
type = EnvColor
trigger1 = animelem = 1
trigger1 = prevstateno = 150 || prevstateno = 151
value = 200,200,200
time = 3

[State 361, 1]
type = velset
trigger1 = Time = [10,25]
x = 5

[state 361, 1]
type = explod
trigger1 = animelem = 1
postype = p1
bindtime = 1
removetime = 8
removeongethit = 1
pos = 0,0
anim = 362
sprpriority = 3

[state 361, 1]
type = explod
trigger1 = time = 20
postype = p1
bindtime = 1
removetime = 8
removeongethit = 1
pos = 30,0
anim = 362
sprpriority = 3

[State 361, dust]
type = Explod
trigger1 = AnimElem = 1
anim = 4010
ID = 100
postype = p1
pos = -10,0
bindtime = 1
sprpriority = 2
ownpal = 1
scale = .7, .7

[State 361, 3]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;====================< STANDING >====================
[Statedef 0]
type = S
physics = S
movetype = I
velset = 0, 0
sprpriority = 0

[State 0, Gone]
type = removeexplod
trigger1 = ishelper
[State 0, Gone]
type = destroyself
trigger1 = ishelper

[State 0, 1]
type = ChangeAnim
trigger1 = Anim != 0 && Anim != 6
trigger2 = Anim = 6 && AnimTime = 0
value =0


[State 0, Dead]
type = changestate
trigger1 = !alive
value = 5050

[State 0, Skywalker]
type = changestate
triggerall = pos y < 0
trigger1 = !numenemy
trigger2 = numenemy = 1
trigger2 = (enemy, name = "M -NES Game 1" + enemy, name = "M -NES Game 2" + enemy, name = "M -GB Game 1" + enemy, authorname = "Bane84") < 2
trigger3 = numenemy >= 2
trigger3 = (enemy(0), name = "M -NES Game 1" + enemy(0), name = "M -NES Game 2" + enemy(0), name = "M -GB Game 1" + enemy(0), authorname = "Bane84") < 2
trigger3 = (enemy(1), name = "M -NES Game 1" + enemy(1), name = "M -NES Game 2" + enemy(1), name = "M -GB Game 1" + enemy(1), authorname = "Bane84") < 2
value = 50


;====================< CROUCHING >====================
[Statedef 10]
type = C
physics = C
movetype = I
velset = 0, 0
sprpriority = 0

[State 10, Anim]
type = changeanim
trigger1 = !time && anim = 12
value = 10
elem = 3 -animelemno(0)
[State 10, Anim]
type = changeanim
trigger1 = anim != 10
value = 10

[State 10, End]
type = changestate
trigger1 = !animtime
value = 11


[Statedef 11]
type = C
physics = C
movetype = I
anim = 11
velset = 0, 0
sprpriority = 0

[State 11, Anim]
type = changeanim
trigger1 = anim = 6 && !animtime
value = 11

[Statedef 12]
type = S
physics = S
movetype = I
velset = 0, 0
sprpriority = 0

[State 12, Anim]
type = changeanim
trigger1 = !time && anim = 10
value = 12
elem = 3 -animelemno(0)
[State 12, Anim]
type = changeanim
trigger1 = anim != 12
value = 12

[State 12, End]
type = changestate
trigger1 = command = "holddown" && command != "holdup"
value = 10
[State 12, End]
type = changestate
trigger1 = !animtime
value = 0


;==========< WALKING >==========
[Statedef 20]
type = S
physics = S
sprpriority = 0

[State 20, Vel]
type = velset
trigger1 = command = "holdfwd"
x = const(velocity.walk.fwd.x)
[State 20, Vel]
type = velset
trigger1 = command = "holdback"
x = const(velocity.walk.back.x)

[State 20, Anim]
type = changeanim
triggerall = vel x > 0
trigger1 = anim != 20 && anim != 5
trigger2 = anim = 5 && animelemtime(1) >= 1
value = 20

[State 20, Anim]
type = changeanim
triggerall = vel x < 0
trigger1 = anim != 21 && anim != 5
trigger2 = anim = 5 && animelemtime(1) >= 1
value = 21

;<Walk AI>=============================
[Statedef 21]
type= S
physics=N
sprpriority= 0
ctrl= 0
facep2= 1

[State 21, Init Pos fix]
type= posset
trigger1= !time
pos y= 0
persistent= 0

[State 21, Var14Clear]
type= Varset
trigger1= !time
var(14)= -1
Persistent=0

[State 21, Init get random var less them 400]
type= Varset
trigger1= !time
trigger1= random<400
var(14)=1                 ;1=Random Move, 0=forced forward, -1=forced backward

[State 21, Conditions for force MoveForward at start]
type= Varset
triggerAll= !time
trigger1= BackEdgeBodyDist <= 20
trigger2= Enemynear,BackEdgeBodyDist <= 20 && !(Enemynear,Prevstateno=[5100,5120]) 
trigger3= ((Enemynear,Stateno=[5100,5120]) || P2Statetype=L || P2Movetype=H) && P2Bodydist x >70
trigger4= NumTarget
trigger5= Enemynear,P2dist x < -20
var(14)=0

[State 21, Conditions for force MoveBackward at start]
type= Varset
triggerAll= !time
trigger1= BackEdgeBodyDist > 20 && !NumTarget && random<320 + 600*((Enemynear,Prevstateno=[5100,5120]) || (Enemynear,Stateno=[5100,5120]) || P2Statetype=L)
trigger2= NumEnemy && Enemynear,vel x > 3 && random<320
trigger3= NumPartner
var(14)= -1

[State 21, INIT Move Var]
type= Varset
trigger1= !time && var(14)=1
var(13)= 0

[State 21, add random Move Var]
type= Varset
trigger1= var(14)=1 && var(13)<1
var(13)= 40+random%41

[State 21, consume Move var]
type= Varadd
trigger1= var(14)=1
trigger1= var(13)>0
var(13)= -1

[State 21, Force move back]
type= Varset
triggerall= var(14) != -1 && time
trigger1= P2Bodydist x<40 && P2Statetype=L
trigger1= P2Bodydist x<40 && (P2StateNo=[5100,5120])
trigger2= NumTarget(1310)
trigger2= P2Bodydist x < 10
var(14)= -1

[State 21, Force move forward]
type= Varset
triggerall= var(14) != 0 && time
trigger1= NumTarget(1310)
trigger1= P2Bodydist x > 25
var(14)= 0

[State 21, adjust Move var-]
type= Null
triggerall= var(14) && var(13) && !NumTarget
trigger1= P2Statetype=A && P2bodydist x <100 && Enemynear,vel x>=0 && Random<100
trigger2= P2Statetype=S && P2bodydist x <100 && Enemynear,vel x>=4 && Random<80
var(13)= 29

[State 21, Move Forward]
type = VelSet
trigger1= !time && var(14)= 0
trigger2= Var(14)=1 && Var(13)>=30
trigger3= time && NumTarget(1310) && var(14) = 0
x = const(velocity.walk.fwd.x) * const(size.xscale)

[State 21, Move Backward]
type = VelSet
trigger1= !time && var(14)= -1
trigger2= Var(14)=1 && Var(13)<30
trigger3= time && NumTarget(1310) && var(14) = -1
x = const(velocity.walk.back.x) * const(size.xscale)

[State 21, 3]
type = ChangeAnim
triggerall = vel x > 0
trigger1 = Anim != 20 && Anim != 5
trigger2 = Anim = 5 && AnimTime = 0
value = 20

[State 21, 4]
type = ChangeAnim
triggerall = vel x < 0
trigger1 = Anim != 21 && Anim != 5
trigger2 = Anim = 5 && AnimTime = 0
value = 21

[State 21, Exit to 0]
type = changestate
trigger1 = !NumTarget
trigger1 = p2bodydist x <= 70 && (random < ifelse((Enemynear,vel x<-1),20,200))
trigger1 = P2StateNo<5000 && P2Movetype!=H
trigger2 = p2dist x < 0
trigger3 = time && vel x>0 && FrontEdgeBodyDist <= 40
trigger4 = time && vel x<0 && BackEdgeBodyDist <= 20
trigger5 = enemy,numproj > 0
trigger6 = InGuardDist
trigger7 = roundstate != 2
trigger8 = (P2Stateno=[5100,5120]) && P2Bodydist x <30
trigger10 = p2bodydist x < 10 && !NumTarget
trigger11 = NumTarget(1310)
trigger11 = P2Bodydist x < 90
value = 0
ctrl = 1

[State 21, Exit to 102]
type = changestate
trigger1 = P2Bodydist x>80 && Enemynear,vel x<0
trigger1 = Var(14)=0 && time>80
trigger1 = random < time
trigger2 = P2Bodydist x>20 && Enemynear,Anim=5300
value = 102
ctrl = 0


;===================< AI JUMPING >================
[Statedef 39]
type = S
physics = S
anim = 40
ctrl = 0
velset = 0, 0
sprpriority = 1
facep2 = 1

[State 39, HuMan TO Jump]
type= ChangeState
trigger1= !time
trigger1= !AILevel
value=40

[State 39, Var]
type = varset
trigger1 = !time && AIlevel
var(9) = ifelse((p2dist x > 240 || p2dist y > 180 || random < 100), 3, 1)

[State 39, Var]
type = varset
trigger1 = AIlevel
sysvar(1) = ifelse((enemynear, movetype = A || backedgebodydist <= 20 || (Enemynear,backedgebodydist >0 && Enemynear,vel x <=0)), 1, ifelse((P2StateNo=[5000,5299]), -1, 0))

[State 39, Var]
type = varset
trigger1 = AIlevel && var(9) != 3 && random < 60
var(9) = 2

[State 39, Dust]
type = helper
trigger1 = !animtime
helpertype = normal
stateno = 7100
ID = 7100
name = "Dust"
postype = p1
ownpal = 1

[State 39, Vel]
type = velset
trigger1 = !animtime && var(9) != 3
x = ifelse(!sysvar(1), const(velocity.jump.neu.x), ifelse(sysvar(1) = 1, const(velocity.jump.fwd.x), const(velocity.jump.back.x)))
y = ifelse(var(9) = 2, 0.75, 1) * const(velocity.jump.y)

[State 39, Vel]
type = velset
trigger1 = !animtime && var(9) = 3
x = ifelse(!sysvar(1), const(velocity.jump.neu.x), ifelse(sysvar(1) = 1, 1.5 * const(velocity.jump.fwd.x), 1.5 * const(velocity.jump.back.x)))
y = ifelse(!sysvar(1), 1.15, 1) * const(velocity.jump.y)

[State 39, Vel]
type = velset
trigger1 = !animtime && var(9) = 3 && sysvar(1)
x = ifelse(!sysvar(1), const(velocity.jump.neu.x), ifelse(sysvar(1) = 1, 1.5 * const(velocity.jump.fwd.x), 1.5 * const(velocity.jump.back.x)))
y = const(velocity.jump.y)

[State 39, Vel]
type = velset
trigger1 = !animtime && prevstateno = 100 && sysvar(1) = 1
trigger1 = var(9) := 3
x = const(velocity.runjump.fwd.x)

[State 39, End]
type = changestate
trigger1 = !animtime
value = 50
ctrl = 1




;====================<JUMPING>====================
[Statedef 40]
type=S
physics=S
movetype=I
anim=40
ctrl=0
velset=0,0
sprpriority=1
facep2=1

[State 40, Direction]
type=varset
trigger1= !AILevel
sysvar(1)= ifelse(!time, 0, ifelse(command="holdfwd", 1, ifelse(command="holdback", -1, sysvar(1))))
[State 40, Direction]
type=varset
trigger1= AILevel
sysvar(1)= ifelse((enemynear,movetype!=A || backedgebodydist<=10), 1, ifelse((enemynear,movetype=A), -1, 0))

[State 40, High Jump]
type=varset
trigger1= !time && !AILevel
var(3)= ifelse(command="highjump", 3, 0)
[State 40, High Jump]
type=varset
trigger1= !time && AILevel
var(3)= ifelse((p2bodydist x>=160 || random<125), 3, 0)
[State 40, High Jump]
type=varset
trigger1= !time && prevstateno=100
var(3)=3

[State 40, Low Jump]
type=varset
trigger1= !AILevel && command!="holdup" && (var(3)!=[1,2])
var(3)= ifelse((var(3)=3 && sysvar(1)), 2, 1)
[State 40, Low Jump]
type=varset
trigger1= AILevel&& (var(3)!=[1,2])
trigger1= (enemynear,statetype=C) && random<500
var(3)= ifelse((var(3)=3 && sysvar(1)), 2, 1)

[State 40, Snd]
type=playsnd
trigger1= !animtime
value=0, ifelse((var(3)=[2,3]), 41, 40)
[State 40, Dust]
type=helper
trigger1= !animtime
helpertype=normal
stateno=8100
ID=8100
name="Jump Dust"
postype=p1
ownpal=1

[State 40, Vel Normal]
type=velset
trigger1= !animtime
x= ifelse(!sysvar(1), const(velocity.jump.neu.x), ifelse(sysvar(1)=1, const(velocity.jump.fwd.x), const(velocity.jump.back.x)))
y= const(velocity.jump.y)

[State 40, Vel Short]
type=velset
trigger1= !animtime && var(3)=1
x= ifelse(!sysvar(1), const(velocity.jump.neu.x), ifelse(sysvar(1)=1, const(velocity.jump.fwd.x), const(velocity.jump.back.x)))
y= .76 * const(velocity.jump.y)

[State 40, Vel Medium]
type=velset
trigger1= !animtime && var(3)=2
x= ifelse(!sysvar(1), const(velocity.jump.neu.x), ifelse(sysvar(1)=1, const(velocity.runjump.fwd.x), const(velocity.runjump.back.x)))
y= .76 * const(velocity.jump.y)

[State 40, Vel Long]
type=velset
trigger1= !animtime && var(3)=3
x= ifelse(!sysvar(1), const(velocity.jump.neu.x), ifelse(sysvar(1)=1, const(velocity.runjump.fwd.x), const(velocity.runjump.back.x)))
y= ifelse(!sysvar(1), const(velocity.runjump.y), const(velocity.jump.y))

[State 40, End]
type=changestate
trigger1= !animtime
value=50
ctrl=1


[Statedef 50]
type=A
physics=N
movetype=I
sprpriority=1

[State 50, Anim]
type=changeanim
trigger1= !time
value= ifelse(!vel x, 41, ifelse(vel x>0, 42, 43)) + 10*(var(3)=[1,2])
persistent=0

[State 50, Grounded Frame]
type=posfreeze
trigger1= time<1 && prevstateno=40
value=1
[State 50, Grav]
type=gravity
trigger1= time>=1 || prevstateno!=40

[State 50, No Guard]
type=assertspecial
trigger1= var(3)=[1,2]
flag=noairguard

[State 50, Land]
type=changestate
trigger1= pos y>-vel y
value=52


[Statedef 51]
type=A
physics=N
movetype=I
sprpriority=1
[State 51, Grav]
type=gravity
trigger1= 1
[State 51, Land]
type=changestate
trigger1= pos y>-vel y
value=52


[Statedef 52]
type=S
physics=S
movetype=I
anim=47
ctrl=0
velset=0,0
sprpriority=1

[State 52, anim 57]
type=changeanim
trigger1= !time && (var(3)=1 || var(3)=2)
trigger1= (prevstateno=[600,699])
value=57

[State 52, Pos]
type=posset
trigger1= 1
y=0

[State 52, Ctrl]
type=ctrlset
trigger1= !time && (prevstateno!=[600,699])
trigger2= time=1 && anim!=57
value=1
[State 52, Guard]
type=changestate
trigger1= ctrl && command="holdback"
trigger1= inguarddist && (prevstateno!=[600,699])
value=120

[State 52, No Walk]
type=assertspecial
trigger1= anim!=5
flag=nowalk

[State 52, Snd]
type=playsnd
trigger1= !time
value=0,52
[State 52, Dust]
type=explod
trigger1= !time
anim=8105
sprpriority=-3
postype=p1
scale=.5,.5
pausemovetime=-1
supermovetime=-1
ownpal=1

[State 52, Turn]
type=changeanim
trigger1= ctrl && p2dist x<0
trigger1= anim!=5
value=5
[State 52, Turn]
type=turn
trigger1= anim=5 && animelem=1

[State 52, End]
type=changestate
trigger1= !animtime
value=0
ctrl=1



;======================< RUN >===========================
;---------------------------------------------------------------------------
[Statedef 100]
type    = S
physics = S
anim = 100
sprpriority = 1
ctrl=0

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

[State 100, 5]
type = Explod
trigger1 = (time%4) = 1
ID = 2221
anim = 2221
postype = p1
facing = 1
vfacing = 1
pos = -16,-70
bindtime = 1
removetime = 6
ontop = 1
vel = 0,0
ownpal = 1
random = 12,90
sprpriority = 3
scale = .4,.14
removeongethit = 1
ignorehitpause = 1
persistent = 1

[State 100, 1]
type = VelSet
trigger1 =anim=100
x = const(velocity.run.fwd.x)
[State 100, 2]
type = AssertSpecial
trigger1 = 1
flag = NoWalk
[State 100, 3]
type = AssertSpecial
trigger1 = 1
flag = NoAutoTurn

[State 100, 4]
type = ChangeState
trigger1=!AILevel&&command = "holdup"
value=40
ctrl=0

[State 100, 4]
type = ChangeState
trigger1=!AILevel&&command != "holdfwd"
trigger2=AILevel&&p2bodydist x<=60
trigger3=frontedgedist<=0
value=101
ctrl=0
;--------------------------------------------------------------------
[StateDef 101]
type = S
physics = S
velset = 3,0
ctrl = 0
anim = 101
poweradd = 0
sprpriority = 2

[State 101, dust]
type= makedust
trigger1 =time%2
pos=30,0

[State 100, Effect]
type = PlaySnd
trigger1=!time
value=1,21
[State 0, VelMul]
type = VelMul
trigger1 = time = 5
x = .8
[State 0, PosSet]
type = PosSet
trigger1 = 1
y = 0

[State 101, end]
type = ChangeState
trigger1=!animtime
value = 0
ctrl = 1
;---------------------------------------------------------------------------
;Run_Back
[Statedef 105]
type= S
movetype = I
physics = S
velset = 0, 0
anim = 105
ctrl = 0
sprpriority = 1

[State 105,AssertSpecial]
type= AssertSpecial
trigger1 =1
flag= NoWalk
flag2 =NoAutoTurn

[State 105, dash dust]
type = Explod
trigger1 = !time
anim = 2217
ID = 2217
pos = 35,6
scale = 1,0.5
sprpriority = 8
ownpal = 1
ignorehitpause = 1

[State 105,VelSet]
type= VelSet
trigger1 =animelemtime(2)>=0
x=Const(Velocity.Run.Back.X)

[State 105, Flash]
type = Explod
trigger1 = (time%4) = 1
ID = 2223
anim = 2223
postype = P1
pos = 30,-80
bindtime = 1
vel = -2.2
ownpal = 1
random = 18,80
removetime = -2
sprpriority = 2
scale = .45,.16
removeongethit = 1
ignorehitpause = 1

[State 105,PlaySnd]
type=PlaySnd
trigger1=(AnimElem = 2)
value=S1,3

[State 105,ChangeState]
type=ChangeState
trigger1=!animtime
value=106
;---------------------------------------------------------------------------
;Run_Back - Stop
[Statedef 106]
type= S
movetype=I
physics=N
anim=106
velset =-2,0
ctrl=0

[State 0, VelMul]
type = VelMul
trigger1 = time = 5
x = .8

[State 106, dust]
type= makedust
trigger1 =time%2
pos=-20,0

[State 106, Effect]
type = PlaySnd
trigger1=!time
value=1,21
[State 0, PosSet]
type = PosSet
trigger1 = 1
y = 0


[State 106,ChangeState]
type= ChangeState
trigger1 =(!AnimTime)
value =0
ctrl= 1

;---------------------------------------------------------------------------
[Statedef 110]
type = A
physics = N
ctrl = 0
anim = 110

[State 500, 2]
type = varset
trigger1 = Time = 0
var(24) = 0

[State -3]
type = varset
trigger1 = Time = 0
fvar(23) = 16

[State 100, 5]
type = Explod
trigger1 = (time%4) = 1
ID = 2221
anim = 2221
postype = p1
facing = 1
vfacing = 1
pos = -16,-70
bindtime = 1
removetime = 6
ontop = 1
vel = 0,0
ownpal = 1
random = 12,90
sprpriority = 3
scale = .4,.14
removeongethit = 1
ignorehitpause = 1
persistent = 1

[State -3]
type = varadd
trigger1 = Time = 0
var(11) = 1

[State 100, 2]
type = PlaySnd
trigger1 =!time
value = 1,3

[State 100, 3]
type = velset
trigger1 = Time = 0
x = 8.75

[State 100, 3]
type = velset
trigger1 = Time = 0
trigger1 = vel y > 0 || sysvar(0)
y = 0

[State 100, 3]
type = velmul
trigger1 = Time < 4
trigger1 = vel y < 0
y = 0.8

[State 100, 3]
type = velset
trigger1 = Time = 4
trigger1 = vel y < 0
y = 0

;[State 100, 3]
;type = posadd
;trigger1 = Time = 0
;y = -10

[State 100, 3]
type = ChangeState
trigger1 = animtime = 0
value = 50
ctrl = 1

;---------------------------------------------------------------------------
[Statedef 115]
type = A
physics = N
ctrl = 0
anim = 115

[State 100, 2]
type = PlaySnd
trigger1 =!time
value = 1,3

[State 500, 2]
type = varset
trigger1 = Time = 0
var(24) = 0

[State 50, 2]
type = varset
trigger1 = Time = 0
var(15) = 0
[State 105, Flash]
type = Explod
trigger1 = (time%4) = 1
ID = 2223
anim = 2223
postype = P1
pos = 30,-80
bindtime = 1
vel = -2.2
ownpal = 1
random = 18,80
removetime = -2
sprpriority = 2
scale = .45,.16
removeongethit = 1
ignorehitpause = 1
;[State 100, 3]
;type = posadd
;trigger1 = Time = 0
;y = -10

[State 100, 3]
type = velset
trigger1 = Time = 0
x = -7


[State 100, 3]
type = velset
trigger1 = Time = 0
trigger1 = vel y > 0
y = 0

[State 100, 3]
type = velmul
trigger1 = Time < 5
trigger1 = vel y < 0
y = 0.8

[State 100, 3]
type = velset
trigger1 = Time = 5
trigger1 = vel y < 0
y = 0

[State -3]
type = varadd
trigger1 = Time = 0
var(11) = 1

[State -3]
type = varset
trigger1 = Time = 0
fvar(23) = 12

;[State 100, 3]
;type = velmul
;trigger1 = animtime = 0
;x = 0.6

[State 100, 3]
type = ChangeState
trigger1 = animtime = 0
value = 50
ctrl = 1

;----------------------------------------------------------------
;Super Jump
[Statedef 123]; change these for the number that you want
type = A
movetype = I
physics = N
anim = 40 ; these is the jump anim
velset = 0,0
ctrl = 0

[state 50, playsnd]
type = playsnd
trigger1=animtime = 0
value = s0,2
channel = 0
[State 123, Explod]
type = Explod
trigger1 = !animtime
anim = 2222
postype = p1
pos = 0,30
facing = 1
vfacing = 1
bindtime = 1
removetime = -2
ownpal = 1
sprpriority = 3
scale = .3,.4
ontop = 1
ownpal = 1
removeongethit = 1
ignorehitpause = 1
persistent = 1

[State 123,1 ]
type = VarSet
trigger1 = Time = 0
sysvar(1) = 0

[State 123,2 ]
type = VarSet
trigger1 = command = "holdfwd"
sysvar(1) = 1

[State 123,3 ]
type = VarSet
trigger1 = command = "holdback"
sysvar(1) = -1

[State 123,4 ]
type = VelSet
trigger1 = animtime = 0
x = ifelse(sysvar(1)=0, const(velocity.jump.neu.x), ifelse(sysvar(1)=1, const(velocity.jump.fwd.x), const(velocity.jump.back.x)))
y = const(velocity.jump.y)*1.4 ; you can change these value, to make it fit how you want the superjump


[State 123,5 ]
type = ChangeState
trigger1 = animtime = 0
value = 124;l50
ctrl = 1

[Statedef 124]
type    = A
physics = A
ctrl = 1

[State 0, ]
type = ChangeAnim
trigger1 = Time = 0
value = ifelse((vel x)=0, 41, ifelse((vel x)>0, 42, 43))

[State 0, ]
type = ChangeAnim
trigger1 = Vel y > -2
trigger1 = SelfAnimExist(anim + 3)
persistent = 0
value = Anim + 3

[State 0, ]
type = VelAdd
triggerall = Vel X >= -2
trigger1 = command = "holdback"
x = -0.1

[State 0, ]
type = VelAdd
triggerall = Vel X <= 2.5
trigger1 = command = "holdfwd"
x = 0.25

[State 0, ]
type = VelSet
trigger1 = Anim = 42
trigger1 = Time = [0,5]
x = 4

[State 0, ]
type = VelSet
trigger1 = Anim = 43
trigger1 = Time = [0,5]
x = -3.5

;==========< GUARD >==========
;--- START ---
[Statedef 120]
type = U
physics = U
[State 120, Vel]
type = velset
trigger1 = !time && statetype != A
x = 0
y = 0
[State 120, Anim]
type = changeanim
trigger1 = !time
value = 120 + (statetype = C) + (statetype = A) * 2
[State 120, Type]
type = statetypeset
trigger1 = !time && statetype = S
physics = S
[State 120, Type]
type = statetypeset
trigger1 = !time && statetype = C
physics = C
[State 120, Type]
type = statetypeset
trigger1 = !time && statetype = A
physics = A
[State 120, High to Low]
type = statetypeset
trigger1 = !AIlevel && statetype = S && command = "holddown"
trigger2 = AIlevel && statetype = S && (enemynear, movetype = A) && (enemynear, statetype = C)
statetype = C
physics = C
[State 120, Low to High]
type = statetypeset
trigger1 = !AIlevel && statetype = C && command != "holddown"
trigger2 = AIlevel && statetype = C && (enemynear, movetype = A) && (enemynear, statetype != C)
statetype = S
physics = S
[State AI fix]
type = ctrlset
trigger1 = AIlevel && numenemy
value = (enemynear, time >= 120 || time >= 180)
[State 120, End]
type = changestate
trigger1 = !animtime || AIlevel
value = 130 + (statetype = C) + (statetype = A) * 2
[State 120, Stop]
type = changestate
trigger1 = (!AIlevel && command != "holdback")
trigger2 = !inguarddist
trigger3 = AIlevel && numenemy
trigger3 = enemynear, hitdefattr = SCA, AT
value = 140


;--- STAND GUARD (guarding) ---
[Statedef 130]
type = S
physics = S

[State 130, Anim]
type = changeanim
trigger1 = anim != 130
value = 130

[State AI fix]
type = ctrlset
trigger1 = AIlevel && numenemy
value = (enemynear, time >= 120 || time >= 180)

[State 130, High to Low]
type = changestate
trigger1 = !AIlevel && command = "holddown"
trigger2 = AIlevel && random < (550 * (AIlevel ** 2 / 64.0))
trigger2 = (enemynear, movetype = A) && (enemynear, statetype = C)
value = 131

[State 130, Stop Guarding]
type = changestate
trigger1 = (!AIlevel && command != "holdback")
trigger2 = !inguarddist
trigger3 = AIlevel && numenemy
trigger3 = enemynear, hitdefattr = SCA, AT
trigger4 = AIlevel && NumEnemy
trigger4 = Enemynear,name = "Ryu" && Enemynear,authorname = "Phantom.of.the.Server" && (P2StateNo=3020 || Enemynear,NumHelper(3025))
trigger5 = AIlevel && NumEnemy
trigger5 = (Life < 100 && (Enemynear,hitdefattr = SCA, SP,HP,SA,HA || Enemynear,NumHelper || Enemynear,NumProj))
value = 140

[State 130, Snd]
type = playsnd
trigger1 = !time
trigger1 = prevstateno = 132 || (prevstateno = [154, 155])
value = 0, 52

[State 130, Dust]
type = explod
trigger1 = !time
trigger1 = prevstateno = 132 || (prevstateno = [154, 155])
anim = 7102
ID = 7102
sprpriority = -2
postype = p1
scale = 0.5, 0.5
ownpal = 1
pausemovetime = -1
supermovetime = -1

;--- CROUCH GUARD (guarding) ---
[Statedef 131]
type = C
physics = C
[State 131, Anim]
type = changeanim
trigger1 = anim != 131
value = 131
[State AI fix]
type = ctrlset
trigger1 = AIlevel && numenemy
value = (enemynear, time >= 120 || time >= 180)
[State 131, Low to High]
type = changestate
trigger1 = !AIlevel && command != "holddown"
trigger2 = AIlevel && random < (525 * (AIlevel ** 2 / 64.0))
trigger2 = (enemynear, movetype = A) && (enemynear, statetype != C)
value = 130

[State 131, Stop Guarding]
type = changestate
trigger1 = (!AIlevel && command != "holdback")
trigger2 = !inguarddist
trigger3 = AIlevel && numenemy
trigger3 = enemynear, hitdefattr = SCA, AT
trigger4 = AIlevel && NumEnemy
trigger4 = Enemynear,name = "Ryu" && Enemynear,authorname = "Phantom.of.the.Server" && (P2StateNo=3020 || Enemynear,NumHelper(3025))
trigger5 = AIlevel && NumEnemy
trigger5 = (Life < 100 && (Enemynear,hitdefattr = SCA, SP,HP,SA,HA || Enemynear,NumHelper || Enemynear,NumProj))
value = 140


;--- AIR GUARD (guarding) ---
[Statedef 132]
type = A
physics = N
[State 132, Anim]
type = changeanim
trigger1 = anim != 132
value = 132
[State 132, Accel]
type = veladd
trigger1 = 1
y = const(movement.yaccel)
[State 132, Var]
type = varset
trigger1 = 1
sysvar(0) = (pos y >= 0) && (vel y > 0)
[State 132, Vel]
type = velset
trigger1 = sysvar(0)
y = 0
[State 132, Pos]
type = posset
trigger1 = sysvar(0)
y = 0
[State AI fix]
type = ctrlset
trigger1 = AIlevel && numenemy
value = (enemynear, time >= 120 || time >= 180)
[State 132, End]
type = changestate
trigger1 = sysvar(0) && inguarddist
trigger1 = (!AIlevel && command = "holdback") || AIlevel
value = 130
[State 132, End]
type = changestate
trigger1 = sysvar(0)
value = 52

[State 132, stop guarding]
type = changestate
trigger1 = (!AIlevel && command != "holdback")
trigger2 = !inguarddist
trigger3 = AIlevel && numenemy
trigger3 = enemynear, hitdefattr = SCA, AT
trigger4 = AIlevel && NumEnemy
trigger4 = (Life < 100 && (Enemynear,hitdefattr = SCA, SP,HP,SA,HA || Enemynear,NumHelper || Enemynear,NumProj))
value = 140


;--- GUARD (end) ---
[Statedef 140]
type = U
physics = U
ctrl = 1
[State 140, Anim]
type = changeanim
trigger1 = !time
value = 140 + (statetype = C) + (statetype = A) * 2
[State 140, Type]
type = statetypeset
trigger1 = !time && statetype = S
physics = S
[State 140, Type]
type = statetypeset
trigger1 = !time && statetype = C
physics = C
[State 140, Type]
type = statetypeset
trigger1 = !time && statetype = A
physics = A
[State 140, High to Low]
type = statetypeset
trigger1 = !AIlevel && statetype = S && command = "holddown"
trigger2 = AIlevel && random < (250 * (AIlevel ** 2 / 64.0))
trigger2 = statetype = S && (enemynear, movetype = A) && (enemynear, statetype = C)
statetype = C
physics = C
[State 140, Low to High]
type = statetypeset
trigger1 = !AIlevel && statetype = C && command != "holddown"
trigger2 = AIlevel && random < (125 * (AIlevel ** 2 / 64.0))
trigger2 = statetype = C && (enemynear, movetype = A) && (enemynear, statetype != C)
statetype = S
physics = S
[State 140, 5]
type = changestate
trigger1 = !animtime
value = (statetype = C) * 11 + (statetype = A) * 51

;--- SGUARDHIT (shaking) ---
[Statedef 150]
type = S
movetype = H
physics = N
velset = 0, 0
[State 150, Anim]
type = changeanim
trigger1 = 1
value = 150
[State 150, End]
type = changestate
trigger1 = hitshakeover
value = 151 + 2 * ((!AIlevel && command = "holddown") || (AIlevel && (enemynear, movetype = A) && (enemynear, statetype = C)))
[State 150, High to Low]
type = statetypeset
trigger1 = !AIlevel && statetype = S && command = "holddown"
trigger2 = AIlevel && random < (250 * (AIlevel ** 2 / 64.0))
trigger2 = statetype = S && (enemynear, movetype = A) && (enemynear, statetype = C)
statetype = C
physics = C
[State 150, Low to High]
type = statetypeset
trigger1 = !AIlevel && statetype = C && command != "holddown"
trigger2 = AIlevel && random < (125 * (AIlevel ** 2 / 64.0))
trigger2 = statetype = C && (enemynear, movetype = A) && (enemynear, statetype != C)
statetype = S
physics = S

;--- SGUARDHIT2 (knocked back) ---
[Statedef 151]
type = S
movetype = H
physics = S
anim = 150
[State 151, Vel]
type = hitvelset
trigger1 = !time
x = 1
[State 151, Vel]
type = velset
trigger1 = time = gethitvar(slidetime)
trigger2 = hitover
x = 0
[State 151, Ctrl]
type = ctrlset
trigger1 = time = gethitvar(ctrltime)
value = 1
[State 151, High to Low]
type = statetypeset
trigger1 = !AIlevel && statetype = S && command = "holddown"
trigger2 = AIlevel && random < (550 * (AIlevel ** 2 / 64.0))
trigger2 = statetype = S && (enemynear, movetype = A) && (enemynear, statetype = C)
statetype = C
physics = C
[State 151, Low to High]
type = statetypeset
trigger1 = !AIlevel && statetype = C && command != "holddown"
trigger2 = AIlevel && random < (525 * (AIlevel ** 2 / 64.0))
trigger2 = statetype = C && (enemynear, movetype = A) && (enemynear, statetype != C)
statetype = S
physics = S
[State 151, End]
type = changestate
trigger1 = hitover
value = 130
ctrl = 1

;--- CGUARDHIT (shaking) ---
[Statedef 152]
type = C
movetype = H
physics = N
velset = 0, 0
[State 152, Anim]
type = changeanim
trigger1 = 1
value = 151
[State 152, End]
type = changestate
trigger1 = hitshakeover
value = 151 + 2 * ((!AIlevel && command = "holddown") || (AIlevel && (enemynear, movetype = A) && (enemynear, statetype = C)))
[State 152, High to Low]
type = statetypeset
trigger1 = !AIlevel && statetype = S && command = "holddown"
trigger2 = AIlevel && random < (550 * (AIlevel ** 2 / 64.0))
trigger2 = statetype = S && (enemynear, movetype = A) && (enemynear, statetype = C)
statetype = C
physics = C
[State 152, Low to High]
type = statetypeset
trigger1 = !AIlevel && statetype = C && command != "holddown"
trigger2 = AIlevel && random < (525 * (AIlevel ** 2 / 64.0))
trigger2 = statetype = C && (enemynear, movetype = A) && (enemynear, statetype != C)
statetype = S
physics = S

;--- CGUARDHIT2 (knocked back) ---
[Statedef 153]
type = C
movetype = H
physics = C
anim = 151
[State 153, Vel]
type = hitvelset
trigger1 = !time
x = 1
[State 153, Vel]
type = velset
trigger1 = time = gethitvar(slidetime)
trigger2 = hitover
x = 0
[State 153, Ctrl]
type = ctrlset
trigger1 = time = gethitvar(ctrltime)
value = 1
[State 153, High to Low]
type = statetypeset
trigger1 = !AIlevel && statetype = S && command = "holddown"
trigger2 = AIlevel && random < (250 * (AIlevel ** 2 / 64.0))
trigger2 = statetype = S && (enemynear, movetype = A) && (enemynear, statetype = C)
statetype = C
physics = C
[State 153, Low to High]
type = statetypeset
trigger1 = !AIlevel && statetype = C && command != "holddown"
trigger2 = AIlevel && random < (125 * (AIlevel ** 2 / 64.0))
trigger2 = statetype = C && (enemynear, movetype = A) && (enemynear, statetype != C)
statetype = S
physics = S
[State 153, End]
type = changestate
trigger1 = hitover
value = 131
ctrl = 1

;--- AGUARDHIT (shaking) ---
[Statedef 154]
type = A
movetype = H
physics = N
velset = 0, 0
[State 154, Anim]
type = changeanim
trigger1 = 1
value = 152
[State 154, End]
type = changestate
trigger1 = hitshakeover
value = 155

;--- AGUARDHIT2 (knocked away) ---
[Statedef 155]
type = A
movetype = H
physics = N
anim = 152
[State 155, Vel]
type = hitvelset
trigger1 = !time
x = 1
y = 1
[State 155, Vel]
type = veladd
trigger1 = 1
y = const(movement.yaccel)
[State 155, Ctrl]
type = ctrlset
trigger1 = time = gethitvar(ctrltime)
value = 1
[State 155, Var]
type = varset
trigger1 = 1
sysvar(0) = (pos y >= 0) && (vel y > 0)
[State 155, Vel]
type = velset
trigger1 = sysvar(0)
y = 0
[State 155, Pos]
type = posset
trigger1 = sysvar(0)
y = 0
[State 155, End]
type = changestate
trigger1 = sysvar(0) && inguarddist
trigger1 = (!AIlevel && command = "holdback") || AIlevel
value = 130
[State 155, End]
type = changestate
trigger1 = sysvar(0)
value = 52



;---------------------------------------------------------------------------
; Lose by Time Over
; CNS difficulty: basic
[Statedef 170]
type = S
ctrl = 0
anim = 170
velset = 0,0

[State 170, 1]
type = NotHitBy
trigger1 = 1
value = SCA
time = 1

;---------------------------------------------------------------------------
; Win state decider
; CNS difficulty: basic
[Statedef 180]
type = S

[State 180, 1]
type = ChangeState
trigger1 = Time = 0
value = 181

;---------------------------------------------------------------------------
; Win pose 1
; CNS difficulty: basic
[Statedef 181]
type = S
ctrl = 0
anim = 180
velset = 0,0

[State 0, PlaySnd]
type = PlaySnd
trigger1 = time=0
value = S3150,3
;volumescale = 0
channel = -1
;lowpriority = -1
;freqmul = 1.0
;loop = 0
;pan = 0
;abspan = 
;ignorehitpause = 
;persistent = 


[State 181, 1]
type = NotHitBy
trigger1 = 1
value = SCA
time = 1

;---------------------------------------------------------------------------
; Introduction
; CNS difficulty: basic
[Statedef 190]
type = S
ctrl = 0
velset = 0,0

[State 190, 1] ;Freeze animation until PreIntro is over
type = Changestate
trigger1 = random<500
value = 191

[State 190, 1] ;Freeze animation until PreIntro is over
type = Changestate
trigger1 = random<500
value = 192

[State 190, 2] ;Assert this until you want "round 1, fight" to begin
type = AssertSpecial
trigger1 = 1
flag = Intro

[State 190, 4] ;Change to stand state
type = ChangeState
trigger1 = AnimTime = 0
value = 0

; ƒCƒ“ƒgƒ1
[Statedef 191]
type = S
ctrl = 0
anim = 191
velset = 0,0

[State 191 , 1]
type = ChangeState
trigger1 = P2name = "Son Goku"
trigger2 = P4name = "Son Goku"
trigger3 = P2name = "Piccolo"
trigger4 = P4name = "Piccolo"
trigger5 = P2name = "Frieza"
trigger6 = P4name = "Frieza"
trigger7 = P2name = "Trunks"
trigger8 = P4name = "Trunks"
trigger9 = P2name = "Mr Satan"
trigger10 = P4name = "Mr Satan"
trigger11 = P2name = "Dr Gero"
trigger12 = P4name = "Dr Gero"
trigger13 = P2name = "Son gohan"
trigger14 = P4name = "Son gohan"
trigger15 = P2name = "Piccolo Daimaoh"
trigger16 = P4name = "Piccolo Daimaoh"
value = 192

[State 191, 1];wŒy‚­ƒEƒH[ƒ~ƒ“ƒOƒAƒbƒv‚Å‚à‚·‚é‚©x
type = PlaySnd
trigger1 = time = 25
value = 191,0
channel = 6

[state 190, 2]
type = assertspecial
trigger1 = 1
flag = intro

[State 191, 3] ;Change to stand state when done
type = ChangeState
trigger1 = AnimTime = 0
value = 0

; ----------------------------------i‚u‚r‘·Œå‹óA‘¼j
[Statedef 192]
type = S
ctrl = 0
anim = 190
velset = 0,0

[State 192, 1];w—ˆ‚¢x
type = PlaySnd
trigger1 = animelem =13
value = 192,0
volume = 225

[state 190, 2]
type = assertspecial
trigger1 = 1
flag = intro

[State 192, 3] ;Change to stand state when done
type = ChangeState
trigger1 = AnimTime = 0
value = 0

;---------------------------------------------------------------------------
; Taunt
; CNS difficulty: easy
[Statedef 195]
type = S
ctrl = 0
anim = 195
velset = 0,0
movetype = I
physics = S
sprpriority = 2

[State 195, 2]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;
;---------------------------------------------------------------------------
; Override common states (use same number to override) :
;---------------------------------------------------------------------------
;---------------------------------------------------------------------------
; HITA_FALL (knocked up, falling)
[Statedef 5050]
type    = A
movetype= H
physics = N

[State 5050, 1] ;Change anim when done with transition
type = ChangeAnim
trigger1 = AnimTime = 0
trigger1 = Anim = 5035
trigger2 = Time = 0     ;If no transition anim
trigger2 = Anim != 5035
trigger2 = (Anim != [5051, 5059]) && (Anim != [5061, 5069])
trigger2 = Anim != 5090 ;Not if hit off ground anim
value = 5050

[State 5050, 2] ;Coming down anim
type = ChangeAnim
trigger1 = anim = [5050,5059]
trigger1 = Vel Y >= ifelse(anim = 5050, 1, -2)
trigger1 = SelfAnimExist(anim+10)
value = anim+10
persistent = 0

[State 5050, 3] ;Gravity
type = VelAdd
trigger1 = 1
y = GetHitVar(yaccel)

[State 5050, 4] ;Recover near ground
type = ChangeState
triggerall = Vel Y > 0
triggerall = Pos Y >= -20
triggerall = alive
triggerall = CanRecover
trigger1 = Command = "recovery"
value = 5200 ;HITFALL_RECOVER

[State 5050, 5]; Recover in mid air
type = ChangeState
triggerall = Vel Y > -1
triggerall = alive
triggerall = CanRecover
trigger1 = Command = "recovery"
value = 5210 ;HITFALL_AIRRECOVER

[State 5050, 6]
type = ChangeState
trigger1 = Vel Y > 0
trigger1 = Pos Y >= ifelse((anim = [5051,5059]) || (anim = [5061,5069]), 0, 25)
value = 5100 ;HIT_BOUNCE

;---------------------------------------------------------------------------
; HIT_BOUNCE (hit ground)
[Statedef 5100]
type    = L
movetype= H
physics = N

[State 5100, 1]
type = VelSet
trigger1 = Time = 0
trigger1 = GetHitVar(fall.yvel) = 0
trigger1 = vel x > 1
x = 1

[State 5100, EnvShake]
type = FallEnvShake
trigger1 = Time = 0

[State 5100, Var] ;Save fall velocity
type = VarSet
trigger1 = Time = 0
sysvar(1) = floor(vel y)

[State 5100, 2] ;Hit ground anim (normal)
type = ChangeAnim
triggerall = time = 0
trigger1 = (anim != [5051,5059]) && (anim != [5061,5069])
trigger2 = !SelfAnimExist(5100 + (anim % 10))
value = 5100

[State 5100, 3] ;Hit ground anim (for hit up)
type = ChangeAnim
trigger1 = time = 0
trigger1 = (anim = [5051,5059]) || (anim = [5061,5069])
trigger1 = SelfAnimExist(5100 + (anim % 10))
value = 5100 + (anim % 10)

[State 5100, 4]
type = PosSet
trigger1 = Time = 0
y = 0

[State 5100, 5]
type = VelSet
trigger1 = Time = 0
y = 0

[State 5100, 6] ;Reduce speed
type = VelMul
trigger1 = Time = 0
x = 0.75

[State 5100, 7]
type = ChangeState
trigger1 = Time = 0
trigger1 = GetHitVar(fall.yvel) = 0
value = 5110 ;HIT_LIEDOWN

[State 5100, Explod]
type = Explod
trigger1 = Time = 0
anim = 6003
ID = 6003
pos = 0,0
facing = 1
bindtime = 1
removetime = -2
scale = .7,.7
sprpriority = -3
ownpal = 1
ignorehitpause = 1

[State 5100, 9]
type = HitFallDamage
trigger1 = Time = 3

[State 5100, 10]
type = PlaySnd
trigger1 = Time = 0
value = S5100,0

[State 5100, 11]
type = PosFreeze
trigger1 = 1

[State 5100, 12]
type = ChangeState
trigger1 = AnimTime = 0
value = 5101

[State 5100, 13]
type = ForceFeedback
trigger1 = Time = 0
waveform = sinesquare
ampl = 128,-3,-.2,.005
time = 20
;---------------------------------------------------------------------------
; HIT_LIEDOWN
[Statedef 5110]
type    = L
movetype= H
physics = N

[State 5110, EnvShake]
type = FallEnvShake
trigger1 = Time = 0

[State 5110, 1] ;For hit up/up-diag type (from state 5081)
type = ChangeAnim
persistent = 0
trigger1 = SelfAnimExist(5110 + (anim % 10))
trigger1 = anim = [5081,5089]
value = 5110 + (anim % 10)

[State 5110, 2] ;Hit ground anim (normal)
type = ChangeAnim
triggerall = time = 0
triggerall = anim != [5110,5119] ;Not already changed anim
trigger1 = anim != [5161,5169]
trigger2 = !SelfAnimExist(5170 + (anim % 10))
value = 5170

[State 5110, 3] ;Hit ground anim (for hit up)
type = ChangeAnim
triggerall = time = 0
triggerall = anim != [5110,5119] ;Not already changed anim
trigger1 = anim = [5161,5169]
trigger1 = SelfAnimExist(5170 + (anim % 10))
value = 5170 + (anim % 10)

[State 5110, 4]
type = HitFallDamage
trigger1 = Time = 0

[State 5110, 5]
type = PosSet
trigger1 = Time = 0
y = 0

[State 5110, Var] ;Get fall velocity
type = VarSet
trigger1 = Time = 0
trigger1 = GetHitVar(fall.yvel) != 0
sysvar(1) = floor(vel y)

[State 5110, 6]
type = PlaySnd
trigger1 = Time = 0
trigger1 = !SysVar(0)
value = S5100,1

[State 5110, Explod]
type = Explod
trigger1 = Time = 0
trigger1 = !SysVar(0)
anim = 6004
ID = 6004
pos = 0,0
facing = 1
bindtime =1
removetime = -2
scale = 1,1
sprpriority = -3
ownpal = 1
ignorehitpause = 1

[State 5110, 8]
type = VelSet
trigger1 = Time = 0
y = 0

[State 5110, 9] ;For hit up type
type = ChangeAnim
persistent = 0
triggerall = anim = [5171,5179]
triggerall = SelfAnimExist(5110 + (anim % 10))
trigger1 = AnimTime = 0
trigger2 = SysVar(0) ;SysVar(0) = 1 avoids hit ground anim
value = 5110 + (anim % 10)

[State 5110, 10] ;For normal
type = ChangeAnim
persistent = 0
triggerall = Anim != [5111,5119]
trigger1 = AnimTime = 0
trigger2 = SysVar(0) ;SysVar(0) = 1 avoids hit ground frame
value = 5110

[State 5110, 11] ;If just died
type = ChangeState
triggerall = !alive
trigger1 = AnimTime = 0
trigger2 = SysVar(0) ;SysVar(0) = 1 avoids hit ground frame
trigger3 = Anim = [5110,5119]
value = 5150

[State 5110, 12]
type = VarSet
trigger1 = SysVar(0)
trigger1 = Time = 0
sysvar(0) = 0

[State 5110, 13] ;Friction
type = VelMul
trigger1 = 1
x = 0.85

[State 5110, 14]
type = ForceFeedback
trigger1 = alive
trigger1 = Time = 0
time = 8
ampl = 240
waveform = sine

[State 5110, 15]
type = ForceFeedback
trigger1 = !alive
trigger1 = Time = 0
ampl = 200, 7, -.467
time = 30
waveform = sine
;==========< FALL RECOVERY >==========
[Statedef 5200]
type = A
movetype = H
physics = N
[State 5200, Anim]
type = changeanim
trigger1 = anim = 5035 && !animtime
value = 5050
[State 5200, Vel]
type = veladd
trigger1 = 1
y = gethitvar(yaccel)
[State 5200, End]
type = selfstate
trigger1 = vel y > 0 && pos y >= -10
value = 5201

[Statedef 5201]
type = S
movetype = I
physics = N
anim = 5200
ctrl = 0
facep2 = 1

[State 5201, Pos]
type = posset
trigger1 = 1
y = 0
[State 5201, Vel]
type = velset
trigger1 = !time
x = -8
y = 0
[State 5201, Vel]
type = velmul
trigger1 = 1
x = 0.9

[State 5201, Snd]
type = playsnd
trigger1 = animelem = 1
value = 3 + (var(1) = 2) * 10, 0
channel = 0
[State 5201, Flash]
type = palfx
trigger1 = !time
add = 255, 255, 255
sinadd = -255, -255, -255, 40
time = 10

[State 5201, Dust]
type = playsnd
trigger1 = !time
value = 0, 101
[State 5201, Dust]
type = explod
trigger1 = !(time % 6) && abs(vel x) >= 1
anim = 7103
sprpriority = 3
postype = p1
pos = 0, 0
vel = 1, 0
scale = 1, 1
pausemovetime = -1
supermovetime = -1
ownpal = 1

[State 5201, NHB]
type = nothitby
trigger1 = 1
value = SCA
time = 1
[State 5201, End]
type = changestate
trigger1 = !animtime
value = 0
ctrl = 1


[Statedef 5210]
type = A
movetype = I
physics = N
anim = 5210
ctrl = 0

[State 5210, Snd]
type = playsnd
trigger1 = animelem = 1
value = 3 + (var(1) = 2) * 10, 3 * (var(1) = 2)
channel = 0

[State 5210, Flash]
type = palfx
trigger1 = !time
add = 255, 255, 255
sinadd = -255, -255, -255, 40
time = 10

[State 5210, Accel]
type = veladd
trigger1 = 1
y = 0.6

[State 5210, Vel]
type = velset
trigger1 = !time
x = ifelse((command = "holdfwd" && command != "holdback"), 4, ifelse((command != "holdfwd" && command = "holdback"), -4, 0))
y = -7.55

[State 5210, Turn]
type = turn
trigger1 = !time
trigger1 = p2dist x < 0

[State 5210, NHB]
type = nothitby
trigger1 = time < 14
value = SCA
time = 1

[State 5210, Ctrl]
type = ctrlset
trigger1 = time >= 14
value = 1

[State 5210, Land]
type = changestate
trigger1 = vel y > 0
trigger1 = pos y > -vel y
value = 52


;==========< TARGET SAFE FALL >==========
[Statedef 5205]
type = A
physics = N
movetype = H

[State 5205, Anim]
type = changeanim
trigger1 = !animtime
trigger1 = anim = 5035
value = 5050

[State 5205, Accel]
type = veladd
trigger1 = 1
y = gethitvar(yaccel)

[State 5205, Ground]
type = selfstate
trigger1 = vel y > 0
trigger1 = pos y >= const(movement.air.gethit.groundrecover.ground.threshold)
value = 5200

[State 5205, Air]
type = selfstate
trigger1 = time >= 60
value = 5210

;====================<K.O.>====================
[StateDef 5150]
type = L
movetype = H
physics = N
sprpriority = -3

[State 5150, ChangeAnim]
type = ChangeAnim
trigger1 = !Time
value = 5150

[State 5150, Anim] ; Lose to Ken
type = ChangeAnim
triggerall = Anim != 171
triggerall = (Roundstate = 2 || MatchOver) && !(TeamMode = Turns)
triggerall = NumEnemy
trigger1 = Enemy, AuthorName = "Phantom.of.the.Server&Jmorphman" && Enemy, Name = "Ken Masters"
trigger1 = Enemy, Anim = 184 && (Enemy, var(40) != 1)
value = 171

[State 5150, SprPriority]
type = SprPriority
trigger1= Anim = 171
value = 3

[State 5150, VelMul]
type = VelMul
trigger1 = 1
x= 0.85

[State 5150, VelSet]
type = VelSet
trigger1 = abs(vel x) < 0.05
x = 0

[State 5150, NotHitBy]
type = NotHitBy
trigger1 = 1
value = SCA
time = 1
;==========< INITIALIZE >==========
[Statedef 5900]
type = S
[State 5900, varreset]
type = varrangeset
trigger1 = !roundsexisted
value = 0
[State 5900, varreset]
type = varrangeset
trigger1 = !roundsexisted
fvalue = 0

[State 5900, Palette]
type = remappal
trigger1 = 1
source = 1, 1
dest = 1, palno

[State 5900, End]
type = changestate
trigger1 = !time
value = ifelse(roundno = 1, 190, 0)
;-------------------------------------------------------------------
;Stand by
[Statedef 7827]
type = S
movetype = I
physics = N
velset = 0,0
ctrl = 0
facep2=1

[State 0, ScreenBound]
type = ScreenBound
trigger1 =1
value =0
ignorehitpause =1
[State 7827]
type = PosSet
trigger1=!time
y = 0
ignorehitpause=1
[State 7827]
type = ChangeState
trigger1 = NumEnemy = [1,2]
trigger1 = Enemy(0),statetype = L || Enemy(0),movetype != H
value = 7828
[State 7827]
type = ChangeState
trigger1 = NumEnemy = 2
trigger1 = Enemy(1),statetype = L || Enemy(1),movetype != H
value = 7828
;-------------------------------------------------------------------------------
[Statedef 7828]
type    = S
physics = S
anim = 100
ctrl = 0
facep2=1

[State 7828, FX]
type = Explod
trigger1 = (time%2) = 1
ID = 2221
anim = 2221
postype = p1
facing = 1
vfacing = 1
pos = -26,-55
bindtime = 1
removetime = 6
ontop = 1
vel = 0,0
ownpal = 1
random = 30,70
sprpriority = 3
scale = .4,.14
removeongethit = 1
ignorehitpause = 1
persistent = 1
[State 7828, SND]
type = playsnd
trigger1 = (animelem = 3 || animelem = 6)
value = 0, 100

[State 7828]
type = PosSet
trigger1 = !Time
y = 0
ignorehitpause=1
[State 7828]
type = VelSet
trigger1 = AnimElem = 1
x = 7
ignorehitpause=1
[State 7828]
type = VelSet
trigger1 = AnimElemNo(0) = [1,2]
x = 9
ignorehitpause=1
[State 7828]
type = AssertSpecial
trigger1 = 1
flag = NoWalk
ignorehitpause=1
[State 7828]
type = AssertSpecial
trigger1 = 1
flag = NoAutoTurn
ignorehitpause=1

[State 7828]
type = ChangeState
trigger1= time>=20
value = 7829
ctrl = 0
;-------------------------------------------------------------------------------
[Statedef 7829]
type    = S
physics = S
anim = 101
ctrl = 0

[State 0, VelMul]
type = VelMul
trigger1 =time=2
x = .5
[State 0,Dust]
type = MakeDust
trigger1=time%6
pos = 30, 0

[State 7829, SND]
type = playsnd
trigger1 =!time
value = 0, 101
persistent = 0
[State 7829,END]
type = ChangeState
trigger1=!animtime
value = 0
ctrl = 1
;--------------------------------------------------------------------------
;CHARGE
[Statedef 88887]
type    = S
movetype= I
physics = S
juggle  = 0
velset = 0,0
ctrl = 0
anim = Ifelse(var(1),88885,88887)
poweradd = 0
sprpriority = 1

[State 999, flash]
type = palfx
trigger1 = 1
time = 1
add =70+ceil(sin(time/8.0*pi)*70),20+ceil(sin(time/8.0*pi)*20),0

[State 6070, Charge]
type=Helper
trigger1=!NumHelper(8885)
trigger1=animelemTime(3)=1
id=8885
name="Charge"
pos=0,5
postype=P1
stateno=8885
helpertype=normal
keyctrl=0
ownpal=1
ignorehitpause=1
pausemovetime=99999999
supermovetime=99999999
size.xscale=1
size.yscale=1

[State 0, Helper]
type = Helper
trigger1 = time = 9
helpertype = normal ;player
name = "Particel"
ID = 2220
stateno = 2022
pos = 0,0
postype = p1    ;p2,front,back,left,right
facing = 1
keyctrl = 0
ownpal = 1

[State 0, PlaySnd] ;----- character scream
type = PlaySnd
trigger1 = time = 11
value = 3 + (var(1) = 1) * 10, 5 + (var(1) = 1)
channel = 20
[State 0, PlaySnd]
type = PlaySnd
trigger1 = time = 9 ;----- charge sound
value = S7,4
channel = 21

[State 0, PowerAdd]
type = PowerAdd
trigger1 = time >= 9
value = 2+floor((time/10))
[State 88887, State]
type=ChangeState
triggerall = !AILevel
trigger1=Command!="holdy"&&Command!="holdb"
trigger2=power>=3000
value=88888
ctrl=0

[State 88887, State]
type=ChangeState
triggerall=AILevel
trigger1=power>=3000
trigger2=p2bodydist x <155
trigger3=enemy,numproj
trigger4=p2bodydist x <175
trigger5=enemynear,movetype=A
trigger6=inguarddist
trigger7=inguarddist
trigger7=enemynear,stateno=5120
trigger8=inguarddist
trigger8=enemynear,stateno=5201
value=88888
ctrl=0
;---------------------------------------------------------------------------
[Statedef 88888] ;   stop animation
type    = S
movetype= I
physics = S
juggle  = 0
velset = 0,0
ctrl = 0
anim = 88888
poweradd = 0
sprpriority = 1

[State 0, RemoveExplod]
type = RemoveExplod
trigger1 = !time
id = 8886

[State 0, RemoveExplod]
type = RemoveExplod
trigger1 = !time
id = 8885

[State 0, StopSnd]
type = StopSnd
trigger1 = time = 2
channel = 21

[State 0, StopSnd]
type = StopSnd
trigger1 = time = 5
channel = 20

[State 200, 5]
type = ChangeState
trigger1 = !animtime
value = 0
ctrl = 1
;------------------------------------------------------------------
[Statedef 100000]
type = A
physics = N
anim = 104 ; What You Want The Dash Anim To Be.
ctrl = 0

[State 905, Explod]
type = Explod
trigger1 = (time%4) = 1
ID = 2221
anim = 2221
postype = p1
facing = 1
vfacing = 1
pos = -19,-63
bindtime = 1
removetime = 6
ontop = 1
vel = 0,0
ownpal = 1
random = 19,63
sprpriority = 3
scale = .32,.15
supermovetime = 999
pausemovetime = 999
removeongethit = 1
ignorehitpause = 1
persistent = 1

[State 100, 1]
type = VelSet
trigger1 = 1
x = 7
y = 0

[State 100, 1]
type = VelSet
trigger1 = time = 11
x = -2
y = 2

[State 0, PlaySnd] ;Woosh Noise
type = PlaySnd
trigger1 = time = 4
value = S0,3

[State 100, assert]
type = AssertSpecial
trigger1 = time = [1,14]
flag = NoAirguard

[State 940, ChangeState]
type = ChangeState
trigger1 = Time = 15
value = 100002 ; Your Falling....
ctrl = 0

; Back Dash
[Statedef 100001]
type = A
physics = N
anim = 104
ctrl = 0

[State 907, Explod]
type = Explod
trigger1 = (time%4) = 1
ID = 2223
anim = 2223
postype = p1
facing = 1
vfacing = 1
pos = 21,-63
bindtime = 1
removetime = 6
ontop = 1
vel = 0,0
ownpal = 1
random = 21,63
sprpriority = 3
scale = .31,.16
supermovetime = 999
pausemovetime = 999
removeongethit = 1
ignorehitpause = 1
persistent = 1

[State 100, 1]
type = VelSet
trigger1 = 1
x = -7
y = 0

[State 100, 1]
type = VelSet
trigger1 = time = 11
x = 2
y = 2

[State 0, PlaySnd]
type = PlaySnd
trigger1 = time = 4
value = S0,3

[State 100, assert]
type = AssertSpecial
trigger1 = time = [1,14]
flag = NoAirguard

[State 940, ChangeState]
type = ChangeState
trigger1 = Time = 15
value = 100002
ctrl = 0

; Where My Vels At?
[Statedef 100002]
type    = A
physics = A

[State 50, 1]
type = VarSet
trigger1 = Time = 0
sysvar(1) = 0

[State 50, 2]
type = ChangeAnim
trigger1 = Time = 0
value = ifelse((vel x)=0, 41, ifelse((vel x)>0, 42, 43))

[State 50, 3]
type = ChangeAnim
trigger1 = Vel y > -2
trigger1 = SelfAnimExist(anim + 3)
persistent = 0
value = Anim + 3

;===========================================================================
;===============================< -2 STATES >=================================
;===========================================================================

[Statedef -2]


[State -2, Super Finish Detection]
type = VarSet
triggerAll = !(Enemy, Alive)
trigger1 = StateNo = 3120
var(11) = 1
ignoreHitPause = 1


[State -2, Hit Detection]
type = VarSet
trigger1 = MoveContact = 1 && var(30) < 0
trigger1 = (stateno!=[4000,4001])
var(30) = HitPauseTime
ignoreHitPause = 1

[State -2, Hit Sound]
type = PlaySnd
trigger1 = MoveContact = 1 && var(30) = HitPauseTime
trigger1 = MoveHit = 1 && var(31) >= 0
value = 2, var(31)
channel = 2
ignoreHitPause = 1

[State -2, Guard Sound]
type = PlaySnd
trigger1 = MoveContact = 1 && var(30) = HitPauseTime
trigger1 = MoveGuarded = 1 && var(32) >= 0
value = 2, var(32)
channel = 2
ignoreHitPause = 1


[State -2, Hit Detection]
type = VarSet
trigger1 = 1
var(30) = -1

[State -2, Hit Detection]
type = VarRangeSet
trigger1 = MoveType = I
trigger2 = MoveType = H && Time
first = 30
last = 36
value = -1
ignoreHitPause = 1

[State -2, P2 Facing]
type = targetfacing
trigger1 = movecontact = 1 && numtarget
trigger1 = !(target, hitshakeover) && !(target, hitfall) && (target, time <= 1)
value = ifelse(p2dist x >= 0, -1, 1)
ignorehitpause = 1

[State -2, P2 Safe Fall]
type = targetstate
trigger1 = numtarget = 1
trigger1 = target, command = "recovery"
trigger1 = target, pos y >= -48 && target, vel y > 0
trigger1 = target, alive && target, hitfall && target, gethitvar(fall.recover)
trigger1 = target, stateno = 5030 || target, stateno = 5035 || target, stateno = 5050 || target, stateno = 5071
value = 5205
ignorehitpause = 1

[State -2, Counter Flag]
type = varset
trigger1 = numenemy
var(29) = (enemynear, movetype = A)
ignorehitpause = 1

[State -2, Hit Count]
type = VarAdd
trigger1 = MoveHit = 1
trigger1 = !(HitDefAttr = SCA, AT)
var(13) = 1

[State -2, Hit Count Reset]
type = VarSet
trigger1 = NumEnemy && var(13)
trigger1 = (EnemyNear, MoveType != H) && (EnemyNear, StateNo != 5300)
var(13) = 0
ignoreHitPause = 1

[State -2, Wall Bounce Count]
type = VarAdd
trigger1 = MoveHit = 1 && Numtarget(1310)
var(14) = 1

[State -2, Wall Bounce Count Reset]
type = VarSet
trigger1 = NumEnemy && var(14)
;trigger1 = (EnemyNear, MoveType != H) && (EnemyNear, StateNo != 5300)
trigger1 = (Enemy, StateType != A) && (Enemy, StateNo != [5100,5109]) && (Enemy, Time >= 1)
trigger2 = (Enemy, MoveType != H) || (Enemy, StateNo = [120,155]) || (Enemy, Ctrl)
;trigger2 = !Numtarget(1310)
var(14) = 0
ignoreHitPause = 1

[State -2, Throws Disallowed]
type = varset
triggerall = numenemy
trigger1 = enemynear, movetype != H
trigger1 = enemynear, stateno != 140
trigger1 = (enemynear, ctrl && enemynear, time >= 1) || (enemynear, time >= 8)
trigger2 = enemynear, movetype = A
trigger3 = (enemynear, stateno != [0, 52]) && (enemynear, stateno != [120, 155]) && (enemynear, stateno != [5000, 5120])
var(38) = 0
[State -2, Throws Disallowed]
type = varset
triggerall = numenemy
trigger1 = enemynear, stateno = [150, 155]
trigger2 = (enemynear, stateno = 51 || enemynear, stateno = 140) && (enemynear, prevstateno = [150, 155])
trigger3 = enemynear, movetype = H && enemynear, statetype != A && !var(20)
trigger4 = (enemynear, stateno = [5020, 5040]) && enemynear, hitfall = 0
trigger5 = enemynear, stateno = 40 && enemynear, prevstateno != 52 && (enemynear, anim != [0, 29])
var(38) = 1
ignorehitpause = 1

[State -2, Defence Levels]
type = lifeadd
trigger1 = var(1) = 2 || var(1) = 3
trigger1 = gethitvar(hitcount) = 1 && gethitvar(damage)
value = -ceil(ifelse(var(1) = 3, 0.25, 0.125) * gethitvar(damage))
kill = 0
ignorehitpause = 1
[State -2, Defence Levels]
type = defencemulset
trigger1 = var(1) = 2 || var(1) = 3
value = ifelse(var(1) = 3, 1.25, 1.125) * (const(data.fall.defence_mul) ** gethitvar(fallcount))
ignorehitpause = 1
[State -2, VarSet]
type = VarSet
trigger1 = stateno!= 52
trigger1 = !(stateno = [3000,4999])
var(23) = 0
ignorehitpause = 1

[State -2, Assert: nostandguard]
type = AssertSpecial
triggerall = stateno = 52
trigger1 = (anim = [1102,1104])
trigger2 = anim = 1208
trigger3 = anim = 3102
flag = nostandguard
flag2 = nocrouchguard
ignoreHitPause = 1

[State -2, OTG]
type= varset
trigger1= p2statetype=L
var(24)= 1
ignorehitpause=1

[State -2, OTG]
type= varset
trigger1= movecontact=1 && p2statetype!=L
trigger2= p2statetype!=A && p2statetype!=L
var(24)= 0
ignorehitpause=1

;[State -2, Free Juggling]
;type=assertspecial
;trigger1= var(20)>0 || var(24) || numtarget(3300)
;trigger2= roundstate!=2
;flag=nojugglecheck
;ignorehitpause=1

[State -2, Free Juggling]
type = assertspecial
trigger1 = var(20) > 0 || var(24) || numtarget(3120) || numtarget(3180)
trigger2 = roundstate != 2
flag = nojugglecheck
ignorehitpause = 1

[State -2, stopsnd3]
type = stopsnd
trigger1 = time <= 1
trigger1 = prevstateno = 3040
channel = 3
[State -2, stopsnd4]
type = stopsnd
trigger1 = time <= 1
trigger1 = prevstateno = 3040
channel = 4

[State -2, KO snd]
type = varset
trigger1 = alive && var(8) > 0
trigger2 = !alive && var(8) < 2
var(8) = ifelse(alive, 0, var(8) + 1)
ignorehitpause = 1
[State -2, KO snd]
type = playsnd
trigger1 = !alive && var(8) = 1
trigger1 = var(8) := 2
value = 11, ifelse((var(1) = 2), 2, 1) + 2 * (stateno = 5130)
ignorehitpause = 1

[State -2, PosAdd]
type = PosAdd
trigger1 = var(1) = 2
trigger1 = (stateno = [1000,3999]) && time = 1
trigger1 = prevstateno = 250
x = 10
ignorehitpause = 1
persistent = 0

[State -2, resetmetsushoryukenvar]
type = varset
trigger1 = (stateno != 3100 || anim != 3101) && var(43)
var(43) = 0

[State -2, Voice Pos]
type = sndpan
trigger1 = 1
channel = 0
pan = 0
ignorehitpause = 1

[State -2, Debug]
type = displaytoclipboard
trigger1 = 1
text = "AI = %d Mode = %d Damage = %f Hits = %d Juggle = %d Free Juggle = %d"
params = AIlevel, var(1), fvar(12), var(13), var(15), var(39)
ignorehitpause = 1

[State -2, Debug]
type = appendtoclipboard
trigger1 = 1
text = "\nBy PotS - http://www.mugenguild.com/pots/"
ignorehitpause = 1

;----------------------------------------------------------------
[State -2, RemoveExplod]
type = RemoveExplod
trigger1 = MoveType = H
trigger2 = StateNo = [0,49]
trigger3 = StateNo = [100,189]
trigger4 = StateNo = 195
trigger5 = StateNo = [200,799]
trigger6 = StateNo = [850,859]
trigger7 = StateNo = [900,1999]
trigger8 = winko
trigger9 = StateNo = [4500,99999]
id = 6035

[State 0, AfterImageTime]
type = AfterImageTime
trigger1 = MoveType = H
trigger2 = StateNo = [0,49]
trigger3 = StateNo = [100,155]
trigger4 = StateNo = 195
trigger5 = StateNo = [200,699]
trigger6 = StateNo = [750,859]
trigger7 = (StateNo = [900,1999])&&stateno!=1350&&stateno!=1400
trigger8 = winko
trigger9 = (StateNo = [4500,99999])&&stateno!=5982
time = 1

[State -2, RemoveExplod]
type = RemoveExplod
trigger1 =stateno!=3040
id = 3027
ignorehitpause=1
[State -2, RemoveExplod]
type = RemoveExplod
trigger1 =stateno!=3040
id = 3047
ignorehitpause=1

[State -2, AssertSpecial]
type = AssertSpecial
trigger1 = (stateno = [3000,4999])&&movetype!=H
flag = nobardisplay
flag2 = noBG
flag3 = noFG
ignorehitpause=1
;=========================================================================
;Dampener
;=========================================================================
[State -2, Damage based on hits]
type=varset
trigger1= numenemy
trigger1=enemynear,gethitvar(hitcount)
trigger1= (enemynear,movetype=H)
fvar(12)=1
ignorehitpause=1
[State -2, Reset var when the opponent recovers]
type=varset
triggerall=enemynear,hitover&&enemynear,hitshakeover&&enemynear,ctrl=1
trigger1= numenemy&&(enemynear,movetype!=H)
fvar(12)=0
ignorehitpause=1

[State -2, combo]
type=varset
triggerall=enemynear,hitover&&enemynear,hitshakeover
trigger1 = (enemynear,movetype!=H)
trigger1 = fvar(12)=0
fvar(13)=0
ignorehitpause=1
[State -2, combo]
type=varset
trigger1 = (stateno = [200,999])&&!Numtarget(1400)&&(enemynear,movetype=H)&&!moveguarded
fvar(13)=1
ignorehitpause=1
[State -2, combo]
type=varset
trigger1 = (stateno = [1000,2999])&&!Numtarget(1400)&&(enemynear,movetype=H)&&!moveguarded
fvar(13)=2
ignorehitpause=1
[State -2, combo]
type=varset
trigger1 = (stateno = [3000,4999])&&!Numtarget(1400)&&(enemynear,movetype=H)&&!moveguarded
fvar(13)=3
ignorehitpause=1
[State -2, combo]
type=varset
trigger1 = (stateno = [200,4999])&&Numtarget(1400)&&(enemynear,movetype=H)&&!moveguarded
fvar(13)=4
ignorehitpause=1

[State -2, reset]
type=varset
trigger1=fvar(12)=0
fvar(9)=0
ignorehitpause=1
[State -2, reset]
type=varset
trigger1 = ctrl=1
fvar(9)=1
ignorehitpause=1

[State -2, Juggler]
type=varset
trigger1 = (stateno = [200,4999])&&Numtarget(1400)&&fvar(12)!=0&&(enemynear,movetype=H)&&(fvar(13)=[0,4])
fvar(10)= .2
ignorehitpause=1
[State -2, Normal]
type=varset
trigger1 = (stateno = [200,999])&&!Numtarget(1400)&&fvar(12)!=0&&(enemynear,movetype=H)&&(fvar(13)=[0,1])
fvar(10)= ifelse((prevstateno=[3000,4999]),.3,ifelse((prevstateno=[1000,2999]),.4,ifelse((prevstateno=[200,999]),.8,1)))
ignorehitpause=1
[State -2, Special]
type=varset
trigger1 = (stateno = [1000,2999])&&!Numtarget(1400)&&fvar(12)!=0&&(enemynear,movetype=H)&&(fvar(13)=[0,2])
fvar(10)= ifelse((prevstateno=[3000,4999]),.4,ifelse((prevstateno=[200,999]),.5,1))
ignorehitpause=1
[State -2, Dampener For Supers]
type=varset
trigger1 = (stateno = [3000,4999])&&!Numtarget(1400)&&fvar(12)!=0&&(enemynear,movetype=H)&&(fvar(13)=[0,3])
fvar(10)= ifelse((prevstateno=[1000,2999]),.7,ifelse((prevstateno=[200,999]),.8,1))
ignorehitpause=1
[State -2, Juggler reset]
type=varset
trigger1=fvar(12)=0
trigger2=moveguarded
fvar(10)=1
ignorehitpause=1
[State -2, Dampener For Specials]
type=varset
trigger1=fvar(12)=0
fvar(11)=0
ignorehitpause=1
[State -2, Dampener For Specials]
type=varset
trigger1=fvar(9)=1&&(prevstateno = [1000,2999])&&fvar(10)=1&&fvar(12)!=0&&!moveguarded
fvar(11)=1
ignorehitpause=1
[State -2, Dampener For Supers]
type=varset
trigger1=fvar(9)=1&&(prevstateno = [3000,4999])&&fvar(10)=1&&fvar(12)!=0&&!moveguarded
fvar(11)=2
ignorehitpause=1
[State -2, Dampener For Supers]
type=varset
trigger1=fvar(9)=1&&(prevstateno != [1000,4999])&&fvar(10)=1&&fvar(12)!=0&&!moveguarded
fvar(11)=3
ignorehitpause=1

[State -2, Dampener For Specials]
type=varset
trigger1 = fvar(11)=1
fvar(10)=.3
ignorehitpause=1
[State -2, Dampener For Supers]
type=varset
trigger1 = fvar(11)=2
fvar(10)=.4
ignorehitpause=1
[State -2, Dampener For Specials]
type=varset
trigger1 = fvar(11)=3
fvar(10)=.5
ignorehitpause=1

[State -2, Dampener itself]
type=attackmulset
trigger1= 1
value=fvar(10)
ignorehitpause=1

;----------------------------------------------------------
[State -2, DEBUG]
trigger1 = 1
type = DisplayToClipboard
ignorehitpause = 1
text = "Dampener = %d hitcount = %d Frontedge =%d Backedge = %d"
params = fvar(10) , enemynear,gethitvar(hitcount) , frontedgebodydist , backedgebodydist
ignorehitpause=1


[State -2, Debug]
type = displaytoclipboard
trigger1 = 1
text = "AI = %d Mode = %d Damage = %f Hits = %d Juggle = %d Free Juggle = %d"
params = AIlevel, var(1), fvar(12), var(13), var(15), var(39)
ignorehitpause = 1

;===========================================================================
;===============================< -3 STATES >=================================
;===========================================================================
[Statedef -3]


[State -3, GetHit Snd]
type=playsnd
triggerall= alive && time=1
triggerall= stateno=5000 || stateno=5010
trigger1= gethitvar(animtype)>=2 && random<500
trigger2= gethitvar(animtype)=1 && random<375
trigger3= gethitvar(animtype)=0 && random<250
value=5000,1+(random%5)
channel=0
ignorehitpause=1

[State -3, GetHit Snd]
type=playsnd
triggerall= alive && time=1
trigger1= (stateno=5000 || stateno=5010) && numenemy
trigger1= gethitvar(fall) || (enemynear,hitdefattr=SCA,SA,HA)
trigger2= (stateno=5020 || stateno=5070 || stateno=5080)
trigger3= (stateno=5050 || stateno=5100) && (prevstateno!=[5000,5199])
value=5000,1+(random%5)
channel=0
ignorehitpause=1

;---------------------------------------------------------------------------
[State -3, AI]
type=varset
trigger1= alive && ishometeam
trigger1= teamside=2 || matchno>1
var(59)=1

[State -3, Gametime Var]
type = varset
trigger1 = 1
var(58) = gametime
ignorehitpause = 1

[State -3,veladd]
type = Veladd
triggerall= !AILevel
triggerall = roundstate=2
triggerall =command = "holdfwd"
triggerall = prevstateno = 123 ; the superjumo state
trigger1 = stateno = 50; jump state
x = .1 ; maybe you need to modify these value

[State state-3,veladd]
type = Veladd
triggerall= !AILevel
triggerall = roundstate=2
triggerall =command = "holdback"
triggerall = prevstateno = 123
trigger1 = stateno = 50
x = -.1

[State -3,veladd]
type = Veladd
triggerall = (AILevel)
triggerall = prevstateno = 123 ; the superjumo state
trigger1 = enemy,vel y < -1
trigger1 = p2bodydist x >= 45
trigger1 = p2movetype != A
trigger1 = p2statetype = A
x = .2 ; maybe you need to modify these valu

[State -3, Prevent Crossup]
type = Width
trigger1 = MoveType != H
edge = 8, 0
ignoreHitPause = 1
;-------------------------------------------------------------------------

[State -3, Shadows]
type = afterimage
triggerall = time = 1 && !var(20)
trigger1 = stateno = 50 && var(9) = 3
trigger2 = stateno = 710 || stateno = 720
time = 2
timegap = 1
framegap = 3
length = 12
palbright = 0, 0, 0
paladd = 0, 0, 0
palmul = 0.9, 0.9, 0.9
palcontrast = 120, 120, 120
palpostbright = 0, 0, 0
trans = add1

[State -3, ExSnd]
type = playsnd
trigger1 = (stateno = [1000, 2999]) && time = 1 && movetype = A && var(10) = 4
value = 7, 6
ignorehitpause = 1
[State -3, ExShadow]
type = afterimage
trigger1 = (stateno = [1000, 2999]) && time = 1 && movetype = A && var(10) = 4
time = 2
timegap = 1
framegap = 1
length = 8
palbright = 32, 32, 0
palcontrast = 128, 128, 128
paladd = -10, -10, -10
palmul = 1.1, 1, 0.5
trans = add
ignorehitpause = 1
[State -3, ExFlash]
type = palfx
trigger1 = (stateno = [1000, 2999]) && movetype = A && var(10) = 4
triggerall = (anim != [1101, 1103]) && anim != 1207
time = 1
add = 32 + ceil(sin(gametime / 1.5) * 32), 32 + ceil(sin(gametime / 1.5) * 32), 0
mul = 300, 300, 200
ignorehitpause = 1

[State -3, Lv1 Shadows]
type = afterimage
trigger1 = stateno = 3000 && animelem = 4
trigger2 = stateno = 3020 && animelem = 3
trigger3 = stateno = 3100 && anim = 3100 && animelem = 4
trigger4 = stateno = 3140 && anim = 3140 && animelemtime(1) = 2
trigger5 = stateno = 3200 && anim = 3200 && animelem = 3
time = 2
timegap = 1
framegap = 10
length = 30
paladd = 0, 0, 0
palmul = 0.75, 0.75, 0.75
palcontrast = 128, 128, 128
palpostbright = 0, 0, 0
trans = add1

[State -3, Lv2 Shadows]
type = afterimage
trigger1 = stateno = 3180 && anim = 3180 && animelem = 2
trigger2 = stateno = 3160 && anim = 3160 && animelem = 4
time = 2
timegap = 1
framegap = 10
length = 30
paladd = 0, 0, 0
palmul = 0.75, 0.75, 0.75
palcontrast = 32, 32, 160
palpostbright = 0, 0, 0
trans = add1

[State -3, Lv3 Shadows]
type = afterimage
trigger1 = stateno = 3040 && anim = 3040 && animelem = 4
trigger2 = stateno = 3120 && anim = 3120 && animelem = 2
trigger3 = stateno = 4000 && time = 1
trigger4 = stateno = 368 && time = 1
time = 2
timegap = 1
framegap = 10
length = 30
paladd = 0, 0, 0
palmul = 0.75, 0.75, 0.75
palcontrast = 160, 32, 32
palpostbright = 0, 0, 0
trans = add1

[State -3, AfterImagePersist]
type = afterimagetime
trigger1 = stateno = 50 && var(9) = 3 && vel y < -1
trigger2 = var(20) > 0
trigger3 = stateno = 710 || stateno = 720 || stateno = 1400
trigger4 = (stateno = [1000, 2999]) && var(10) = 4 && (anim != [1101, 1103]) && anim != 1207
trigger5 = (stateno = [3000, 4999]) && (anim != [1101, 1102]) && (anim != [1111, 1112])
trigger6 = stateno = 368 && animelemtime(2) < 0
time = 2

[State -3, Corner Push]
type = varset
trigger1 = fvar(5)
trigger1 = numtarget
trigger1 = target, hitover || (target, gethitvar(hitshaketime) > 0 && target, time <= 0)
fvar(5) = 0
[State -3, Corner Push]
type = varset
trigger1 = movecontact = 1 && numtarget
fvar(5) = target, gethitvar(xvel)
ignorehitpause = 1
[State -3, Corner Push]
type = posadd
triggerall = fvar(5)
triggerall = (statetype = S || statetype = C) && numtarget
triggerall = !hitpausetime && target, gethitvar(hitshaketime) <= 0
triggerall = (target, statetype = S || target, statetype = C) && !(target, gethitvar(yvel)) && !(target, hitfall)
trigger1 = target, frontedgebodydist <= abs(target, vel x)
trigger1 = (target, gethitvar(xvel) * target, facing) > 0
trigger2 = target, backedgebodydist <= abs(target, vel x)
trigger2 = (target, gethitvar(xvel) * target, facing) < 0
x = ifelse(target, frontedgebodydist <= 0, -1, 1) * (target, facing) * fvar(5)
[State -3, Corner Push]
type = varset
trigger1 = fvar(5)
trigger1 = abs(fvar(5)) < 1.0
fvar(5) = 0
[State -3, Corner Push]
type = varset
trigger1 = numtarget
trigger1 = target, gethitvar(hitshaketime) <= 0
fvar(5) = fvar(5) * 0.85

[State -3, Underground Juggle Prevention]
type = targetbind
trigger1 = movecontact = 1
trigger1 = numtarget && numenemy
trigger1 = (target, time = 0) && (target, ID = enemynear, ID)
trigger1 = !(target, hitshakeover) && (target, pos y > 0)
pos = ceil(p2dist x), ceil(-pos y)
ignorehitpause = 1

[State -3, Prevent Crossup]
type = width
trigger1 = movetype != H
edge = 8, 0
ignorehitpause = 1

[State -3, Variable Height]
type = playerpush
triggerall = statetype = A && movetype != H && numenemy = 1
triggerall = p2bodydist x = [ -(enemynear, const(size.ground.back) + enemynear, const(size.ground.front)) , 0]
trigger1 = p2statetype = S
trigger1 = p2dist y >= (enemynear, const(size.height) - 30)
trigger2 = p2statetype = C
trigger2 = p2dist y >= (enemynear, const(size.height) - 56)
trigger3 = p2statetype = L
trigger3 = p2dist y >= 12
value = 0
ignorehitpause = 1

[State -3, GetHit Snd]
type = playsnd
triggerall = alive && time = 1
triggerall = stateno = 5000 || stateno = 5010
trigger1 = gethitvar(animtype) >= 2 && random < 500
trigger2 = gethitvar(animtype) = 1 && random < 375
trigger3 = gethitvar(animtype) = 0 && random < 250
value = 5000 + (var(1) = 2) * 10, ceil(random / 200)
channel = 0
ignorehitpause = 1

[State -3, GetHit Snd]
type = playsnd
triggerall = alive && time = 1
trigger1 = (stateno = 5000 || stateno = 5010) && numenemy
trigger1 = gethitvar(fall) || (enemynear, hitdefattr = SCA, SA, HA)
trigger2 = (stateno = 5020 || stateno = 5070 || stateno = 5080)
trigger3 = (stateno = 5050 || stateno = 5100) && (prevstateno != [5000, 5199])
value = 5000 + (var(1) = 2) * 10, ceil(random / 200)
channel = 0
ignorehitpause = 1

;[State -3, NoWalk after Parry]
;type = assertspecial
;trigger1 = prevstateno = 700
;trigger1 = stateno = 0 && time < 7
;flag = nowalk

;[State -3, Cheap KO]
;type = changestate
;trigger1 = !alive && (stateno = [5000, 5010])
;trigger1 = (prevstateno = [130, 131]) || (prevstateno = [140, 141]) || (prevstateno = [150, 153])
;value = 5130
;ignorehitpause = 1

;-------------------------------------------------------------------------------
[State -3, Normal Finish]
type = Helper
triggerall = roundstate >= 2
triggerall = WinKo && NumHelper(9994)=0
trigger1 = (stateno = [200, 999])&&movetype!=H&&Movetype=A 
ID = 9994
stateno = 9994
postype = back
pos = 0,0
pausemovetime = 999999
supermovetime = 999999
ignorehitpause = 1
ownpal = 1
persistent=0

[State -3, Special Finish]
type = Helper
triggerall = roundstate >= 2
triggerall = WinKo && NumHelper(9994)=0
trigger1 = (stateno = [1000, 2999])&&movetype!=H&&Movetype=A  
ID = 9994
stateno = 9995
postype = back
pos = 0,0
pausemovetime = 999999
supermovetime = 999999
ignorehitpause = 1
ownpal = 1
persistent=0

[State -3, Finish Hit Explod - Helper]
type = Helper
triggerall = roundstate >= 2
triggerall = WinKo && !NumHelper(9994);=0
trigger1 = (stateno = [3000, 4999])&&movetype!=H 
helpertype = Normal
name = "Finish Hit Explod"
id = 9994
pos = 0, 0
postype = p1
facing = 0
stateno = 9996
keyctrl = 0
ownpal = 1
supermovetime = 999999
pausemovetime = 999999
ignorehitpause = 1
persistent=0

