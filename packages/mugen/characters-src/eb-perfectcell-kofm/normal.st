
;---------------------------------------------------------------------------
; Standing Light Punch
; CNS difficulty: easy
[Statedef 200]
type = S
movetype = A
physics = S
juggle = ifelse(numtarget, 15, 8)
anim =200
velset = 0, 0
poweradd = 0
sprpriority = 1
ctrl = 0
facep2 = 1			;Set layering priority to 2 (in front)

[State 0, Vel]
type = velset
trigger1 = animelem=2
x = 2

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 400,0
volume = 255


[State 200, 1]
type = HitDef
trigger1 = Time = 0
attr = S, NA
damage = 20, 0
animtype = Light
air.animtype = Back
fall.animtype = Back
guardflag = M
hitflag = MAF
priority = 4, Hit
pausetime =8,8
sparkno = s7010 + (random % 8)
guard.sparkno = s7000
sparkxy = -10, -85
hitsound = s2, 1
guardsound = s2, 0
ground.type = High
ground.slidetime = 12 + 2 * var(29)
ground.hittime = 12 + 2 * var(29)
ground.velocity = -3
ground.cornerpush.veloff = 0;ifelse(var(20), -4.33, -8.17)
air.type = Low
air.hittime = 18
air.velocity =-3, -3
air.cornerpush.veloff = 0
getpower = 20
givepower = 36, 36
envshake.time = 8
envshake.ampl =-3			;Time before opponent regains control in air

[State 200, End]
type = changestate
trigger1 = !animtime
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Standing Medium Punch
; CNS difficulty: easy
[Statedef 210]
type    = S
movetype= A
physics = S
juggle  = 4
poweradd= 65
ctrl = 0
velset = 0,0
anim = 210


