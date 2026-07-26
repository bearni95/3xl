[Statedef 3000, burning attack]
type = S
movetype = A
physics = S
anim = 3000
poweradd = -1000
velset = 0
ctrl = 0
sprpriority = 2

;[state 2300, super a]
;type = superpause
;trigger1 = time = 0
;time = 75
;anim = -1
[State 3000, Black BG]
type = Explod
trigger1 = Time = 0
removetime = -1
id = 6035
anim = 6035
pos = 0,0
postype = Left
scale = 1,1
sprpriority = -99999
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
persistent = 1
supermovetime = 60
pausemovetime =  60
[State 0, Helper]
type = Helper
trigger1=!time
helpertype = normal ;player
name = "Super Fx"
ID = 2061
stateno = 2061
pos = 30, -83
postype = p1
facing = 1
keyctrl = 0
ownpal = 1
supermovetime = 48
[State 0, Helper]
type = Helper
trigger1 =time=0
helpertype = normal ;player
name = "portrait"
ID = 6033
stateno = 6033
postype = back
facing = 1
keyctrl = 0
ownpal = 1
supermovetime = 99999
size.xscale =.5
size.yscale =.5
[State 6034, HyperBG]
type=helper
trigger1 = AnimElem =9
helpertype=normal
stateno=6031
ID=6034
name="HyperBG"
postype=Back
supermovetime=99999
pausemovetime=99999
ownpal=1
ignorehitpause=1
size.xscale=.6
size.yscale=.6
[State 0,LV1]
type=afterimage
trigger1=Time=5
time = 999
timegap = 1
framegap = 10
length = 30
paladd = 0, 0, 0
palmul = 0.75, 0.75, 0.75
palcontrast = 128, 128, 128
palpostbright = 0, 0, 0
trans = add1
[State 3000, Super Pause]
type = superpause
trigger1 = time=0
time =60
movetime = 60
anim = -1
sound = s3100, 0
p2defmul = 1
darken = 0

;[State 2300, juggle]
;type = AssertSpecial
;trigger1 = 1
;flag = nojugglecheck

;[State 2300, Aura1]
;type = Explod
;trigger1 = animelem = 1
;anim = 1226
;sprpriority = 5
;postype = p1
;pos = 0,0;
;bindtime = -1
;removetime = 87
;removeongethit = 1
;supermove = 1

[State 2300, dust]
type = Explod
trigger1 = AnimElem = 1
anim = 2216
ID = 2216
postype = p1
pos = -25,0
bindtime = -1
sprpriority = 5
supermovetime = 52
ownpal = 1
removeongethit = 1
facing = -1

[State 2300, 1];w—­‚ß‚é‰¹x
type = PlaySnd
trigger1 = AnimElem = 1
value = 20,0

[State 2300, 1];w—­‚ß‚é‰¹x
type = PlaySnd
trigger1 = AnimElem = 5
value = 2000,5

[State 2300, 1];wŒ‚‚Â‰¹x
type = PlaySnd
trigger1 = AnimElem = 1
value = 1000,2

[State 2300, 1];wŒ‚‚Â‰¹x
type = PlaySnd
trigger1 = AnimElem = 4
value = 1400,0

[State 2300, StopSnd]
type = StopSnd
trigger1 = animelem = 4
channel = 4

[State 0, finish buster]
type = Helper
trigger1 = anim=3000&&animelem = 9
helpertype = normal
name = "finishbuster"
ID = 3005;8030
stateno =3005; 8030
pos = 30,-70
postype = p1
facing = 1
keyctrl = 0
ownpal = 1
size.xscale = .5
size.yscale = .5
sprpriority = 3

[State 2200, dust]
type = explod
trigger1 = animelem = 5;time = 25
anim = 2215
pos = 17,5
sprpriority = 5
bindtime = 1
ownpal = 1
removeongethit = 1
facing = -1
removetime = 66

[State 2300, 3]
type = ChangeState
trigger1 = animtime = 0
value = 0
ctrl = 1


[Statedef 3010, burning attack]
type=A
physics=N
movetype=A
anim=3010
ctrl=0
velset=0,0
sprpriority=1
poweradd=-1000

[State 0, Helper]
type = Helper
trigger1 =time=0
helpertype = normal ;player
name = "portrait"
ID = 6033
stateno = 6033
postype = back
facing = 1
keyctrl = 0
ownpal = 1
supermovetime = 99999
size.xscale =.5
size.yscale =.5

[State 3050, strengthvar]
type=varset
trigger1= var(10)!=5
var(10)=5


