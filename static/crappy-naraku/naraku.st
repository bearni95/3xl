;---------------------------------------------------------------------------
; Variables and Whatnot:
;
; Var(1)  - Combo Counter
; Var(4)  - Kikyo's introductory quote decider
; Var(7)  - Determines random X position for Kikyo's Soul Collectors
; Var(8)  - Determines random Y position for Kikyo's Soul Collectors
; Var(10) - Variable for Kikyo's Anti-Cheapo System. If set to any value
;           other than zero, Kikyo will activate her anti-cheapo mode when
;           facing a cheap character (Boost in Attack, Defense, & Speed and
;           immune to Omega Tom Hanks's attacks). Useful for Kikyo vs Cheap
;           Character videos.
;           If set to 0, Kikyo will not activate anti-cheapo mode. Useful
;           if you want a challenge or want Kikyo to be raped by the likes
;           of Broly, Psycho Shredder, etc.
;           Default value is 0.
; Var(46) - Used by Kikyo's Hyper Armor during Anti-Cheapo mode
; Var(59) - Variable for Kikyo's AI

; Variables not Yet used:
; None




;---------------------------------------------------------------------------
; Lose by Time Over
[Statedef 170]
type = S
ctrl = 0
anim = 170
velset = 0,0

[State 170, Varset]
type = Varrandom
trigger1 = time <= 0
v = 4
range = 1,2

[State 170, 1]
type = NotHitBy
trigger1 = 1
value = SCA
time = 1

[State 170, Lose Sound]
type = playsnd
trigger1 = AnimElem = 1
trigger1 = Var(4) = 1
value = 170,0
channel = 0

[State 170, Lose Sound]
type = playsnd
trigger1 = AnimElem = 1
trigger1 = Var(4) = 2
value = 170,1
channel = 0

;---------------------------------------------------------------------------
; Win state decider
; CNS difficulty: basic
; CNS レベル: 基本
[Statedef 180]
type = S

[State 180, 1]
type = ChangeState
trigger1 = Time = 0
value = 181

;---------------------------------------------------------------------------
; Win pose 1 - Bow
; CNS difficulty: basic
; CNS レベル: 基本
[Statedef 181]
type = S
ctrl = 0
anim = 181
velset = 0,0

[State 181, Varset]
type = Varrandom
trigger1 = time <= 0
v = 4
range = 1,2

[State 181, 1]
type = NotHitBy
trigger1 = 1
value = SCA
time = 1

[State 181, Win Sound]
type = playsnd
trigger1 = AnimElem = 1
trigger1 = Var(4) = 1
value = 181,0
channel = 0

[State 181, Win Sound]
type = playsnd
trigger1 = AnimElem = 1
trigger1 = Var(4) = 2
value = 181,1
channel = 0

;---------------------------------------------------------------------------
; Introduction
; CNS difficulty: basic
; CNS レベル: 基本
[Statedef 191]
type = S
ctrl = 0
anim = 190
velset = 0,0

[State 192, Power Up]
type = ChangeState
trigger1 = Var(10) != 0
trigger1 = Var(11) != 0
value = 192

[State 191, 2] ;Assert this until you want "round 1, fight" to begin
type = AssertSpecial
trigger1 = 1
flag = Intro

[State 191, Varset]
type = Varrandom
trigger1 = time = 0
v = 4
range = 1,3

[State 191, Kikyo Gonna Punish You]
type = playsnd
trigger1 = AnimElem = 1
trigger1 = Var(4) = 1
value = 190,0
channel = 0

[State 191, Kikyo Gonna Kill You]
type = playsnd
trigger1 = AnimElem = 1
trigger1 = Var(4) = 2
value = 190,1
channel = 0

[State 191, Kikyo Pulls off Dr Eggmans Drill Tank]
type = playsnd
trigger1 = AnimElem = 1
trigger1 = Var(4) = 3
value = 190,2
channel = 0

[State 191, 3] ;Change to stand state when done
type = ChangeState
trigger1 = AnimTime = 0
value = 0

;---------------------------------------------------------------------------
; Intro with Anti Cheapo mode on and activated
[Statedef 192]
type = S
ctrl = 0
anim = 0
velset = 0,0

[State 192, ChangeAnim]
type = ChangeAnim
triggerall = Anim != 190
trigger1 = Time <= 0
value = 190

[State 192, 2] ;Assert this until you want "round 1, fight" to begin
type = AssertSpecial
trigger1 = 1
flag = Intro

[State 192, You're Screwed now, bub]
type = playsnd
trigger1 = (Anim = 190) && (AnimElem = 1)
value = 192,0
channel = 0

[state 192, ChangeAnim]
type = ChangeAnim
trigger1 = (Anim = 190) && (AnimTime = 0)
value = 0

[state 192, ChangeAnim]
type = ChangeAnim
trigger1 = Time = 240
value = 2000

[State 192, You're Screwed now, bub]
type = playsnd
trigger1 = Time = 240
value = 2000,0
channel = 0

[State 192, Aura]
; Kikyo goes SUPER SAIYAN FOUR PLUS PLUS OMFG WATCH OUT GOKU!!!.
type = Helper
trigger1 = (Anim = 2000) && (AnimElem = 16)
helpertype = normal
name = "Aura"
ID = 2100
pos = 0,-54
postype = p1
facing = 1
stateno = 2100

[State 192, 3] ;Change to stand state when done
type = ChangeState
trigger1 = (Anim = 2000) && (AnimTime = 0)
value = 0

;---------------------------

;----------------------------
;Dash Forwards
; UPDATE 07/21/07 - State 100 and 101 revised. It is now based on
; KFM's State 105 and 106 so that Kikyo's forward dash looks less
; awkward
[Statedef 100]
type = A
physics = N
anim = 100
ctrl = 0

[State 100, Velset]
type = VelSet
trigger1 = AnimElem = 4
x = const(velocity.run.fwd.x)
y = const(velocity.run.fwd.y)

[State 100, What Goes Up Must Come Down]
type = VelSet
trigger1 = AnimElem = 7
y = 3.8

[State 100, changeState]
type = ChangeState
trigger1 = AnimElemTime(8) = 2
value = 101

;----------------------------
;Dash Forwards part 2
[Statedef 101]
type = S
physics = S
anim = 101
ctrl = 0

[State 101, PosSet]
type = PosSet
trigger1 = time = 0
y = 0

[State 101, Velset]
type = Velset
trigger1 = time = 0
y = 0

[State 101, Dust]
type = MakeDust
trigger1 = AnimElem = 4
pos = 0,0
spacing = 2

[State 101, changestate]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
;---------------------------------------------------------------------------
; Kikyo's Bow Smack 1 (Stand Light Attack)
[Statedef 200]
type    = S                      ;State-type: S-stand, C-crouch, A-air, L-liedown
movetype= A                      ;Move-type: A-attack, I-idle, H-gethit
physics = S                      ;Physics: S-stand, C-crouch, A-air
juggle  = 1                      ;Number of air juggle points move takes
velset = 0,0                     ;Set velocity (x,y) (Def: no change)
ctrl = 0                         ;Set ctrl (Def: no change)
anim = 200                       ;Change animation (Def: no change)
poweradd = 0                    ;Power to add (Def: 0)
sprpriority = 2                  ;Set p1's sprite layering priority to 2 (in front)

[State 200, Hitdef]
type = HitDef
trigger1 = AnimElem = 3
attr = S, NA                     ;Attribute: Standing, Normal Attack
damage = 23, 0                   ;Damage that move inflicts, guard damage
animtype = Light                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = MA                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 8, 8                 ;Time attacker pauses, time opponent shakes
sparkno = 0                      ;Spark anim no (Def: set above)
sparkxy = -10, -76               ;X-offset for the "hit spark" rel. to p2,
;Y-offset for the spark rel. to p1
hitsound = S200, 2                  ;Sound to play on hit
guardsound = S6, 0                ;Sound to play on guard
ground.type = High               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 20             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = High                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 20                 ;Time before opponent regains control in air
getpower = 20,10

[State 200, Sound]
type = PlaySnd
trigger1 = AnimElem = 1
value = 200, 0

[State 200, Changestate]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1
;---------------------------------------------------------------------------
; Kikyo's Bow Smack 2 (Duplicate State for Yasha Combos)
; Edit 07/16/07 - Added Velocity. Kikyo shouldn't stand in one place anymore
[Statedef 201]
type    = S                      ;State-type: S-stand, C-crouch, A-air, L-liedown
movetype= A                      ;Move-type: A-attack, I-idle, H-gethit
physics = S                      ;Physics: S-stand, C-crouch, A-air
juggle  = 1                      ;Number of air juggle points move takes
velset = 4,0                     ;Set velocity (x,y) (Def: no change)
ctrl = 0                         ;Set ctrl (Def: no change)
anim = 200                       ;Change animation (Def: no change)
poweradd = 0                    ;Power to add (Def: 0)
sprpriority = 2                  ;Set p1's sprite layering priority to 2 (in front)

[State 201, Hitdef]
type = HitDef
trigger1 = AnimElem = 3
attr = S, NA                     ;Attribute: Standing, Normal Attack
damage = 23, 0                   ;Damage that move inflicts, guard damage
animtype = Light                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = MA                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 8, 8                 ;Time attacker pauses, time opponent shakes
sparkno = 0                      ;Spark anim no (Def: set above)
sparkxy = -10, -76               ;X-offset for the "hit spark" rel. to p2,
;Y-offset for the spark rel. to p1
hitsound = S200, 2                  ;Sound to play on hit
guardsound = S6, 0                ;Sound to play on guard
ground.type = High               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 20             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = High                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 20                 ;Time before opponent regains control in air
getpower = 20,10
hitcountpersist = 1

[State 201, Sound]
type = PlaySnd
trigger1 = AnimElem = 1
value = 200, 0

[State 201, Changestate]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1
;---------------------------------------------------------------------------
; Kikyo's Bow Smack 3 (Edited State 200/201 for More Yasha Combo Goodness)
; Edit 07/16/07 - Added Velocity. Kikyo shouldn't stand in one place anymore
[Statedef 202]
type    = S                      ;State-type: S-stand, C-crouch, A-air, L-liedown
movetype= A                      ;Move-type: A-attack, I-idle, H-gethit
physics = S                      ;Physics: S-stand, C-crouch, A-air
juggle  = 1                      ;Number of air juggle points move takes
velset = 4,0                     ;Set velocity (x,y) (Def: no change)
ctrl = 0                         ;Set ctrl (Def: no change)
anim = 202                       ;Change animation (Def: no change)
poweradd = 0                    ;Power to add (Def: 0)
sprpriority = 2                  ;Set p1's sprite layering priority to 2 (in front)

[State 202, Hitdef]
type = HitDef
trigger1 = AnimElem = 5
attr = S, NA                     ;Attribute: Standing, Normal Attack
damage = 23, 0                   ;Damage that move inflicts, guard damage
animtype = Light                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = MA                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 8, 8                 ;Time attacker pauses, time opponent shakes
sparkno = 0                      ;Spark anim no (Def: set above)
sparkxy = -10, -76               ;X-offset for the "hit spark" rel. to p2,
;Y-offset for the spark rel. to p1
hitsound = S1500, 1                  ;Sound to play on hit
guardsound = S6, 0                ;Sound to play on guard
ground.type = High               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 20             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = High                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 20                 ;Time before opponent regains control in air
getpower = 20,10
hitcountpersist = 1

[State 202, Sound]
type = PlaySnd
trigger1 = AnimElem = 1
value = 200, 1

[State 202, Changestate]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;----------------------------------------------------
; Kikyo's Bow Smack 4 (Dash Fwd Attack)
[Statedef 110]
type    = A                      ;State-type: S-stand, C-crouch, A-air, L-liedown
movetype= A                      ;Move-type: A-attack, I-idle, H-gethit
physics = A                      ;Physics: S-stand, C-crouch, A-air
juggle  = 1                      ;Number of air juggle points move takes
velset = 2,0                     ;Set velocity (x,y) (Def: no change)
ctrl = 0                         ;Set ctrl (Def: no change)
anim = 110                       ;Change animation (Def: no change)
poweradd = 0                    ;Power to add (Def: 0)
sprpriority = 2                  ;Set p1's sprite layering priority to 2 (in front)

[State 110, Hitdef]
type = HitDef
trigger1 = AnimElem = 7
attr = A, NA                     ;Attribute: Standing, Normal Attack
damage = 23, 0                   ;Damage that move inflicts, guard damage
animtype = Medium                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = MA                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 8, 8                 ;Time attacker pauses, time opponent shakes
sparkno = 0                      ;Spark anim no (Def: set above)
sparkxy = -10, -76               ;X-offset for the "hit spark" rel. to p2,
;Y-offset for the spark rel. to p1
hitsound = S200, 2                  ;Sound to play on hit
guardsound = S6, 0                ;Sound to play on guard
ground.type = High               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 10             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = High                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 12                 ;Time before opponent regains control in air
getpower = 20,10

[State 110, Float For a While]
type = PosSet
trigger1 = AnimTime < 28
y = -2

[State 110, Float For a While]
type = VelSet
trigger1 = AnimTime < 28
y = -2

[State 110, Return to Ground]
type = PosSet
trigger1 = AnimTime >= 28
y = 0

;[State 110, Float For a While]
;type = VelSet
;trigger1 = AnimTime >= 28
;y = 3.8

[State 110, Sound]
type = PlaySnd
trigger1 = AnimElem = 1
value = 210, 0

[State 110, Changestate]
type = ChangeState
trigger1 = AnimElem = 14
value = 101
ctrl = 1

;----------------------------------------------------
; Kikyo's Bow Smack 5 (Dash Back Attack)
[Statedef 111]
type    = A                      ;State-type: S-stand, C-crouch, A-air, L-liedown
movetype= A                      ;Move-type: A-attack, I-idle, H-gethit
physics = A                      ;Physics: S-stand, C-crouch, A-air
juggle  = 1                      ;Number of air juggle points move takes
velset = -2,0                     ;Set velocity (x,y) (Def: no change)
ctrl = 0                         ;Set ctrl (Def: no change)
anim = 111                       ;Change animation (Def: no change)
poweradd = 0                    ;Power to add (Def: 0)
sprpriority = 2                  ;Set p1's sprite layering priority to 2 (in front)

[State 111, Hitdef]
type = HitDef
trigger1 = AnimElem = 6
attr = A, NA                     ;Attribute: Standing, Normal Attack
damage = 23, 0                   ;Damage that move inflicts, guard damage
animtype = Medium                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = MA                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 8, 8                 ;Time attacker pauses, time opponent shakes
sparkno = 0                      ;Spark anim no (Def: set above)
sparkxy = -10, -76               ;X-offset for the "hit spark" rel. to p2,
;Y-offset for the spark rel. to p1
hitsound = S200, 2                  ;Sound to play on hit
guardsound = S6, 0                ;Sound to play on guard
ground.type = High               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 10             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = High                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 12                 ;Time before opponent regains control in air
getpower = 20,10

[State 111, Float For a While]
type = PosSet
trigger1 = AnimTime < 28
y = -2

[State 111, Float For a While]
type = VelSet
trigger1 = AnimTime < 28
y = -2

[State 111, Return to Ground]
type = PosSet
trigger1 = AnimTime >= 28
y = 0

;[State 110, Float For a While]
;type = VelSet
;trigger1 = AnimTime >= 28
;y = 3.8

[State 111, Sound]
type = PlaySnd
trigger1 = AnimElem = 1
value = 210, 0

[State 111, Changestate]
type = ChangeState
trigger1 = AnimElem = 14
value = 101
ctrl = 1
;---------------------------------------------------------------------------
; Kikyo's Shikigami Smack 1 (Stand Strong Attack)
[Statedef 210]
type    = S                      ;State-type: S-stand, C-crouch, A-air, L-liedown
movetype= A                      ;Move-type: A-attack, I-idle, H-gethit
physics = S                      ;Physics: S-stand, C-crouch, A-air
juggle  = 1                      ;Number of air juggle points move takes
velset = 0,0                     ;Set velocity (x,y) (Def: no change)
ctrl = 0                         ;Set ctrl (Def: no change)
anim = 210                       ;Change animation (Def: no change)
poweradd = 0                    ;Power to add (Def: 0)
sprpriority = 2                  ;Set p1's sprite layering priority to 2 (in front)

[State 210, Hitdef]
type = HitDef
triggerall = MoveContact = 0
trigger1 = AnimElem = 4
trigger2 = AnimElem = 5
trigger3 = AnimElem = 6
attr = S, NA                     ;Attribute: Standing, Normal Attack
damage = 42, 0                   ;Damage that move inflicts, guard damage
animtype = Heavy                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = MA                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 10, 8                 ;Time attacker pauses, time opponent shakes
sparkno = 0                      ;Spark anim no (Def: set above)
sparkxy = -10, -76               ;X-offset for the "hit spark" rel. to p2,
;Y-offset for the spark rel. to p1
hitsound = S1500, 1                  ;Sound to play on hit
guardsound = S6, 0                ;Sound to play on guard
ground.type = High               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 20             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = High                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 20                 ;Time before opponent regains control in air
getpower = 20,10
hitcountpersist = 1

[State 210, Sound]
type = PlaySnd
trigger1 = AnimElem = 1
value = 210, 0

[State 210, Sound]
type = PlaySnd
trigger1 = AnimElem = 9
value = 210, 2

[State 210, Changestate]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;------------------------------------------------
; Kikyo's Shikigami Smack 2 (Duplicate State for Combos)
; Edit 07/16/07 - Added Velocity. Kikyo shouldn't stand in one place anymore
[Statedef 211]
type    = S                      ;State-type: S-stand, C-crouch, A-air, L-liedown
movetype= A                      ;Move-type: A-attack, I-idle, H-gethit
physics = S                      ;Physics: S-stand, C-crouch, A-air
juggle  = 1                      ;Number of air juggle points move takes
velset = 4,0                     ;Set velocity (x,y) (Def: no change)
ctrl = 0                         ;Set ctrl (Def: no change)
anim = 210                       ;Change animation (Def: no change)
poweradd = 0                    ;Power to add (Def: 0)
sprpriority = 2                  ;Set p1's sprite layering priority to 2 (in front)

[State 211, Hitdef]
type = HitDef
triggerall = MoveContact = 0
trigger1 = AnimElem = 4
trigger2 = AnimElem = 5
trigger3 = AnimElem = 6
attr = S, NA                     ;Attribute: Standing, Normal Attack
damage = 42, 0                   ;Damage that move inflicts, guard damage
animtype = Heavy                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = MA                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 10, 8                 ;Time attacker pauses, time opponent shakes
sparkno = 0                      ;Spark anim no (Def: set above)
sparkxy = -10, -76               ;X-offset for the "hit spark" rel. to p2,
;Y-offset for the spark rel. to p1
hitsound = S1500, 1                  ;Sound to play on hit
guardsound = S6, 0                ;Sound to play on guard
ground.type = High               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 20             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = High                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 20                 ;Time before opponent regains control in air
getpower = 20,10
hitcountpersist = 1

[State 211, Sound]
type = PlaySnd
trigger1 = AnimElem = 1
value = 210, 0

[State 211, Sound]
type = PlaySnd
trigger1 = AnimElem = 6
value = 210, 2

[State 211, Changestate]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;-------------------------------------------------
; Kikyo's Shikigami Smack 3 (For Yasha Combos)
; Edit 07/16/07 - Added Velocity. Kikyo shouldn't stand in one place anymore
[Statedef 212]
type    = S                      ;State-type: S-stand, C-crouch, A-air, L-liedown
movetype= A                      ;Move-type: A-attack, I-idle, H-gethit
physics = S                      ;Physics: S-stand, C-crouch, A-air
juggle  = 1                      ;Number of air juggle points move takes
velset = 4,0                     ;Set velocity (x,y) (Def: no change)
ctrl = 0                         ;Set ctrl (Def: no change)
anim = 212                       ;Change animation (Def: no change)
poweradd = 0                    ;Power to add (Def: 0)
sprpriority = 2                  ;Set p1's sprite layering priority to 2 (in front)

[State 212, Hitdef]
type = HitDef
triggerall = MoveContact = 0
trigger1 = AnimElem = 5
trigger2 = AnimElem = 6
trigger3 = AnimElem = 7
trigger4 = AnimElem = 8
trigger5 = AnimElem = 9
trigger6 = AnimElem = 10
attr = S, NA                     ;Attribute: Standing, Normal Attack
damage = 42, 0                   ;Damage that move inflicts, guard damage
animtype = Heavy                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = MA                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 10, 8                 ;Time attacker pauses, time opponent shakes
sparkno = 0                      ;Spark anim no (Def: set above)
sparkxy = -10, -76               ;X-offset for the "hit spark" rel. to p2,
;Y-offset for the spark rel. to p1
hitsound = S1500, 1                  ;Sound to play on hit
guardsound = S6, 0                ;Sound to play on guard
ground.type = High               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 20             ;Time opponent is in hit state
ground.velocity = -2             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = High                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 20                 ;Time before opponent regains control in air
getpower = 20,10
hitcountpersist = 1

[State 212, Sound]
type = PlaySnd
trigger1 = AnimElem = 1
value = 200, 1

[State 212, Sound]
type = PlaySnd
trigger1 = AnimElem = 9
value = 210, 2

[State 212, Changestate]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1
;---------------------------------------------------------------------------
;---------------------------------------------------------------------------
; Kikyo's Crouching Bow Smack 1 (Crouch Light Attack)
[Statedef 400]
type    = C                      ;State-type: S-stand, C-crouch, A-air, L-liedown
movetype= A                      ;Move-type: A-attack, I-idle, H-gethit
physics = C                      ;Physics: S-stand, C-crouch, A-air
juggle  = 1                      ;Number of air juggle points move takes
velset = 0,0                     ;Set velocity (x,y) (Def: no change)
ctrl = 0                         ;Set ctrl (Def: no change)
anim = 400                       ;Change animation (Def: no change)
poweradd = 0                    ;Power to add (Def: 0)
sprpriority = 2                  ;Set p1's sprite layering priority to 2 (in front)

[State 400, Hitdef]
type = HitDef
trigger1 = AnimElem = 3
attr = C, NA                     ;Attribute: Crouch, Normal Attack
damage = 23, 0                   ;Damage that move inflicts, guard damage
animtype = Light                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = L                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 8, 8                 ;Time attacker pauses, time opponent shakes
sparkno = 0                      ;Spark anim no (Def: set above)
sparkxy = -10, -38               ;X-offset for the "hit spark" rel. to p2,
;Y-offset for the spark rel. to p1
hitsound = S200, 2                  ;Sound to play on hit
guardsound = S6, 0                ;Sound to play on guard
ground.type = Low               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 20             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = Low                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 20                 ;Time before opponent regains control in air
getpower = 20,10

[State 400, Sound]
type = PlaySnd
trigger1 = AnimElem = 1
value = 200, 0

[State 400, Changestate]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1

;---------------------------------------------------------------------------
; Kikyo's Crouching Bow Smack 2 (Duplicate for Combos)
[Statedef 401]
type    = C                      ;State-type: S-stand, C-crouch, A-air, L-liedown
movetype= A                      ;Move-type: A-attack, I-idle, H-gethit
physics = C                      ;Physics: S-stand, C-crouch, A-air
juggle  = 1                      ;Number of air juggle points move takes
velset = 4,0                     ;Set velocity (x,y) (Def: no change)
ctrl = 0                         ;Set ctrl (Def: no change)
anim = 400                       ;Change animation (Def: no change)
poweradd = 0                    ;Power to add (Def: 0)
sprpriority = 2                  ;Set p1's sprite layering priority to 2 (in front)

[State 401, Hitdef]
type = HitDef
trigger1 = AnimElem = 3
attr = C, NA                     ;Attribute: Crouch, Normal Attack
damage = 23, 0                   ;Damage that move inflicts, guard damage
animtype = Light                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = L                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 8, 8                 ;Time attacker pauses, time opponent shakes
sparkno = 0                      ;Spark anim no (Def: set above)
sparkxy = -10, -38               ;X-offset for the "hit spark" rel. to p2,
;Y-offset for the spark rel. to p1
hitsound = S200, 2                  ;Sound to play on hit
guardsound = S6, 0                ;Sound to play on guard
ground.type = Low               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 20             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = Low                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 20                 ;Time before opponent regains control in air
getpower = 20,10

[State 401, Sound]
type = PlaySnd
trigger1 = AnimElem = 1
value = 200, 0

[State 401, Changestate]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1

;---------------------------------------------------------------------------
; Kikyo's Crouching Bow Smack 2 (Duplicate for Combos)
[Statedef 402]
type    = C                      ;State-type: S-stand, C-crouch, A-air, L-liedown
movetype= A                      ;Move-type: A-attack, I-idle, H-gethit
physics = C                      ;Physics: S-stand, C-crouch, A-air
juggle  = 1                      ;Number of air juggle points move takes
velset = 4,0                     ;Set velocity (x,y) (Def: no change)
ctrl = 0                         ;Set ctrl (Def: no change)
anim = 402                       ;Change animation (Def: no change)
poweradd = 0                    ;Power to add (Def: 0)
sprpriority = 2                  ;Set p1's sprite layering priority to 2 (in front)

[State 402, Hitdef]
type = HitDef
trigger1 = AnimElem = 5
attr = C, NA                     ;Attribute: Crouch, Normal Attack
damage = 23, 0                   ;Damage that move inflicts, guard damage
animtype = Light                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = L                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 8, 8                 ;Time attacker pauses, time opponent shakes
sparkno = 0                      ;Spark anim no (Def: set above)
sparkxy = -10, -38               ;X-offset for the "hit spark" rel. to p2,
;Y-offset for the spark rel. to p1
hitsound = S1500, 1                  ;Sound to play on hit
guardsound = S6, 0                ;Sound to play on guard
ground.type = Low               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 20             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = Low                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 20                 ;Time before opponent regains control in air
getpower = 20,10

[State 402, Sound]
type = PlaySnd
trigger1 = AnimElem = 1
value = 200, 1

[State 402, Changestate]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1
;---------------------------------------------------------------------------
; Kikyo's Crouching Shikigami Smack 1 (Crouch Strong Attack)
[Statedef 410]
type    = C                      ;State-type: S-stand, C-crouch, A-air, L-liedown
movetype= A                      ;Move-type: A-attack, I-idle, H-gethit
physics = C                      ;Physics: S-stand, C-crouch, A-air
juggle  = 1                      ;Number of air juggle points move takes
velset = 0,0                     ;Set velocity (x,y) (Def: no change)
ctrl = 0                         ;Set ctrl (Def: no change)
anim = 410                       ;Change animation (Def: no change)
poweradd = 0                    ;Power to add (Def: 0)
sprpriority = 2                  ;Set p1's sprite layering priority to 2 (in front)

[State 410, Hitdef]
type = HitDef
triggerall = MoveContact = 0
trigger1 = AnimElem = 5
trigger2 = AnimElem = 6
trigger3 = AnimElem = 7
attr = C, NA                     ;Attribute: Standing, Normal Attack
damage = 42, 0                   ;Damage that move inflicts, guard damage
animtype = Heavy                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = L                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 10, 8                 ;Time attacker pauses, time opponent shakes
sparkno = 0                      ;Spark anim no (Def: set above)
sparkxy = -10, -38               ;X-offset for the "hit spark" rel. to p2,
;Y-offset for the spark rel. to p1
hitsound = S1500, 1                  ;Sound to play on hit
guardsound = S6, 0                ;Sound to play on guard
ground.type = Low               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 20             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = Low                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 20                 ;Time before opponent regains control in air
getpower = 20,10

[State 410, Sound]
type = PlaySnd
trigger1 = AnimElem = 1
value = 210, 0

[State 410, Sound]
type = PlaySnd
trigger1 = AnimElem = 10
value = 210, 2

[State 410, Changestate]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1

;---------------------------------------------------------------------------
; Kikyo's Crouching Shikigami Smack 2 (Duplicate for Combos)
[Statedef 411]
type    = C                      ;State-type: S-stand, C-crouch, A-air, L-liedown
movetype= A                      ;Move-type: A-attack, I-idle, H-gethit
physics = C                      ;Physics: S-stand, C-crouch, A-air
juggle  = 1                      ;Number of air juggle points move takes
velset = 4,0                     ;Set velocity (x,y) (Def: no change)
ctrl = 0                         ;Set ctrl (Def: no change)
anim = 410                       ;Change animation (Def: no change)
poweradd = 0                    ;Power to add (Def: 0)
sprpriority = 2                  ;Set p1's sprite layering priority to 2 (in front)

[State 411, Hitdef]
type = HitDef
triggerall = MoveContact = 0
trigger1 = AnimElem = 5
trigger2 = AnimElem = 6
trigger3 = AnimElem = 7
attr = C, NA                     ;Attribute: Standing, Normal Attack
damage = 42, 0                   ;Damage that move inflicts, guard damage
animtype = Heavy                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = L                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 10, 8                 ;Time attacker pauses, time opponent shakes
sparkno = 0                      ;Spark anim no (Def: set above)
sparkxy = -10, -38               ;X-offset for the "hit spark" rel. to p2,
;Y-offset for the spark rel. to p1
hitsound = S1500, 1                  ;Sound to play on hit
guardsound = S6, 0                ;Sound to play on guard
ground.type = Low               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 20             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = Low                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 20                 ;Time before opponent regains control in air
getpower = 20,10

[State 411, Sound]
type = PlaySnd
trigger1 = AnimElem = 1
value = 210, 0

[State 411, Sound]
type = PlaySnd
trigger1 = AnimElem = 10
value = 210, 2

[State 411, Changestate]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1
;---------------------------------------------------------------------------
; Kikyo's Crouching Shikigami Smack 3 (Duplicate for Combos)
[Statedef 412]
type    = C                      ;State-type: S-stand, C-crouch, A-air, L-liedown
movetype= A                      ;Move-type: A-attack, I-idle, H-gethit
physics = C                      ;Physics: S-stand, C-crouch, A-air
juggle  = 1                      ;Number of air juggle points move takes
velset = 4,0                     ;Set velocity (x,y) (Def: no change)
ctrl = 0                         ;Set ctrl (Def: no change)
anim = 412                       ;Change animation (Def: no change)
poweradd = 0                    ;Power to add (Def: 0)
sprpriority = 2                  ;Set p1's sprite layering priority to 2 (in front)

[State 412, Hitdef]
type = HitDef
triggerall = MoveContact = 0
trigger1 = AnimElem = 5
trigger2 = AnimElem = 6
trigger3 = AnimElem = 7
trigger4 = AnimElem = 8
trigger5 = AnimElem = 9
trigger6 = AnimElem = 10
attr = C, NA                     ;Attribute: Standing, Normal Attack
damage = 42, 0                   ;Damage that move inflicts, guard damage
animtype = Heavy                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = L                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 10, 8                 ;Time attacker pauses, time opponent shakes
sparkno = 0                      ;Spark anim no (Def: set above)
sparkxy = -10, -38               ;X-offset for the "hit spark" rel. to p2,
;Y-offset for the spark rel. to p1
hitsound = S1500, 1                  ;Sound to play on hit
guardsound = S6, 0                ;Sound to play on guard
ground.type = Low               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 20             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = Low                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 20                 ;Time before opponent regains control in air
getpower = 20,10

[State 412, Sound]
type = PlaySnd
trigger1 = AnimElem = 1
value = 200, 1

[State 412, Sound]
type = PlaySnd
trigger1 = AnimElem = 9
value = 210, 2

[State 412, Changestate]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1
;---------------------------------------------------------------------------


;---------------------------------------------------------------------------
;Jump Weak Attack
; CNS difficulty: easy
[Statedef 600]
type    = A
movetype= A
physics = A
juggle  = 2
poweradd= 0
ctrl = 0
anim = 600
sprpriority = 2

[State 600, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 200, 0

[State 600, Hitdef]
type = HitDef
trigger1 = AnimElem = 3
attr = A, NA                     ;Attribute: Air, Normal Attack
damage = 23, 0                   ;Damage that move inflicts, guard damage
animtype = Light                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = MA                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 8, 8                 ;Time attacker pauses, time opponent shakes
sparkno = 0                      ;Spark anim no (Def: set above)
sparkxy = -10, -76               ;X-offset for the "hit spark" rel. to p2,
;Y-offset for the spark rel. to p1
hitsound = S200, 2                  ;Sound to play on hit
guardsound = S6, 0                ;Sound to play on guard
ground.type = High               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 10             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = High                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 12                 ;Time before opponent regains control in air
getpower = 20,10

[State 600, Sound]
type = PlaySnd
trigger1 = AnimElem = 5
value = 210, 2

[State 600, Ctrl]
type = CtrlSet
trigger1 = AnimTime = 0
value = 1

;---------------------------------------------------------------------------
;Jump Strong Attack
; CNS difficulty: easy
[Statedef 610]
type    = A
movetype= A
physics = A
juggle  = 2
poweradd= 0
ctrl = 0
anim = 610
sprpriority = 2

[State 610, 1]
type = PlaySnd
trigger1 = AnimElem = 1
value = 210, 0

[State 610, Hitdef]
type = HitDef
triggerall = MoveContact = 0
trigger1 = AnimElem = 4
trigger2 = AnimElem = 5
trigger3 = AnimElem = 6
trigger4 = AnimElem = 7
trigger5 = AnimElem = 8
trigger6 = AnimElem = 9
attr = A, NA                     ;Attribute: Air, Normal Attack
damage = 40, 0                   ;Damage that move inflicts, guard damage
animtype = Heavy                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = MA                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit                ;Attack priority: 0 (least) to 7 (most), 4 default
;Hit/Miss/Dodge type (Def: Hit)
pausetime = 8, 8                 ;Time attacker pauses, time opponent shakes
sparkno = 0                      ;Spark anim no (Def: set above)
sparkxy = -10, 50               ;X-offset for the "hit spark" rel. to p2,
;Y-offset for the spark rel. to p1
hitsound = S1500, 1                  ;Sound to play on hit
guardsound = S6, 0                ;Sound to play on guard
ground.type = High               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 10             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = High                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 12                 ;Time before opponent regains control in air
getpower = 20,10

[State 610, Sound]
type = PlaySnd
trigger1 = AnimElem = 5
value = 210, 2

[State 610, Ctrl]
type = CtrlSet
trigger1 = AnimTime = 0
value = 1

;---------------------------------------------------------------------------
;---------------------------------------------------------------------------
;Soul Collector Throw - Attempt
[Statedef 800]
type    = S
movetype= A
physics = S
juggle  = 0
velset = 0,0
ctrl = 0
anim = 800
sprpriority = 2

[State 800, 1]
type = HitDef
Trigger1 = Time = 0
attr = S, NT          ;Attributes: Standing, Normal Throw
hitflag = M-          ;Affect only ground people who are not being hit
priority = 1, Miss    ;Throw has low priority, must be miss or dodge type.
sparkno = -1          ;No spark
p1sprpriority = 1     ;Draw p1's sprite in front of p2
                      ;p2's sprite priority is set to 0 by default
p1facing = 1
p2facing = 1          ;Force p2 to face Kikyo
p1stateno = 810       ;On success, Kikyo changes to state 810
p2stateno = 820       ;P2 changes to Kikyo's state 820
guard.dist = 0        ;This prevents p2 from going into a guard state if close
fall = 1              ;Force p2 into falling down

[State 800, 2]
type = ChangeState
Trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
;Shikigami In Yo Face Throw
[Statedef 810]
type    = S
movetype= A
physics = N
anim = 1000
poweradd = 0

[State 810, Summoning Sound]
type = PlaySnd
trigger1 = AnimElem = 5
value = 200, 0

[State 810, Soul Collector]
; Kikyo's Soul Collector pops out of the ground. Its like Whack-a-mole, except
; P2 doesn't have a rubber hammer and even if he did, he can't do shit anyway
type = Projectile
triggerall = Var(11) = 0  ; Normal Throw for Normal Kikyo
trigger1 = AnimElem = 8
projanim = 810
projremove = 0
projremovetime = 30
projmisstime = 5
projhits = 4
projedgebound = 0
postype = p1
offset = 20,0
velocity = 0,0
sparkxy = 23,-50
attr = S, HP
damage = 12,12
animtype = heavy
guardflag = MA
hitflag = MAF
hitsound = S1500, 1
guardsound = S6, 0
ground.type = Low
ground.slidetime = 10
ground.hittime  = 15
ground.velocity = 0, 0
guard.velocity = 0
air.hittime = 20
fall = 1
air.fall = 1
getpower = 9,9
givepower = 20, 15
projscale = 1,1

[State 810, Soul Collector]
; Kikyo's Soul Collector pops out of the ground. Its like Whack-a-mole, except
; P2 doesn't have a rubber hammer and even if he did, he can't do shit anyway
type = Projectile
triggerall = Var(10) != 0  ; Enhanced Throw for Anti-Cheap Kikyo
triggerall = Var(11) != 0
trigger1 = AnimElem = 8
projanim = 810
projremove = 0
projremovetime = 30
projmisstime = 5
projhits = 4
projedgebound = 0
postype = p1
offset = 20,0
velocity = 0,0
sparkxy = 23,-50
attr = S, HP
damage = 35,35
animtype = heavy
guardflag = MA
hitflag = MAF
hitsound = S1500, 1
guardsound = S6, 0
ground.type = Low
ground.slidetime = 10
ground.hittime  = 15
ground.velocity = 0, 0
guard.velocity = 0
air.hittime = 20
fall = 1
air.fall = 1
getpower = 9,9
givepower = 20, 15
projscale = 1,1

[State 810, Bind]
type = TargetBind
trigger1 = AnimElemTime(23) < 0
pos = 50, 0

[State 810, Send Em Packing]
type = TargetState
trigger1 = AnimElem = 23
value = 821

[State 810, State End]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
;Thrown by Soul Collectors
[Statedef 820]
type    = A
movetype= H
physics = N
velset = 0,0

[State 820, 1]
type = ChangeAnim2
Trigger1 = Time = 0
value = 820

;In case attacker loses binding on player for any reason, this controller
;guarantees that the player will never get stuck in this thrown state.
[State 820, 2]
type = SelfState
trigger1 = !gethitvar(isbound)
value = 5050

;---------------------------------------------------------------------------
;Thrown by Soul Collectors
[Statedef 821]
type    = A
movetype= H
physics = N
velset = -6,-4

[State 821, 1] ;Gravity
type = VelAdd
Trigger1 = 1
y = .4

[State 821, 2] ; Recover near ground (use ChangeState)
type = ChangeState
triggerall = Vel Y > 0
triggerall = Pos Y >= -20
triggerall = alive
triggerall = CanRecover
trigger1 = Command = "recovery"
value = 5200 ;HITFALL_RECOVER

[State 821, 3] ; Recover in mid air (use SelfState)
type = SelfState
triggerall = Vel Y > 0
triggerall = alive
triggerall = CanRecover
trigger1 = Command = "recovery"
value = 5210 ;HITFALL_AIRRECOVER

[State 821, 4] ;Hit ground
type = SelfState
trigger1 = Vel Y > 0
trigger1 = Pos Y >= 0
value = 5100 ;Hit ground


;---------------------------------------------------------------------------
; Kikyo's Parry Attack - Kikyo counters with a push. Next time I play Ocarina
; of time, I'll make Kikyo do the dirty work for Link in the Forest Temple.
[Statedef 900]
type = S
movetype = A
physics = S
ctrl = 0
anim = 900
velset = 0

[State 900, NotHitBy]
type = NotHitBy
trigger1 = AnimElem = 1 || AnimElem = 2 || AnimElem = 3
value = SCA,NA,SA ; If some bastard tries to punch me I won't feel it
time = 2
ignorehitpause = 1

[State 900, Reverse the Curse]
; Go Red Sox! Oh wait, more like Boston Sux
type = ReversalDef
trigger1 = AnimElem <= 4
reversal.attr = SCA,NA,SA
p1stateno = 910
pausetime = 0,12
;p2stateno = 920

[State 900, The Big Push]
; Don't you know who I am? I'm da Kikyo, bitch!
type = ChangeState
trigger1 = MoveContact
value = 910 ; The Big Push

[State 900, End]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Kikyo's Pushblock - Almost exact duplicate of Parry
[Statedef 950]
type = S
movetype = A
physics = S
ctrl = 0
anim = 950
velset = 0

[State 950, NotHitBy]
type = NotHitBy
trigger1 = AnimElem = 1
value = SCA,NA,SA ; If some bastard tries to punch me I won't feel it
time = 2
ignorehitpause = 1

[State 950, Reverse the Curse]
; Go Red Sox! Oh wait, more like Boston Sux
type = ReversalDef
trigger1 = AnimElem = 1
reversal.attr = SCA,NA,SA
p1stateno = 910
pausetime = 0,12
;p2stateno = 920

[State 950, The Big Push]
; Don't you know who I am? I'm da Kikyo, bitch!
type = ChangeState
trigger1 = MoveContact
value = 910 ; The Big Push

[State 950, End]
type = ChangeState
trigger1 = AnimTime = 0
value = 130
ctrl = 1

;-------------------------

[Statedef 910]
type = S
movetype = A
physics = S
ctrl = 0
anim = 910
velset = 0

[State 910, HitDef]
type = HitDef
Trigger1 = AnimElem = 4
attr = S, NA          ;Attributes: Standing, Normal Attack
hitflag = MAF          ;Affect only ground people who are not being hit
sparkno = -1          ;No spark
p1sprpriority = 2     ;Draw p1's sprite in front of p2
                      ;p2's sprite priority is set to 0 by default
p1facing = 1
p2facing = 1          ;Force p2 to face Kikyo
hitsound = S1500, 1
damage = 40,40
;p2stateno = 921       ;If hit, p2 changes to state 920 in Kikyo's cns
guard.dist = 0        ;This prevents p2 from going into a guard state if close
ground.type = High
ground.slidetime = 60
ground.hittime  = 15
ground.velocity = -6, -4
air.velocity = -6, -4
guard.velocity = -6
air.hittime = 60
fall = 1
air.fall = 1

;[State 910, Bind]
;type = TargetBind
;trigger1 = AnimElemTime(4) < 0
;pos = 25, 0

;[State 910, Send Em Packing]
;type = TargetState
;trigger1 = AnimElem = 4
;value = 921

[State 910, End]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;----------------------------------------------

;[Statedef 920]
;type    = A
;movetype= H
;physics = N
;velset = 0,0

;[State 920, ChangeAnim2]
;type = ChangeAnim2
;Trigger1 = Time = 0
;value = 820

;[State 920, SelfState]
;type = SelfState
;trigger1 = !gethitvar(isbound)
;value = 5050

;---------------------------------------------------------------------------
;Thrown by Parry Attack (A Near Duplicate of the Soul Collector Throw
;[Statedef 921]
;type    = A
;movetype= H
;physics = N
;velset = -6,-4

;[State 921, Gravity] ;Gravity
;type = VelAdd
;Trigger1 = 1
;y = .4

;[State 921, 2] ; Recover near ground (use ChangeState)
;type = Null
;triggerall = Vel Y > 0
;triggerall = Pos Y >= -20
;triggerall = alive
;triggerall = CanRecover
;trigger1 = Command = "recovery"
;value = 5200 ;HITFALL_RECOVER

;[State 921, 3] ; Recover in mid air (use SelfState)
;type = Null
;triggerall = Vel Y > 0
;triggerall = alive
;triggerall = CanRecover
;trigger1 = Command = "recovery"
;value = 5210 ;HITFALL_AIRRECOVER

;[State 921, 4] ;Hit ground
;type = SelfState
;trigger1 = Vel Y > 0
;trigger1 = Pos Y >= 0
;value = 5100 ;Hit ground


;---------------------------------------------------------------------------
; Kikyo's Ascension Attack (Lets throw a Shikigami at the foe
; and steal their fucking soul :p)
[Statedef 1000]
type    = S
movetype= A
physics = S
juggle  = 1
velset = 0,0
anim = 1000
ctrl = 0
sprpriority = 2

[State 1000, Sound]
type = PlaySnd
trigger1 = AnimElem = 1
value = 210, 1
channel = 0

[State 1000, Sound]
type = HitDef 
trigger1 = AnimElem = 12
value = 1000, 0

[State 1000, Shikigami]
; Kikyo's Soul Collector gets to harvest the crops.. Or cotton.. Oh wait, she's
; Japanese right? What the hell kind of rice-picking stereotype is Bandai
; trying to play on?
type = Projectile
trigger1 = AnimElem = 5
projanim = 1001
projremove = 0
projhits = 1
projedgebound = 0
postype = p1
offset = 30,-60
velocity = 4,0
sparkxy = 23,0
attr = S, SP
damage = 100,25
animtype = heavy
guardflag = MA
hitflag = MAF-
hitsound = S1500, 1
guardsound = S6, 0
ground.type = High
ground.slidetime = 10
ground.hittime  = 15
ground.velocity = -4, -2
air.velocity = -4, -1
guard.velocity = -4
air.hittime = 20
fall = 1
air.fall = 1
getpower = 120,50
givepower = 20, 15
projscale = 1,1

[State 1000, Shikigami's Collected Soul]
; Kikyo's Soul Collector stole my bike!
type = Projectile
trigger1 = AnimElem = 5
projanim = 1002
projremove = 0
projhits = 0
projedgebound = 0
postype = p1
offset = 30,-60
velocity = 4,0
attr = S, SP


[State 1000, ChangeState]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Kikyo's Purification Attack (Summon a fuckin hoarde of Shikigami at the foe
; and steal their fucking soul :p)
[Statedef 1500]
type    = S
movetype= A
physics = S
juggle  = 1
velset = 0,0
anim = 1500
ctrl = 0
sprpriority = 2

[State 1500, Sound]
type = PlaySnd
trigger1 = AnimElem = 1
value = 1500, 0
channel = 0

[State 1500, Sound]
type = PlaySnd
trigger1 = AnimElem = 12
value = 1000, 0

[State 1500, Random X]
type = VarRandom
trigger1 = AnimElem = 4
trigger2 = AnimElem = 6
trigger3 = AnimElem = 8
trigger4 = AnimElem = 10
trigger5 = AnimElem = 12
v = 7
range = -81,-30

[State 1500, Random Y]
type = VarRandom
trigger1 = AnimElem = 4
trigger2 = AnimElem = 6
trigger3 = AnimElem = 8
trigger4 = AnimElem = 10
trigger5 = AnimElem = 12
v = 8
range = -95,-20

[State 1500, SpawnPoint]
; Kikyo opens up a spawn point... Five of 'em.
type = Helper
trigger1 = AnimElem = 4
trigger2 = AnimElem = 6
trigger3 = AnimElem = 8
trigger4 = AnimElem = 10
trigger5 = AnimElem = 12
helpertype = normal
name = "Spawn_Point"
ID = 1600
pos = Var(7),Var(8)
postype = p1
facing = 1
stateno = 1600

[State 1500, ChangeState]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Kikyo's Curse Deflector (Kikyo's version of Kagome's SSj3 Transformation
; Explosion)
[Statedef 2000]
type    = S
movetype= A
physics = S
juggle  = 1
velset = 0,0
anim = 2000
ctrl = 0
sprpriority = 2

[State 2000, Sound]
type = PlaySnd
trigger1 = AnimElem = 2
value = 2000, 0
channel = 0

[State 2000, Sound]
type = PlaySnd
trigger1 = AnimElem = 16
value = 2000, 1

[State 2000, NoPush]
; Kikyo Can't be pushed back when using
type = PlayerPush
trigger1 = 1
value = 1

[State 2000, Aura]
; Kikyo goes SUPER SAIYAN FOUR PLUS PLUS OMFG WATCH OUT GOKU!!!.
type = Helper
trigger1 = AnimElem = 16
helpertype = normal
name = "Aura"
ID = 2100
pos = 0,-54
postype = p1
facing = 1
stateno = 2100

[State 2000, I Pity Da Foo Who Gets Pushed Back By Dis]
; Now we just need a glass of milk
type = HitDef
trigger1 = AnimElem = 16
attr = S, SP
damage = 100,25
animtype = heavy
guardflag = MA
hitflag = MAF-
hitsound = S1500, 1
guardsound = S6, 0
sparkxy = -42,-54
ground.type = High
ground.slidetime = 30
ground.hittime = 60
ground.velocity = -10
airguard.velocity = -4,-1
air.velocity = -5,-4
air.hittime = 60
fall = 1
air.fall = 1
getpower = 120,50
givepower = 20, 15

[State 2000, ChangeState]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
;---------------------------------------------------------------------------
; Kikyo's Sacred Arrow Hyper
[StateDef 6666]
type = S
movetype = a
physics = S
anim = 4000
ctrl = 0
velset = 0,0

[State 6666, Sound]
; Kikyo doesn't need Omnislash to kick some ass
type = Playsnd
trigger1 = AnimElem = 3
value = 4000,0
channel = 1

;[State 6666, Sound]
; Kikyo doesn't need Omnislash to kick some ass
;type = Playsnd
;trigger1 = AnimElem = 16
;value = 6666,0
;channel = 0

[State 6666, Background]
; Kikyo's "Limit Break"??
type = Explod
trigger1 = AnimElem = 16
anim = 6666
id = 6666
postype = back
pos = 0,0
sprpriority = -4
ownpal = 1
removeongethit = 1
bindtime = -1
supermovetime = 79
removetime = 79

[State 6666, SPortrait]
; Kikyo's "Limit Break"??
type = Explod
trigger1 = AnimElem = 16
anim = 6667
id = 6667
postype = back
pos = 0,0
sprpriority = -3
ownpal = 1
removeongethit = 1
bindtime = -1
supermovetime = 79
removetime = 79

[State 6666, STOP]
type = Superpause ; STOP! Hammer Time!
trigger1 = AnimElem = 16
poweradd = -1000
anim = -1
time = 79
sound = s6667,0
darken = 1
unhittable = 1

[State 6666, Sound]
; Kikyo gonna let that sunuvabitch arrow fly!
type = Playsnd
trigger1 = AnimElem = 20
value = 4000,1
channel = 1

[State 6666, Sound]
; "GO!"
type = Playsnd
trigger1 = AnimElem = 17
value = 1500,0
channel = 0

[State 6666, FIRE]
; Kikyo FIRES the ARROW!! Heh heh.. FIRE! FIRE! FIRE! FIRE!!! Huh huh HEH HEH
type = Projectile
trigger1 = AnimElem = 15
projanim = 4001
projremove = 0
projremanim = 4002
projhits = 1
projedgebound = 0
postype = p1
offset = 68,-72
sparkxy = 130,0
accel = 0.5,0
attr = S, HP
damage = 300,75
animtype = heavy
guardflag = MA
hitflag = MAF-
hitsound = S4000,2
guardsound = S6, 0
ground.type = High
ground.slidetime = 10
ground.hittime  = 15
ground.velocity = -4, -2
air.velocity = -4, -2
guard.velocity = -4
air.hittime = 20
fall = 1
air.fall = 1
getpower = 0,0
givepower = 300, 75

[State 6666, Changestate]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;-------------------------------------------------------

[Statedef 9000]
; Kikyo's Hyper Armor - Active only during Anti-cheapo mode
type = U
movetype = H
physics = U

[State 9000, Light Up]
type = PalFX
;triggerall = Var(10) != 0
;triggerall = Var(11) != 0
trigger1 = Life > 0
trigger1 = Time = 0
trigger2 = Time = 1
trigger3 = Time = 5
trigger4 = Time = 9
trigger5 = Time = 13
time = 2
add = 164,1,0
mul = 358,256,256
color = 128
ignorehitpause = 1

;[State 9000, PosFreeze]
;type = PosFreeze
;triggerall = Var(10) != 0
;triggerall = Var(11) != 0
;trigger1 = Life > 0
;trigger1 = 1
;value = 1

[State 9000, ChangeAnim]
type = ChangeAnim
;triggerall = Var(10) != 0
;triggerall = Var(11) != 0
trigger1 = 1
value = Anim
elem = AnimElemNo(0)

[State 9000, Back To Original State]
type = ChangeState
;triggerall = Var(10) != 0
;triggerall = Var(11) != 0
trigger1 = Life > 0
trigger1 = HitShakeOver
value = Var(46)
ctrl = 1

[State 9000, When Killed]
type = ChangeState
;triggerall = Var(10) != 0
;triggerall = Var(11) != 0
trigger1 = Life <= 0
value = 5050
