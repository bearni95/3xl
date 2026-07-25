;===============================
; Helper States
;===============================

;-----------------------
; Dash Effect
[Statedef 700]
anim = 702
velset = 0,0
sprpriority = 2

[State 700, T]
type = trans
trigger1 = 1
trans = addalpha
alpha = 256-(25*time),256

[State 700, AD]
type = angledraw
trigger1 = 1
scale = 0.7+(0.1*time),0.7+(0.1*time)

[State 700, Zeeky]
type = destroyself
trigger1 = time >= 10

;-----------------------
[Statedef 10000]
;Tag Select
ctrl = 1
anim = 1998 ;This Anim SHOULD BE BLANK
velset = 0,0

[State 10000, VarSet]
type = ParentVarSet
trigger1 = Time = 0
var(47) = 0
;0 = No Tag Partner.

[State 10000, Explod]
type = Explod
trigger1 = Time = 0
Anim = 10000
pos = Ifelse(Teamside = 1,50, 205),35
postype = left
ownpal = 1
bindtime = -1
pausemovetime = -1
supermove = 1
;facing = Ifelse(Teamside = 1,1,-1)
ontop = 1
ID = 10000

[State 10000, Explod]
type = Explod
trigger1 = Time = 0
Anim = 10003
pos = Ifelse(Teamside = 1,50, 205),35
postype = left
ownpal = 1
bindtime = -1
removetime = -1
pausemovetime = -1
supermove = 1
;facing = Ifelse(Teamside = 1,1,-1)
ontop = 1
ID = 10000

[State 10000, PlaySnd]
type = PlaySnd
trigger1 = roundstate > 1
trigger2 = parent,command = "a" || parent,command = "b" || parent,command = "c"
trigger3 = parent,command = "x" || parent,command = "y" || parent,command = "z"
value = 10000,1
volume = 255

;The sound that play's when you change the grooves.
[State 10000, PlaySnd]
type = PlaySnd
trigger1 = time = 0
value = 10000,0
volume = 255
channel = 6

;Remove Sesshomaru Select Explod
[State 10000, RemoveExplod]
type = RemoveExplod
trigger1 = time = 0
ID = 10001

;Remove Naraku Select Explod
[State 10000, RemoveExplod]
type = RemoveExplod
trigger1 = time = 0
ID = 10002

;Remove Name Select Explod
[State 10000, RemoveExplod]
type = RemoveExplod
trigger1 = time = 0
ID = 10003

;This will remove this explod when the groove is selected
[State 10000, RemoveExplod]
type = RemoveExplod
trigger1 = roundstate > 1
trigger2 = parent,command = "a" || parent,command = "b" || parent,command = "c"
trigger3 = parent,command = "x" || parent,command = "y" || parent,command = "z"
ID = 10000

;This will change the Helper Select to Sesshomaru
[State 10000, ChangeState]
type = ChangeState
triggerall = time > 10
trigger1 = parent,facing = 1
trigger1 = parent,command = "SelectRight"
trigger2 = parent,facing = -1
trigger2 = parent,command = "SelectLeft"
value = 10001

;This will change the Helper Select to Naraku
[State 10000, ChangeState]
type = ChangeState
triggerall = time > 10
trigger1 = parent,facing = 1
trigger1 = parent,command = "SelectLeft"
trigger2 = parent,facing = -1
trigger2 = parent,command = "SelectRight"
value = 10002

;This will destroy this invisible helper when the groove is selected
[State 10000, DestroySelf]
type = DestroySelf
trigger1 = roundstate > 1
trigger2 = parent,command = "a" || parent,command = "b" || parent,command = "c"
trigger3 = parent,command = "x" || parent,command = "y" || parent,command = "z"

; Bonus power for no strikers
;[State 10000, Powerset]
;type = null;powerset
;triggerall = power <= 1000
;trigger1 = roundstate > 1
;trigger2 = parent,command = "a" || parent,command = "b" || parent,command = "c"
;trigger3 = parent,command = "x" || parent,command = "y" || parent,command = "z"
;value = 1000

;-----------------------
[Statedef 10001]
;Tag Select
ctrl = 1
anim = 1998 ;This Anim SHOULD BE BLANK
velset = 0,0

[State 10000, VarSet]
type = ParentVarSet
trigger1 = Time = 0
var(47) = 1
;1 = Sesshomaru.

[State 10000, Explod]
type = Explod
trigger1 = Time = 0
Anim = 10001
pos = Ifelse(Teamside = 1,50, 205),35
postype = left
ownpal = 1
bindtime = -1
pausemovetime = -1
supermove = 1
;facing = Ifelse(Teamside = 1,1,-1)
ontop = 1
ID = 10001

