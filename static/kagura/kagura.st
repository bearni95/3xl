;---------------------------------------------------------------------------
; Variable usage:
; var(1)  - Combo condition (updated every tick)
; var(8)  - Air Dash identifier.
;
; var(9)  - Parry Type
;
; var(11) - Random X position for Dead Hand grab.
; var(12) - Win speech decider
; var(13) - Random X
; var(14) - Random Y
; var(15) - random spr

; Var(18) - Kanna Projectile Number (Max: 23)
; Var(19) - Kanna Projectile Damage (Max: 230)
; var(20) - Command Identifier:
;          1 = X
;          2 = Y
;          3 = Z
; var(21) - Escape
; var(22) - Dance of the Hurricane hit counter
;
; Var(47) - Striker Select
;          0 = None
;          1 = Sesshomaru
;          2 = Naraku
;
; fvar(10) - Damage Dampener
; fvar(11-12) - Air Velocity

;-------------------------------
; Coordinates 107,130
; To be used for sprite ripping.
;-------------------------------


;---------------------------------------------------------------------------
; Lose by Time Over
; CNS difficulty: basic
; CNS レベル: 基本
[Statedef 170]
type = S
ctrl = 0
anim = 0;170
velset = 0,0

[State 170, 1]
type = NotHitBy
trigger1 = 1
value = SCA
time = 1

;---------------------------------------------------------------------------
; Win state decider
; CNS difficulty: basic
; CNS レベル: 基本
[Statedef 180]
type = S

[State 180, 1]
type = ChangeState
trigger1 = Time = 0
trigger1 = Prevstateno != 3501
value = 181

[State 180, 1]
type = ChangeState
trigger1 = Time = 0
trigger1 = Prevstateno = 3501
value = 182

;---------------------------------------------------------------------------
; Win pose 1 - Fan Point
[Statedef 181]
type = S
ctrl = 0
anim = 181
velset = 0,0

[State 181, CS]
type = changestate
trigger1 = numhelper(3450)=1
trigger1 = helper(3450),stateno = 3451
trigger1 = time = 0
value = 182

[State 181, CS]
type = changestate
trigger1 = numhelper(3550)=1
trigger1 = helper(3550),stateno = 3551
trigger1 = time = 0
value = 183

[state 181, Varrand]
type = VarRandom
trigger1 = time = 0
v = 12
range = 1,2

[state 181, SND]
type = playsnd
trigger1 = animelem = 10
trigger1 = var(12) = 1
value = 181, 0
channel = 0

[state 181, SND]
type = playsnd
trigger1 = animelem = 20
trigger1 = var(12) = 2
value = 181, 1
channel = 0

[State 181, 1]
type = NotHitBy
trigger1 = 1
value = SCA
time = 1

;---------------------------------------------------------------------------
; Win by Sesshomaru
[Statedef 182]
type = S
ctrl = 0
anim = 182
velset = 0,0

[state 181, SND]
type = playsnd
trigger1 = animelem = 2
value = 3300, 1+(random%2)
channel = 0

;---------------------------------------------------------------------------
; Win by Naraku
[Statedef 183]
type = S
ctrl = 0
anim = 183
velset = 0,0

[state 181, SND]
type = playsnd
trigger1 = time = 0
value = 3350, 1
channel = 0

;---------------------------------------------------------------------------
; Introduction Decider
; CNS difficulty: basic
; CNS レベル: 基本
[Statedef 191]
type = S
ctrl = 0
anim = 189
velset = 0,0

[state 191, Varrand]
type = VarRandom
trigger1 = time = 0
v = 12
range = 1,2

[State 191, CS]
type = Changestate
trigger1 = time = 0
value = 191+Var(12)

;---------------------------------------------------------------------------
; Intro 2 - Turn Around
[Statedef 193]
type = S
ctrl = 0
anim = 191
velset = 0,0

[State 191, Bye bye BARbie]
type = AssertSpecial
trigger1 = 1
flag = Intro
flag2 = nobardisplay
flag3 = noautoturn

[State 191,3]
Type = PlaySnd
trigger1 = Time = 30
value = 191,2