[State 3050, ECreset]
type=palfx
trigger1= !time
trigger1= !(var(20):=0)
time=1
[State 3000, Black BG]
type = Explod
trigger1 = Time = 0
removetime = -1
id = 6035
anim = 6035
pos = 0,0
postype = Left
scale = 1,1
sprpriority = -99999
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
persistent = 1
supermovetime = 60
pausemovetime =  60
[State 0, Helper]
type = Helper
trigger1=!time
helpertype = normal ;player
name = "Super Fx"
ID = 2061
stateno = 2061
pos = 30,-70
postype = p1
facing = 1
keyctrl = 0
ownpal = 1
supermovetime = 48
[State 6030, HyperBG]
type=helper
trigger1 = AnimElem =3
helpertype=normal
stateno=6030
ID=6030
name="HyperBG"
postype=Back
supermovetime=99999
pausemovetime=99999
ownpal=1
ignorehitpause=1
size.xscale=.75
size.yscale=.75
[State 3050, Super Pause]
type = superpause
trigger1 = time=0
time = 60
anim = -1
sound = s3100,0
p2defmul = 1
darken = 0
movetime = 60

[State 2300, 1];w—­‚ß‚é‰¹x
type = PlaySnd
trigger1 = AnimElem = 1
value = 20,0

[State 2300, 1];w—­‚ß‚é‰¹x
type = PlaySnd
trigger1 = AnimElem = 5
value = 2000,5

[State 2300, 1];wŒ‚‚Â‰¹x
type = PlaySnd
trigger1 = AnimElem = 1
value = 1000,2

[State 2300, 1];wŒ‚‚Â‰¹x
type = PlaySnd
trigger1 = AnimElem = 4
value = 1400,0

[State 2300, StopSnd]
type = StopSnd
trigger1 = animelem = 4
channel = 4

[State 3050, nhb]
type=nothitby
trigger1= animelemtime(6)<1
time=1
value=SCA

[State 3050, hadouken]
type=helper
trigger1= animelem=7
helpertype=normal
stateno=3015
ID=3015
name="burningattack"
postype=p1
pos=43,-40
ownpal=1
size.xscale = .5;1
size.yscale = .5;1
;scale =.5,.5

[State 3050, snd]
type=playsnd
trigger1= animelem=8
value=4,0
channel=0
[State 3050, snd]
type=playsnd
trigger1= animelem=8
value=5,0
channel=5

[State 3050, vel]
type=velset
trigger1= animelem=8
x=-1.5
y=-6
[State 3050, sts]
type=statetypeset
trigger1= animelemtime(8)>0
physics=A
;---------------------------------------------------
;BURNING SLASH
[Statedef 3020]
type    = S
movetype= A
physics = S
velset = 0,0
ctrl = 0
poweradd = -1000
anim = 3020
sprpriority = 2

;[State 3020, Pause]
;type = SuperPause
;trigger1 = AnimElem = 1
;time = 35
;movetime = 35
;anim = -1
[State 3000, Black BG]
type = Explod
trigger1 = Time = 0
removetime = -1
id = 6035
anim = 6035
pos = 0,0
postype = Left
scale = 1,1
sprpriority = -99999
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
persistent = 1
supermovetime = 60
pausemovetime =  60
[State 0, Helper]
type = Helper
trigger1=!time
helpertype = normal ;player
name = "Super Fx"
ID = 2061
stateno = 2061
pos = -30, -83
postype = p1
facing = 1
keyctrl = 0
ownpal = 1
supermovetime = 48
[State 0, Helper]
type = Helper
trigger1 =time=0
helpertype = normal ;player
name = "portrait"
ID = 6033
stateno = 6033
postype = back
facing = 1
keyctrl = 0
ownpal = 1
supermovetime = 99999
size.xscale =.5
size.yscale =.5
[State 6034, HyperBG]
type=helper
trigger1 = AnimElem =4
helpertype=normal
stateno=6031
ID=6034
name="HyperBG"
postype=Back
supermovetime=99999
pausemovetime=99999
ownpal=1
ignorehitpause=1
size.xscale=.6
size.yscale=.6
[State 0,LV1]
type=afterimage
trigger1=Time=5
time = 999
timegap = 1
framegap = 10
length = 30
paladd = 0, 0, 0
palmul = 0.75, 0.75, 0.75
palcontrast = 128, 128, 128
palpostbright = 0, 0, 0
trans = add1
[State 3000, Super Pause]
type = superpause
trigger1 = time=0
time =50
movetime = 50
anim = -1
sound = s3100, 0
p2defmul = 1
darken = 0

[State 3020, push]
type = playerpush
Trigger1 = AnimElem = 5, >= 1 ;&& AnimElem = 6, <= 1;Time >= 0
value = 0

[State 3020, muteki]
type = NotHitBy
trigger1 = Time = 0
value = SCA
time = 40

[State 3020, playsnd]
type = PlaySnd
trigger1 = AnimElem = 1
value = 3000,10
volume = 255


[State 3020, PlaySnd]
type = PlaySnd
trigger1 = AnimElem = 10
value = 100,2

[State 3020, 1]
type = PosAdd
trigger1 = Time > 51
x = 6