[State 10000, Explod]
type = Explod
trigger1 = Time = 0
Anim = 10004
pos = Ifelse(Teamside = 1,50, 205),35
postype = left
ownpal = 1
bindtime = -1
pausemovetime = -1
removetime = -1
supermove = 1
;facing = Ifelse(Teamside = 1,1,-1)
ontop = 1
ID = 10001

[State 10000, PlaySnd]
type = PlaySnd
trigger1 = roundstate > 1
trigger2 = parent,command = "a" || parent,command = "b" || parent,command = "c"
trigger3 = parent,command = "x" || parent,command = "y" || parent,command = "z"
value = 10000,1
volume = 255

[State 10000, PlaySnd]
type = PlaySnd
trigger1 = roundstate > 1
trigger2 = parent,command = "a" || parent,command = "b" || parent,command = "c"
trigger3 = parent,command = "x" || parent,command = "y" || parent,command = "z"
value = 10000,2
volume = 255

;The sound that play's when you change the grooves.
[State 10000, PlaySnd]
type = PlaySnd
trigger1 = time = 0
value = 10000,0
volume = 255
channel = 6

;Remove None Select Explod
[State 10000, RemoveExplod]
type = RemoveExplod
trigger1 = time = 0
ID = 10000

;Remove Naraku Select Explod
[State 10000, RemoveExplod]
type = RemoveExplod
trigger1 = time = 0
ID = 10002

;Remove Name Select Explod
[State 10000, RemoveExplod]
type = RemoveExplod
trigger1 = time = 0
ID = 10003

;This will remove this explod when the groove is selected
[State 10000, RemoveExplod]
type = RemoveExplod
trigger1 = roundstate > 1
trigger2 = parent,command = "a" || parent,command = "b" || parent,command = "c"
trigger3 = parent,command = "x" || parent,command = "y" || parent,command = "z"
ID = 10001

;This will change the Helper Select to Naraku
[State 10000, ChangeState]
type = ChangeState
triggerall = time > 10
trigger1 = parent,facing = 1
trigger1 = parent,command = "SelectRight"
trigger2 = parent,facing = -1
trigger2 = parent,command = "SelectLeft"
value = 10002

;This will change the Helper Select to None
[State 10000, ChangeState]
type = ChangeState
triggerall = time > 10
trigger1 = parent,facing = 1
trigger1 = parent,command = "SelectLeft"
trigger2 = parent,facing = -1
trigger2 = parent,command = "SelectRight"
value = 10000

;This will destroy this invisible helper when the groove is selected
[State 10000, DestroySelf]
type = DestroySelf
trigger1 = roundstate > 1
trigger2 = parent,command = "a" || parent,command = "b" || parent,command = "c"
trigger3 = parent,command = "x" || parent,command = "y" || parent,command = "z"

;-----------------------
[Statedef 10002]
;Tag Select
ctrl = 1
anim = 1998 ;This Anim SHOULD BE BLANK
velset = 0,0

[State 10000, VarSet]
type = ParentVarSet
trigger1 = Time = 0
var(47) = 2
;2 = Naraku.

[State 10000, Explod]
type = Explod
trigger1 = Time = 0
Anim = 10002
pos = Ifelse(Teamside = 1,50, 205),35
postype = left
ownpal = 1
bindtime = -1
pausemovetime = -1
supermove = 1
;facing = Ifelse(Teamside = 1,1,-1)
ontop = 1
ID = 10002

[State 10000, Explod]
type = Explod
trigger1 = Time = 0
Anim = 10005
pos = Ifelse(Teamside = 1,50, 205),35
postype = left
ownpal = 1
bindtime = -1
pausemovetime = -1
removetime = -1
supermove = 1
;facing = Ifelse(Teamside = 1,1,-1)
ontop = 1
ID = 10002

[State 10000, PlaySnd]
type = PlaySnd
trigger1 = roundstate > 1
trigger2 = parent,command = "a" || parent,command = "b" || parent,command = "c"
trigger3 = parent,command = "x" || parent,command = "y" || parent,command = "z"
value = 10000,1
volume = 255

[State 10000, PlaySnd]
type = PlaySnd
trigger1 = roundstate > 1
trigger2 = parent,command = "a" || parent,command = "b" || parent,command = "c"
trigger3 = parent,command = "x" || parent,command = "y" || parent,command = "z"
value = 10000,3
volume = 255

;The sound that play's when you change the grooves.
[State 10000, PlaySnd]
type = PlaySnd
trigger1 = time = 0
value = 10000,0
volume = 255
channel = 6

;Remove None Select Explod
[State 10000, RemoveExplod]
type = RemoveExplod
trigger1 = time = 0
ID = 10000

;Remove Sesshomaru Select Explod
[State 10000, RemoveExplod]
type = RemoveExplod
trigger1 = time = 0
ID = 10001