[State 193, Intro vs Wickydoo's Kagura]
type = Changestate
triggerall = animtime = 0
trigger1 = (enemy,name = "Kagura") && (enemy,authorname = "Wickydoo")
trigger2 = (enemy,name = "Homer J Simpson") && (enemy,authorname = "Warner el Tochix")
trigger3 = (enemy,name = "Developer Fags You Imbecile") && (enemy,authorname = "Most Mysterious (also, TN'79)")
trigger4 = enemy,authorname = "Most Mysterious"
trigger5 = (enemy,name = "Zeeky H. Bomb") && (enemy,authorname = "Kamek")
trigger6 = (enemy,name = "Magikarp") && (enemy,authorname = "Kamek")
trigger7 = (enemy,name = "Ultimate Chimera") && (enemy,authorname = "N-Mario")
trigger8 = (enemy,name = "Primeus") && (enemy,authorname = "Not_Ricepigeon")
value = 194

[State 191,4]
Type = ChangeState
trigger1 = Animtime = 0
value = 0

;---------------------------------------------------------------------------
; Special Intro - Versus Wickydoo's Kagura & Silly Chars
[Statedef 194]
type = S
ctrl = 0
anim = 0
velset = 0,0

[State 194, Bye bye BARbie]
type = AssertSpecial
trigger1 = 1
flag = Intro
flag2 = nobardisplay

[State 194, RecordScratch]
type = AssertSpecial
trigger1 = time >= 0
trigger1 = time < 118
flag = nomusic

[State 191,3]
Type = PlaySnd
trigger1 = Time = 0
value = 194,0

[State 194, What the fuck?]
type = EnvShake
trigger1 = Time = 60
time = 5
freq = 100
ampl = -10
;phase = 10

[State 194,3]
Type = PlaySnd
trigger1 = Time = 60
value = 5000,2

[State 194,4]
Type = ChangeAnim
trigger1 = anim = 0
trigger1 = time = 60
value = 194

[State 194, Who the fuck are you?]
type = Explod
trigger1 = time = 118
trigger1 = teamside = 1
pausemovetime = 144
anim = 10193
ownpal = 1
postype = left
removetime = 144
sprpriority = 3
ontop = 1

[State 194, Who the fuck are you?]
type = Explod
trigger1 = time = 118
trigger1 = teamside = 2
pausemovetime = 144
anim = 10193
ownpal = 1
postype = right
removetime = 144
sprpriority = 3
ontop = 1
facing = -1

[State 194, Who the fuck are you?]
type = Explod
trigger1 = time = 118
pausemovetime = 144
anim = 10194
ownpal = 1
postype = left
removetime = 144
sprpriority = 4
ontop = 1

[State 191,4]
Type = ChangeState
trigger1 = anim = 194
trigger1 = Animtime = 0
value = 0


;---------------------------------------------------------------------------
; Intro 1 - Fly In
[Statedef 192]
type = S
ctrl = 0
anim = 189
velset = 0,0

[State 191, turn]
type = Turn
trigger1 = time = 1

[state 191, NoPush]
type = PlayerPush
trigger1 = 1
value = 0

[State 191, Start]
type = changeanim
trigger1 = time = 0
value = 189
elem = 4

[State 191, Bye bye BARbie]
type = AssertSpecial
trigger1 = 1
flag = Intro
flag2 = nobardisplay
flag3 = noautoturn

[State 191, Bounded]
type = Screenbound
trigger1 = 1
value = 0
movecamera = 0,0

[State 191, Pos]
Type = PosAdd
trigger1 = Time = 0
x = 320
y = -100

[State 191,3]
Type = PlaySnd
trigger1 = Time = 100
value = 191,0

[State 191,4]
type = posadd
trigger1 = Time > 30
trigger1 = anim = 189
x = 4

[State 100, Feather]
type = projectile
trigger1 = time = 110
projanim = 102
projremovetime = 8
velocity = const(velocity.run.fwd.x),0

[State 191,5]
type = ChangeAnim
trigger1 = time = 110
value = 44

[State 10191, Gravity]
type = Gravity
trigger1 = anim = 44
trigger1 = Pos Y < 0

[State 10191, Gravity]
type = velset
trigger1 = anim = 44
trigger1 = Pos Y >= 0
y = 0

;[State 700, Explod]
;type = Explod
;trigger1 = anim = 44
;trigger1 = Pos Y >= 0
;ID = 700
;anim = 701
;removetime = 15
;sprpriority = 1

;[State 700, Explod]
;type = Explod
;trigger1 = anim = 44
;trigger1 = Pos Y >= 0
;ID = 700
;anim = 701
;removetime = 15
;sprpriority = 1
;facing = -1


[State 191, 2]
type = ChangeAnim
trigger1 = Pos Y >= 0
trigger1 = Anim = 44
value = 11

[State 191, 2]
type = ChangeAnim
trigger1 = Animelem = 2
trigger1 = Anim = 11
value = 12

[State 191, 2]
type = ChangeAnim
trigger1 = Animtime = 0
trigger1 = Anim = 12
value = 5

[State 191, 2]
type = ChangeAnim
trigger1 = Animtime = 0
trigger1 = Anim = 5
value = 190

[State 191, 2]
type = Turn
trigger1 = Animelem = 1
trigger1 = Anim = 5

[State 191,3]
Type = PlaySnd
trigger1 = Anim = 190
trigger1 = AnimElem = 12
value = 191,1

[State 191,4]
Type = ChangeState
trigger1 = Anim = 190
trigger1 = Animtime = 0
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

[State 195, 1]
type = CtrlSet
trigger1 = Time = 40
value = 1

[State 195, 2]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1
;---------------------------------------------------------------------------
; Stand Light Punch
; CNS difficulty: easy
[Statedef 200]
type    = S                      ;State-type: S-stand, C-crouch, A-air, L-liedown
movetype= A                      ;Move-type: A-attack, I-idle, H-gethit
physics = S                      ;Physics: S-stand, C-crouch, A-air
juggle  = 1                      ;Number of air juggle points move takes
;Commonly-used controllers:
velset = 0,0                     ;Set velocity (x,y) (Def: no change)
ctrl = 0                         ;Set ctrl (Def: no change)
anim = 200                       ;Change animation (Def: no change)
sprpriority = 2                  ;Set p1's sprite layering priority to 2 (in front)

[State 200, 1]
type = HitDef
trigger1 = AnimElem = 4
attr = S, NA                     ;Attribute: Standing, Normal Attack
damage = 20, 0                   ;Damage that move inflicts, guard damage
animtype = Light                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = MA                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit
pausetime = 8, 8                 ;Time attacker pauses, time opponent shakes
sparkno = s8000+(random%2)
guard.sparkno = s8030
sparkxy = -10, -76
hitsound = s5, 0                  ;Sound to play on hit
guardsound = s6, 0                ;Sound to play on guard
ground.type = High               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 20             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = High                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 12                 ;Time before opponent regains control in air
getpower = 20,0

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 4
value = 0, 0

[State 200, 7]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Standing Weak punch
; CNS difficulty: easy
; Note the width controller. It makes KFM's push box larger, so he doesn't
; stand so close to the opponent. Hit Ctrl-C and look at the red bar at his
; feet.
; The sprpriority for this state is at -1, instead of the usual 2 for
; attacks. This makes KFM appear behind the opponent initially.
; The SprPriority controller in [State 210, 4] brings KFM to the front when
; his arm has swung over.
; To stop KFM from pausing in his swing frame, there is a ChangeAnim in
; [State 210, 3] that detects if the hit has come in contact with the
; opponent during that frame, and switches to the next animation element
; (notice the elem=6 parameter). If you don't see what I mean, try commenting
; out that controller, then hit someone with this attack.
[Statedef 210]
type    = S
movetype= A
physics = S
juggle  = 4
ctrl = 0
velset = 0,0
anim = 210
sprpriority = -1

[State 230, Velset]
type = Velset
trigger1 = Animelem = 4
x = 2

[State 210, 1]
type = PlaySnd
trigger1 = animelem = 4
value = 0, 4
channel = 0

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 4
value = 0, 2

[State 210, 2]
type = HitDef
trigger1 = time = 0
attr = S, NA
animtype  = Medium
damage    = 35
guardflag = MA
pausetime = 12,12
sparkno = s8010+(random%2)
guard.sparkno = s8030
sparkxy = -10,-70
hitsound   = s5,1
guardsound = s6,0
ground.type = High
ground.slidetime = 12
ground.hittime  = 24
ground.velocity = -5.5
air.velocity = -2.5,-4
getpower = 63,0

[State 210, 4]
type = SprPriority
trigger1 = AnimElem = 5
value = 2

[State 210, 5]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Standing Strong attack
; CNS difficulty: easy
[Statedef 230]
type    = S
movetype= A
physics = S
juggle  = 4
ctrl = 0
velset = 0,0
anim = 230
sprpriority = 2

[State 230, 1]
type = PlaySnd
trigger1 = Animelem = 5
value = 0, 1

[State 230, Velset]
type = Velset
trigger1 = Animelem = 6
x = 4

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 5
value = 0, 3

[State 230, 2]
type = HitDef
trigger1 = time = 0
attr = S, NA
animtype  = Hard
damage    = 50,0
guardflag = MA
pausetime = 6,12
sparkno = s8020
guard.sparkno = s8030
sparkxy = -10,-57
hitsound   = s5,2
guardsound = s6,0
ground.type = High
ground.slidetime = 10
ground.hittime  = 25
ground.velocity = -5
air.velocity = -2.5,-3.5
getpower = 50,0

[State 230, 3]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Tornado Hold Attempt
[Statedef 240]
type    = S
movetype= A
physics = S
juggle  = 4
velset = 0,0
ctrl = 0
anim = 240
sprpriority = 2



[State 240, 3]
type = HitDef
trigger1 = Time = 0
attr = S, NT
priority = 1,miss
hitflag = MAF
guardflag = MA
sparkno = -1
guard.sparkno = -1
hitsound   = -1
guardsound = -1
p1stateno = 241
p2stateno = 242
fall = 1
ID = 240

[State 240, 4]
type = ChangeState
trigger1 = AnimTime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Tornado Hold Success
[Statedef 241]
type    = S
movetype= A
physics = S
velset = 0,0
ctrl = 0
anim = 241
sprpriority = 0

[State 241, PP]
type = playerpush
trigger1 = 1
value = 0

[State 241, TS]
type = TargetBind
trigger1 = time = 0
pos = 20, 0

[State 241, NHB]
type = nothitby
trigger1 = animelemtime(24) < 0
value = SCA, AA, AP, AT

[State 241, VelS]
type = velset
trigger1 = 1
x = ifelse(animelemtime(23)>=0,0,1.25)

[State 1000, Explod]
type = Explod
trigger1 = Animelem = 18
anim = 1230
removetime = 21
sprpriority = 3
scale = 0.5,1.5
pos = 0,0
postype = p2

[State 241, PSND]
type = playsnd
trigger1 = time = 0
value = 950,0
channel = 0

[State 241, PSND]
type = playsnd
trigger1 = animelem = 16
value = 1200,0

[State 241, PSND]
type = playsnd
trigger1 = animelem = 20
value = 0,4
channel = 0

[State 241, T]
type = turn
trigger1 = animtime = 0

[State 241, CS]
type = changestate
trigger1 = animtime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Thrown by Tornado Hold
[Statedef 242]
type    = S
movetype= H
physics = N
velset = 0,0
sprpriority = 2

[State 242, CA]
type = changeanim2
trigger1 = time = 0
value = 242

[State 242, VelS]
type = velset
trigger1 = animelem = 2
y = -12.5;5

[State 244, LA]
type = lifeadd
trigger1 = animelemtime(2) = 0
value = -30

[State 242, ST]
type = statetypeset
trigger1 = animelemtime(2) = 4
statetype = A
physics = A

[State 242, CS]
type = changestate
trigger1 = vel y > 0
value = 243

;---------------------------------------------------------------------------
; Falling Down from Tornado Hold
[Statedef 243]
type    = A
movetype= H
physics = N
velset = 0,0
sprpriority = 2

[State 243, CA2]
type = changeanim
trigger1 = time = 0
value = 5061

[State 243, Gravity]
type = VelAdd
Trigger1 = 1
y = .4

[State 243, Recover] ; Recover near ground (use ChangeState)
type = SelfState
triggerall = time >= 20
triggerall = Vel Y > 0
triggerall = Pos Y >= -20
triggerall = alive
triggerall = CanRecover
trigger1 = Command = "recovery"
value = 5200 ;HITFALL_RECOVER

[State 243, Recover] ; Recover in mid air (use SelfState)
type = SelfState
triggerall = time >= 20
triggerall = Vel Y > 0
triggerall = alive
triggerall = CanRecover
trigger1 = Command = "recovery"
value = 5210 ;HITFALL_AIRRECOVER

[State 243, CS]
type = changestate
trigger1 = pos y >= -10
value = 244

;---------------------------------------------------------------------------
; Hit Ground from Tornado Hold
[Statedef 244]
type    = L
movetype= I
physics = S
velset = 0,0
sprpriority = 1

[State 244, HitSpark]
type = GameMakeAnim
trigger1 = Time = 0
value = 62
pos = 0, 0
under = 1

[State 244, PSND]
type = playsnd
trigger1 = time = 0
value = F7, 2

[State 244, CA2]
type = changeanim
trigger1 = time = 0
value = 5110

[State 244, PS]
type = posset
trigger1 = time = 0
y = 0

[State 244, LA]
type = lifeadd
trigger1 = time = 0
value = -60

[State 244, EnvS]
type = envshake
trigger1 = time = 0
time = 15
freq = 100
ampl = -10

[State 243, SS]
type = selfstate
trigger1 = time >= 60
value = ifelse(alive,5120,5150)


;---------------------------------------------------------------------------
;Crouching light punch
;---------------------------------------------------------------------------
; Stand Light Punch
; CNS difficulty: easy
[Statedef 400]
type    = C                      ;State-type: S-stand, C-crouch, A-air, L-liedown
movetype= A                      ;Move-type: A-attack, I-idle, H-gethit
physics = C                      ;Physics: S-stand, C-crouch, A-air
juggle  = 1                      ;Number of air juggle points move takes
velset = 0,0                     ;Set velocity (x,y) (Def: no change)
ctrl = 0                         ;Set ctrl (Def: no change)
anim = 400                       ;Change animation (Def: no change)
sprpriority = 2                  ;Set p1's sprite layering priority to 2 (in front)

[State 400, 1]
type = HitDef
trigger1 = AnimElem = 4
attr = C, NA                     ;Attribute: Standing, Normal Attack
damage = 20, 0                   ;Damage that move inflicts, guard damage
animtype = Light                 ;Animation type: Light, Medium, Heavy, Back (def: Light)
guardflag = L                   ;Flags on how move is to be guarded against
hitflag = MAF                    ;Flags of conditions that move can hit
priority = 3, Hit
pausetime = 8, 8                 ;Time attacker pauses, time opponent shakes
sparkno = s8000+(random%2)
guard.sparkno = s8030
sparkxy = -10, -38
hitsound = s5, 0                  ;Sound to play on hit
guardsound = s6, 0                ;Sound to play on guard
ground.type = Low               ;Type: High, Low, Trip (def: Normal)
ground.slidetime = 5             ;Time that the opponent slides back
ground.hittime  = 20             ;Time opponent is in hit state
ground.velocity = -4             ;Velocity at which opponent is pushed
airguard.velocity = -1.9,-.8     ;Guard velocity in air (def: (air.xvel*1.5, air.yvel/2))
air.type = Low                  ;Type: High, Low, Trip (def: same as ground.type)
air.velocity = -1.4,-3           ;X-velocity at which opponent is pushed,
;Y-velocity at which opponent is pushed
air.hittime = 12                 ;Time before opponent regains control in air
getpower = 20,0

[State 400, 1]
type = PlaySnd
trigger1 = AnimElem = 4
value = 0, 0

[State 400, 7]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1

;---------------------------------------------------------------------------
;Crouching strong punch
; CNS difficulty: easy
; Description: This is a 2-hit move. It is done by having two HitDefs
;     triggered, one for each frame of animation that hits.
;     Notice how the first hit cannot be guarded by an opponent in the
;     air, because of the "M" in the guardflag, meaning it can only
;     be guarded "middle". The second hit has an "MA" guardflag, so
;     it can be guarded both on the ground and in the air.
; CNS レベル: 易
; 詳細: これは殴打が二発ある攻撃です。
; 殴打できるアニメーションの枚は一々HitDefを登録しています。
; 一発目の攻撃のHitDefにはguardflagが「M」（middle＝中段ガード）
; にセットされているので、相手は空中でガードできません。二発目
; の攻撃のguardflagは「MA」（middle+air＝中段＋空中ガード）で、
; 地上、空中でもガードすることができます。
[Statedef 410]
type    = C
movetype= A
physics = C
juggle  = 4
ctrl = 0
velset = 0,0
anim = 410
sprpriority = -1

[State 410, Velset]
type = Velset
trigger1 = Animelem = 4
x = 2

[State 410, 1]
type = PlaySnd
trigger1 = animelem = 4
value = 0, 4
channel = 0

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 4
value = 0, 2

[State 410, 2]
type = HitDef
trigger1 = time = 0
attr = C, NA
animtype  = Medium
damage    = 35
guardflag = L
pausetime = 12,12
sparkno = s8010+(random%2)
guard.sparkno = s8030
sparkxy = -10,-35
hitsound   = s5,1
guardsound = s6,0
ground.type = Low
ground.slidetime = 12
ground.hittime  = 24
ground.velocity = -5.5
air.velocity = -2.5,-4
getpower = 65,0

[State 410, 4]
type = SprPriority
trigger1 = AnimElem = 5
value = 2

[State 410, 4]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1

;---------------------------------------------------------------------------
;Crouching light kick
; CNS difficulty: easy
[Statedef 430]
type    = C
movetype= A
physics = C
ctrl = 0
velset = 0,0
anim = 430
sprpriority = 2

[State 430, 1]
type = PlaySnd
trigger1 = Animelem = 5
value = 0, 1
channel = 0

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 5
value = 0, 2

[State 430, Velset]
type = Velset
trigger1 = Animelem = 6
x = 4

[State 430, NHB]
type = nothitby
trigger1 = prevstateno = 5120
trigger1 = time <= 12
value = SCA

[State 430, 2]
type = HitDef
trigger1 = time = 0
attr = C, NA
animtype  = Hard
damage    = 50,0
guardflag = L
pausetime = 12,12
sparkno = s8020
guard.sparkno = s8030
sparkxy = -10,-37
hitsound   = s5,2
guardsound = s6,0
ground.type = Low
ground.slidetime = 10
ground.hittime  = 25
ground.velocity = -5
air.velocity = -2.5,-3.5
getpower = 60,0

[State 430, 3]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1

;---------------------------------------------------------------------------
; Fan Trip
[Statedef 440]
type    = C
movetype= A
physics = C
velset = 8,0
juggle = 8;5
ctrl = 0
anim = 440
sprpriority = 2

[State 440, Snd]
type = playsnd
trigger1 = animelem = 8
value = 240, 0
channel = 0

[State 440, PSND]
type = playsnd
trigger1 = animelem = 8
value = 0, 3

[State 440, 3]
type = HitDef
trigger1 = Time = 0
attr = C, NA
damage = 60,0
hitflag = MAFD
guardflag = L
pausetime = 5,5
sparkno = s8020
guard.sparkno = s8030
sparkxy = -5,0
hitsound   = s2500,2
guardsound = s6,0
ground.type = Trip
animtype = Back
ground.slidetime = 10
ground.hittime  = 5
ground.velocity = -0.5,-5
air.velocity = -0.5,-4
guard.velocity = -5
fall = 1
fall.recovertime = 20
getpower = 70,0

[State 440, 4]
type = ChangeState
trigger1 = AnimTime = 0
value = 11
ctrl = 1

;---------------------------------------------------------------------------
;Jump Light Attack
[Statedef 600]
type    = A
movetype= A
physics = A
juggle  = 2
ctrl = 0
anim = 600
sprpriority = 2

[State 600, 1]
type = PlaySnd
trigger1 = Animelem = 2
value = 0, 0

[State 600, 2]
type = HitDef
trigger1 = time = 0
attr = A, NA
damage    = 20,0
guardflag = HA
priority = 3
pausetime = 5,3
sparkno = s8000+(random%2)
guard.sparkno = s8030
sparkxy = -10,-58
hitsound   = s5,0
guardsound = s6,0
ground.type = High
ground.slidetime = 15
ground.hittime  = 15
ground.velocity = 0,-4
air.velocity = 0,-4
;yaccel = 0.6
getpower = 20,0

[State 600, 3]
type = Changestate
trigger1 = Animtime = 0
value = 50
ctrl = 1

;---------------------------------------------------------------------------
;Jump Strong Attack
[Statedef 620]
type    = A
movetype= A
physics = A
juggle  = 2
ctrl = 0
anim = 620
sprpriority = 2

[State 610, 2]
type = PlaySnd
trigger1 = Animelem = 2
value = 0, 1
channel = 0

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0, 3

[State 610, 2]
type = HitDef
trigger1 = time = 0
attr = A, NA
animtype  = Medium
damage    = 55
guardflag = MA
pausetime = 8,8
sparkno = s8010+(random%2)
guard.sparkno = s8030
sparkxy = -10,-70
hitsound   = s5,2
guardsound = s6,0
ground.type = High
ground.slidetime = 12
ground.hittime  = 24
ground.velocity = -5.5
air.velocity = -0.5,-5
getpower = 35,0

[State 610, 3]
type = Changestate
trigger1 = Animtime = 0
value = 50
ctrl = 1

;---------------------------------------------------------------------------
;Jump Medium Attack 1
[Statedef 610]
type    = A
movetype= A
physics = A
juggle  = 3
ctrl = 0
anim = 610
sprpriority = 2

[State 630, 1]
type = PlaySnd
trigger1 = Animelem = 4
value = 0, 1
channel = 0

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 4
value = 0, 2

[State 630, 2]
type = HitDef
trigger1 = time = 0
attr = A, NA
animtype  = Hard
damage    = 30,0
guardflag = MA
pausetime = 8,10
sparkno = s8000+(random%2)
guard.sparkno = s8030
sparkxy = -20,-57
hitsound   = s5,1
guardsound = s6,0
ground.type = High
ground.slidetime = 10
ground.hittime  = 25
ground.velocity = -5
air.velocity = -2,-6
getpower = 30,0

[State 630, 3]
type = ChangeState
trigger1 = AnimTime = 0
value = 50
ctrl = 1

;---------------------------------------------------------------------------
;Jump Medium Attack 2
[Statedef 615]
type    = A
movetype= A
physics = A
juggle  = 3
ctrl = 0
anim = 615
sprpriority = 2

[State 630, 1]
type = PlaySnd
trigger1 = Animelem = 2
value = 240, 0
channel = 0

[State 200, 1]
type = PlaySnd
trigger1 = AnimElem = 2
value = 0, 2

[State 630, 2]
type = HitDef
trigger1 = time = 0
attr = A, NA
animtype  = Hard
damage    = 45,0
guardflag = MA
pausetime = 6,12
sparkno = s8015+(random%2)
guard.sparkno = s8030
sparkxy = -20,-37
hitsound   = s5,3
guardsound = s6,0
ground.type = High
ground.slidetime = 10
ground.hittime  = 25
ground.velocity = -5
air.velocity = -7,2
air.fall = 1
getpower = 35,0

[State 630, 3]
type = ChangeState
trigger1 = AnimTime = 0
value = 50
ctrl = 1

;---------------------------
; Stand/Crouch Parry
[Statedef 851]
type = U
movetype = I
physics = U
anim = IfElse(StateType = S,200,400) ;<--- The first value should be the standing parry anim, 2nd being the crouching parry anim.
velset = 0,0
ctrl = 0
poweradd = 60
juggle = 0
facep2 = 1
hitdefpersist = 0
movehitpersist = 0
hitcountpersist = 0
sprpriority = 2

[State 851: AssertSpecial]
type = AssertSpecial
trigger1 = 1
flag = NoWalk

[State 851: CtrlSet]
type = CtrlSet
trigger1 = (Time > 4) && (StateType = S)
value = 1

[State 851: NotHitBy]
type = NotHitBy
trigger1 = 1
value = SCA

[State 851: Pause]
type = Pause
trigger1 = (!Time)
time = 14
movetime = 14

[State 851: VarSet]
type = VarSet
trigger1 = (!Time)
var(10) = 1

[State 851: PalFX]
type = PalFX
trigger1 = (!Time)
time = 8
add = 0,0,0
mul = 256,256,256
sinadd = 75,100,255,8
invertall = 0
color = 256

[State 851: EnvColor]
type = EnvColor
trigger1 = (!Time)
value = 255,255,255
time = 4

[State 851: EnvShake]
type = EnvShake
trigger1 = (!Time)
time = 8
freq = 60
ampl = -2
phase = 90

[State 851: PlaySnd]
type = PlaySnd
trigger1 = (!Time)
value = S5000,0

[State 851: PlaySnd]
type = PlaySnd
trigger1 = (!Time)
value = S3000,1

[State 851, ASS]
type=assertspecial
trigger1=1
flag=nowalk

[State 851: ChangeState]
type = ChangeState
trigger1 = (!AnimTime)
value = IfElse(StateType = S,0,11)

;--------------------------
; Air Parry
[Statedef 852]
type = A
movetype = I
physics = N
anim = 600
ctrl = 0
poweradd = 60
juggle = 0
facep2 = 0
hitdefpersist = 0
movehitpersist = 0
hitcountpersist = 0
sprpriority = 2

[State 852: CtrlSet]
type = CtrlSet
trigger1 = (Time > 4)
value = 1

[State 852: NotHitBy]
type = NotHitBy
trigger1 = (Time < 14)
value = SCA

[State 852: Pause]
type = Pause
trigger1 = (!Time)
time = 14
movetime = 14

[State 852: VarSet]
type = VarSet
trigger1 = (!Time)
var(10) = 1

[State 851: PalFX]
type = PalFX
trigger1 = (!Time)
time = 8
add = 0,0,0
mul = 256,256,256
sinadd = 75,100,255,8
invertall = 0
color = 256

[State 851: EnvColor]
type = EnvColor
trigger1 = (!Time)
value = 255,255,255
time = 4

[State 851: EnvShake]
type = EnvShake
trigger1 = (!Time)
time = 8
freq = 60
ampl = -2
phase = 90

[State 851: PlaySnd]
type = PlaySnd
trigger1 = (!Time)
value = S5000,0

[State 851: PlaySnd]
type = PlaySnd
trigger1 = (!Time)
value = S3000,1

[State 852: Null]
type = Null
trigger1 = (!Time)
trigger1 = (FVar(11) := Vel X) && (FVar(12) := Vel Y)

[State 852: VelSet]
type = VelSet
trigger1 = (Time)
x = 0
y = 0
persistent = 0

[State 852: VelSet]
type = VelSet
trigger1 = (Time > 14)
x = FVar(11)
y = FVar(12)
persistent = 0

[State 852: VelAdd]
type = VelAdd
trigger1 = (Time > 14)
y = 0.45

[State 852: ChangeState]
type = ChangeState
trigger1 = (Pos Y >= 0) && (Vel Y > 0)
value = 52

;---------------------------------------------------------------------------
; Kanna
[Statedef 1100]
type    = S
movetype= A
physics = S
juggle  = 0
velset = 0,0
anim = 1100
ctrl = 0
sprpriority = 2

[State 900, Invince]
type = nothitby
trigger1 = 1
value = SCA,AP
time = 20

[State 1140, NHB]
type = hitby
trigger1 = 1
value = SCA, AA, AT
ignorehitpause = 1

[State 900, Kanna]
type = helper
trigger1 = time = 0
helpertype = normal
name = "kanna"
ID = 1100
pos = 15,0
postype = p1
stateno = 1101
ownpal = 1

[State 1100, Snd]
type = PlaySnd
trigger1 = Animelem = 2
value = 1100, 0

[State 900, CS]
type = Changestate
trigger1 = animtime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Dance of Blades - Normal
[Statedef 1000]
type    = U
movetype= A
physics = U
juggle  = 4
velset = vel x,vel y
anim = 1000
ctrl = 0
sprpriority = 2

[State 1450, VS]
type = velset
trigger1 = (Statetype = S) || (Statetype = C)
x = 0
y = 0

[State 1450, VS]
type = velset
trigger1 = statetype = A
x = ifelse(vel x <0,-1,ifelse(vel x>0,1,0))
y = ifelse(vel y <0,-0.5,ifelse(vel y>0,0.5,0))

[State 1000, CA]
type = changeanim
trigger1 = statetype = A
trigger1 = time = 0
value = 1050

[State 1000, CS]
type = changestate
trigger1 = time = 0
trigger1 = var(20) = 2
value = 1010

[State 1000, 1]
type = PlaySnd
trigger1 = Animelem = 6
value = 1000, 0
channel = 0

[State 1000, Explod]
type = Explod
trigger1 = Animelem = 10
anim = 1001
removetime = 15
sprpriority = 3

[State 1000, Snd]
type = PlaySnd
trigger1 = time >= 6
trigger1 = (time-2)%4 = 0
trigger1 = time <= 14
value = 1400, 0

[State 1000, 5]
type = Projectile
trigger1 = AnimElem = 11
attr = S, SP
projanim = 1003
projid = 1000
projremove = 1
projscale = 1.0,1.0
velocity = 6,3*ifelse(statetype=A,-1,1)
accel = 0,-0.27*var(20)*ifelse(statetype=A,-1,1)
projhits = 1
offset = 35,-70
animtype  = Hard
damage    = ceil(29*fvar(10)), 0
priority  = 5
hitflag = MAF
guardflag = MA
pausetime = 3,2
sparkno = s8005+(random%2)
guard.sparkno = s8030
sparkxy = -10,0
hitsound   = s1400,1
guardsound = s6,0
ground.type = High
ground.slidetime = 12
ground.hittime  = 15
ground.velocity = -4,-3.5
air.velocity = -4,-3
fall = 1
getpower = 25,0
ownpal = 1

[State 1000, 5]
type = Projectile
trigger1 = AnimElem = 11
attr = S, SP
projanim = 1003
projid = 1000
projremove = 1
projscale = 1.0,1.0
velocity = 6,3*ifelse(statetype=A,-1,1)
accel = 0,-0.20*var(20)*ifelse(statetype=A,-1,1)
projhits = 1
offset = 35,-70
animtype  = Hard
damage    = ceil(29*fvar(10)), 0
priority  = 5
hitflag = MAF
guardflag = MA
pausetime = 3,2
sparkno = s8005+(random%2)
guard.sparkno = s8030
sparkxy = -10,0
hitsound   = s1400,1
guardsound = s6,0
ground.type = High
ground.slidetime = 12
ground.hittime  = 15
ground.velocity = -4,-3.5
air.velocity = -4,-3
fall = 1
getpower = 25,0
ownpal = 1

[State 1000, 5]
type = Projectile
trigger1 = AnimElem = 11
attr = S, SP
projanim = 1003
projid = 1000
projremove = 1
projscale = 1.0,1.0
velocity = 6,3*ifelse(statetype=A,-1,1)
accel = 0,-0.125*var(20)*ifelse(statetype=A,-1,1)
projhits = 1
offset = 35,-70
animtype  = Hard
damage    = ceil(29*fvar(10)), 0
priority  = 5
hitflag = MAF
guardflag = MA
pausetime = 3,2
sparkno = s8005+(random%2)
guard.sparkno = s8030
sparkxy = -10,0
hitsound   = s1400,1
guardsound = s6,0
ground.type = High
ground.slidetime = 12
ground.hittime  = 15
ground.velocity = -4,-3.5
air.velocity = -4,-3
fall = 1
getpower = 25,0
ownpal = 1

[State 1000, 7]
type = ChangeState
trigger1 = AnimTime = 0
value = ifelse(statetype=A,50,0)
ctrl = ifelse(statetype=A,0,1)

;---------------------------------------------------------------------------
; Dance of Blades - Z Version
[Statedef 1010]
type    = U
movetype= A
physics = U
juggle  = 4
velset = vel x,vel y
anim = 1010
ctrl = 0
sprpriority = 2

[State 1450, VS]
type = velset
trigger1 = 1;(Statetype = S) || (Statetype = C)
x = 0
y = 0

[State 1450, VS]
type = null;velset
trigger1 = statetype = A
x = ifelse(vel x <0,-1,ifelse(vel x>0,1,0))
y = ifelse(vel y <0,-0.5,ifelse(vel y>0,0.5,0))

[State 1000, CA]
type = changeanim
trigger1 = statetype = A
trigger1 = time = 0
value = 1011

[State 1010, Take THIS!]
type = playsnd
trigger1 = time = 0
value = 2000, 0
channel = 0

[state 1010, Za Warudo!]
type = SuperPause
trigger1 = time = 0
time = 60
anim = -1
sound = S900, 0
p2defmul = 1
poweradd = -1000
unhittable = 1
movetime = 8

[State 1010, Explod]
type = Explod
trigger1 = time = 0
anim = 2502
ID = 2502
pos = -100,0
vel = 3,0
postype = back
supermovetime = 60
removetime = 60

[State 1000, 1]
type = PlaySnd
trigger1 = Animelem = 10
value = 1000, 0
channel = 0

[State 1000, 1]
type = PlaySnd
trigger1 = time = 12
trigger2 = time = 29
trigger3 = time = 50
value = 1400, 0

[State 1000, Blade]
type = helper
trigger1 = time = 17
helpertype = normal
name = "Blade 1"
ID = 1010
pos = 20,-45
postype = p1
stateno = 1011
ownpal = 1

[State 1000, Blade]
type = helper
trigger1 = time = 34
helpertype = normal
name = "Blade 2"
ID = 1011
pos = 20,-75
postype = p1
stateno = 1011
ownpal = 1

[State 1000, Blade]
type = helper
trigger1 = time = 55
helpertype = normal
name = "Blade 3"
ID = 1012
pos = 20,-60
postype = p1
stateno = 1011
ownpal = 1
[State 1000, Blade]
type = helper
trigger1 = time = 55
helpertype = normal
name = "Blade 4"
ID = 1013
pos = 20,-60
postype = p1
stateno = 1011
ownpal = 1

[State 1000, 7]
type = ChangeState
trigger1 = AnimTime = 0
value = ifelse(statetype=A,50,0)
ctrl = ifelse(statetype=A,0,1)

;---------------------------------------------------------------------------
; Dance of the Dragon
; X Version
[Statedef 1200]
type    = S
movetype= A
physics = S
velset = 0,0
juggle = 4
anim = 1000
ctrl = 0
sprpriority = 2

[State 1200, NHB]
type = nothitby
trigger1 = time <= 14
value = SCA, AA, AP, AT

;[State 1200, Snd]
;type = PlaySnd
;trigger1 = Time = 8
;value = 1200, 0

[State 2500, Dance of the Dragon!]
type = playsnd
trigger1 = anim = 1000
trigger1 = Animelem = 8
value = 2500, 0
channel = 0

[State 2500, Dance of the Dragon!]
type = playsnd
trigger1 = anim = 1000
trigger1 = Animelem = 9
value = 2500, 1

[State 2500, Tornado]
type = Helper
trigger1 = anim = 1000
trigger1 = AnimElem = 9
helpertype = normal
name = "Nado"
ID = 1201
pos = 0,0
stateno = 1201
ownpal = 1

[State 1200, CA]
type = changeanim
trigger1 = anim = 1000
trigger1 = animtime = 0
value = 0

[State 1200, 5]
type = ChangeState
trigger1 = Anim = 0
trigger1 = numhelper(1201) = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Dance of the Dragon
; Z Version
[Statedef 1230]
type    = S
movetype= A
physics = S
velset = 0,0
juggle = 4
anim = 1200
ctrl = 0
sprpriority = 2

[State 2500, Take THIS!]
type = playsnd
trigger1 = time = 0
value = 2000, 0

[state 2500, Za Warudo!]
type = SuperPause
trigger1 = time = 0
time = 60
anim = -1
sound = S900, 0
p2defmul = 1
poweradd = -1000
unhittable = 1
movetime = 8

[State 2500, Explod]
type = Explod
trigger1 = time = 0
anim = 2502
ID = 2502
pos = -100,0
vel = 3,0
postype = back
supermovetime = 60
removetime = 60

[State 1200, NHB]
type = nothitby
trigger1 = time <= 14
value = SCA, AA, AP, AT

;[State 1200, Snd]
;type = PlaySnd
;trigger1 = Time = 8
;value = 1200, 0

[State 2500, Dance of the Dragon!]
type = playsnd
trigger1 = anim = 1200
trigger1 = Animelem = 8
value = 2500, 0
channel = 0

[State 2500, Dance of the Dragon!]
type = playsnd
trigger1 = anim = 1200
trigger1 = Animelem = 9
value = 2500, 1

[State 2500, Tornado]
type = Helper
trigger1 = anim = 1200
trigger1 = AnimElem = 9
helpertype = normal
name = "Super_Nado"
ID = 1201
pos = 0,0
stateno = 1231
ownpal = 1

[State 1130, Pusher]
type = helper
trigger1 = time = 0
helpertype = normal
name = "Pushblocker1"
ID = 1232
pos = 0,0
postype = back
stateno = 1232
ownpal = 1
size.height = 518

[State 1130, Pusher]
type = helper
trigger1 = time = 0
helpertype = normal
name = "Pushblocker2"
ID = 1233
pos = 0,0
postype = front
stateno = 1232
facing = -1
ownpal = 1
size.height = 518

[State 1130, Hitbox]
type = helper
trigger1 = time = 0
helpertype = normal
name = "Hitbox"
ID = 1234
pos = 0,0
postype = p1
stateno = 1233
facing = 1
ownpal = 1

[State 1230, LA]
type = Lifeadd
trigger1 = alive
trigger1 = numhelper(1234)=1
trigger1 = helper(1234),stateno=1234
value = -floor(0.8*(helper(1234),gethitvar(damage)))

[State -2, PFX]
type = palfx
triggerall = alive
trigger1 = numhelper(1234) = 1
trigger1 = (helper(1234),stateno = 1234)
trigger1 = (time%7)=0
trigger1 = !ishelper
time = 3
mul = 512,0,0
color = 0

[State 1200, CA]
type = changeanim
trigger1 = anim = 1200
trigger1 = numhelper(1201) = 1
trigger1 = helper(1201),anim=1231
value = 1000
elem = 18

[State 1230, NHB]
type = nothitby
trigger1 = 1;anim = 1200
value = SCA, AA, AP, AT

[State 1230, PP]
type = playerpush
trigger1 = anim = 1200
value = 0

[State 1200, 5]
type = ChangeState
trigger1 = Anim = 1000
trigger1 = animtime = 0
;trigger1 = numhelper(1201) = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Dance of the Dead
; X Version
[Statedef 1300]
type    = S
movetype= A
physics = S
velset = 0,0
juggle = 4
anim = 1100
ctrl = 0
sprpriority = 2

[State 1300, dance of the dead!]
type = playsnd
trigger1 = animelem = 5
value = 2000, 1
channel = 0

[State 1300, Skel1]
type = helper
trigger1 = animelem = 5
helpertype = normal
name = "Skeleton_X"
ID = 1301
pos = 5,0
postype = p1
stateno = 1301
ownpal = 1

[State 1300, CS]
type = Changestate
trigger1 = animtime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Dance of the Dead
; Y Version
[Statedef 1310]
type    = S
movetype= A
physics = S
velset = 0,0
juggle = 4
anim = 1309
ctrl = 0
sprpriority = 2

[State 1300, dance of the dead!]
type = playsnd
trigger1 = animelem = 11
value = 2000, 1
channel = 0

[State 1300, Skel1]
type = helper
trigger1 = animelem = 18
helpertype = normal
name = "Moving_Trap"
ID = 1301
pos = 0,0
postype = p1
stateno = 1311
ownpal = 1

[State 1300, CS]
type = Changestate
trigger1 = animtime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Dance of the Dead
; Z Version
[Statedef 1320]
type    = S
movetype= A
physics = S
velset = 0,0
juggle = 4
anim = 1300
ctrl = 0
sprpriority = 2
supermovetime = 50

[State 2000, Take THIS!]
type = playsnd
trigger1 = time = 0
value = 2000, 0
channel = 0

[State 1999, Summon]
type = playsnd
trigger1 = time = 0
value = 2000, 2

[State 2000, Random X]
type = Varrandom
trigger1 = time = 0
trigger2 = time = 3
trigger3 = time = 6
trigger4 = time = 9
trigger5 = time = 12
v = 13
range = -75,50

[State 2000, Random Y]
type = Varrandom
trigger1 = time = 0
trigger2 = time = 3
trigger3 = time = 6
trigger4 = time = 9
trigger5 = time = 12
v = 14
range = -40,0

[State 2000, Skeletons]
type = helper
trigger1 = time = 0
trigger2 = time = 3
trigger3 = time = 6
trigger4 = time = 9
trigger5 = time = 12
helpertype = normal
name = "Skeleton_Z"
ID = 1301
pos = var(13),var(14)
postype = p1
stateno = 1321
supermovetime = 120
ownpal = 1

[state 2000, Za Warudo!]
type = SuperPause
trigger1 = time = 0
time = 90
anim = -1
sound = S900, 0
p2defmul = 1
poweradd = -1000
unhittable = 1
movetime = 90

[State 1010, Explod]
type = Explod
trigger1 = time = 0
anim = 2502
ID = 2502
pos = -100,0
vel = 3,0
postype = back
supermovetime = 60
removetime = 60

[State 2000, dance of the dead!]
type = playsnd
trigger1 = animelem = 21
value = 2000, 1

[State 2000, CHARGE!!!]
type = playsnd
trigger1 = animelem = 25
value = 1300, 1

[State 2000, CS]
type = changestate
trigger1 = animtime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Dance of the Dragon
; Y Version
[Statedef 1210];1400]
type    = S
movetype= A
physics = S
velset = 0,0
juggle = 2
anim = 230
ctrl = 0
sprpriority = 2