[State 3020, 2]
type = VelSet
trigger1 = Time = 51
x = 35

[State 3020, 3]
type = VelAdd
trigger1 = Time > 51
x = .15

[State 3020, AfterImage]
type = AfterImage
trigger1 = AnimElem = 4
time = 20
FrameGap = 2
length = 12
PalBright   =   0,  0,  0
PalContrast = 128,128,128
PalAdd      =   0,  0,  0
PalMul      =  1,1,1
Trans = Add1

[State 3020, dust1]
type = Explod
trigger1 = AnimElem = 5
anim = 4010
ID = 3005
postype = p1
pos = 0,0
bindtime = 1
sprpriority = 5
ownpal = 1

[state 3020, dust2]
type = explod
trigger1 = Time = 40
pos = 10,0
spacing = 1
anim = 4030
bindtime = -1
ownpal = 1

[State 3020, hit]
type = hitdef
trigger1 = time=0
attr = S, ha
damage = 150,0
animtype = light
hitflag = maf
guardflag = ma
numhits = 0
sparkno = -1
guard.sparkno = -1
sparkxy = 0,-70
hitsound = -1
guardsound = -1
pausetime = 0,0
ground.hittime = 15
ground.type = high
ground.slidetime = 5
ground.velocity = 0,0
air.velocity = 0,0
p2facing = 1
kill = 0

[State 3020, win]
type = ChangeState
triggerall = win
trigger1 = movecontact = 1
value = 3021

[State 3020, guarded]
type = ChangeState
trigger1 = moveguarded; && p2Life > 1
trigger2 = movecontact = 1
trigger2 = p2name = "biohazard" || p4name = "biohazard"
value = 3021

[State 3020, hit]
type = ChangeState
trigger1 = movehit = 1
;trigger2 = moveguarded && p2Life = 1
value = 3022

[State 3020, end]
type = ChangeState
trigger1 = Animtime = 0
value =3023
ctrl = 1

;---------------------------------
;move guarded 
[Statedef 3021]
type    = S
movetype= A
physics = S
velset = 0,0
ctrl = 0
anim = 3021

[State 3021, pos]
type = Posadd
trigger1 = Animelem = 1 , =1
x = p2bodydist X + 85

[state 3021, shake]
type = envshake
trigger1 = moveguarded = 1
Trigger1 = AnimElem = 1, >= 1 && AnimElem = 5, <= 1
time = 8
freq = 8
ampl = 3
ignorehitpause = 0

[State 3021, hit1]
type = hitdef
trigger1 = AnimElem = 2
attr = S, ha
damage = 5,5
animtype = light
hitflag = maf
guardflag = ma
numhits = 0
sparkno = s(8800+random%64)
guard.sparkno = s7001
sparkxy = -20,-60
hitsound = S1,6
guardsound = S3,0
pausetime = 10,20
ground.hittime = 15
ground.type = high
ground.slidetime = 5
ground.velocity = 0,0
air.velocity = 0,0
p2facing = 1
envshake.time = 12
envshake.ampl = 8
envshake.freq = 100

[State 3021, hit2]
type = hitdef
trigger1 = AnimElem = 3
attr = S, ha
damage = 5,5
animtype = light
hitflag = maf
guardflag = ma
numhits = 0
sparkno = s(8800+random%64)
guard.sparkno = s7001
sparkxy = -20,-75
hitsound = S1,6
guardsound = S3,0
pausetime = 10,20
ground.hittime = 15
ground.type = high
ground.slidetime = 5
ground.velocity = 0,0
air.velocity = 0,0
p2facing = 1
envshake.time = 12
envshake.ampl = 8
envshake.freq = 100

[State 3021, hit3]
type = hitdef
trigger1 = AnimElem = 4
attr = S, ha
damage = 5,5
animtype = light
hitflag = maf
guardflag = ma
numhits = 0
sparkno = s(8800+random%64)
guard.sparkno = s7001
sparkxy = -10,-45
hitsound = S1,6
guardsound = S3,0
pausetime = 10,20
ground.hittime = 15
ground.type = high
ground.slidetime = 5
ground.velocity = 0,0
air.velocity = 0,0
p2facing = 1
envshake.time = 12
envshake.ampl = 8
envshake.freq = 100

[State 3021, hit4]
type = hitdef
trigger1 = AnimElem = 5
attr = S, ha
damage = 5,5
animtype = light
hitflag = maf
guardflag = ma
numhits = 0
sparkno = s(8800+random%64)
guard.sparkno = s7001
sparkxy = -20,-60
hitsound = S1,6
guardsound = S3,0
pausetime = 10,20
ground.hittime = 15
ground.type = high
ground.slidetime = 5
ground.velocity = 0,0
air.velocity = 0,0
p2facing = 1
fall = 1
fall.recover = 0
envshake.time = 12
envshake.ampl = 8
envshake.freq = 100