;Remove Name Select Explod
[State 10000, RemoveExplod]
type = RemoveExplod
trigger1 = time = 0
ID = 10003

;This will remove this explod when the groove is selected
[State 10000, RemoveExplod]
type = RemoveExplod
trigger1 = roundstate > 1
trigger2 = parent,command = "a" || parent,command = "b" || parent,command = "c"
trigger3 = parent,command = "x" || parent,command = "y" || parent,command = "z"
ID = 10002

;This will change the Helper Select to None
[State 10000, ChangeState]
type = ChangeState
triggerall = time > 10
trigger1 = parent,facing = 1
trigger1 = parent,command = "SelectRight"
trigger2 = parent,facing = -1
trigger2 = parent,command = "SelectLeft"
value = 10000

;This will change the Helper Select to Sesshomaru
[State 10000, ChangeState]
type = ChangeState
triggerall = time > 10
trigger1 = parent,facing = 1
trigger1 = parent,command = "SelectLeft"
trigger2 = parent,facing = -1
trigger2 = parent,command = "SelectRight"
value = 10001

;This will destroy this invisible helper when the groove is selected
[State 10000, DestroySelf]
type = DestroySelf
trigger1 = roundstate > 1
trigger2 = parent,command = "a" || parent,command = "b" || parent,command = "c"
trigger3 = parent,command = "x" || parent,command = "y" || parent,command = "z"


;----------------------
; Air Parry Helper
[Statedef 853]
type = A
movetype = I
physics = N
anim = 1998
poweradd = 0
juggle = 0
facep2 = 0
hitdefpersist = 0
movehitpersist = 0
hitcountpersist = 0
sprpriority = 2

[State 853: ParentVarSet]
type = ParentVarSet
trigger1 = (!Time)
var(9) = 12;8
ignorehitpause = 1

[State 853: DestroySelf]
type = DestroySelf
trigger1 = (Parent, Command != "holdfwd")

;----------------------
[Statedef 1011]
; Dance of Blades Z Version Blade
; Var Useage:
; Var(1) = Angle
type    = A
movetype= A
physics = N
anim = 1012
juggle = 2
sprpriority = 2

[State 1011, AM]
type = varset
trigger1 = 1
fv = 1
value = root,fvar(10)
ignorehitpause = 1

[State 1011, AM]
type = attackmulset
trigger1 = 1
value = fvar(1)
ignorehitpause = 1

[State 1000, 5]
type = Hitdef
trigger1 = movecontact = 0
attr = A, HP
animtype  = Hard
damage    = ifelse(ishelper(1012)||ishelper(1013),40,75), 0
priority  = 5,Hit
hitflag = MAF
guardflag = MA
pausetime = 3,6
sparkno = s8005+(random%2)
guard.sparkno = s8030
sparkxy = -10,0
hitsound   = s1400,1
guardsound = s6,0
ground.type = High
ground.slidetime = 14
ground.hittime  = 24
ground.velocity = -3,-5.5
air.velocity = -3,-5
fall = 1
getpower = 0,0

[State 1011, DTCB]
type = displaytoclipboard
trigger1 = 1
text = "Angle: %d \t Attack Multiplier: %f"
params = var(1), fvar(1)

[State 1011, VS]
type = varset
trigger1 = (ishelper(1010)||ishelper(1011))
v = 1
value = (time-10)*ifelse(ishelper(1010),2,-2)

[State 1011, VS]
type = varset
trigger1 = (ishelper(1012)||ishelper(1013))
v = 1
value = (time-10)*ifelse(ishelper(1012),4,-4)

[State 1011, VelS]
type = velset
trigger1 = 1
x = 12 * cos(2.0*pi*var(1)/360.0)
y = -12 * sin(3.0*pi*var(1)/360.0)

[State 1401, Direction]
type = AngleSet
trigger1 = 1
value = var(1)

[State 1011, HOR]
type = hitoverride
trigger1 = 1
attr = SCA,AA,AP,AT
time = -1
slot = 6
ignorehitpause = 1

[State 1011, Afterimage]
type = AfterImage
trigger1 = Time = 0
time = 40
timeGap = 2
length = 10
palbright = 30,30,30
palcontrast = 100,100,220
palpostbright = 0,0,0
paladd = 15,15,40
palmul = .65,.65,.80
trans = add

[State 1011, Direction]
type = AngleDraw
trigger1 = 1
scale = 0.5,0.5

[State 1011, HOR]
type = Nothitby
trigger1 = 1
value = SCA

[State 1011, ASS]
type = assertspecial
trigger1 = 1
flag = noshadow
pausetime = 999

[State 1011, Transparency]
type = trans
trigger1 = 1
trans = add

[State 1011, Zeeky]
type = destroyself
trigger1 = time >= 40;frontedgedist < -20