[State 1400, PSND]
type = playsnd
trigger1 = time = 0
value = 2500, 0
channel = 0

[State 1400, PSND]
type = playsnd
trigger1 = Animelem = 6
value = 1400, 0

[State 1400, Helper]
type = Helper
trigger1 = animelem = 6
trigger1 = numhelper(1211) = 0
trigger1 = numhelper(1201) = 0
helpertype = normal
ID = 1211
name = "Cutter"
pos = 20,-60
stateno = 1401
ownpal = 1

[State 1400, CS]
type = Changestate
trigger1 = animtime = 0
value = 0
ctrl = 1

;---------------------------------------------------------------------------
; Gale Cutter - Air Version (replaces Wind Cutter from v2.X and older)
[Statedef 1450]
type    = A
movetype= A
physics = A
velset = vel x,vel y
anim = 630
ctrl = 0
sprpriority = 2

[State 1450, VS]
type = velset
trigger1 = 1;time <= 15
x = ifelse(vel x <0,-2,ifelse(vel x>0,2,0))
y = ifelse(vel y <0,-1,ifelse(vel y>0,1,0))

[State 1050, FVAdd]
type = varadd
trigger1 = time = 0
fv = 12
value = -0.25

[State 1450, PSND]
type = playsnd
trigger1 = Animelem = 6
value = 240, 0
channel = 0