[State 3021, sword]
type = PlaySnd
trigger1 = animelem = 8
value = 700,1

[State 3021, end]
type = ChangeState
trigger1 = Animtime = 0
value = 0
ctrl = 1

;movehit
[Statedef 3022]
type    = S
movetype= A
physics = S
velset = 0,0
ctrl = 0
anim = 3022

[State 3250, Target]
type = TargetState
trigger1 = time = 0
value = 3025;2150

[State 3022, Pause]
type = superpause
trigger1 = time = 0
time = 40
movetime = 40
anim = -1

[State 3022, color]
type = EnvColor
trigger1 = time = 0
value = 0,0,0
time = 40
under = 0
ignorehitpause = 1

[State 3022, slash1]
type = Explod
trigger1 = time = 0
anim =  (8800+random%64)
sprpriority = 5
postype = p2
pos = 0,-60
bindtime = -1
removeongethit = 1
supermove = 1
ontop = 1
facing = -1

[State 3022, slash2]
type = Explod
trigger1 = time = 10
anim =  (8800+random%64)
sprpriority = 5
postype = p2
pos = 0,-60
bindtime = -1
removeongethit = 1
supermove = 1
ontop = 1
facing = -1

[State 3022, slash3]
type = Explod
trigger1 = time = 20
anim =  (8800+random%64)
sprpriority = 5
postype = p2
pos = 0,-60
bindtime = -1
removeongethit = 1
supermove = 1
ontop = 1
facing = -1

[State 3022, slash3]
type = Explod
trigger1 = time = 30
anim =  (8800+random%64)
sprpriority = 5
postype = p2
pos = 0,-60
bindtime = -1
removeongethit = 1
supermove = 1
ontop = 1
facing = -1

[State 3022, sound]
type = PlaySnd
trigger1 = time = 0
trigger2 = time = 20
value = s1100,3

[State 3022, sound]
type = PlaySnd
trigger1 = time = 10
trigger2 = time = 30
value = s1100,4

[State 3022, HitAdd]
type = HitAdd
trigger1 = time = 0
trigger2 = time = 10
trigger3 = time = 20
trigger4 = time = 30
value = 1

[State 3022, muteki]
type = NotHitBy
trigger1 = 1
value = SCA

[State 3022, width]
type = width
trigger1 = 1
edge = 75,0

[State 3022, pos]
type = Posadd
trigger1 = Animelem = 1 , =1
x = p2bodydist X + 85

[State 3022, bind]
type = TargetBind
Trigger1 = AnimElem = 1, >= 1 && AnimElem = 6, <= 1
pos =  -85,0

[State 3020, voice];w‚¨‘O‚Í‚à‚¤I‚í‚è‚¾Iv
type = PlaySnd
trigger1 = Time = 70
value = 1000,3
volume = 255

[State 3022, sword]
type = PlaySnd
trigger1 = animelem = 3
value = 700,1

[State 3022, fall]
type = PlaySnd
trigger1 = animtime = 0
value = 5110,0

[State 3022, blood]
type = PlaySnd
trigger1 = time = 185
value = 3000,11
volume = 255

[State 3022, blood]
type = Explod
trigger1 = time = 180
anim = (8800+random%25);l4603
sprpriority = 5
postype = p2
pos = -5,-70
bindtime = -1
removeongethit = 1
supermove = 1
ontop = 1

[State 3022, end]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1


;IDLE STATE
[Statedef 3023]
type    = S
movetype= A
physics = S
ctrl = 0
anim = 3023

[State 2110, 1]
type = VelSet
trigger1 = Time = 0
x = 5
y = 0

[State 2110, 3]
type = VelAdd
trigger1 = Time > 0
x = .15

[state 2110, 2]
type = posset
trigger1 = time = 0
y = 0

[State 2110, stop]
type = VelSet
trigger1 = time = 8
x = 0
y = 0

[State 2110, landdust1]
type = explod
trigger1 = Time = 1
postype = p1
pos = -17,0
spacing = 1
anim = 4010
ownpal = 1
scale = .5, .5

[State 2110, landdust]
type = explod
trigger1 = Time = 1
postype = p1
pos = 20,0
facing = -1
spacing = 1
anim = 4010
ownpal = 1
scale = .5, .5

[State 2110, e]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;P2stateno
[Statedef 3025]
type    = S
movetype= H
physics = N
velset = 0,0

[State 2150, 1]
type = PosSet
trigger1 = 1
y = 0

[State 2150, HitBy]
type = NotHitBy
trigger1 = 1
value = SCA

[State 2150, push]
type = PlayerPush
trigger1 = 1
value = 1

[State 2150, p2]
type = ChangeAnim2
Trigger1 = Time = 0
value = 3025;2150

[State 2150, hitvoice]
type = PlaySnd
trigger1 = Time = 146
triggerall = alive = 1
value = 5000,1