;----------------------
[Statedef 1101]
; Kanna Summon State
type    = S
movetype= I
physics = S
anim = 901
velset = 0,0
ctrl = 0
juggle = 0
sprpriority = 5

[State 1140, NHB]
type = nothitby
trigger1 = 1
value = SCA, AA, AP, AT
ignorehitpause = 1

[State 901, Fade]
type = Trans
trigger1 = time >= 0
trigger1 = time < 4
trans = addalpha
alpha = 64,255

[State 901, Fade]
type = Trans
trigger1 = time >= 4
trigger1 = time < 8
trans = addalpha
alpha = 128,255

[State 901, Fade]
type = Trans
trigger1 = time >= 8
trigger1 = time < 12
trans = addalpha
alpha = 192,255

[State 901, Bye Bye]
type = Changestate
trigger1 = time >= 12
value = 1100+(10*parent,var(20))

;----------------------------------
; Kanna - X version
; Projectile Absorb
; Var(1) = Time remaining
[Statedef 1110]
type    = S
movetype= I
physics = S
velset = 0,0
ctrl = 0
juggle = 0
sprpriority = 4

[State 700, Explod]
type = Explod
trigger1 = time = 0
trigger1 = numexplod(1110) = 0
trigger1 = prevstateno = 1101
ID = 1110
anim = 902
removetime = 69
pos = 3,-38
sprpriority = 5

[State 1110, VS]
type = varset
trigger1 = prevstateno = 1101
trigger1 = time = 0
v = 1
value = 69

[State 1110, VA]
type = varadd
trigger1 = time > 0
v = 1
value = -1

[State 1110, NHB]
type = nothitby
trigger1 = 1
value = SCA, AA, HP, AT
ignorehitpause = 1

[State 1140, HB]
type = hitby
trigger1 = 1
value = SCA, NP, SP
ignorehitpause = 1

[State 2100, HOR]
type = hitoverride
trigger1 = 1
attr = SCA,NP,SP
time = -1
slot = 6
stateno = 1111
ignorehitpause = 1

;--------------------------------------------------------
; Debug Controllers. If these two Sctrls are here, please
; remove them
;--------------------------------------------------------
;[State 1111, PVA]
;type = parentvaradd
;trigger1 = time = 0
;v = 18
;value = 23
;[State 1111, PVA]
;type = parentvaradd
;trigger1 = time = 0
;v = 19
;value = 230
;--------------------------------------------------------
; End of Debug Controllers. Do not remove anything
; Below this line unless otherwise stated.
;--------------------------------------------------------

[State 901, Bye Bye]
type = Changestate
trigger1 = var(1) <= 0
value = 1140

;----------------------------------
; Kanna - X version Hitstate
[Statedef 1111]
type    = S
movetype= I
physics = S
sprpriority = 5

[State 1140, NHB]
type = nothitby
trigger1 = 1
value = SCA, AA, AP, AT
ignorehitpause = 1

[State 1111, PVA]
type = parentvaradd
trigger1 = time = 0
v = 18
value = 1

[State 1111, PVA]
type = parentvaradd
trigger1 = time = 0
v = 19
value = gethitvar(damage)

[State 901, Bye Bye]
type = Changestate
trigger1 = time > 0
trigger1 = var(1) <= 0
value = 1140

[State 901, Bye Bye]
type = Changestate
trigger1 = time > 0
value = 1110

;----------------------------------
; Kanna - Y version
; Projectile Release
; Var(1) = Time remaining
[Statedef 1120]
type    = S
movetype= I
physics = S
velset = 0,0
ctrl = 0
juggle = 0
sprpriority = 3

[State 700, Explod]
type = Explod
trigger1 = time = 0
trigger1 = numexplod(1110) = 0
ID = 1110
anim = 903
removetime = 69
pos = 3,-38
sprpriority = 4

[State 1120, VS]
type = varset
trigger1 = time = 0
v = 18
value = parent,var(18)
[State 1120, VS]
type = varset
trigger1 = time = 0
v = 19
value = parent,var(19)

[State 1120, VA]
type = varadd
trigger1 = time%3 = 0
trigger1 = time > 0
trigger1 = var(18) > 0
v = 18
value = -1

[State 1120, 5]
type = Playsnd
trigger1 = (time-1)%3 = 0
trigger1 = var(18) > 0
trigger1 = var(1) > 0
value = 1120,0
channel = 1

[State 1120, 5]
type = Projectile
trigger1 = (time-1)%3 = 0
trigger1 = var(18) > 0
trigger1 = var(1) > 0
attr = S, SP
projanim = 1120
projid = 1120
projremove = 1
projscale = 0.75,0.75
velocity = 7,-5+(random%6)
projhits = 1
offset = 3,-38
animtype  = Hard
damage    = ceil(parent,var(19)/parent,var(18)), 0
priority  = 5
guardflag = MA
pausetime = 5,5
sparkno = s8010+(random%2)
guard.sparkno = s8030
sparkxy = 0,0
hitsound   = s1120,1
guardsound = s6,0
ground.type = High
ground.slidetime = 12
ground.hittime  = 15
ground.velocity = -4,-3.5
air.velocity = -4,-3
fall = 1
getpower = ceil(90/parent,var(18)),0
ownpal = 1
projsprpriority = 5