[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 4,0

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 400,0


[State 210, Hit]
type = hitdef
trigger1 = time=0
attr = S, NA
damage = 40, 0
animtype = Medium
air.animtype = Back
fall.animtype = Back
guardflag = M
hitflag = MAF
priority = 4, Hit
pausetime = ifelse(var(20), 5, 10), ifelse(var(20), 5, 10)
sparkno = s7010 + (random % 8)
guard.sparkno = s7000
sparkxy = -10, -78
hitsound = s2, 2
guardsound = s2, 0
ground.type = Low
ground.slidetime = 17 + 3 * var(29)
ground.hittime = 17 + 3 * var(29)
ground.velocity = ifelse(var(20), -4.30, -7.51), 0
ground.cornerpush.veloff = 0;ifelse(var(20), -5.78, -10.47)
air.type = Low
air.hittime = 18
air.velocity = ifelse(var(20), -2.5, -5), -7
air.cornerpush.veloff = 0
getpower = ifelse(p2movetype = H, 72, 144) * !var(20), 36 * !var(20)
givepower = 36, 36
yaccel = 0.5
fall.recover = 1
fall.recovertime = 120
forcenofall = !var(20)


[State 200, End]
type = changestate
trigger1 = !animtime
value = 0
ctrl = 1


;---------------------------------------------------------------------------
; Standing Strong Punch
; CNS difficulty: easy
[Statedef 220]
type    = S
movetype= A
physics = S
juggle  = 4
poweradd= 65
ctrl = 0
velset = 0,0
anim = 220

[State 0, Vel]
type = velset
trigger1 = animelem=3
x = 4


[State 203, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 4,0

[State 203, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 400,1
volume = 255

[State 210, Hit]
type = hitdef
trigger1 = time=0
attr = S, NA
damage = 60, 0
animtype = Hard
air.animtype = Back
fall.animtype = Back
guardflag = M
hitflag = MAF
priority = 4, Hit
pausetime = 12,12
sparkno = s7010 + (random % 8)
guard.sparkno = s7000
sparkxy = -15, -69
hitsound = s2, 3
guardsound = s2, 0
ground.type = high
ground.slidetime = 18 + 4 * var(29)
ground.hittime = 18 + 4 * var(29)
ground.velocity = -10
ground.cornerpush.veloff = 0;ifelse(var(20), -6.82, -12.74)
air.type = Low
air.hittime = 18
air.velocity =-3, -3
air.cornerpush.veloff = 0
getpower = 20
givepower = 36, 36
envshake.time = 12
envshake.ampl =-5


[State 200, End]
type = changestate
trigger1 = !animtime
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Standing Light Kick
; CNS difficulty: easy
[Statedef 230]
type    = S
movetype= A
physics = S
juggle  = 4
poweradd= 22
ctrl = 0
velset = 0,0
anim = 230;+(5*(p2bodydist x<25))

[State 0, Vel]
type = velset
trigger1 = animelem=2
x = 2


[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 400,0
volume = 255

[State 220, Hit]
type = hitdef
trigger1 =  time=0
attr = S, NA
damage = 20, 0
animtype = light
air.animtype = Back
fall.animtype = Back
guardflag = M
hitflag = MA
priority = 4, Hit
pausetime = 10,10
sparkno = s7010 + (random % 8)
guard.sparkno = s7000
sparkxy = -10, -93
hitsound = s2, 5
guardsound = s2, 0
ground.type = High
ground.slidetime = 15 + 3 * var(29)
ground.hittime = 15 + 3 * var(29)
ground.velocity = -5
ground.cornerpush.veloff = 0;ifelse(var(20), -5.78, -10.47)
air.type = Low
air.hittime = 18
air.velocity =-3, -3
air.cornerpush.veloff = 0
getpower = 20
givepower = 36, 36
envshake.time = 10
envshake.ampl =-4

[State 230, 5]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Standing Medium Kick
; CNS difficulty: easy
[Statedef 240]
type    = S
movetype= A
physics = S
juggle  = 5
poweradd= 65
ctrl = 0
velset = 0,0
anim = 240


[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 400,1
volume = 255

[State 220, Hit]
type = hitdef
trigger1 =  time=0
attr = S, NA
damage = 40, 0
animtype = Medium
air.animtype = Back
fall.animtype = Back
guardflag = M
hitflag = MA
priority = 4, Hit
pausetime = 10,10
sparkno = s7010 + (random % 8)
guard.sparkno = s7000
sparkxy = -10, -93
hitsound = s2, 5
guardsound = s2, 0
ground.type = Low
ground.slidetime = 15 + 3 * var(29)
ground.hittime = 15 + 3 * var(29)
ground.velocity = -5
ground.cornerpush.veloff = 0;ifelse(var(20), -5.78, -10.47)
air.type = Low
air.hittime = 18
air.velocity =-3, -3
air.cornerpush.veloff = 0
getpower = 20
givepower = 36, 36
envshake.time = 10
envshake.ampl =-4

[State 240, 5]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Standing Strong Kick
; CNS difficulty: easy
[Statedef 250]
type    = S
movetype= A
physics = S
juggle  = 5
poweradd= 65
ctrl = 0
velset = 0,0
anim = 250


[State 0, Vel]
type = velset
trigger1 = animelem=2
x = 4

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 401,0
volume = 255

[State 225, Hit]
type = hitdef
trigger1 =  time=0
attr = S, NA
damage = 60, 0
animtype = Hard
air.animtype = Back
fall.animtype = Back
guardflag = M
hitflag = MA
priority = 4, Hit
pausetime = 12,12
sparkno = s7010 + (random % 8)
guard.sparkno = s7000
sparkxy = -10, -92
hitsound = s2, 6
guardsound = s2, 0
ground.type = High
ground.slidetime = 18 + 4 * var(29)
ground.hittime = 18 + 4 * var(29)
ground.velocity = ifelse(var(20), -5.77, -10.52), 0
ground.cornerpush.veloff = 0;ifelse(var(20), -6.82, -12.74)
air.type = Low
air.hittime = 18
air.velocity =-3, -3
air.cornerpush.veloff = 0
getpower = 20
givepower = 36, 36
envshake.time = 12
envshake.ampl =-5


[State 250, 5]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Crouching Strong Punch
[Statedef 255]
type    = S
movetype= A
physics = S
juggle  = 6
poweradd= 50
ctrl = 0
anim = 255


[State 0, Vel]
type = velset
trigger1 = animelem=2
x = 3

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 400,1
volume = 255

[State 240, 0]
type = HitDef
trigger1= time=0
attr = S, NA
damage  = 60
pausetime=12,12
animtype = up
air.animtype = up
fall.animtype = Medium
hitflag = MA
guardflag = MA
sparkno = s2220
guard.sparkno = s7000
sparkxy = -10, -73
hitsound = s2, 3
guardsound = s2, 0
ground.type = high
air.type = High
ground.slidetime = 20
ground.hittime = 30
air.hittime = 40
guard.ctrltime = 20
recovertime=10
ground.velocity = -1,-13
guard.velocity = -6
air.velocity = -1,-11
airguard.velocity = -6
ground.cornerpush.veloff = 0
guard.cornerpush.veloff = -6
air.cornerpush.veloff = 0
airguard.cornerpush.veloff = 0
persistent = 0
fall = 0
air.fall = 0
fall.recover = 1
air.recover = 1
yaccel = .4
envshake.time = 18
envshake.ampl =-5
fall.envshake.time = 32
fall.envshake.ampl = -6
facing=p1

[State 420, jump combo]
type = Changestate
trigger1 = animelem=3&&movehit ; when you hit the opponent
trigger1 = command = "holdup"
value = 123; the superjump state
ctrl = 1 ; these menas that you re-gain control

[State 420, 5]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1

;---------------------------------------------------------------------------
; Crouching Light Punch
; CNS difficulty: easy
; Description: Simple crouching attack. The HitDef's guardflag parameter
;     is set to "L", meaning that the move can only be guarded low
;     (crouching), and not by standing or jumping opponents.
;     Like for all light attacks, it's a good idea to keep the slidetime
;     and hittime parameters at a smaller number, so the opponent isn't
;     stunned for too long. For all crouching attacks you have to
;     remember to set the attr parameter to indicate that it is crouching
;     attack. In this case, "C, NA" stands for "crouching, normal attack".
;     The HitDef's priority is set at 3, instead of the default of 4,
;     so this attack has a lower priority than most others, meaning the
;     player will get hit instead of trading hits with the opponent if
;     their attack collision boxes (Clsn1) intersect each other's Clsn2
;     boxes at the same time.
[Statedef 400]
type    = C
movetype= A
physics = C
juggle  = 5
poweradd= 15
ctrl = 0
anim = 400

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 400,0
volume = 255

[State 230, Hit]
type = hitdef
trigger1 =time=0
attr = C, NA 
damage = 20, 0
animtype = Light
air.animtype = Back
fall.animtype = Back
guardflag = M 
hitflag = MA 
priority = 4, Hit 
pausetime = 8,8
sparkno = s7010 + (random % 8)
guard.sparkno = s7000
sparkxy = -10, -51
hitsound = s2, 1
guardsound = s2, 0
ground.type = Low
ground.slidetime = 12 + 2 * var(29)
ground.hittime = 12 + 2 * var(29)
ground.velocity =-3
ground.cornerpush.veloff = 0;ifelse(var(20), -4.33, -8.17)
air.type = Low
air.hittime = 18
air.velocity =-3, -3
air.cornerpush.veloff = 0
getpower = 20
givepower = 36, 36
envshake.time = 8
envshake.ampl =-3

[State 400, 5]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1

;---------------------------------------------------------------------------
; Crouching Medium Punch
[Statedef 410]
type    = C
movetype= A
physics = C
juggle  = 6
poweradd= 50
ctrl = 0
anim = 410

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 400,0
volume = 255

[State 235, Hit]
type = hitdef
trigger1 = time=0
attr = C, NA 
damage = 40, 0
animtype = Medium 
air.animtype = Back
fall.animtype = Back
guardflag = M 
hitflag = MA
priority = 4, Hit 
pausetime = 10,10
sparkno = s7010 + (random % 8)
guard.sparkno = s7000
sparkxy = -10, -46
hitsound = s2, 2
guardsound = s2, 0
ground.type = Low
ground.slidetime = 15 + 3 * var(29)
ground.hittime = 15 + 3 * var(29)
ground.velocity = -5
ground.cornerpush.veloff = 0;ifelse(var(20), -5.78, -10.47)
air.type = Low
air.hittime = 18
air.velocity =-3, -3
air.cornerpush.veloff = 0
getpower = 20
givepower = 36, 36
envshake.time = 10
envshake.ampl =-4
[State 410, 5]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1

;---------------------------------------------------------------------------
; Crouching Strong Punch
[Statedef 420]
type    = C
movetype= A
physics = C
juggle  = 6
poweradd= 50
ctrl = 0
anim = 420


[State 0, Vel]
type = velset
trigger1 = animelem=2
x = 3

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 400,1
volume = 255

[State 240, 0]
type = HitDef
trigger1= time=0
attr = S, NA
damage  = 60
pausetime=12,12
animtype = up
air.animtype = up
fall.animtype = Medium
hitflag = MA
guardflag = MA
sparkno = s2220
guard.sparkno = s7000
sparkxy = -10, -73
hitsound = s2, 3
guardsound = s2, 0
ground.type = high
air.type = High
ground.slidetime = 20
ground.hittime = 30
air.hittime = 40
guard.ctrltime = 20
recovertime=10
ground.velocity = -1,-13
guard.velocity = -6
air.velocity = -1,-11
airguard.velocity = -6
ground.cornerpush.veloff = 0
guard.cornerpush.veloff = -6
air.cornerpush.veloff = 0
airguard.cornerpush.veloff = 0
persistent = 0
fall = 0
air.fall = 0
fall.recover = 1
air.recover = 1
yaccel = .4
envshake.time = 18
envshake.ampl =-5
fall.envshake.time = 32
fall.envshake.ampl = -6
facing=p1

[State 420, jump combo]
type = Changestate
trigger1 = animelem=3&&movehit ; when you hit the opponent
trigger1 = command = "holdup"
value = 123; the superjump state
ctrl = 1 ; these menas that you re-gain control

[State 420, 5]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1

;---------------------------------------------------------------------------
; Crouching Light Kick
; CNS difficulty: easy
[Statedef 430]
type    = C
movetype= A
physics = C
juggle  = 5
poweradd= 22
ctrl = 0
anim = 430

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 400,0
volume = 255

[State 245, Hit]
type = hitdef
trigger1 = TIME=0
attr = C, NA 
damage = 20, 0
animtype = Light
air.animtype = Back
fall.animtype = Back
guardflag = L
hitflag = MA 
priority = 4, Hit 
pausetime = 8,8
sparkno = s7010 + (random % 8)
guard.sparkno = s7000
sparkxy = -10, -4
hitsound = s2, 4
guardsound = s2, 0
ground.type = Low
ground.slidetime = 12 + 2 * var(29)
ground.hittime = 12 + 2 * var(29)
ground.velocity = -3
ground.cornerpush.veloff = 0;ifelse(var(20), -4.33, -8.17)
air.type = Low
air.hittime = 18
air.velocity =-3, -3
air.cornerpush.veloff = 0
down.velocity = -2, -2
getpower = 20
givepower = 36, 36
envshake.time = 8
envshake.ampl =-3


[State 430, 5]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1

;---------------------------------------------------------------------------
; Crouching Medium Kick
; CNS difficulty: easy
[Statedef 440]
type    = C
movetype= A
physics = C
juggle  = 5
poweradd= 22
ctrl = 0
anim = 440

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 400,1
volume = 255

[State 250, Hit]
type = hitdef
trigger1 = time=0
attr = C, NA 
damage = 40, 0
animtype = Medium
air.animtype = Back
fall.animtype = Back
guardflag = L 
hitflag = MA
priority = 4, Hit 
pausetime = 10,10
sparkno = s7010 + (random % 8)
guard.sparkno = s7000
sparkxy = -10, -5
hitsound = s2, 5
guardsound = s2, 0
ground.type = Low
ground.slidetime = 15 + 3 * var(29)
ground.hittime = 15 + 3 * var(29)
ground.velocity = -5
ground.cornerpush.veloff = 0;ifelse(var(20), -5.78, -10.47)
air.type = Low
air.hittime = 18
air.velocity =-3, -3
air.cornerpush.veloff = 0
down.velocity = -3, -3
getpower = 20
givepower = 36, 36
envshake.time = 10
envshake.ampl =-4


[State 840, 5]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1

;---------------------------------------------------------------------------
; Crouch Strong Kick
; CNS difficulty: easy
; Description: This move uses "Trip" for the "ground.type" parameter in
;     its HitDef. It's a special type that puts the opponent in a tripped
;     animation as he falls. Also, the hitflag parameter in the HitDef
;     is set to "MAFD". The "D" indicates that a downed opponent can be
;     hit by the attack.
[Statedef 450]
type    = C
movetype= A
physics = C
juggle  = 7
poweradd= 70
ctrl = 0
anim = 450


[State 0, Vel]
type = velset
trigger1 = animelem=2
x =25


[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 401,0
volume = 255

[State 255, Hit]
type = hitdef
trigger1 = time=0
attr = C, NA
damage = 65, 0
animtype = Hard
air.animtype = Back
fall.animtype = Back
guardflag = L
hitflag = MAF
priority = 4, Hit
pausetime = 12,12
sparkno = s7010 + (random % 8)
guard.sparkno = s7000
sparkxy = -10, -10
hitsound = s2, 6
guardsound = s2, 0
ground.type = Trip
ground.slidetime = 15 + 3 * var(29)
ground.hittime = 15 + 3 * var(29)
ground.velocity = -1,-6
ground.cornerpush.veloff = 0;ifelse(var(20), -5.78, -10.47)
air.type = Low
air.hittime = 18
air.velocity =-3, -3
air.cornerpush.veloff = 0
getpower = 20
givepower = 36, 36
envshake.time = 12
envshake.ampl =-5
fall.envshake.time = 24
fall.envshake.ampl = -6


[State 850, 5]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1

;---------------------------------------------------------------------------
; Jump Light Punch
; CNS difficulty: easy
[Statedef 600]
type    = A
movetype= A
physics = A
juggle  = 2
poweradd= 11
ctrl = 0
anim = 600

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 400,0
volume = 255

[State 260, Hit]
type=hitdef
trigger1 = time=0
attr=A,NA
damage=20,0
animtype=Light
guardflag=HA
hitflag=MAF
priority=4,Hit
pausetime= 12,12
sparkno=s7010+(random%8)
guard.sparkno=s7000
sparkxy=-10,-70
hitsound=s2,1
guardsound=s2,0
ground.type=High
ground.hittime=12
ground.slidetime=12
ground.velocity= ifelse(var(20), -2.66, -4.49), 0
ground.cornerpush.veloff = 0;ifelse(var(20), -4.33, -8.17)
guard.velocity= ifelse(var(20), -2.66, -4.49)
guard.cornerpush.veloff = 0;ifelse(var(20), -4.33, -8.17)
air.type=Low
air.hittime=18
air.velocity= -1,-7
air.cornerpush.veloff = 0
getpower= 72*!var(20), 36*!var(20)
givepower=36,36
yaccel=.5
airguard.ctrltime= 16
airguard.velocity= ifelse(var(20),-4,-8), -1.5
airguard.cornerpush.veloff = 0
fall.recover=0

[State 600, 5]
type = CtrlSet
trigger1 = Time = 20
value = 1

;---------------------------------------------------------------------------
; Jump Medium Punch
; CNS difficulty: easy
[Statedef 610]
type    = A
movetype= A
physics = A
juggle  = 4
poweradd= 65
ctrl = 0
anim = 610

[State 0, Vel]
type = velset
trigger1 = animelem=3
x =3

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 400,0
volume = 255

[State 265, Hit]
type=hitdef
trigger1 = time=0
attr=A,NA 
damage=40
animtype=Medium 
guardflag=HA 
hitflag=MAF 
priority=4,Hit 
pausetime= 12,12
sparkno=s7010+(random%8)
guard.sparkno=s7000
sparkxy=-10,-68
hitsound=s2,2
guardsound=s2,0
ground.type=High
ground.hittime=12
ground.slidetime=12
ground.velocity= ifelse(var(20), -2.66, -4.49), 0
ground.cornerpush.veloff = 0;ifelse(var(20), -4.33, -8.17)
guard.velocity= ifelse(var(20), -4.30, -7.51)
guard.cornerpush.veloff = 0;ifelse(var(20), -5.78, -10.47)
air.type=High
air.hittime=18
air.velocity= -1,-7
air.cornerpush.veloff = 0
getpower= ifelse(p2movetype=H,72,144)*!var(20), 36*!var(20)
givepower=36,36


[State 610, 5]
type = CtrlSet
trigger1 = Time = 20
value = 1

;---------------------------------------------------------------------------
; Jump Strong Punch
; CNS difficulty: easy
[Statedef 620]
type    = A
movetype= A
physics = A
juggle  = 4
poweradd= 70
ctrl = 0
anim = 620

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 400,1
volume = 255

[State 270, Hit]
type=hitdef
trigger1 = time=0
attr = A, NA
damage = 60, 0
animtype = Hard
air.animtype = Back
fall.animtype = Back
guardflag = HA 
hitflag = MAF 
priority = 4, Hit 
pausetime = 15,15
sparkno = s7010 + (random % 8)
guard.sparkno = s7000
sparkxy = -10, -52
hitsound = s2, 3
guardsound = s2, 0
ground.type = High
ground.hittime = 12
ground.slidetime = 12
ground.velocity = ifelse(var(20), -2.66, -4.49), 0
ground.cornerpush.veloff = 0;ifelse(var(20), -4.33, -8.17)
guard.velocity = ifelse(var(20), -5.77, -10.52)
guard.cornerpush.veloff = 0;ifelse(var(20), -6.82, -12.74)
air.type = Low
air.hittime = 18
air.velocity = -6, 7
air.cornerpush.veloff = 0
getpower = 20
givepower = 36, 36
airguard.ctrltime = 16
airguard.velocity = ifelse(var(20), -4, -8), -1.5
airguard.cornerpush.veloff = 0
air.fall=1
fall.recover=1
fall.recover=0
air.recover=0
envshake.time = 14
envshake.ampl =-5
fall.envshake.time = 20
fall.envshake.ampl = -6


[State 620, 5]
type = CtrlSet
trigger1 = Time = 20
value = 1

;---------------------------------------------------------------------------
; Jump Light Kick
; CNS difficulty: easy
[Statedef 630]
type    = A
movetype= A
physics = A
juggle  = 3
poweradd= 20
ctrl = 0
anim = 630

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 400,0
volume = 255

[State 275, Hit]
type=hitdef
trigger1 = time=0
attr=A,NA 
damage=20,0
animtype=Light
guardflag=HA 
hitflag=MAF 
priority=4,Hit 
pausetime= 12,12
sparkno=s7010+(random%8)
guard.sparkno=s7000
sparkxy=-10,-68
hitsound=s2,4
guardsound=s2,0
ground.type=High
ground.hittime=12
ground.slidetime=12
ground.velocity= ifelse(var(20), -2.66, -4.49), 0
ground.cornerpush.veloff = 0;ifelse(var(20), -4.33, -8.17)
guard.velocity= ifelse(var(20), -2.66, -4.49)
guard.cornerpush.veloff = 0;ifelse(var(20), -4.33, -8.17)
air.type=Low
air.hittime=18
air.velocity= -1,-7
air.cornerpush.veloff = 0
getpower= 72*!var(20), 36*!var(20)
givepower=36,36
yaccel=.5
airguard.ctrltime= 16
airguard.velocity= ifelse(var(20),-4,-8), -1.5
airguard.cornerpush.veloff = 0
fall.recover=0


[State 630, 5]
type = CtrlSet
trigger1 = Time = 20
value = 1

;---------------------------------------------------------------------------
; Jump Medium Kick
; CNS difficulty: easy
[Statedef 640]
type    = A
movetype= A
physics = A
juggle  = 4
poweradd= 65
ctrl = 0
anim = 640

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 400,0
volume = 255

[State 280, Hit]
type=hitdef
trigger1 = time=0
attr=A,NA 
damage=40,0
animtype=Medium 
guardflag=HA 
hitflag=MAF 
priority=4,Hit 
pausetime= 12,12
sparkno=s7010+(random%8)
guard.sparkno=s7000
sparkxy=-10,-66
hitsound=s2,5
guardsound=s2,0
ground.type=High
ground.hittime=12
ground.slidetime=12
ground.velocity= ifelse(var(20), -2.66, -4.49), 0
ground.cornerpush.veloff = 0;ifelse(var(20), -4.33, -8.17)
guard.velocity= ifelse(var(20), -4.30, -7.51)
guard.cornerpush.veloff = 0;ifelse(var(20), -5.78, -10.47)
air.type=Low
air.hittime=18
air.velocity= -1,-7
air.cornerpush.veloff = 0
getpower= ifelse(p2movetype=H,72,144)*!var(20), 36*!var(20)
givepower=36,36
yaccel=.5
airguard.ctrltime= 16
airguard.velocity= ifelse(var(20),-4,-8), -1.5
airguard.cornerpush.veloff = 0
fall.recover=0

[State 640, 5]
type = CtrlSet
trigger1 = Time = 20
value = 1

;---------------------------------------------------------------------------
; Jump Strong Kick
; CNS difficulty: easy
[Statedef 650]
type    = A
movetype= A
physics = A
juggle  = 4
poweradd= 70
ctrl = 0
anim = 650

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0,1

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 401,0
volume = 255

[State 285, Hit]
type=hitdef
trigger1 = time=0
attr=A,NA
damage    =60
animtype=Hard
guardflag=HA 
hitflag=MAF 
priority=4,Hit 
pausetime= 12,12
sparkno=s7010+(random%8)
guard.sparkno=s7000
sparkxy=-10,-54
hitsound=s2,6
guardsound=s2,0
ground.type=High
ground.hittime=12
ground.slidetime=12
ground.velocity= ifelse(var(20), -2.66, -4.49), 0
ground.cornerpush.veloff = 0;ifelse(var(20), -4.33, -8.17)
guard.velocity= ifelse(var(20), -5.77, -10.52)
guard.cornerpush.veloff = 0;ifelse(var(20), -6.82, -12.74)
air.type=Low
air.hittime=18
air.velocity= -15,15
air.cornerpush.veloff = 0
getpower= ifelse(p2movetype=H,72,216)*!var(20), 36*!var(20)
givepower=36,36
yaccel=.5
airguard.ctrltime= 16
airguard.velocity= ifelse(var(20),-4,-8), -1.5
airguard.cornerpush.veloff = 0
fall.recover=0
air.fall=1

[State 650, 5]
type = CtrlSet
trigger1 = Time = 20
value = 1

;---------------------------------------------------------------------------
; Throw - Attempt
; CNS difficulty: medium-advanced
; Description: Throws are not difficult to make, although then can be
;     tedious at times. Throw attempt states have a HitDef of a
;     special format. The key parameters in a throw are p1stateno
;     and p2stateno. If the HitDef successfully connects, then
;     the attacker will change to the state number specified by
;     p1stateno, and the opponent will be change to the state
;     number assigned to p2stateno. The special thing about p2stateno
;     is that the opponent will be temporarily brought into the
;     attacker's state file. In this case, no matter who the
;     opponent is, he will be taken to state 820 of this file (kfm.cns)
;     and remain here until the end of the throw (look at his debug
;     information when he is being thrown; the text changes to yellow
;     to mean that he is in another player's state file).
[Statedef 800]
type = S
movetype = A
physics = N
anim = 800
sprpriority = 2
ctrl = 0

[State VelM, 1]
type = VelMul
trigger1 = 1
x = 0.88

[State VelS, 1]
type = VelSet
triggerall = time = 0
trigger1 = prevstateno = [20,22]
x = 0

[State VarR, 1]
type = VarRandom
trigger1 = time = 0
v = 1
range = 0,1

; Notes: The '-' symbol in the hitflag field means that it only affects
;   players who are not in a hit state. This prevents the player from combo-ing
;   into the throw. The priority should be set to a low number, such as
;   1 or 2, so that the throw does not take precedence over normal attacks.
;   The type of priority must always be set to "Miss" or "Dodge" for throws,
;   otherwise strange behavior can result.
[State 800, 1]
type = HitDef
Trigger1 = Time = 0
attr = S, NT          ;Attributes: Standing, Normal Throw
hitflag = M-          ;Affect only ground people who are not being hit
priority = 1, Miss    ;Throw has low priority, must be miss or dodge type.
sparkno = -1          ;No spark
sprpriority = 1       ;Draw in front of p2
p1facing = 1;ifelse (command = "holdfwd", -1, 1) ;Turn if holding forwards
p2facing = 1          ;Force p2 to face player
p1stateno = 810       ;On success, player changes to state 810
p2stateno = 820       ;If hit, p2 changes to state 820 in player's cns
fall = 1              ;Force p2 into falling down

[State 800, 2]
type = ChangeState
Trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Throwing the opponent
; Description: In this state, the player throws the opponent by binding him to
;     various offsets based on his current frame of animation. For
;     example, [State 810, Bind 1] binds the opponent to an offset of
;     28 pixels in front of the player. That puts him around where the hand
;     is at. Is is important to keep the opponent bound using a
;     TargetBind controller at all times, until you let him go. This
;     is especially important if your player has a Clsn2 box that
;     allows him to get hit while throwing someone. Each time a player
;     gets hit, all his bound targets will be set to a fall state. If
;     the opponent is not bound, then he might get stuck in his thrown
;     state when his attacker is knocked out of the throw halfway.
; Notes: There is a TargetLifeAdd controller to decrease the opponent's
;     life, and a TargetState controller to change his state to a
;     falling state when KFM lets go of him.
[Statedef 810]
type    = S
movetype= A
physics = N
anim = 810
poweradd = 60


[State 805, hurt]
type = targetlifeadd
trigger1 = animelem = 4 && var(10) = 1
value = -120
[State 805, hurt]
type = targetlifeadd
trigger1 = var(10) = 2 && numtarget
trigger1 = target, stateno = 5110 && target, time = 1
value = -125
;[State 0, Gravity]
;type = Gravity
;trigger1 = time > 35

[State 300, PlaySnd]
type = PlaySnd
trigger1 = !time
value = s180, 2
channel = 0
volumescale = 100

[State 0, TargetBind]
type = TargetBind
trigger1 = animelem = 1
time = 10
pos = 42,-78

[State 0, TargetBind]
type = TargetBind
trigger1 = animelem = 2
time = 9
pos = 42,-98

[State 0, TargetVelSet]
type = TargetVelSet
trigger1 = time = 19
x = 8
y = -6



[State 810, State End]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1
;---------------------------------------------------------------------------
; Opponent Thrown
[Statedef 820]
type    = A
movetype= H
physics = N
velset = 0,0

[State 820, 1]
type = ChangeAnim2
Trigger1 = anim !=820
value = 820

[State 0, Gravity]
type = Gravity
trigger1 = time > 20

[State 445, ChangeState]
type = selfstate
trigger1 = Pos y > const(movement.down.bounce.groundlevel) && vel y > 0
value = 5100

;---------------------------------------------------------------------------
; Air Z
[Statedef 840]
type    = A
movetype= A
physics = A
ctrl = 0
anim = 840
sprpriority = 1

[State 200, Hitdef]
type = HitDef
trigger1 = Time = 0
attr = A, NT
damage = 0, 0
animtype = Medium
guardflag = 
hitflag = AF
priority = 6, Miss
guard.pausetime = 0,0
sparkno = -1 + 0*(var(10):=8010)
guard.sparkno =  s8010
sparkxy = 0 + 0*(var(16):=90), var(17):=-75
hitsound = s1, 0
guardsound = s2, 0
fall = 1
p1stateno = 845
p2stateno = 850
;getpower = 0,0

[State 400, ChangeState]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1
;---------------------------------------------------------------------------
; Air Z P1
[Statedef 845]
type    = A
movetype= A
physics = N
ctrl = 0
anim = 441
velset = 0,0
sprpriority = 1

[State 0, Gravity]
type = Gravity
trigger1 = time > 35

[State 0, TargetBind]
type = TargetBind
trigger1 = animelem = 1
time = 10
pos = 42,-78

[State 0, TargetBind]
type = TargetBind
trigger1 = animelem = 2
time = 9
pos = 42,-98

[State 0, TargetVelSet]
type = TargetVelSet
trigger1 = time = 19
x = 8
y = -6

[State 0, ChangeState]
type = ChangeState
trigger1 = command = "x" && time > 34
value = 270
ctrl = 0

[State 845, ChangeState]
type = changestate
trigger1 = Pos y > 0 && vel y > 0
value = 52
;---------------------------------------------------------------------------
; Air Z P2
[Statedef 850]
type    = A
movetype= H
ctrl = 0
velset = 0,0
sprpriority = 1

[State 0, ChangeAnim2]
type = ChangeAnim2
trigger1 = anim !=442
value = 442

[State 0, Gravity]
type = Gravity
trigger1 = time > 20
[State 845, ChangeState]
type = selfstate
trigger1 = Pos y > 0 && vel y > 0
value = 5100