[State 2150, life1]
type = lifeadd
trigger1 = time = 145
value = -65

[State 2150, life2]
type = lifeadd
trigger1 = time = 145
value = -65
absolute = 1

[State 2150, turn]
type = Turn
trigger1 = animtime = 0

[State 2150, change]
type = SelfState
trigger1 = animtime = 0 && alive
value = 5120
;ctrl = 1

[State 2150, dead]
type = SelfState
trigger1 = animelem = 6 && !alive
value = 5150
ctrl = 0

;FINAL BUSTER
[Statedef 3100]
type    = S
movetype= A
physics = S
velset = 0,0
ctrl = 0
poweradd = -2000
anim = 3100
sprpriority = 0
juggle = 1

[State 3000, Black BG]
type = Explod
trigger1 = Time = 0
removetime = -1
id = 6035
anim = 6035
pos = 0,0
postype = Left
scale = 1,1
sprpriority = -99999
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
persistent = 1
supermovetime = 60
pausemovetime =  60
[State 0, Helper]
type = Helper
trigger1=!time
helpertype = normal ;player
name = "Super Fx"
ID = 2062
stateno = 2062
pos = 0,-60
postype = p1
facing = 1
keyctrl = 0
ownpal = 1
supermovetime = 48
[State 0, Helper]
type = Helper
trigger1 =time=0
helpertype = normal ;player
name = "portrait"
ID = 6036
stateno = 6036
postype = back
facing = 1
keyctrl = 0
ownpal = 1
supermovetime = 99999
size.xscale =.5
size.yscale =.5
[State 6034, HyperBG]
type=helper
trigger1 = AnimElem =5
helpertype=normal
stateno=6031
ID=6034
name="HyperBG"
postype=Back
supermovetime=99999
pausemovetime=99999
ownpal=1
ignorehitpause=1
size.xscale=.6
size.yscale=.6
[State 0,LV1]
type=afterimage
trigger1=Time=5
time = 999
timegap = 1
framegap = 10
length = 30
paladd = 0, 0, 0
palmul = 0.75, 0.75, 0.75
palcontrast = 128, 128, 128
palpostbright = 0, 0, 0
trans = add1
[State 3000, 8]
type = SuperPause
trigger1 = AnimElem = 1
time = 45
movetime = 45
anim = -1
sound = s3100, 1
p2defmul = 1
darken = 0

[State 0, Explod]
type = Explod
trigger1 =animelem=3
anim = 7061
ID = 7061
pos = 0,5
postype = p1
bindtime = -1
removetime = 30
pausemovetime = 45
supermovetime = 45
scale = 1,1
sprpriority = 5
ownpal = 1
removeongethit = 1

[State 3000, flash]
type = PalFX
triggerall = var(10) = 0
trigger1 = time >= 3; && AnimElem = 3, <= 1
trigger1 = TimeMod = 4,0
trigger1 = Time > 0
time = 1
add = 100,100,100

[State 3000, 1]
type = playerpush
trigger1 = Time >= 0
value = 0

[State 3000, 2]
type = NotHitBy
trigger1 = Time = 0
value = SCA
time = 15

[State 3000, playsnd]
type = PlaySnd
trigger1 = AnimElem = 1
value =s100,5