[State 1110, VS]
type = varset
trigger1 = time = 0
v = 1
value = 69

[State 1110, VA]
type = varadd
trigger1 = time > 0
v = 1
value = -1

[State 1110, NHB]
type = nothitby
trigger1 = 1
value = SCA, AA, AP, AT
ignorehitpause = 1

[State 901, Bye Bye]
type = Changestate
trigger1 = var(1) <= 0
value = 1140

;----------------------------------
; Kanna - Z version
; Push Back
; Var(1) = Time remaining
[Statedef 1130]
type    = S
movetype= I
physics = S
velset = 0,0
ctrl = 0
juggle = 0
sprpriority = 4

[State 1130, Pusher]
type = helper
trigger1 = time = 0
helpertype = normal
name = "Pushblocker"
ID = 1131
pos = 0,0
postype = p1
stateno = 1131
ownpal = 1
size.height = 518

[State 700, Explod]
type = Explod
trigger1 = time = 0
trigger1 = numexplod(1110) = 0
ID = 1110
anim = 903
removetime = 69
pos = 3,-38
sprpriority = 5

[State 1110, VS]
type = varset
trigger1 = time = 0
v = 1
value = 69

[State 1110, VA]
type = varadd
trigger1 = time > 0
v = 1
value = -1

[State 1110, NHB]
type = nothitby
trigger1 = 1
value = SCA, AA, AP, AT
ignorehitpause = 1

[State 901, Bye Bye]
type = Changestate
trigger1 = var(1) <= 0
value = 1140

;----------------------------------
; Kanna - Z version Pushblocker
[Statedef 1131]
type    = S
movetype= I
physics = N
anim = 1131

[State 1131, VelS]
type = velset
trigger1 = 1
x = 10

[State 1131, PA]
type = posfreeze
trigger1 = time > 0
trigger1 = parentdist x <= -100

[State 1131, NHB]
type = nothitby
trigger1 = 1
value = SCA, AA, AP, AT

[State 1131, PP]
type = playerpush
trigger1 = 1
value = 1

[State 1131, Zeeky]
type = destroyself
trigger1 = time >= 69

;---------------------
[Statedef 1140]
; Kanna Destruct State
type    = S
movetype= I
physics = S
velset = 0,0
ctrl = 0
juggle = 0
sprpriority = 5

[State 1120, PVS]
type = parentvarset
trigger1 = prevstateno = 1120
trigger1 = time = 0
v = 18
value = 0

[State 1120, PVS]
type = parentvarset
trigger1 = prevstateno = 1120
trigger1 = time = 0
v = 19
value = 0

[State 1140, NHB]
type = nothitby
trigger1 = 1
value = SCA, AA, AP, AT
ignorehitpause = 1

[State 901, Fade]
type = Trans
trigger1 = time >= 0
trigger1 = time < 4
trans = addalpha
alpha = 192,255

[State 901, Fade]
type = Trans
trigger1 = time >= 4
trigger1 = time < 8
trans = addalpha
alpha = 128,255

[State 901, Fade]
type = Trans
trigger1 = time >= 8
trigger1 = time < 12
trans = addalpha
alpha = 64,255

[State 901, Bye Bye]
type = Destroyself
trigger1 = time >= 12

;----------------------------------
; Skeleton - X/Y Version
[Statedef 1301]
type    = S
movetype= A
physics = S
anim = 2002
velset = 0,0
ctrl = 0
juggle = 2
sprpriority = 3

[State 2100, HOR]
type = hitoverride
trigger1 = 1
attr = SCA,AA,AP,AT
time = -1
slot = 6
ignorehitpause = 1

[State 1301, PSND]
type = playsnd
trigger1 = time = 0
value = 1300,1

[State 2001, 1]
type = HitDef
trigger1 = time = 0
attr = S, SA                     ;Attribute: Standing, Normal Attack
damage = ceil(109*root,fvar(10)), ceil(10*root,fvar(10))
animtype = Hard                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = MA                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 6, 6                 ;Time attacker pauses, time opponent shakes
sparkno = s8015+(random%2)                     ;Spark anim no (Def: set above)
guard.sparkno = s8030
sparkxy = -10, -76
hitsound = S1500,0                  ;Sound to play on hit
guardsound = s6, 0                ;Sound to play on guard
ground.type = High               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 20             ;Time opponent is in hit state
ground.velocity = -5,-2             ;Velocity at which opponent is pushed
airguard.velocity = -5.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = High                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 12                 ;Time before opponent regains control in air
fall = 1
getpower = 40,0
sprpriority = 3