[State 1400, PSND]
type = playsnd
trigger1 = Animelem = 8
value = 1400, 0

[State 1450, Helper]
type = Helper
trigger1 = animelem = 8
trigger1 = numhelper(1400) = 0
helpertype = normal
ID = 1400
name = "Cutter"
pos = 20,-60
stateno = 1401
ownpal = 1

[State 1450, CS]
type = Changestate
trigger1 = animtime = 0
trigger2 = pos y >= 10
value = 50
ctrl = 1

;---------------------------------------------------------------------------
;Desperation Assist - Sesshomaru
[Statedef 3300]
type    = C
movetype= I
physics = C
juggle  = 4
velset = 0,0
anim = 10
ctrl = 0
poweradd = -3000
sprpriority = 2

[State -2, Sesshomaru]
type = helper
trigger1 = time = 30
helpertype = normal
name = "Sesshomaru"
ID = 3450;3400
pos = 15,0
postype = p1
stateno = 3400
ownpal = 1

[State 3300, CA]
type = changeanim
trigger1 = anim = 10
trigger1 = animtime = 0
value = 11

[State 3300, PSND]
type = playsnd
trigger1 = time = 0
value = 3300,0
channel = 0

[State 3500, NHB]
type = nothitby
triggerall = numhelper(3450) = 1
trigger1 = helper(3450),stateno = 3451
value = SCA, AA, AP, AT