[State 3000, playsnd];ws‚­‚¼[IIv
type = PlaySnd
trigger1 = Time = 1
value = s1,13



[State 3000, e]
type = ChangeState
trigger1 = time=30
value = 3101

;-----------------------------“Ëi
[Statedef 3101]
type    = S
movetype= A
physics = S
velset = 0,0
ctrl = 0
anim = 3101

[State 1600, 1]
type = NotHitBy
trigger1 = Time = 0
value = SCA
time = 8

[State 1200, PlaySnd]
type = PlaySnd
trigger1 = Time = 0
value = s0,3

[State 3005, 1]
type = PosAdd
trigger1 = Time > 2
x = 6

[State 3005, 2]
type = VelSet
trigger1 = Time = 2
x = 15

[State 3005, 3]
type = VelAdd
trigger1 = Time > 2
x = .15

[State 3005, AfterImage]
type = AfterImage
trigger1 = Time = 0
time = 20
FrameGap = 2
length = 12
PalBright   =   0,  0,  0
PalContrast = 128,128,128
PalAdd      =   0,  0,  0
PalMul      =  1,1,1
Trans = Add1


[State 3005, hit]
type = hitdef
trigger1= !((EnemyNear, StateNo = 5040) && !(EnemyNear, Ctrl))
trigger1 = !Time
attr = S,HT
damage = 0,0
animtype = Hard
air.animtype = Back
fall.animtype = Back
guardflag = MA
hitflag = MAF
priority= 4,Hit
pausetime = 1,1
sparkno = -1
guard.sparkno = s7001 
guard.sparkxy = (var(22) := 32), var(23):= -87
sparkxy = -19+ 0 * (var(22) := 53),-75+ 0 * (var(23):= -39)
hitsound = -1
guardsound = s2,0
ground.type = Low
ground.slidetime = 17
ground.hittime  = 17
ground.velocity = 0
guard.pausetime  = 2,2
guard.slidetime = 17
guard.hittime = 17
guard.ctrltime = 19
air.type = High
air.velocity = 0,0
air.hittime = 13
getpower= 0,0
givepower = 36,36
yaccel = .5
airguard.ctrltime = 16
fall=0
air.fall=1
air.fall.recover=0
ground.cornerpush.veloff = 0
guard.cornerpush.veloff = 0
air.cornerpush.veloff = 0
airguard.cornerpush.veloff = 0
down.cornerpush.veloff = 0
kill=0
;p1stateno=3102
forcestand=1
p2stateno= 3060



[State 3005, 4]
type = ChangeState
trigger1 = moveguarded=1
value = 3205
ctrl=0

[State 3005, 4]
type = ChangeState
trigger1 = movehit = 1
value = 3102

[State 3005, end]
type = ChangeState
trigger1 = Animtime = 0
value = 0
ctrl=1

;---------------------------------
[Statedef 3102]
type    = S
movetype= A
physics = S
velset = 0,0
ctrl = 0
anim = 3102
sprpriority = 0


[State 3050, muteki]
type = NotHitBy
trigger1 = 1
value = SCA

[State 3050, width]
type = width
trigger1 = 1
edge = 75,0

[State 3050, bind]
type = TargetBind
Trigger1 = AnimElem = 1, >= 1 && AnimElem = 8, <= 1
pos =  70,0



[state 3020, speedline2]
type = explod
trigger1 = time = 0
anim = 6100
postype = back
pos = 0,0
bindtime = -1
supermove = 1
sprpriority = -4
ontop = 0
ownpal = 1
removetime = 100
scale = 2.575, 1.075



[State 2300, 1];w—­‚ß‚é‰¹x
type = PlaySnd
trigger1 = AnimElem = 17
value = 20,0

[State 2300, 1];w—­‚ß‚é‰¹x
type = PlaySnd
trigger1 = AnimElem = 22
value = 2000,5


[State 3050, hit]
type = hitdef
trigger1 = AnimElem = 4
attr = S, HP
damage = 75,10
animtype = heavy
hitflag = MAf
snap = 70,0
sparkno = s8900+(random%8)
guard.sparkno = s7001
sparkxy = 0,-80
guardflag = MA
hitsound = S1100,3
guardsound = S2,0
pausetime = 12,25
ground.hittime = 15
ground.type = low
ground.slidetime = 5
ground.velocity = 0,0
air.velocity = 0,0
envshake.time = 20
envshake.ampl = 6
kill = 0
p2facing = 1
forcestand =1
;p2stateno= 3060



[state 1710, 1]
type = hitdef
trigger1 = animelem = 9
attr = S, HA
damage = 75, 20
animtype = heavy
guarDFlag = ma
hitflag = maf
priority = 7
pausetime = 10,15
sparkno = s8900+(random%8)
sparkxy = -50,-80
hitsound = s1100,4
guardsound = s2,0
ground.type = high
ground.slidetime = 5
ground.hittime  = 30
ground.velocity = -1, -11
airguard.velocity = -1.9,-.8     
air.velocity =  -1, -11
fall = 1
fall.recover = 0                     
envshake.time = 20
envshake.freq = 70
envshake.ampl = -6
envshake.phase = 30
kill = 1

[state 2300, super a]
type = pause
trigger1 = animelemtime(15)=23
time = 80
movetime = 80
anim = -1

[State 2300, 1];wŒ‚‚Â‰¹x
type = PlaySnd
trigger1 = AnimElem = 17
value = s3000,0

[State 2300, 1];wŒ‚‚Â‰¹x
type = PlaySnd
trigger1 = AnimElem = 16
value = s1000,1

[State 2300, 1];wŒ‚‚Â‰¹x
type = PlaySnd
trigger1 = AnimElem = 19
value = s3250,0

[State 0]
type = PlaySnd
trigger1 = animelem = 15
value = S1,13


[State 0, Explod]
type = Explod
trigger1 =animelem=15
anim = 7060
ID = 7060
pos = 0,5
postype = p1
bindtime = -1
removetime = 160
pausemovetime = 9999
supermovetime = 9999
scale = 1,1
sprpriority = 5
ownpal = 1
removeongethit = 1


[State 0, Explod]
type = Explod
trigger1 =animelem=18
anim = 3030
ID = 3030
pos = 40,-100
postype = p1
bindtime = -1
removetime = 45
pausemovetime = 99999
supermovetime = 99999
scale = .5,.5
sprpriority =1
ownpal = 1
removeongethit = 1

[State 0, Helper]
type = Helper
trigger1 = animelem=19
helpertype = normal ;player
name = "superkamehameha"
ID = 3150
stateno = 3150
pos = 0,0
postype = p1    ;p2,front,back,left,right
facing = 1
keyctrl = 0
ownpal = 0
supermovetime = 9999999
pausemovetime = 9999999

[State 3050, env]
type = EnvColor
trigger1 = AnimElem = 3
trigger2 = AnimElem = 8
value = 245,245,245
ignorehitpause = 1
time = 1


[State 1200, 3]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1


;---------------------------------------------------
[Statedef 3200, heatdome]
type    = S
movetype= A
physics = S
velset = 0,0
ctrl = 0
poweradd = -3000
anim = 3100
sprpriority = 0
juggle = 1


[State 3000, Black BG]
type = Explod
trigger1 = Time = 0
removetime = -1
id = 6035
anim = 6035
pos = 0,0
postype = Left
scale = 1,1
sprpriority = -99999
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
persistent = 1
supermovetime = 60
pausemovetime =  60
[State 0, Helper]
type = Helper
trigger1=!time
helpertype = normal ;player
name = "Super Fx"
ID = 2063
stateno = 2063
pos = 0,-60
postype = p1
facing = 1
keyctrl = 0
ownpal = 1
supermovetime = 48
[State 7500, portrait]
type=helper
trigger1=!time
helpertype=normal
stateno=7510
ID=7510
name="Super Charge Portrait"
postype=p1
supermovetime=300
ownpal=1
[State 6034, HyperBG]
type=helper
trigger1 = AnimElem =4
helpertype=normal
stateno=6031
ID=6034
name="HyperBG"
postype=Back
supermovetime=99999
pausemovetime=99999
ownpal=1
ignorehitpause=1
size.xscale=.6
size.yscale=.6
[State 0,LV1]
type=afterimage
trigger1=Time=5
time = 999
timegap = 1
framegap = 10
length = 30
paladd = 0, 0, 0
palmul = 0.75, 0.75, 0.75
palcontrast = 128, 128, 128
palpostbright = 0, 0, 0
trans = add1
[State 3000, 8]
type = SuperPause
trigger1 = AnimElem = 1
time = 45
movetime = 45
anim = -1
sound = s3100,2
p2defmul = 1
darken = 0

[State 0, Explod]
type = Explod
trigger1 =animelem=3
anim = 7060
ID = 7060
pos = 0,5
postype = p1
bindtime = -1
removetime = 30
pausemovetime = 45
supermovetime = 45
scale = 1,1
sprpriority = 5
ownpal = 1
removeongethit = 1

[State 3000, flash]
type = PalFX
triggerall = var(10) = 0
trigger1 = time >= 3; && AnimElem = 3, <= 1
trigger1 = TimeMod = 4,0
trigger1 = Time > 0
time = 1
add = 100,100,100

[State 3000, 1]
type = playerpush
trigger1 = Time >= 0
value = 0

[State 3000, 2]
type = NotHitBy
trigger1 = Time = 0
value = SCA
time = 15

[State 3000, playsnd]
type = PlaySnd
trigger1 = AnimElem = 1
value =s100,5


[State 3000, playsnd];ws‚­‚¼[IIv
type = PlaySnd
trigger1 = Time = 1
value = s1,13


[State 3000, e]
type = ChangeState
trigger1 = time=30
value = 3201

;-----------------------------“Ëi
[Statedef 3201]
type    = S
movetype= A
physics = S
velset = 0,0
ctrl = 0
anim = 3101

[State 1600, 1]
type = NotHitBy
trigger1 = Time = 0
value = SCA
time = 8


[State 3005, 1]
type = PosAdd
trigger1 = Time > 2
x = 6

[State 3005, 2]
type = VelSet
trigger1 = Time = 2
x = 15

[State 3005, 3]
type = VelAdd
trigger1 = Time > 2
x = .15

[State 3005, AfterImage]
type = AfterImage
trigger1 = Time = 0
time = 20
FrameGap = 2
length = 12
PalBright   =   0,  0,  0
PalContrast = 128,128,128
PalAdd      =   0,  0,  0
PalMul      =  1,1,1
Trans = Add1


[State 3005, hit]
type = hitdef
trigger1 = AnimElem = 1
trigger2 = AnimElem = 7
attr = S, ha; SP
damage = 0,0
animtype = light
hitflag = maf
guardflag = ma
numhits = 0
sparkno = -1
guard.sparkno = s7030
sparkxy = 0,-70
hitsound = -1
guardsound = S6,0
pausetime = 0,0
ground.hittime = 15
ground.type = high
ground.slidetime = 5
ground.velocity = 0,0
air.velocity = 0,0
p2facing = 1
kill = 0
p2stateno= 3060



[State 3005, 4]
type = ChangeState
triggerall = var(10) = 0 || var(10) != 0
trigger1 = moveguarded; = 1
value = 3205
ctrl=1

[State 3005, 4]
type = ChangeState
trigger1 = movehit;movehit = 1
value = 3202

[State 3005, end]
type = ChangeState
trigger1 = Animtime = 0
value = 0
ctrl=1

;---------------------------------
[Statedef 3202]
type    = S
movetype= A
physics = S
velset = 0,0
ctrl = 0
anim = 3202
sprpriority=0


[State 6034, HyperBG]
type=helper
trigger1 = AnimElem =10
helpertype=normal
stateno=6032
ID=6034
name="HyperBG"
postype=Back
supermovetime=99999
pausemovetime=99999
ownpal=1
ignorehitpause=1
size.xscale=.6
size.yscale=.6

[State 3050, muteki]
type = NotHitBy
trigger1 = 1
value = SCA

[State 3050, width]
type = width
trigger1 = 1
edge = 75,0

[State 3050, bind]
type = TargetBind
Trigger1 = AnimElem = 1, >= 1 && AnimElem = 8, <= 1
pos =  70,0


[State 3050, hit]
type = hitdef
trigger1 = AnimElem = 4
attr = S, HP
damage = 75,10
animtype = heavy
hitflag = MAf
snap = 70,0
sparkno = s7030+(random%8)
guard.sparkno = s7001
sparkxy = 0,-80
guardflag = MA
hitsound = S200,1
guardsound = S6,0
pausetime = 12,25
ground.hittime = 15
ground.type = low
ground.slidetime = 5
ground.velocity = 0,0
air.velocity = 0,0
envshake.time = 20
envshake.ampl = 6
kill = 0
p2facing = 1
;p2stateno= 3060



[state 1710, 1]
type = hitdef
trigger1 = animelem = 9
attr = S, HA
damage = 75, 20
animtype = heavy
guarDFlag = ma
hitflag = maf
priority = 7
pausetime = 10,15
sparkno = s7030+(random%8)
sparkxy = -50,-80
hitsound = S5,8
guardsound = s120,0
ground.type = high
ground.slidetime = 5
ground.hittime  = 30
ground.velocity = 1, -15
airguard.velocity = -1.9,-.8     
air.velocity =  1, -15
fall = 1
fall.recover = 0                     
envshake.time = 20
envshake.freq = 70
envshake.ampl = -6
envshake.phase = 30
kill = 1

[State 0, Pause]
type = Pause
trigger1 = animelem=16;!time
time = 110
movetime =110
pausebg = 0

[State 0, PlaySnd]
type = PlaySnd
trigger1 = animelem=16
value = S4001,0



[State 0, Explod]
type = Explod
trigger1 =animelem=15
anim = 7060
ID = 7060
pos = 0,0
postype = p1
bindtime = -1
removetime =160
pausemovetime = 9999999
supermovetime = 9999999
scale = 1,1
sprpriority = 5
ownpal = 1
removeongethit = 1

[State 0, Explod]
type = Explod
trigger1 =animelem=16
anim = 3030
ID = 3030
pos = 0,-120
postype = p1
bindtime = -1
removetime = 35
pausemovetime = 999999
supermovetime = 999999
scale = 1,1
sprpriority = 5
ownpal = 1
removeongethit = 1


[State 0, Helper]
type = Helper
trigger1 = animelem=18
helpertype = normal ;player
name = "heatdome"
ID = 3250
stateno = 3250
pos = 0,0
postype = p1    ;p2,front,back,left,right
facing = 1
keyctrl = 0
ownpal = 0
supermovetime = 99999
pausemovetime = 99999
sprpriority=5
[State 0, PlaySnd]
type = PlaySnd
trigger1 = animelem=18
value = S3250,0

[State 3050, env]
type = EnvColor
trigger1 = AnimElem = 3
trigger2 = AnimElem = 8
value = 245,245,245
ignorehitpause = 1
time = 1


[State 1200, 3]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------ƒ~ƒX‚Á‚½ê‡
[Statedef 3205]
type    = S
movetype= A
physics = S
ctrl = 0
anim = 3205

[State 1730, 1]
type = VelSet
trigger1 = Time = 0
x = -15
y = 0

[State 1730, 3]
type = VelAdd
trigger1 = Time > 0
x = .15

[state 1730, 2]
type = posset
trigger1 = time = 0
y = 0

[State 1730, landdust1]
type = explod
trigger1 = StateNo = 3205 && Time = 1
postype = p1
pos = -17,0
spacing = 1
anim = 7100
ownpal = 1
scale = .5, .5

[State 1730, landdust]
type = explod
trigger1 = StateNo = 3205 && Time = 1
postype = p1
pos = 20,0
facing = -1
spacing = 1
anim = 7100
ownpal = 1
scale = .5, .5

[State 1730, Landing Sound]
type = PlaySnd
trigger1 = animelem = 2
value = s8,0

[State 1730, e]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1