[State 2001, Selfdestruct]
type = DestroySelf
trigger1 = animtime = 0

;----------------------------------
; Dance of the Dead - Y Version
[Statedef 1311]
type    = S
movetype= A
physics = S
juggle  = 1
velset = 0,0
anim = 1310
ctrl = 0
sprpriority = -1

[State 1311, PA]
type = posadd
trigger1 = time > 0
trigger1 = time%9 = 0
x = 24

[State 1311, PA]
type = explod
trigger1 = time > 0
trigger1 = time%9 = 0
anim = 1313
ID = 1313
pos = -24,0
removetime = 14

[State 2100, HOR]
type = hitoverride
trigger1 = 1
attr = SCA,AA,AP,AT
time = -1
slot = 6
ignorehitpause = 1

[State 1102, Hitdef]
type = Hitdef
trigger1 = 1
attr = C, ST
hitflag = MFD
guardflag = A
sparkno = -1
guard.sparkno = -1
p1stateno = 1312
p2stateno = 1313

[State 1102, ASS]
type = AssertSpecial
trigger1 = 1
flag = unguardable

[State 1102, Destroyself]
type = Destroyself
trigger1 = frontedgedist < -15
trigger2 = time >= 609

;----------------------------------
; ITS A TRAP!
;----------------------------------
[Statedef 1312]
type    = S
movetype= A
physics = S
juggle  = 1
velset = 0,0
anim = 1312
ctrl = 0
sprpriority = 10

[state 1103, Bind]
type = Targetbind
trigger1 = time = 0
time = 1
pos = 14,0

[State 1300, Skel1]
type = helper
trigger1 = time = 0
helpertype = normal
name = "Skeleton_X"
ID = 1301
pos = -25,0
postype = p1
stateno = 1301
ownpal = 1

[State 1103, Destroyself]
type = Destroyself
trigger1 = Animtime = 0

;----------------------------------
; Grabbed by Trap
[Statedef 1313]
type = S
movetype = H
physics = N
velset = 0,0
ctrl = 0

[State 1104, 1]
type = ChangeAnim
trigger1 = selfanimexist(5000)
Trigger1 = Time < 120
trigger1 = anim != 5010
value = 5000
elem = 1

[State 1104, 1]
type = ChangeAnim2
trigger1 = !selfanimexist(5000)
Trigger1 = Time < 120
value = 1104

[State 1104, Changestate]
type = SelfState
trigger1 = time >= 120
value = 0
ctrl = 1

;----------------------------------
; Skeleton - Z Version
[Statedef 1321]
type    = S
movetype= A
physics = S
anim = 1321
velset = 0,0
ctrl = 0
juggle = 2
sprpriority = 1

[State 2001, CHARGE!]
type = velset
trigger1 = anim = 1321
trigger1 = time >= 90
x = 6

[State 2001, CA]
type = changeanim
trigger1 = anim = 1321
trigger1 = p2bodydist X <= 45
trigger1 = vel X = 6
value = 1322

[State 2100, HOR]
type = hitoverride
trigger1 = 1
attr = SCA,AA,AP,AT
time = -1
slot = 6
ignorehitpause = 1

[State 2001, 1]
type = HitDef
triggerall = anim = 1322
trigger1 = AnimElem = 1
attr = S, HA                     ;Attribute: Standing, Normal Attack
damage = ceil(45*parent,fvar(10)), ceil(5*parent,fvar(10))
animtype = Hard                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = MA                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 6, 6                 ;Time attacker pauses, time opponent shakes
sparkno = s8025+(random%2)                      ;Spark anim no (Def: set above)
guard.sparkno = s8030
sparkxy = -10, -76
hitsound = S1500,0                  ;Sound to play on hit
guardsound = s6, 0                ;Sound to play on guard
ground.type = High               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 20             ;Time opponent is in hit state
ground.velocity = -5,-2             ;Velocity at which opponent is pushed
airguard.velocity = -5.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = High                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 12                 ;Time before opponent regains control in air
fall = 1
getpower = 0,0
sprpriority = 1

[State 2001, Selfdestruct]
type = DestroySelf
trigger1 = frontedgedist < 0
trigger2 = anim = 1322
trigger2 = animtime = 0

;----------------------------------
; Dragon Tornado - X/Y Versions
[Statedef 1201]
type    = S
movetype= A
physics = S
anim = 1230
juggle = 1
vel = 0,0
sprpriority = 3
ctrl = 0

[State 1401, Direction]
type = AngleSet
trigger1 = time = 0
value = 0

[State 1201, PS]
type = posset
trigger1 = 1;time = 0
y = 0