[State 3500, CS]
type = Changestate
triggerall = anim = 11
triggerall = numhelper(3450) = 1
trigger1 = helper(3450),stateno = 3402
trigger1 = helper(3450),time >= 30
trigger2 = win
value = 11
ctrl = 1

;---------------------------------------------------------------------------
;Desperation Assist - Naraku
[Statedef 3350]
type    = C
movetype= I
physics = C
juggle  = 4
velset = 0,0
anim = 10
ctrl = 0
poweradd = -3000
sprpriority = 2

[State -2, Sesshomaru]
type = helper
trigger1 = time = 30
helpertype = normal
name = "Naraku"
ID = 3550;3400
pos = 15,0
postype = p1
stateno = 3500
ownpal = 1

[State 3300, CA]
type = changeanim
trigger1 = anim = 10
trigger1 = animtime = 0
value = 11

[State 3350, NHB]
type = nothitby
trigger1 = numhelper(3552) = 1
trigger1 = helper(3552),stateno = 3560
value = SCA, AA, AP, AT

[State 3300, PSND]
type = playsnd
trigger1 = time = 0
value = 3350,0
channel = 0

[State 3500, NHB]
type = nothitby
triggerall = numhelper(3550) = 1
trigger1 = helper(3550),stateno = 3551
value = SCA, AA, AP, AT

[State 3500, CS]
type = Changestate
triggerall = anim = 11
triggerall = numhelper(3550) = 1
trigger1 = helper(3550),stateno = 3502
trigger1 = helper(3550),time >= 30
trigger2 = win
value = 11
ctrl = 1