[State 1201, ASS]
type = assertspecial
trigger1 = 1
flag = noshadow
ignorehitpause = 1

[State 1201, VS]
type = velset
trigger1 = ishelper(1211)
x = -1.5
ignorehitpause = 1

[State 1201, Transparency]
type = trans
trigger1 = 1
trans = add

[State 1201, Scale]
type = angledraw
trigger1 = 1
scale = 0.75,1.5

[state 1201, ATKMS]
type = attackmulset
trigger1 = 1
value = parent, fvar(10)
ignorehitpause = 1

[State 1201, HOR]
type = hitoverride
trigger1 = 1
attr = SCA,AA,AP,AT
time = -1
slot = 6
ignorehitpause = 1

[State 1201, HOR]
type = Nothitby
trigger1 = 1
value = SCA

[State 1201, Hitcount]
type = VarSet
trigger1 = time = 0
v = 1
value = 0

[State 2500, Tornado]
type = Hitdef
trigger1 = time = 0
trigger2 = Var(1) < 10
attr = S, SP
animtype = up
getpower = 0,0
damage    = ifelse(ishelper(1211),10,15),1
priority  = 5
guardflag = MA
pausetime = 4,1;10
sparkno = -1
guard.sparkno = -1
sparkxy = 0,0
hitsound   = s2500,2
guardsound = s6,0
ground.type = High
ground.slidetime = 12
ground.hittime  = 15
ground.velocity = -1,-7
air.velocity = -1,-7
fall = 1
fall.recover = 0
fall.yvelocity = 0
getpower = 7,0
sprpriority = 3

[State 1201, TB]
type = targetbind
trigger1 = movehit = 1
time = 1
pos = ifelse(var(1)%2=0,20,-20),(enemynear,pos y)

[State 3061, Explod]
type = Explod
trigger1 = movehit = 1
pos = 0,-50
random = 20,20
postype = p2
anim = 8005+(random%2)+ifelse(random<=499,10,0)
facing = ifelse(random<=499,1,-1)
sprpriority = 6

[State 3061, Explod]
type = Explod
trigger1 = movehit = 0
trigger1 = movecontact = 1
pos = 0,-50
random = 20,20
postype = p2
anim = 8030
facing = -1
sprpriority = 6

[State 2502, Hitcount]
type = VarAdd
trigger1 = movecontact = 1
v = 1
value = 1

[State 2502, reset]
type = Movehitreset
trigger1 = movecontact = 1

[State 2502, Hitcount]
type = VarSet
trigger1 = Var(1) >= 10
v = 1
value = 10

[State 1231, CA]
type = changeanim
trigger1 = anim = 1230
trigger1 = time >= 46
value = 1231

[State 2502, Kamikaze]
type = destroyself
trigger1 = anim = 1231
trigger1 = animtime = 0
ignorehitpause = 1

;----------------------------------
; Dragon Tornado - Z Version
[Statedef 1231]
type    = S
movetype= A
physics = S
anim = 1230
juggle = 1
sprpriority = 3
ctrl = 0

[State 1201, ASS]
type = assertspecial
trigger1 = 1
flag = noshadow
ignorehitpause = 1

[State 1201, Transparency]
type = trans
trigger1 = 1
trans = add

[State 1201, Scale]
type = angledraw
trigger1 = 1
scale = 2.5,3.5

[state 1201, ATKMS]
type = attackmulset
trigger1 = 1
value = parent, fvar(10)
ignorehitpause = 1

[State 1201, HOR]
type = hitoverride
trigger1 = 1
attr = SCA,AA,AP,AT
time = -1
slot = 6
ignorehitpause = 1

[State 1201, HOR]
type = Nothitby
trigger1 = 1
value = SCA

[State 1201, Hitcount]
type = VarSet
trigger1 = time = 0
v = 1
value = 0

[State 2500, Tornado]
type = Hitdef
trigger1 = time = 0
trigger2 = Var(1) < 20
attr = S, SP
animtype = hard
getpower = 0,0
damage = 19,2
priority  = 5
guardflag = MA
pausetime = 4,1;10
sparkno = -1
guard.sparkno = -1
sparkxy = 0,0
hitsound   = s2500,2
guardsound = s6,0
ground.type = High
ground.slidetime = 12
ground.hittime  = 15
ground.velocity = -3,-11
air.velocity = -3,-10
fall = 1
fall.recover = 0
fall.yvelocity = 0
getpower = 0,0
sprpriority = 3

[State 1201, TB]
type = targetbind
trigger1 = movehit = 1
time = 1
pos = ifelse(var(1)%2=0,30,-30),(enemynear,pos y)

[State 3061, Explod]
type = Explod
trigger1 = movehit = 1
pos = 0,-50
random = 20,20
postype = p2
anim = 8025+(random%2)
facing = ifelse(random<=499,1,-1)
sprpriority = 6

[State 3061, Explod]
type = Explod
trigger1 = movehit = 0
trigger1 = movecontact = 1
pos = 0,-50
random = 20,20
postype = p2
anim = 8030
facing = -1
sprpriority = 6

[State 2502, Hitcount]
type = VarAdd
trigger1 = movecontact = 1
v = 1
value = 1

[State 2502, reset]
type = Movehitreset
trigger1 = movecontact = 1

[State 2502, Hitcount]
type = VarSet
trigger1 = Var(1) >= 20
v = 1
value = 20

[State 1231, CA]
type = changeanim
trigger1 = anim = 1230
trigger1 = statetime >= 120
value = 1231

[State 2502, Kamikaze]
type = destroyself
trigger1 = anim = 1231
trigger1 = animtime = 0
ignorehitpause = 1

;----------------------------------
; Dance of the Dragon - Z version Pushblocker
[Statedef 1232]
type    = S
movetype= I
physics = S
anim = 1131

[State 1131, VelS]
type = velset
trigger1 = 1
x = ifelse(abs(parentdist x)<=15,0,5)

[State 1131, NHB]
type = nothitby
trigger1 = 1
value = SCA, AA, AP, AT

[State 1131, PP]
type = playerpush
trigger1 = 1
value = 1

[State 1131, Zeeky]
type = destroyself
trigger1 = time >= 120

;----------------------------------
; DotDragon Z Version Hitbox
[Statedef 1233]
anim = 0
velset = 0,0
sprpriority = 5

[State 500, LS]
type = lifeset
trigger1 = 1
value = 1000

[State 500, CA]
type = changeanim
trigger1 = anim != 0
value = 0

[State 500, BTP]
type = bindtoparent
trigger1 = 1

[State 500, ASS]
type = assertspecial
trigger1 = 1
flag = invisible

[State 500, NHB]
type = nothitby
trigger1 = 1
value = SCA, AT

[State 500, NHB]
type = hitby
trigger1 = 1
value = SCA, AA, AP

[State 500, HOR]
type = hitoverride
trigger1 = 1
attr = SCA, AA, AP
stateno = 1234

[State 1233, Zeeky]
type = destroyself
trigger1 = parent,stateno != 1230
trigger2 = parent,alive = 0

;---------------------------------
; Hitbox Hit
[Statedef 1234]
type = S
movetype = H
anim = 0
velset = 0,0
sprpriority = 5

[State 500, DMS]
type = defencemulset
trigger1 = 1
value = 1.33

[State 501, BTP]
type = bindtoparent
trigger1 = 1

[State 501, ASS]
type = assertspecial
trigger1 = 1
flag = invisible

[State 500, NHB]
type = nothitby
trigger1 = 1
value = SCA, AT

[State 500, NHB]
type = hitby
trigger1 = 1
value = SCA, AA, AP

[State 500, HOR]
type = hitoverride
trigger1 = 1
attr = SCA, AA, AP
stateno = 1234

[State 501, CS]
type = changestate
trigger1 = hitover
value = 1233

[State 500, Zeeky]
type = destroyself
trigger1 = parent,stateno != 1230
trigger2 = parent,alive = 0

;----------------------------------
; Wind Cutter Projectile
[Statedef 1401]
type    = S
movetype= A
physics = S
velset = 2,0
anim = 1400
ctrl = 0
sprpriority = 3

[State 2100, HOR]
type = hitoverride
trigger1 = 1
attr = SCA,AA,AP,AT
time = -1
slot = 6
ignorehitpause = 1

[State 100, Afterimage]
type = AfterImage
trigger1 = Time = 0
;trigger1 = var(20) = 0
time = 20;50
timeGap = 2;6
length = 10
palbright = 30,30,30
palcontrast = 100,100,220
palpostbright = 0,0,0
paladd = 15,15,40
palmul = .65,.65,.80
trans = add

[State 1401, Direction]
type = AngleSet
trigger1 = 1;(var(24)) = 1
value = (((vel y)*1.0/(vel x))*-90.0)

[State 1401, Direction]
type = AngleDraw
trigger1 = 1
scale = 0.75,0.75

[State 1401, HOR]
type = Nothitby
trigger1 = 1
value = SCA

[State 1401, ASS]
type = assertspecial
trigger1 = 1
flag = noshadow
pausetime = 999

[State 1401, Transparency]
type = trans
trigger1 = 1
trans = add

[State 1401, Decrease Alt]
type = VelSet
trigger1 = 1
y = 1.5*((0.032*16.0*time)-1.6);0.8

[State 1401, Maintain]
type = VelSet
trigger1 = 1
x = 9.0;12.0

[State 1401, Kamikaze]
type = changestate
trigger1 = pos y >= -10
value = 1201
